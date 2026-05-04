# 🚀 Setup Guide

## Prerequisites
- Node.js 20+
- npm or pnpm
- Supabase account
- Firebase project

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Backend Setup
```bash
cd backend
npm install
cp env.example .env
# Edit .env with your credentials
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp env.example .env.local
# Edit .env.local with API URL
npm run dev
```

### 4. Database Setup
```bash
# Run in Supabase SQL Editor
\i backend/database/migrations/001_initial_schema.sql
```

## Environment Variables

### Backend (.env)
```env
PORT=5000
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-client-email
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME="SaaS Application"
```

## Running the Application

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend
npm run dev:frontend
```

## Verification

1. Backend health check: http://localhost:5000
2. Frontend application: http://localhost:5173
3. Database connection: Check backend logs
4. Authentication: Test login flow
