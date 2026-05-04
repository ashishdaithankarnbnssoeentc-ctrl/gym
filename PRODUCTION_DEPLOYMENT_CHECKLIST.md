# 🚀 **PRODUCTION DEPLOYMENT CHECKLIST**

## 📋 **PRE-DEPLOYMENT VERIFICATION**

### **✅ Security Checklist**

#### **Backend Security:**
- [ ] **No service role key in frontend code**
- [ ] **RLS policies enabled on all tables** (`block_all` for public)
- [ ] **Backend-only database access** (no direct frontend DB calls)
- [ ] **JWT includes tenant_id** in all tokens
- [ ] **CORS configured correctly** (only frontend domain)
- [ ] **Rate limiting implemented** on sensitive endpoints
- [ ] **Input validation** on all API endpoints
- [ ] **SQL injection protection** (parameterized queries)

#### **Environment Variables:**
```env
# Must be set in production
PORT=5000
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

#### **Frontend Security:**
- [ ] **No API keys in frontend code**
- [ ] **Environment variables only** (VITE_* prefix)
- [ ] **HTTPS enforced** in production
- [ ] **Content Security Policy** headers
- [ ] **XSS protection headers**
- [ ] **Frame protection headers**

---

## 🔧 **BACKEND DEPLOYMENT (Render/Railway)**

### **Step 1: Environment Setup**
```bash
# Set all required environment variables
export PORT=5000
export NODE_ENV=production
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export FIREBASE_PROJECT_ID="your-firebase-project"
export FIREBASE_PRIVATE_KEY="your-firebase-private-key"
export FIREBASE_CLIENT_EMAIL="your-firebase-client-email"
export FRONTEND_URL="https://yourdomain.com"
```

### **Step 2: Database Verification**
```sql
-- Run in Supabase SQL Editor
SELECT 'RLS CHECK' as check_name, 
       CASE 
         WHEN count(*) > 0 THEN 'RLS policies exist'
         ELSE 'NO RLS POLICIES - SECURITY RISK'
       END as status
FROM pg_policies 
WHERE schemaname = 'public';

-- Verify tenant isolation
SELECT COUNT(*) as public_rows 
FROM memberships 
WHERE tenant_id IS NULL;
-- Should return 0
```

### **Step 3: Build and Deploy**
```bash
# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Start production server
npm start
```

### **Step 4: Health Checks**
```bash
# Test endpoints
curl https://your-api-url.com/health
curl https://your-api-url.com/api/auth/me

# Should return:
# - 200 for health
# - 401 for auth/me (no token)
```

---

## 🌐 **FRONTEND DEPLOYMENT (Vercel/Netlify)**

### **Step 1: Environment Setup**
```env
# Frontend .env.production
VITE_API_URL=https://your-api-url.com
VITE_APP_NAME="Your SaaS App"
VITE_ENABLE_ANALYTICS=true
```

### **Step 2: Build and Deploy**
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Vercel/Netlify
vercel --prod
# or
netlify deploy --prod
```

### **Step 3: Verification**
```bash
# Test frontend
curl https://yourdomain.com

# Check network requests in browser:
# - API calls go to correct URL
# - No console errors
# - Auth redirects work
```

---

## 🔥 **CRITICAL PRODUCTION CHECKS**

### **Authentication Flow:**
- [ ] **Login works** on deployed domain
- [ ] **Token persists** after page refresh
- [ ] **Multi-tab stability** (shared auth state)
- [ ] **Logout clears all** auth data
- [ ] **Expired tokens** handled gracefully
- [ ] **JWT tenant_id** present in decoded token

### **Membership Enforcement:**
- [ ] **Expired users blocked** from all API endpoints
- [ ] **Inactive users blocked** from all API endpoints
- [ ] **Plan restrictions** enforced (premium/pro features)
- [ ] **Admin bypass** works correctly
- [ ] **UI reflects** membership status immediately

### **Data Flow:**
- [ ] **Notifications created** by cron jobs
- [ ] **Admin can view** all notifications
- [ ] **Users can view** their notifications
- [ ] **Analytics return** correct data
- [ ] **Cache invalidates** on membership changes

### **Performance:**
- [ ] **API responses** < 200ms average
- [ ] **Cached responses** < 50ms
- [ ] **Database queries** optimized with indexes
- [ ] **Memory usage** stable (no leaks)
- [ ] **Error rates** < 1%

---

## 📊 **MONITORING SETUP**

### **Sentry Integration:**
```typescript
// Verify Sentry is working
Sentry.captureMessage('Production deployment test');
// Should appear in Sentry dashboard
```

### **Health Endpoint:**
```typescript
// Add to backend
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### **Database Monitoring:**
```sql
-- Monitor slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

