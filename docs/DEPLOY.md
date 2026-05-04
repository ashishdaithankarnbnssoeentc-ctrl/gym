# 🚀 DEPLOY NOW — Step-by-Step Guide

**Your system is ready for production deployment.**

---

## ⚡ QUICK START (Choose One)

### Option A: Render (Recommended — Free, Easy)
Deploy time: ~5 minutes

### Option B: Railway (Alternative)
Deploy time: ~5 minutes

---

## ✅ OPTION A: RENDER DEPLOYMENT

### Step 1: Push Backend to GitHub

Your backend is in `c:\gym\backend\`. You need to either:
- Move it to its own repo, OR
- Keep it in main repo and point Render to `backend/` subfolder

```bash
# If backend is in subfolder (current setup)
# Just ensure your main repo is pushed to GitHub
git add backend/
git commit -m "Prepare backend for deployment"
git push origin main
```

### Step 2: Sign Up on Render

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"

### Step 3: Configure Service

| Setting | Value |
|---------|-------|
| **Name** | `elite-fitness-backend` |
| **Region** | Oregon (US West) |
| **Branch** | `main` |
| **Root Directory** | `backend` (if backend is subfolder) OR leave blank |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free |

### Step 4: Add Environment Variables

Click "Advanced" → "Add Environment Variable" for each:

**Public (not sensitive):**
```
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://ozmmontfdlnzvqchhzdd.supabase.co
FIREBASE_PROJECT_ID=elite-fitness-9ecf5
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@elite-fitness-9ecf5.iam.gserviceaccount.com
FRONTEND_URL=https://your-figma-site.figma.site
```

**Sensitive (hidden):**
```
SUPABASE_SERVICE_ROLE_KEY=<paste from Supabase Dashboard>
FIREBASE_PRIVATE_KEY=<paste from Firebase Console>
```

> 🔑 **Where to get keys:**
> - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → `service_role` key
> - `FIREBASE_PRIVATE_KEY`: Firebase Console → Project Settings → Service Accounts → Generate New Private Key

### Step 5: Deploy

Click **"Create Web Service"**

Wait for build (~2-3 minutes). Check logs for:
```
✅ Firebase Admin SDK initialized
✅ Supabase backend client initialized
🚀 Server running on port 5000
```

### Step 6: Copy Backend URL

Once deployed, copy your URL:
```
https://elite-fitness-backend.onrender.com
```

---

## ✅ UPDATE FRONTEND

### Step 1: Create Production Env File

Create `c:\gym\.env.production`:

```env
VITE_API_URL=https://elite-fitness-backend.onrender.com
VITE_FIREBASE_API_KEY=AIzaSyCymV2NjthGVNV2N71xpRt2e-RND8qshkg
VITE_FIREBASE_AUTH_DOMAIN=elite-fitness-9ecf5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=elite-fitness-9ecf5
VITE_FIREBASE_STORAGE_BUCKET=elite-fitness-9ecf5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=657674679661
VITE_FIREBASE_APP_ID=1:657674679661:web:2c9f6f1e423f464d3c1664
```

### Step 2: Build Frontend

```bash
cd c:\gym
npm run build
```

### Step 3: Deploy `dist/` Folder

Upload `dist/` contents to your hosting:
- Figma hosting
- Vercel
- Netlify
- Any static host

---

## ✅ TESTING CHECKLIST

Run these tests after deployment:

### 1. Health Check
```bash
curl https://elite-fitness-backend.onrender.com/
# Expected: {"status":"ok"}
```

### 2. Browser Test — Auth Flow
- [ ] Open your frontend URL
- [ ] Click "Sign In" → Google
- [ ] Complete Google auth
- [ ] Should redirect to dashboard with user data
- [ ] Refresh page → should stay logged in
- [ ] Open second tab → should show same login state
- [ ] Logout → should clear session

### 3. Browser Test — API
Open DevTools → Console:
```javascript
// Test content API
fetch('https://elite-fitness-backend.onrender.com/api/content')
  .then(r => r.json())
  .then(console.log)

// Should return content array
```

### 4. Browser Test — Favorites
```javascript
// Add favorite (requires auth)
fetch('https://elite-fitness-backend.onrender.com/api/favorites', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + await auth.currentUser.getIdToken()
  },
  body: JSON.stringify({ content_id: 'test123', content_type: 'video' })
})
```

### 5. Security Tests
- [ ] Try API call without token → should get 401
- [ ] Try API call with fake token → should get 403
- [ ] Verify no Supabase calls in Network tab (only backend API)

---

## 🚨 TROUBLESHOOTING

### CORS Error
```
Access-Control-Allow-Origin header missing
```
**Fix:** Update `FRONTEND_URL` in backend env vars to match your exact frontend domain.

### Firebase Redirect Error
```
redirect_uri_mismatch
```
**Fix:** Add your backend domain to Firebase Console → Authentication → Authorized redirect URIs

### 500 Error
**Fix:** Check Render logs for specific error message

### "User not found" Error
**Fix:** User needs to sync first. Login should auto-sync via `syncUserToBackend`.

---

## 📊 POST-DEPLOYMENT MONITORING

### Check These Regularly

1. **Render Dashboard** — Check uptime and logs
2. **Supabase Dashboard** — Monitor database connections
3. **Firebase Console** — Check auth users

### Optional: Add Sentry

For error tracking, add `SENTRY_DSN` to both frontend and backend env vars.

---

## 🎉 YOU'RE DONE

When all tests pass:
- ✅ Backend is public and secure
- ✅ Frontend connects correctly
- ✅ Auth works across domains
- ✅ No direct DB access
- ✅ Production-ready

**Your system is now LIVE.**

---

## NEXT STEPS (Optional)

1. **Custom domain** — Point your domain to Render
2. **Monitoring** — Add Sentry for error tracking
3. **Analytics** — Set up Google Analytics
4. **Backups** — Configure Supabase automated backups

**Questions? Check `DEPLOYMENT_STATUS.md` for detailed checklist.**
