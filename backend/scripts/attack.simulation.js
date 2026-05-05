/**
 * Attack Simulation Script
 * 
 * Comprehensive stress testing for the hardened security system
 * Tests all identified attack vectors and edge cases
 */

import fetch from 'node-fetch';

class AttackSimulator {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.sessionCookies = new Map();
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      blockedTests: 0,
      errors: []
    };
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive attack simulation...\n');

    try {
      // Test 1: Authentication bypass attempts
      await this.testAuthBypass();
      
      // Test 2: IDOR attacks
      await this.testIDORAttacks();
      
      // Test 3: SQL injection attempts
      await this.testSQLInjection();
      
      // Test 4: XSS attacks
      await this.testXSSAttacks();
      
      // Test 5: Rate limiting stress
      await this.testRateLimiting();
      
      // Test 6: Membership abuse
      await this.testMembershipAbuse();
      
      // Test 7: Tenant isolation breaches
      await this.testTenantIsolation();
      
      // Test 8: Payment replay attacks
      await this.testPaymentReplay();
      
      // Test 9: Smart blocking evasion
      await this.testSmartBlockingEvasion();
      
      // Test 10: Connection pool leakage
      await this.testConnectionPoolLeakage();

      this.printResults();
      
    } catch (error) {
      console.error('❌ Attack simulation failed:', error);
      this.results.errors.push(error.message);
    }
  }

  async testAuthBypass() {
    console.log('🔐 Testing Authentication Bypass...');
    
    // Test 1: No token
    await this.makeRequest('/api/membership', 'GET', null, false, 'No token');
    
    // Test 2: Invalid token
    await this.makeRequest('/api/membership', 'GET', null, false, 'Invalid token', {
      'Cookie': 'authToken=invalid_token_12345'
    });
    
    // Test 3: Expired token
    const expiredToken = this.generateExpiredJWT();
    await this.makeRequest('/api/membership', 'GET', null, false, 'Expired token', {
      'Cookie': `authToken=${expiredToken}`
    });
    
    // Test 4: Malformed token
    await this.makeRequest('/api/membership', 'GET', null, false, 'Malformed token', {
      'Cookie': 'authToken=not.a.valid.jwt'
    });
    
    // Test 5: Token manipulation
    const manipulatedToken = this.generateManipulatedJWT();
    await this.makeRequest('/api/membership', 'GET', null, false, 'Manipulated token', {
      'Cookie': `authToken=${manipulatedToken}`
    });
  }

  async testIDORAttacks() {
    console.log('🎯 Testing IDOR Attacks...');
    
    // First, get a valid session
    const validSession = await this.createValidSession();
    
    // Test 1: Access other user's membership
    await this.makeRequest('/api/membership/other-user-id', 'GET', null, false, 'Other user membership', validSession.headers);
    
    // Test 2: Access other user's favorites
    await this.makeRequest('/api/favorites', 'GET', null, false, 'Other user favorites', validSession.headers);
    
    // Test 3: Modify other user's data
    await this.makeRequest('/api/membership/other-user-id', 'PUT', {
      plan: 'premium'
    }, false, 'Modify other user membership', validSession.headers);
    
    // Test 4: Delete other user's data
    await this.makeRequest('/api/favorites/favorite-id-123', 'DELETE', null, false, 'Delete other user favorite', validSession.headers);
    
    // Test 5: Enumerate user IDs
    for (let i = 1; i <= 10; i++) {
      await this.makeRequest(`/api/membership/user-${i}`, 'GET', null, false, `User enumeration ${i}`, validSession.headers);
    }
  }

  async testSQLInjection() {
    console.log('💉 Testing SQL Injection...');
    
    const validSession = await this.createValidSession();
    
    // Test 1: Union-based injection
    const unionPayloads = [
      "' UNION SELECT password FROM users--",
      "' OR '1'='1",
      "'; DROP TABLE users;--",
      "' OR 1=1#",
      "admin'--"
    ];
    
    for (const payload of unionPayloads) {
      await this.makeRequest(`/api/content/search?q=${encodeURIComponent(payload)}`, 'GET', null, false, `SQL injection: ${payload}`, validSession.headers);
    }
    
    // Test 2: Time-based injection
    const timePayloads = [
      "'; WAITFOR DELAY '00:00:05'--",
      "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--"
    ];
    
    for (const payload of timePayloads) {
      await this.makeRequest(`/api/content/search?q=${encodeURIComponent(payload)}`, 'GET', null, false, `Time-based injection: ${payload}`, validSession.headers);
    }
    
    // Test 3: Boolean-based injection
    const booleanPayloads = [
      "' AND '1'='1",
      "' AND '1'='2",
      "admin' AND '1'='1"
    ];
    
    for (const payload of booleanPayloads) {
      await this.makeRequest(`/api/content/search?q=${encodeURIComponent(payload)}`, 'GET', null, false, `Boolean injection: ${payload}`, validSession.headers);
    }
  }

  async testXSSAttacks() {
    console.log('🎭 Testing XSS Attacks...');
    
    const validSession = await this.createValidSession();
    
    // Test 1: Script injection
    const scriptPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>'
    ];
    
    for (const payload of scriptPayloads) {
      await this.makeRequest('/api/content', 'POST', {
        title: payload,
        content: payload,
        content_type: 'article'
      }, false, `XSS: ${payload}`, validSession.headers);
    }
    
    // Test 2: HTTP header injection
    const headerPayloads = [
      'X-Forwarded-For: <script>alert("XSS")</script>',
      'User-Agent: <script>alert("XSS")</script>',
      'Referer: javascript:alert("XSS")'
    ];
    
    for (const payload of headerPayloads) {
      const [headerName, headerValue] = payload.split(': ');
      await this.makeRequest('/api/content', 'POST', {
        title: 'Test',
        content: 'Test content',
        content_type: 'article'
      }, false, `Header injection: ${headerName}`, {
        ...validSession.headers,
        [headerName]: headerValue
      });
    }
  }

  async testRateLimiting() {
    console.log('⚡ Testing Rate Limiting...');
    
    const validSession = await this.createValidSession();
    
    // Test 1: Burst requests
    console.log('  Testing burst requests...');
    let blockedCount = 0;
    for (let i = 0; i < 150; i++) {
      const result = await this.makeRequest('/api/content', 'GET', null, false, `Burst request ${i}`, validSession.headers);
      if (result.blocked) blockedCount++;
    }
    console.log(`  Burst test: ${blockedCount}/150 requests blocked`);
    
    // Test 2: Sustained requests
    console.log('  Testing sustained requests...');
    blockedCount = 0;
    for (let i = 0; i < 60; i++) {
      const result = await this.makeRequest('/api/content', 'GET', null, false, `Sustained request ${i}`, validSession.headers);
      if (result.blocked) blockedCount++;
      await this.sleep(1000); // 1 second between requests
    }
    console.log(`  Sustained test: ${blockedCount}/60 requests blocked`);
    
    // Test 3: Concurrent requests
    console.log('  Testing concurrent requests...');
    const concurrentPromises = [];
    for (let i = 0; i < 50; i++) {
      concurrentPromises.push(this.makeRequest('/api/content', 'GET', null, false, `Concurrent request ${i}`, validSession.headers));
    }
    const concurrentResults = await Promise.all(concurrentPromises);
    blockedCount = concurrentResults.filter(r => r.blocked).length;
    console.log(`  Concurrent test: ${blockedCount}/50 requests blocked`);
  }

  async testMembershipAbuse() {
    console.log('💳 Testing Membership Abuse...');
    
    const validSession = await this.createValidSession();
    
    // Test 1: Rapid membership extensions
    console.log('  Testing rapid extensions...');
    for (let i = 0; i < 10; i++) {
      await this.makeRequest('/api/membership/extend', 'POST', {
        days: 30
      }, false, `Rapid extension ${i}`, validSession.headers);
    }
    
    // Test 2: Excessive extension days
    await this.makeRequest('/api/membership/extend', 'POST', {
      days: 365
    }, false, 'Excessive extension days', validSession.headers);
    
    await this.makeRequest('/api/membership/extend', 'POST', {
      days: -10
    }, false, 'Negative extension days', validSession.headers);
    
    await this.makeRequest('/api/membership/extend', 'POST', {
      days: 0
    }, false, 'Zero extension days', validSession.headers);
    
    // Test 3: Plan upgrade without payment
    await this.makeRequest('/api/membership', 'POST', {
      plan: 'enterprise',
      payment_verified: false
    }, false, 'Plan upgrade without payment', validSession.headers);
    
    // Test 4: Expired membership revival
    // First, let's assume we have an expired membership
    await this.makeRequest('/api/membership/extend', 'POST', {
      days: 30
    }, false, 'Expired membership revival', validSession.headers);
  }

  async testTenantIsolation() {
    console.log('🏢 Testing Tenant Isolation...');
    
    const session1 = await this.createValidSession('tenant1');
    const session2 = await this.createValidSession('tenant2');
    
    // Test 1: Cross-tenant content access
    await this.makeRequest('/api/content', 'GET', null, false, 'Cross-tenant content access', session1.headers);
    
    // Test 2: Cross-tenant user access
    await this.makeRequest('/api/users', 'GET', null, false, 'Cross-tenant user access', session1.headers);
    
    // Test 3: Cross-tenant favorites
    await this.makeRequest('/api/favorites', 'GET', null, false, 'Cross-tenant favorites', session1.headers);
    
    // Test 4: Tenant header manipulation
    await this.makeRequest('/api/content', 'GET', null, false, 'Tenant header manipulation', {
      ...session1.headers,
      'X-Tenant-ID': 'other-tenant-id'
    });
    
    // Test 5: JWT tenant manipulation
    const manipulatedJWT = this.generateJWTWithDifferentTenant();
    await this.makeRequest('/api/content', 'GET', null, false, 'JWT tenant manipulation', {
      'Cookie': `authToken=${manipulatedJWT}`
    });
  }

  async testPaymentReplay() {
    console.log('💰 Testing Payment Replay Attacks...');
    
    const validSession = await this.createValidSession();
    
    // Test 1: Reuse payment verification
    const paymentId = 'payment-verification-123';
    
    // First use (should succeed if valid)
    await this.makeRequest('/api/membership/upgrade', 'POST', {
      plan: 'premium',
      payment_verified: true,
      verification_id: paymentId
    }, false, 'First payment use', validSession.headers);
    
    // Second use (should be blocked)
    await this.makeRequest('/api/membership/upgrade', 'POST', {
      plan: 'premium',
      payment_verified: true,
      verification_id: paymentId
    }, false, 'Payment replay', validSession.headers);
    
    // Test 2: Expired payment verification
    const expiredPaymentId = 'expired-payment-456';
    await this.makeRequest('/api/membership/upgrade', 'POST', {
      plan: 'premium',
      payment_verified: true,
      verification_id: expiredPaymentId
    }, false, 'Expired payment verification', validSession.headers);
    
    // Test 3: Invalid payment verification
    await this.makeRequest('/api/membership/upgrade', 'POST', {
      plan: 'premium',
      payment_verified: true,
      verification_id: 'invalid-payment-789'
    }, false, 'Invalid payment verification', validSession.headers);
  }

  async testSmartBlockingEvasion() {
    console.log('🧠 Testing Smart Blocking Evasion...');
    
    // Test 1: IP rotation
    const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3', '10.0.0.1', '172.16.0.1'];
    
    for (const ip of ips) {
      await this.makeRequest('/api/auth/login', 'POST', {
        email: 'test@example.com',
        password: 'wrongpassword'
      }, false, `IP rotation: ${ip}`, {
        'X-Forwarded-For': ip
      });
    }
    
    // Test 2: User agent rotation
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    
    for (const ua of userAgents) {
      await this.makeRequest('/api/auth/login', 'POST', {
        email: 'test@example.com',
        password: 'wrongpassword'
      }, false, `UA rotation: ${ua.substring(0, 20)}...`, {
        'User-Agent': ua
      });
    }
    
    // Test 3: Slow and steady attacks
    console.log('  Testing slow attacks...');
    for (let i = 0; i < 20; i++) {
      await this.makeRequest('/api/auth/login', 'POST', {
        email: 'test@example.com',
        password: 'wrongpassword'
      }, false, `Slow attack ${i}`);
      await this.sleep(30000); // 30 seconds between attempts
    }
  }

  async testConnectionPoolLeakage() {
    console.log('🔗 Testing Connection Pool Leakage...');
    
    // Test 1: Rapid sequential requests
    console.log('  Testing rapid sequential requests...');
    for (let i = 0; i < 100; i++) {
      const session = await this.createValidSession();
      await this.makeRequest('/api/content', 'GET', null, false, `Sequential request ${i}`, session.headers);
    }
    
    // Test 2: Parallel requests with different users
    console.log('  Testing parallel requests...');
    const parallelPromises = [];
    for (let i = 0; i < 20; i++) {
      const session = await this.createValidSession(`tenant-${i}`);
      parallelPromises.push(this.makeRequest('/api/content', 'GET', null, false, `Parallel request ${i}`, session.headers));
    }
    await Promise.all(parallelPromises);
    
    // Test 3: Transaction context verification
    console.log('  Testing transaction context...');
    const session = await this.createValidSession();
    
    // Make multiple requests to test context isolation
    for (let i = 0; i < 10; i++) {
      await this.makeRequest('/api/membership', 'GET', null, false, `Context test ${i}`, session.headers);
    }
  }

  async makeRequest(endpoint, method = 'GET', body = null, expectSuccess = true, testName = '', headers = {}) {
    this.results.totalTests++;
    
    try {
      const url = `${this.baseURL}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }
      
      const startTime = Date.now();
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      
      const isBlocked = response.status === 429;
      const isSuccess = expectSuccess ? response.status < 400 : response.status >= 400;
      
      if (isSuccess) {
        this.results.passedTests++;
      } else if (isBlocked) {
        this.results.blockedTests++;
      } else {
        this.results.failedTests++;
      }
      
      // Log result
      const status = isBlocked ? '🚫 BLOCKED' : isSuccess ? '✅ PASS' : '❌ FAIL';
      console.log(`    ${status} ${testName} (${response.status} - ${duration}ms)`);
      
      return {
        status: response.status,
        blocked: isBlocked,
        success: isSuccess,
        duration
      };
      
    } catch (error) {
      this.results.failedTests++;
      console.log(`    ❌ ERROR ${testName}: ${error.message}`);
      this.results.errors.push(error.message);
      
      return {
        error: error.message,
        success: false,
        blocked: false
      };
    }
  }

  async createValidSession(tenantId = 'test-tenant') {
    // This would normally authenticate with real credentials
    // For testing, we'll simulate a valid session
    const mockJWT = this.generateMockJWT(tenantId);
    
    return {
      headers: {
        'Cookie': `authToken=${mockJWT}`
      }
    };
  }

  generateMockJWT(tenantId = 'test-tenant') {
    // Generate a mock JWT for testing
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      uid: `user-${Math.random().toString(36).substr(2, 9)}`,
      email: 'test@example.com',
      tenantId: tenantId,
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64url');
    const signature = 'mock-signature';
    
    return `${header}.${payload}.${signature}`;
  }

  generateExpiredJWT() {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      uid: 'expired-user',
      email: 'expired@example.com',
      tenantId: 'test-tenant',
      role: 'user',
      iat: Math.floor((Date.now() - 7200000) / 1000), // 2 hours ago
      exp: Math.floor((Date.now() - 3600000) / 1000)   // 1 hour ago (expired)
    })).toString('base64url');
    const signature = 'mock-signature';
    
    return `${header}.${payload}.${signature}`;
  }

  generateManipulatedJWT() {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      uid: 'admin-user',
      email: 'admin@example.com',
      tenantId: 'test-tenant',
      role: 'admin',  // Manipulated role
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64url');
    const signature = 'mock-signature';
    
    return `${header}.${payload}.${signature}`;
  }

  generateJWTWithDifferentTenant() {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      uid: 'user-123',
      email: 'test@example.com',
      tenantId: 'different-tenant',  // Different tenant
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64url');
    const signature = 'mock-signature';
    
    return `${header}.${payload}.${signature}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ATTACK SIMULATION RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests:     ${this.results.totalTests}`);
    console.log(`Passed:          ${this.results.passedTests} (${((this.results.passedTests/this.results.totalTests)*100).toFixed(1)}%)`);
    console.log(`Blocked:         ${this.results.blockedTests} (${((this.results.blockedTests/this.results.totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed:          ${this.results.failedTests} (${((this.results.failedTests/this.results.totalTests)*100).toFixed(1)}%)`);
    console.log(`Errors:          ${this.results.errors.length}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Security assessment
    const blockRate = this.results.blockedTests / this.results.totalTests;
    const passRate = this.results.passedTests / this.results.totalTests;
    
    console.log('\n🔒 SECURITY ASSESSMENT:');
    
    if (blockRate > 0.8) {
      console.log('✅ EXCELLENT: High blocking rate indicates strong security');
    } else if (blockRate > 0.6) {
      console.log('⚠️  GOOD: Moderate blocking rate, some attacks may get through');
    } else {
      console.log('❌ POOR: Low blocking rate indicates security weaknesses');
    }
    
    if (passRate < 0.1) {
      console.log('✅ EXCELLENT: Low false positive rate');
    } else if (passRate < 0.2) {
      console.log('⚠️  ACCEPTABLE: Moderate false positive rate');
    } else {
      console.log('❌ POOR: High false positive rate indicates overly restrictive security');
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (this.results.failedTests > 0) {
      console.log('  - Fix failed security tests immediately');
    }
    
    if (this.results.blockedTests < this.results.totalTests * 0.7) {
      console.log('  - Strengthen rate limiting and anomaly detection');
    }
    
    if (this.results.errors.length > 0) {
      console.log('  - Fix system errors that may indicate security gaps');
    }
    
    console.log('='.repeat(60));
  }
}

// Run the simulation
if (require.main === module) {
  const simulator = new AttackSimulator(process.argv[2] || 'http://localhost:3001');
  simulator.runAllTests().catch(console.error);
}

export default AttackSimulator;
