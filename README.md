# 🎬 ClipAI Backend

Backend server untuk ClipAI Platform - platform otomasi pembuatan video clip dengan AI.

## 📋 Fitur

- ✅ User Authentication (Register/Login)
- ✅ Video Upload & Processing
- ✅ AI-powered Clip Generation
- ✅ Post Scheduling (Multi-platform)
- ✅ Analytics Tracking
- ✅ AI Caption Generation

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite3
- **Auth**: JWT + bcryptjs
- **File Upload**: Multer
- **Deployment**: Vercel

## 📦 Installation

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/violalysia/ClipAI-Backend.git
cd ClipAI-Backend

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << EOF
PORT=3001
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:3000
EOF

# 4. Run server
npm start
```

Server akan berjalan di: `http://localhost:3001`

## 🚀 Deployment di Vercel

### Prerequisites
- GitHub account (sudah terconnect)
- Vercel account (https://vercel.com)

### Deployment Steps

1. **Login ke Vercel**
   - Buka https://vercel.com
   - Sign in dengan GitHub account

2. **Import Project**
   - Klik "Add New..." → "Project"
   - Pilih repository: `violalysia/ClipAI-Backend`
   - Klik "Import"

3. **Configure Environment Variables**
   - Pada tahap "Configure Project", masukkan:
     ```
     PORT: 3001
     JWT_SECRET: [masukkan secret key yang aman]
     FRONTEND_URL: [URL frontend Anda, contoh: https://clipai-platform.vercel.app]
     ```

4. **Deploy**
   - Klik "Deploy"
   - Tunggu proses deployment selesai (~2-3 menit)

5. **Dapatkan URL Production**
   - Setelah deploy, Anda akan mendapat URL seperti:
     ```
     https://clipai-backend-xxx.vercel.app
     ```

## 📝 API Documentation

### Authentication
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires token)

### Videos
- `POST /api/videos/upload` - Upload video
- `GET /api/videos` - List user videos

### Clips
- `GET /api/clips` - List user clips

### Schedule
- `POST /api/schedule` - Schedule post
- `GET /api/schedule` - List scheduled posts
- `DELETE /api/schedule/:id` - Cancel scheduled post

### Analytics
- `GET /api/analytics` - Get user analytics

### AI Caption
- `POST /api/ai/caption` - Generate AI caption

## 🔑 Environment Variables

```env
PORT=3001                                    # Server port
JWT_SECRET=your-secret-key                   # JWT signing key
FRONTEND_URL=http://localhost:3000           # Frontend URL (for CORS)
NODE_ENV=production                          # Set by Vercel automatically
```

## 📂 Project Structure

```
.
├── ClipAI-Backend-server.js      # Main server file
├── ClipAI-Platform.html           # Frontend
├── package.json                   # Dependencies
├── vercel.json                    # Vercel config
├── .env                           # Environment variables
├── .gitignore                     # Git ignore rules
└── uploads/                       # Upload directory (created automatically)
```

## ❌ Troubleshooting

### 404 NOT_FOUND Error
- Pastikan `vercel.json` sudah ter-deploy
- Cek environment variables di Vercel dashboard
- Lihat logs: Vercel Dashboard → Deployments → Logs

### Database Connection Error
- SQLite file dibuat otomatis saat first run
- Perhatikan folder permissions

### Token Expired
- Cek JWT_SECRET sesuai di .env
- Token expires in 7 days, user perlu login ulang

## 🔗 Links

- **Repository**: https://github.com/violalysia/ClipAI-Backend
- **Live URL**: https://clipai-backend-xxx.vercel.app
- **Frontend**: [update dengan URL frontend Anda]

## 📄 License

ISC
