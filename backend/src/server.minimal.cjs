/**
 * Minimal Backend Server for E2E Testing
 * 
 * Bypasses TypeScript build issues
 * Provides basic API endpoints for testing
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock users for testing
const USERS = {
  'userA@test.com': {
    id: 'user-a-id',
    email: 'userA@test.com',
    password: 'password123',
    tenantId: 'tenant-a-id',
    role: 'admin'
  },
  'userB@test.com': {
    id: 'user-b-id', 
    email: 'userB@test.com',
    password: 'password123',
    tenantId: 'tenant-b-id',
    role: 'member'
  }
};

// Mock content data
const CONTENT = {
  'tenant-a-id': [
    { id: 'content-1', title: 'Tenant A Content 1', tenant_id: 'tenant-a-id' },
    { id: 'content-2', title: 'Tenant A Content 2', tenant_id: 'tenant-a-id' }
  ],
  'tenant-b-id': [
    { id: 'content-3', title: 'Tenant B Content 1', tenant_id: 'tenant-b-id' }
  ]
};

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { 
      uid: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role
    },
    'test-secret-key',
    { expiresIn: '1h' }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, 'test-secret-key');
  } catch (error) {
    return null;
  }
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = decoded;
  next();
}

// Admin middleware
function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = USERS[email];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);
  res.json({ 
    token,
    user: {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role
    }
  });
});

app.get('/api/content', authMiddleware, (req, res) => {
  const tenantId = req.user.tenantId;
  const content = CONTENT[tenantId] || [];
  
  console.log(`🔍 User ${req.user.email} accessing tenant ${tenantId}:`, content.length, 'items');
  
  res.json({
    success: true,
    data: content,
    tenantId
  });
});

app.get('/api/membership', authMiddleware, (req, res) => {
  const user = USERS[req.user.email];
  
  res.json({
    success: true,
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      plan: 'basic',
      status: 'active'
    }
  });
});

app.get('/api/favorites', authMiddleware, (req, res) => {
  const tenantId = req.user.tenantId;
  
  // Mock favorites data
  const favorites = [
    { id: 'fav-1', content_id: 'content-1', user_id: req.user.uid, tenant_id: tenantId }
  ];
  
  res.json({
    success: true,
    data: favorites
  });
});

app.get('/api/admin/admins', authMiddleware, adminMiddleware, (req, res) => {
  const tenantId = req.user.tenantId;
  const admins = Object.values(USERS).filter(u => u.tenantId === tenantId && u.role === 'admin');
  
  res.json({
    success: true,
    data: admins.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role
    }))
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'minimal-test-server'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Minimal test server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`  POST /api/auth/login`);
  console.log(`  GET  /api/content`);
  console.log(`  GET  /api/membership`);
  console.log(`  GET  /api/favorites`);
  console.log(`  GET  /api/admin/admins`);
  console.log(`  GET  /api/health`);
});

module.exports = app;
