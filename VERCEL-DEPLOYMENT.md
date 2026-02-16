# 🔧 VERCEL DEPLOYMENT GUIDE

## ⚠️ Masalah di Vercel

Jika mengalami error 404 atau database error, ini adalah solusi lengkapnya.

## 🔍 Penyebab Error

### 1. **SQLite File System Issue** 
Vercel serverless hanya memiliki `/tmp` directory yang temporary (~15 menit).
SQLite tidak optimal untuk environment ini.

### 2. **Route Not Found**
Middleware atau routing belum correct di serverless.

## ✅ Solusi

### Step 1: Setup Environment Variables di Vercel

1. Pergi ke: **Project Settings → Environment Variables**
2. Tambahkan variables:

```
JWT_SECRET = your-super-secret-key-at-least-32-characters
FRONTEND_URL = https://your-frontend-url.vercel.app
NODE_ENV = production
```

3. **Redeploy** setelah menambah env vars

### Step 2: Verify Endpoints

Test API mu dengan curl:

```bash
# Health check
curl https://clipai-chi.vercel.app/health

# Root endpoint  
curl https://clipai-chi.vercel.app/

# Register test
curl -X POST https://clipai-chi.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Password123"}'
```

### Step 3: Check Logs

Lihat error detail di Vercel:

1. Dashboard → **Deployments**
2. Pilih deployment terbaru
3. Tab **Logs** → lihat console output

### Step 4: Database Solution

**PENTING:** SQLite di Vercel tidak reliable. Options:

#### Option A: PostgreSQL + Supabase (Recommended ✅)
- Gratis tier tersedia
- Persistent storage
- SSL connection

**Setup:**
1. Daftar di https://supabase.com
2. Create project
3. Copy connection string
4. Update server code untuk PostgreSQL

#### Option B: MongoDB Atlas (Free Tier)
- https://www.mongodb.com/cloud/atlas
- 512MB free storage
- Cloud database

#### Option C: Firebase (Quick Setup)
- https://firebase.google.com
- Real-time database
- Authentication built-in

---

## 🚀 Quick Deployment Checklist

- [ ] `.env` variables sudah ter-set di Vercel (tidak push ke Git)
- [ ] `vercel.json` ada di root
- [ ] `package.json` dengan semua dependencies
- [ ] Test `/health` endpoint working
- [ ] Test `/api/auth/register` working
- [ ] Database solution dipilih

---

## 📝 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 404 NOT_FOUND | Routes tidak ter-map | Cek `vercel.json` routes |
| Cannot find module | Missing dependencies | `npm install` missing package |
| Database error | SQLite path issue | Use Supabase/MongoDB |
| CORS error | Frontend URL wrong | Update `FRONTEND_URL` env var |
| Token invalid | JWT_SECRET berbeda | Set consistent JWT_SECRET |

---

## 🔗 API Endpoints (Sudah Fixed)

```
GET  /                    → Server info
GET  /health              → Health check
POST /api/auth/register   → User registration
POST /api/auth/login      → User login
GET  /api/auth/me         → Current user (protected)
POST /api/videos/upload   → Upload video (protected)
GET  /api/videos          → List videos (protected)
GET  /api/clips           → List clips (protected)
POST /api/schedule        → Schedule post (protected)
GET  /api/schedule        → List scheduled (protected)
GET  /api/analytics       → Analytics (protected)
POST /api/ai/caption      → Generate caption (protected)
```

---

## 🛠️ Troubleshooting Live

### If still getting 404:

1. **Check Vercel logs:**
   ```bash
   vercel logs --follow
   ```

2. **Local test:**
   ```bash
   npm install
   npm start
   # Visit http://localhost:3001
   ```

3. **Rebuild & Redeploy:**
   ```bash
   git add .
   git commit -m "Fix: Complete Vercel deployment"
   git push origin main
   # Vercel automatically redeploy
   ```

### If database error:

1. Update ke PostgreSQL/MongoDB
2. Set DB connection string di env vars
3. Update database code di `ClipAI-Backend-server.js`

---

## 📞 Support

- Check Vercel Dashboard Logs
- Review this guide
- Update database to cloud solution

Good luck! 🚀
