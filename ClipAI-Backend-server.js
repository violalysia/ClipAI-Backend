/**
 * ClipAI Backend Server
 * Node.js + Express + SQLite
 * 
 * Install: npm install express sqlite3 bcryptjs jsonwebtoken multer cors dotenv
 * Run: node server.js
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'clipai-super-secret-key-2025';

// ==================== MIDDLEWARE ====================
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, '../')));

// Rate limiter (sederhana)
const rateLimitMap = new Map();
const rateLimit = (max, windowMs) => (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - record.start > windowMs) {
    record.count = 1; record.start = now;
  } else {
    record.count++;
    if (record.count > max) return res.status(429).json({ error: 'Terlalu banyak request. Coba lagi nanti.' });
  }
  rateLimitMap.set(ip, record);
  next();
};

// ==================== DATABASE ====================
const db = new sqlite3.Database('./clipai.db', (err) => {
  if (err) console.error('DB Error:', err);
  else console.log('✅ Database terhubung');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    plan TEXT DEFAULT 'free',
    clips_used INTEGER DEFAULT 0,
    clips_limit INTEGER DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    filename TEXT NOT NULL,
    original_name TEXT,
    size INTEGER,
    duration REAL,
    status TEXT DEFAULT 'processing',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS clips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER,
    user_id INTEGER,
    title TEXT,
    filename TEXT,
    start_time REAL,
    end_time REAL,
    duration REAL,
    ai_score INTEGER,
    subtitle_file TEXT,
    status TEXT DEFAULT 'processing',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scheduled_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    clip_id INTEGER,
    platforms TEXT,
    caption TEXT,
    hashtags TEXT,
    scheduled_at DATETIME,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(clip_id) REFERENCES clips(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    clip_id INTEGER,
    platform TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
});

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token tidak valid' });
  }
};

// ==================== FILE UPLOAD ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = `uploads/user_${req.user?.id || 'temp'}`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `video_${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Format video tidak didukung'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2GB

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', rateLimit(5, 60000), async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Semua field wajib diisi' });
  if (password.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter' });

  const hash = await bcrypt.hash(password, 12);
  db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash], function(err) {
    if (err) return res.status(409).json({ error: 'Email sudah terdaftar' });
    const user = { id: this.lastID, name, email };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token, message: 'Akun berhasil dibuat!' });
  });
});

app.post('/api/auth/login', rateLimit(10, 60000), (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Email atau password salah' });
    delete user.password;
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  db.get('SELECT id, name, email, plan, clips_used, clips_limit, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ user });
  });
});

// ==================== VIDEO ROUTES ====================
app.post('/api/videos/upload', authMiddleware, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File video tidak ditemukan' });
  
  db.run(
    'INSERT INTO videos (user_id, filename, original_name, size, status) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, req.file.filename, req.file.originalname, req.file.size, 'uploaded'],
    function(err) {
      if (err) return res.status(500).json({ error: 'Gagal menyimpan video' });
      
      const videoId = this.lastID;
      // Simulate AI processing (in production: queue job ke worker)
      setTimeout(() => simulateAIClipping(videoId, req.user.id), 2000);
      
      res.json({ videoId, message: 'Video berhasil diupload! AI sedang memproses...' });
    }
  );
});

function simulateAIClipping(videoId, userId) {
  const clipTitles = ['Hook Pembuka Viral', 'Momen Terbaik', 'Punchline Utama', 'Tips Eksklusif', 'Call to Action'];
  const numClips = Math.floor(Math.random() * 4) + 3;
  
  db.run('UPDATE videos SET status = ?, duration = ? WHERE id = ?', ['ready', 247.5, videoId]);
  
  for (let i = 0; i < numClips; i++) {
    db.run(
      'INSERT INTO clips (video_id, user_id, title, start_time, end_time, duration, ai_score, status) VALUES (?,?,?,?,?,?,?,?)',
      [videoId, userId, clipTitles[i % clipTitles.length] + ` #${i+1}`,
       i * 45, (i + 1) * 45, 45, Math.floor(Math.random() * 30 + 70), 'ready']
    );
  }
  db.run('UPDATE users SET clips_used = clips_used + ? WHERE id = ?', [numClips, userId]);
}

app.get('/api/videos', authMiddleware, (req, res) => {
  db.all('SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, videos) => {
    res.json({ videos: videos || [] });
  });
});

// ==================== CLIPS ROUTES ====================
app.get('/api/clips', authMiddleware, (req, res) => {
  const query = req.query.videoId
    ? 'SELECT * FROM clips WHERE user_id = ? AND video_id = ? ORDER BY ai_score DESC'
    : 'SELECT * FROM clips WHERE user_id = ? ORDER BY created_at DESC';
  const params = req.query.videoId ? [req.user.id, req.query.videoId] : [req.user.id];
  
  db.all(query, params, (err, clips) => res.json({ clips: clips || [] }));
});

// ==================== SCHEDULE ROUTES ====================
app.post('/api/schedule', authMiddleware, (req, res) => {
  const { clipId, platforms, caption, hashtags, scheduledAt } = req.body;
  if (!clipId || !platforms) return res.status(400).json({ error: 'Data tidak lengkap' });
  
  db.run(
    'INSERT INTO scheduled_posts (user_id, clip_id, platforms, caption, hashtags, scheduled_at) VALUES (?,?,?,?,?,?)',
    [req.user.id, clipId, JSON.stringify(platforms), caption, hashtags, scheduledAt || new Date().toISOString()],
    function(err) {
      if (err) return res.status(500).json({ error: 'Gagal menjadwalkan' });
      res.json({ scheduleId: this.lastID, message: 'Berhasil dijadwalkan!' });
    }
  );
});

app.get('/api/schedule', authMiddleware, (req, res) => {
  db.all('SELECT * FROM scheduled_posts WHERE user_id = ? ORDER BY scheduled_at ASC', [req.user.id], (err, posts) => {
    res.json({ posts: posts || [] });
  });
});

app.delete('/api/schedule/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM scheduled_posts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: 'Gagal membatalkan' });
    res.json({ message: 'Berhasil dibatalkan' });
  });
});

// ==================== ANALYTICS ROUTES ====================
app.get('/api/analytics', authMiddleware, (req, res) => {
  db.get(
    'SELECT SUM(views) as total_views, SUM(likes) as total_likes, COUNT(*) as total_posts FROM analytics WHERE user_id = ?',
    [req.user.id],
    (err, stats) => res.json({ stats })
  );
});

// ==================== AI CAPTION (calls Claude API) ====================
app.post('/api/ai/caption', authMiddleware, async (req, res) => {
  const { context } = req.body;
  // In production: call Anthropic API here
  const captions = [
    `POV: Ini yang selama ini kamu cari... 👀 ${context || ''} #viral #fyp #kreatorindonesia`,
    `Rahasia yang nggak diajarkan di sekolah manapun ✨ Simpan ini! #konten #creator`,
    `Tunggu sampai detik terakhir... 😱 Ini mengubah segalanya. #trending #indonesia`
  ];
  res.json({ caption: captions[Math.floor(Math.random() * captions.length)] });
});

// ==================== START SERVER ====================
// Only listen locally, for Vercel export the app
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════╗
  ║   🤖 ClipAI Server Running   ║
  ║   http://localhost:${PORT}      ║
  ╚═══════════════════════════════╝
  `);
  });
}

module.exports = app;
