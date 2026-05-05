#!/bin/bash

# Elite Fitness SaaS Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up Elite Fitness SaaS..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Backend setup
echo "📦 Setting up backend..."
cd backend
npm install
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your credentials"
fi
echo "✅ Backend setup complete"

# Frontend setup
echo "📦 Setting up frontend..."
cd ../frontend
npm install
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "⚠️  Please edit frontend/.env.local with your API URL"
fi
echo "✅ Frontend setup complete"

# Database setup
echo "🗄️  Setting up database..."
cd ../backend
echo "📋 Please run these SQL commands in your Supabase dashboard:"
echo "   1. Run backend/database/schema/atomic-membership.sql"
echo "   2. Run backend/database/migrations/001_extend_membership_atomic.sql"
echo "   3. Run backend/database/seeds/sample-membership-data.sql (optional)"

# Security setup
echo "🔒 Security setup..."
echo "📋 Please ensure these environment variables are set:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - FIREBASE_PROJECT_ID"
echo "   - FIREBASE_PRIVATE_KEY"
echo "   - FIREBASE_CLIENT_EMAIL"

# Final setup
echo "🎯 Setup complete!"
echo ""
echo "🚀 To start development:"
echo "   cd backend && npm run dev"
echo "   cd frontend && npm run dev"
echo ""
echo "📚 For more information, see:"
echo "   - docs/SECURITY_AUDIT_REPORT.md"
echo "   - docs/SETUP.md"
echo "   - SAAS_TEMPLATE_STRUCTURE.md"
echo ""
echo "✨ Happy coding!"
