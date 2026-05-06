# 🔒 CRITICAL SECURITY ROTATION CHECKLIST
# Execute immediately before deployment

## ⚠️ IMMEDIATE ACTION REQUIRED

The old Supabase service role key was committed to repository and must be considered **COMPROMISED**.

---

## 🔄 STEP 1: Rotate Supabase Service Role Key

**Action Required**: Go to Supabase Dashboard
1. Navigate: `Project Settings → API → service_role key`
2. Click **"Rotate"** button
3. **Copy the new key immediately** - it only shows once
4. Store securely in password manager

---

## 🔄 STEP 2: Update All Environment Variables

**Critical**: Update EVERY location with the new key:

### GitHub Actions Secrets
- Go to: `Repository → Settings → Secrets and variables → Actions`
- Update: `SUPABASE_SERVICE_ROLE_KEY`

### Render Environment Variables
- Go to: `Render Dashboard → Backend Service → Environment`
- Update: `SUPABASE_SERVICE_ROLE_KEY`

### Local Development
- Update: `backend/.env`
- Update: Any local test files

### Documentation Files
- Update: `ENVIRONMENT_VARIABLES.txt`
- Update: `render.yaml` (if present)

---

## 🔍 STEP 3: Final Secret Sweep

**Action Required**: Run these searches to ensure no secrets remain

```bash
# Search for any remaining service role references
git grep "service_role"
git grep "SUPABASE_SERVICE_ROLE_KEY"

# Search for Firebase private keys
git grep "BEGIN PRIVATE KEY"
git grep "AIza"

# Search for any JWT tokens
git grep "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
```

**Expected Result**: All should return nothing or only safe references

---

## 🏗️ STEP 4: Frontend Build Check

**Action Required**: Ensure no secrets in built frontend

```bash
cd frontend
npm run build

# Search built files for secrets
grep -R "service_role" dist/
grep -R "BEGIN PRIVATE KEY" dist/
grep -R "SUPABASE_SERVICE_ROLE_KEY" dist/
```

**Expected Result**: No matches found

---

## 🚀 STEP 5: Test with New Key

**Action Required**: Verify new key works

```bash
cd backend
# Test database connection with new key
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('tenants').select('count').then(r => console.log('✅ New key works:', r.data));
"
```

---

## 📋 STEP 6: Pre-Deployment Verification

**Checklist before deployment**:
- [ ] Supabase service role key rotated
- [ ] GitHub Actions secrets updated
- [ ] Render environment variables updated
- [ ] Local .env file updated
- [ ] Documentation updated
- [ ] Secret sweep shows no remaining secrets
- [ ] Frontend build contains no secrets
- [ ] New key tested and working
- [ ] All changes committed to repository

---

## 🚨 CRITICAL WARNINGS

### Do NOT Deploy Until:
- ✅ Service role key is rotated
- ✅ All environment variables updated
- ✅ Secret sweep passes
- ✅ Frontend build verified clean

### Risk Assessment:
- **Old Key Status**: COMPROMISED (was in git history)
- **New Key Status**: SECURE (never committed)
- **Repository Status**: Clean (no hardcoded secrets)

---

## 🔄 Post-Rotation Actions

### After Deployment:
1. **Monitor logs** for any authentication failures
2. **Test all user flows** (signup, login, content access)
3. **Verify tenant isolation** works correctly
4. **Watch for any 401/403 errors** that indicate key issues

### If Issues Occur:
1. **Check Render logs** immediately
2. **Verify environment variables** are set correctly
3. **Test key manually** with simple connection
4. **Roll back to previous key** only if absolutely necessary

---

## 📞 Emergency Contacts

If critical authentication issues arise:
1. **First**: Check Render environment variables
2. **Second**: Verify GitHub Actions secrets
3. **Third**: Test Supabase connection manually
4. **Last**: Consider key rotation issues

---

# ✅ SECURITY POSTURE AFTER ROTATION

After completing this checklist:
- ✅ Old compromised key is invalid
- ✅ New secure key is in use
- ✅ No secrets in repository
- ✅ All environment variables updated
- ✅ System ready for safe deployment

**This is a critical security prerequisite for production launch.**
