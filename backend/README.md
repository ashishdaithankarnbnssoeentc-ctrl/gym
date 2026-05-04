# Elite Fitness Platform - Backend

Production-ready backend server for Elite Fitness Platform.

## Features

- ✅ **Firebase Admin SDK** - Verify user identity tokens
- ✅ **Supabase Service Role** - Secure database operations
- ✅ **Express API** - RESTful endpoints
- ✅ **TypeScript** - Type-safe code
- ✅ **CORS Enabled** - Frontend integration
- ✅ **Environment Variables** - Secure configuration

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (from Supabase dashboard)
- Firebase Admin credentials (see below)

### 3. Firebase Admin Setup

**Option A: Service Account JSON (Recommended for Development)**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `backend/serviceAccountKey.json`

**Option B: Environment Variables (Recommended for Production)**

Set these in your `.env`:
```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Run Development Server

```bash
pnpm dev
```

Server will start on `http://localhost:5000`

---

## API Endpoints

### Health Check

```http
GET /
```

Returns server status.

### Sync User

```http
POST /api/auth/sync-user
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "membershipPlan": "premium",
  "location": "New York"
}
```

Syncs authenticated Firebase user to Supabase database.

### Get User Profile

```http
GET /api/auth/user/:firebaseUid
Authorization: Bearer <firebase-id-token>
```

Retrieves user profile from Supabase.

---

## Frontend Integration

### After Firebase Login

```typescript
import { auth } from './lib/firebase';

// After successful login
const user = auth.currentUser;
if (user) {
  const token = await user.getIdToken();
  
  // Sync to backend
  await fetch('http://localhost:5000/api/auth/sync-user', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: 'John',
      lastName: 'Doe',
      // ... other user data
    }),
  });
}
```

---

## Security

### ⚠️ IMPORTANT

1. **NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to frontend**
   - This key bypasses Row Level Security (RLS)
   - Only use it in backend/server code

2. **NEVER commit `.env` or `serviceAccountKey.json` to Git**
   - These files are in `.gitignore`
   - Use `.env.example` as a template

3. **Always verify Firebase tokens**
   - Backend verifies all requests using Firebase Admin SDK
   - Prevents spoofing and unauthorized access

---

## Production Deployment

### Environment Variables

Set these in your hosting platform (Vercel, Railway, Render, etc.):

```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="your_private_key"
FRONTEND_URL=https://your-frontend-domain.com
```

### Build & Start

```bash
# Build TypeScript
pnpm run build

# Start production server
pnpm start
```

---

## Folder Structure

```
backend/
├── src/
│   ├── index.ts           # Main server
│   ├── firebase.ts        # Firebase Admin setup
│   ├── supabase.ts        # Supabase client
│   └── routes/
│       └── auth.ts        # Auth routes
├── dist/                  # Compiled JavaScript (gitignored)
├── .env                   # Environment variables (gitignored)
├── .env.example           # Template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── README.md              # This file
```

---

## Troubleshooting

### "Missing Supabase environment variables"

Make sure `.env` file exists and contains:
```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### "Missing Firebase configuration"

Either:
1. Place `serviceAccountKey.json` in `backend/` folder, OR
2. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `.env`

### "CORS error from frontend"

Update `FRONTEND_URL` in `.env`:
```env
FRONTEND_URL=http://localhost:5173
```

---

## Built With

- **Express** - Web framework
- **Firebase Admin SDK** - User authentication
- **Supabase** - Database operations
- **TypeScript** - Type safety
- **dotenv** - Environment variables

---

Built with ❤️ by Aesthenixtech