---

## ⚡ **CRON JOB VERIFICATION**

### **Check Cron is Running:**
```bash
# Check Render cron logs
# Should show daily runs at 9 AM and midnight

# Manual test
curl -X POST https://your-api-url.com/api/test/internal-cron/reminders
```

### **Verify Cron Results:**
```sql
-- Check notifications were created
SELECT COUNT(*) as notifications_today
FROM membership_notifications
WHERE DATE(created_at) = CURRENT_DATE;

-- Check expired memberships processed
SELECT COUNT(*) as expired_today
FROM memberships
WHERE status = 'expired'
AND DATE(updated_at) = CURRENT_DATE;
```

---

## 🔒 **SECURITY VALIDATION**

### **Test Security Measures:**
```bash
# Test RLS policies
curl -H "Authorization: Bearer INVALID_TOKEN" \
     https://your-api-url.com/api/admin/users
# Should return 401

# Test CORS
curl -H "Origin: https://malicious-site.com" \
     https://your-api-url.com/api/auth/me
# Should return CORS error

# Test rate limiting
for i in {1..100}; do
  curl https://your-api-url.com/api/auth/me
done
# Should return 429 after threshold
```

### **Verify Tenant Isolation:**
```sql
-- Test data isolation
SELECT tenant_id, COUNT(*)
FROM memberships
GROUP BY tenant_id;

-- No cross-tenant data access
SELECT * FROM notifications WHERE tenant_id != 'current-tenant';
# Should return 0 rows
```

---

## 📈 **PERFORMANCE BENCHMARKS**

### **Load Testing:**
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test.yml

# Targets:
# - 100 concurrent users
# - 1000 requests/minute
# - < 200ms response time
# - < 1% error rate
```

### **Database Performance:**
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM memberships 
WHERE tenant_id = $1 AND status = 'active';

-- Should use indexes, not sequential scans
```

---

## 🚨 **ROLLBACK PLAN**

### **Quick Rollback:**
```bash
# Render: Deploy previous commit
git checkout previous-commit
git push origin main

# Vercel: Redeploy previous version
vercel --prod --prebuilt

# Database: Restore backup if needed
# Use Supabase dashboard to restore point-in-time
```

### **Emergency Procedures:**
1. **Database issue** → Restore from backup
2. **Auth issue** → Verify Firebase config
3. **Performance issue** → Scale up resources
4. **Security issue** → Revoke all sessions

---

## 📋 **POST-DEPLOYMENT CHECKLIST**

### **Day 1 Verification:**
- [ ] **User registrations** working
- [ ] **Payment processing** (if enabled)
- [ ] **Email notifications** (if enabled)
- [ ] **Admin dashboard** functional
- [ ] **Analytics data** flowing
- [ ] **Error monitoring** active

### **Week 1 Monitoring:**
- [ ] **Daily active users** tracking
- [ ] **Error rates** monitoring
- [ ] **Performance metrics** stable
- [ ] **Database size** growth
- [ ] **Cache hit rates** > 80%

### **Month 1 Optimization:**
- [ ] **Slow queries** identified and optimized
- [ ] **Cache strategies** refined
- [ ] **User feedback** collected
- [ ] **Scaling needs** assessed
- [ ] **Cost analysis** performed

---

## 🎯 **SUCCESS METRICS**

### **Technical Metrics:**
- **Uptime**: > 99.9%
- **Response time**: < 200ms
- **Error rate**: < 1%
- **Security score**: A+ grade
- **Performance score**: > 90/100

### **Business Metrics:**
- **User registration**: > 10/day
- **Active users**: > 70% retention
- **Admin engagement**: Daily usage
- **Support tickets**: < 5% of users

---

## 🚀 **AUTOMATION SCRIPTS**

### **Deployment Script (deploy.sh):**
```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Run tests
npm test

# Build frontend
cd frontend
npm run build

# Deploy to Vercel
vercel --prod

# Build backend
cd ../backend
npm run build

# Deploy to Render
git push origin main

echo "✅ Deployment complete!"

# Run health checks
sleep 30
curl -f https://your-api-url.com/health || exit 1
echo "✅ Health checks passed!"
```

### **Database Backup Script (backup.sh):**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to cloud storage
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

# Clean up local file
rm $BACKUP_FILE

echo "✅ Backup completed: $BACKUP_FILE"
```

---

## 🎯 **FINAL VERIFICATION**

Before going live, ensure:

1. **All security checks pass** ✅
2. **Performance targets met** ✅
3. **Monitoring is active** ✅
4. **Backup strategy in place** ✅
5. **Rollback plan tested** ✅
6. **Team is trained** ✅

**Your SaaS system is now production-ready!**
