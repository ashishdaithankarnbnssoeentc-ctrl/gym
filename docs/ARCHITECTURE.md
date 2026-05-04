# 🏗️ System Architecture

**Backend-controlled, secure, production-ready**

---

## 📐 Architecture Pattern

```
Frontend (Vite/React) ──HTTPS──► Backend (Node.js) ──service_role──► Supabase (RLS locked)
        │                           │                              │
    Public API                 Firebase Admin                 Private DB
    No secrets                 Token Verification             No direct access
```

---

## 🔐 Security Model

### Frontend
- **No Supabase client** - Zero direct database access
- **No API keys** - Only public Firebase config
- **Backend API only** - All data via `/api/*` endpoints

### Backend
- **Firebase Admin** - Verifies ID tokens
- **Service Role** - Full Supabase access (backend only)
- **Rate Limiting** - 60 req/min general, 10 req/15min auth
- **CORS** - Restricted to allowed domains

### Database
- **RLS Policies** - Row-level security enforced
- **Service Role Only** - No anon key usage
- **User Isolation** - Data scoped by user_id

---

## 🔄 Data Flow

### Authentication
1. User signs in with Firebase (Google, email, etc.)
2. Frontend gets ID token
3. Backend verifies token with Firebase Admin
4. Backend creates/updates user in Supabase
5. Frontend receives user data from backend

### API Calls
1. Frontend includes fresh ID token in headers
2. Backend verifies token
3. Backend queries Supabase with service role
4. Backend returns filtered data to frontend

---

## 📁 Project Structure

```
gym/
├── frontend/                 # Vite React app
│   ├── src/                # Source code
│   ├── dist/               # Build output
│   └── vite.config.ts      # Build config
├── backend/                 # Node.js API
│   ├── src/                # Source code
│   ├── dist/               # Build output
│   └── .env.example        # Environment template
├── docs/                   # Documentation
│   ├── README.md           # Project overview
│   ├── DEPLOY.md           # Deployment guide
│   └── ARCHITECTURE.md     # This file
├── .env.example            # Frontend env template
├── .gitignore              # Git ignore rules
├── render.yaml             # Render deployment config
└── package.json            # Root scripts
```

---

## 🔧 Technology Stack

### Frontend
- **Vite** - Build tool
- **React** - UI framework
- **Firebase Auth** - Authentication
- **TailwindCSS** - Styling
- **TypeScript** - Type safety

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Firebase Admin** - Token verification
- **Supabase** - Database (service role)
- **TypeScript** - Type safety

### Infrastructure
- **Render** - Backend hosting
- **Supabase** - Database hosting
- **Firebase** - Auth hosting

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/sync-user` - Sync Firebase user to Supabase
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/me` - Update user profile

### Content
- `GET /api/content` - Get all content
- `GET /api/content/:id` - Get content by ID
- `GET /api/content/search` - Search content
- `GET /api/content/category/:category` - Get by category

### Favorites
- `GET /api/favorites` - Get user favorites
- `POST /api/favorites` - Add favorite
- `DELETE /api/favorites/:id` - Remove favorite
- `GET /api/favorites/check/:id` - Check if favorited

### Proposals
- `GET /api/proposals` - Get user proposals
- `POST /api/proposals` - Create proposal
- `GET /api/proposals/:id` - Get proposal by ID
- `PATCH /api/proposals/:id` - Update proposal
- `DELETE /api/proposals/:id` - Delete proposal

---

## 🔒 Security Measures

### Authentication
- Firebase ID tokens required for protected routes
- Tokens verified with Firebase Admin SDK
- 15-minute token cache for performance
- Automatic token refresh on frontend

### API Security
- Rate limiting on all endpoints
- CORS restricted to allowed domains
- Input validation and sanitization
- SQL injection prevention via Supabase

### Data Protection
- User data isolation in database
- No direct database access from frontend
- Environment variables for all secrets
- Service role key backend-only

---

## 📊 Performance Optimizations

### Backend
- Token caching (5-minute TTL)
- Connection pooling via Supabase client
- Efficient database queries with indexes
- Rate limiting prevents abuse

### Frontend
- Code splitting for large components
- Lazy loading for video content
- Optimized bundle size
- Service worker for caching

---

## 🚀 Deployment Architecture

### Backend (Render)
- Node.js runtime
- Environment variables for secrets
- Automatic HTTPS
- Health check endpoint
- Zero-downtime deployments

### Frontend (Static Hosting)
- Pre-built static files
- CDN distribution
- Environment-specific API URL
- Service worker for offline support

---

## 🔄 Development Workflow

### Local Development
```bash
# Start both services
npm run dev

# Individual services
cd backend && npm run dev
cd frontend && npm run dev
```

### Build Process
```bash
# Build both
npm run build

# Individual builds
cd backend && npm run build
cd frontend && npm run build
```

### Production Deployment
1. Deploy backend to Render
2. Update frontend API URL
3. Build and deploy frontend
4. Run production validation

---

## 📈 Scalability Considerations

### Database
- Supabase handles scaling automatically
- Proper indexes for query performance
- Connection pooling via backend

### Backend
- Stateless design for horizontal scaling
- Rate limiting prevents abuse
- Efficient token verification

### Frontend
- Static files scale infinitely
- CDN distribution
- Progressive loading

---

## 🔍 Monitoring & Observability

### Backend
- Request logging with timestamps
- Error tracking via Sentry
- Performance metrics
- Health check endpoint

### Frontend
- Error boundary for crash reporting
- Performance monitoring
- User analytics
- Network request tracking

---

## 🎯 Key Architectural Decisions

### Why Backend-Controlled?
- Prevents database credential exposure
- Enables complex business logic
- Centralizes authentication
- Improves security posture

### Why Supabase?
- Managed PostgreSQL
- Built-in auth integration
- Real-time capabilities
- Excellent TypeScript support

### Why Firebase Auth?
- Industry-standard provider
- Social login support
- Token-based security
- Mobile-friendly

---

## 📝 Maintenance Guidelines

### Code Quality
- TypeScript for type safety
- ESLint for code style
- Regular dependency updates
- Security audit checks

### Database Maintenance
- Regular backups via Supabase
- Performance query analysis
- User data cleanup policies
- Index optimization

### Security Maintenance
- Regular secret rotation
- Dependency vulnerability scans
- CORS policy reviews
- Rate limit adjustments

---

## 🔄 Future Enhancements

### Potential Additions
- Redis for session caching
- Queue system for async tasks
- Advanced analytics tracking
- Multi-tenant support

### Scaling Paths
- Microservices decomposition
- Database read replicas
- Geographic distribution
- Advanced CDN configuration

---

**This architecture prioritizes security, maintainability, and scalability while keeping development velocity high.**
