#!/bin/bash

# ================================
# PRODUCTION SMOKE TESTS
# Run these after backend deployment
# ================================

echo "🧪 Running Production Smoke Tests..."
echo ""

# Replace with your actual backend domain
BACKEND_URL="https://your-backend-domain.onrender.com"

echo "1️⃣ Testing Health Check..."
curl -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" $BACKEND_URL/
echo ""

echo "2️⃣ Testing API Health..."
curl -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" $BACKEND_URL/api/health
echo ""

echo "3️⃣ Testing Monitoring Endpoint..."
curl -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" $BACKEND_URL/monitoring/performance
echo ""

echo "4️⃣ Testing Content Endpoint (should require auth)..."
curl -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" $BACKEND_URL/api/content
echo ""

echo "✅ Smoke Tests Complete!"
echo ""
echo "📊 Expected Results:"
echo "- Health Check: 200 OK, <500ms"
echo "- API Health: 200 OK, <500ms" 
echo "- Monitoring: 200 OK, <500ms"
echo "- Content: 401/403 (protected)"
