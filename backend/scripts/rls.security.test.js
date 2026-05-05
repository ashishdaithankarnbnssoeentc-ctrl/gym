/**
 * RLS Security Test Script
 * 
 * Comprehensive testing of Row Level Security policies
 * Attempts to break tenant isolation and access controls
 */

import fetch from 'node-fetch';

class RLSSecurityTester {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.sessions = new Map();
    this.results = {
      totalTests: 0,
      blockedTests: 0,
      passedTests: 0,
      failedTests: 0,
      vulnerabilities: []
    };
  }

  async runAllTests() {
    console.log('🔒 Starting RLS Security Testing...\n');

    try {
      // Setup test sessions
      await this.setupTestSessions();
      
      // Test 1: Cross-tenant data access
      await this.testCrossTenantAccess();
      
      // Test 2: User data isolation
      await this.testUserDataIsolation();
      
      // Test 3: Admin privilege escalation
      await this.testAdminPrivilegeEscalation();
      
      // Test 4: Direct SQL injection attempts
      await this.testDirectSQLInjection();
      
      // Test 5: Policy bypass attempts
      await this.testPolicyBypassAttempts();
      
      // Test 6: Transaction context verification
      await this.testTransactionContext();
      
      // Test 7: Connection pool leakage
      await this.testConnectionPoolLeakage();
      
      // Test 8: Orphan data access
      await this.testOrphanDataAccess();

      this.printResults();
      
    } catch (error) {
      console.error('❌ RLS security test failed:', error);
      this.results.errors.push(error.message);
    }
  }

  async setupTestSessions() {
    console.log('🔧 Setting up test sessions...');
    
    // Create sessions for different tenants
    this.sessions.set('tenant1-admin', await this.createTestSession('tenant1', 'admin'));
    this.sessions.set('tenant1-user', await this.createTestSession('tenant1', 'user'));
    this.sessions.set('tenant2-admin', await this.createTestSession('tenant2', 'admin'));
    this.sessions.set('tenant2-user', await this.createTestSession('tenant2', 'user'));
    this.sessions.set('unauthenticated', null);
    
    console.log('✅ Test sessions created');
  }

  async testCrossTenantAccess() {
    console.log('\n🏢 Testing Cross-Tenant Access...');
    
    const tenant1User = this.sessions.get('tenant1-user');
    const tenant2User = this.sessions.get('tenant2-user');
    
    // Test 1: Tenant 1 user accessing Tenant 2 data
    await this.testCrossTenantScenario(
      'Tenant1 user accessing Tenant2 content',
      tenant1User,
      '/api/content',
      'GET',
      null,
      'should_block'
    );
    
    // Test 2: Tenant 2 user accessing Tenant 1 data
    await this.testCrossTenantScenario(
      'Tenant2 user accessing Tenant1 content',
      tenant2User,
      '/api/content',
      'GET',
      null,
      'should_block'
    );
    
    // Test 3: Cross-tenant favorites access
    await this.testCrossTenantScenario(
      'Cross-tenant favorites access',
      tenant1User,
      '/api/favorites',
      'GET',
      null,
      'should_block'
    );
    
    // Test 4: Cross-tenant membership access
    await this.testCrossTenantScenario(
      'Cross-tenant membership access',
      tenant1User,
      '/api/membership',
      'GET',
      null,
      'should_block'
    );
  }

  async testUserDataIsolation() {
    console.log('\n👤 Testing User Data Isolation...');
    
    const tenant1User = this.sessions.get('tenant1-user');
    const tenant1Admin = this.sessions.get('tenant1-admin');
    
    // Test 1: User accessing other user's favorites
    await this.testUserDataScenario(
      'User accessing other user favorites',
      tenant1User,
      '/api/favorites/other-user-id',
      'GET',
      null,
      'should_block'
    );
    
    // Test 2: User modifying other user's data
    await this.testUserDataScenario(
      'User modifying other user membership',
      tenant1User,
      '/api/membership/other-user-id',
      'PUT',
      { plan: 'premium' },
      'should_block'
    );
    
    // Test 3: User deleting other user's favorites
    await this.testUserDataScenario(
      'User deleting other user favorites',
      tenant1User,
      '/api/favorites/favorite-id-123',
      'DELETE',
      null,
      'should_block'
    );
  }

  async testAdminPrivilegeEscalation() {
    console.log('\n👑 Testing Admin Privilege Escalation...');
    
    const tenant1User = this.sessions.get('tenant1-user');
    const tenant2User = this.sessions.get('tenant2-user');
    
    // Test 1: Regular user accessing admin endpoints
    await this.testAdminScenario(
      'Regular user accessing admin content',
      tenant1User,
      '/api/admin/content',
      'GET',
      null,
      'should_block'
    );
    
    // Test 2: Regular user creating admin content
    await this.testAdminScenario(
      'Regular user creating admin content',
      tenant1User,
      '/api/content',
      'POST',
      { title: 'Admin Test', content: 'Should fail', content_type: 'article' },
      'should_block'
    );
    
    // Test 3: Cross-tenant admin access
    await this.testAdminScenario(
      'Admin accessing other tenant',
      tenant1User,
      '/api/admin/tenants/tenant-2-id',
      'GET',
      null,
      'should_block'
    );
  }

  async testDirectSQLInjection() {
    console.log('\n💉 Testing Direct SQL Injection...');
    
    const tenant1User = this.sessions.get('tenant1-user');
    
    // Test 1: SQL injection in content queries
    const injectionPayloads = [
      "' OR tenant_id = 'other-tenant' --",
      "'; SELECT * FROM content WHERE tenant_id != 'current-tenant' --",
      "' UNION SELECT * FROM content WHERE tenant_id = 'other-tenant' --",
      "admin' AND tenant_id != 'current-tenant' --"
    ];
    
    for (const payload of injectionPayloads) {
      await this.testSQLInjectionScenario(
        `SQL injection: ${payload}`,
        tenant1User,
        `/api/content/search?q=${encodeURIComponent(payload)}`,
        'GET',
        null,
        'should_block'
      );
    }
  }

  async testPolicyBypassAttempts() {
    console.log('\n🎭 Testing Policy Bypass Attempts...');
    
    const tenant1User = this.sessions.get('tenant1-user');
    
    // Test 1: Bypass via direct table access
    await this.testBypassScenario(
      'Direct table access bypass',
      tenant1User,
      '/api/direct/memberships',
      'GET',
      null,
      'should_block'
    );
    
    // Test 2: Bypass via function calls
    await this.testBypassScenario(
      'Function call bypass',
      tenant1User,
      '/api/rpc/get_all_content',
      'POST',
      {},
      'should_block'
    );
    
    // Test 3: Bypass via view access
    await this.testBypassScenario(
      'View access bypass',
      tenant1User,
      '/api/views/all_data',
      'GET',
      null,
      'should_block'
    );
  }

  async testTransactionContext() {
    console.log('\n🔄 Testing Transaction Context...');
    
    const tenant1User = this.sessions.get('tenant1-user');
    
    // Test 1: Query without transaction context
    await this.testTransactionScenario(
      'Query without transaction context',
      null,
      '/api/content',
      'GET',
      null,
      'should_block'
    );
    
    // Test 2: Query with wrong tenant context
    await this.testTransactionScenario(
      'Query with wrong tenant context',
      tenant1User,
      '/api/content',
      'GET',
      null,
      'should_succeed'
    );
    
    // Test 3: Rapid context switching
    for (let i = 0; i < 5; i++) {
      await this.testTransactionScenario(
        `Rapid context switch ${i}`,
        tenant1User,
        '/api/content',
        'GET',
        null,
        'should_succeed'
      );
    }
  }

  async testConnectionPoolLeakage() {
    console.log('\n🔗 Testing Connection Pool Leakage...');
    
    // Test 1: Sequential requests from different tenants
    console.log('  Testing sequential tenant switching...');
    
    for (let i = 0; i < 10; i++) {
      const session = i % 2 === 0 ? 
        this.sessions.get('tenant1-user') : 
        this.sessions.get('tenant2-user');
      
      await this.testLeakageScenario(
        `Sequential request ${i}`,
        session,
        '/api/content',
        'GET',
        null,
        'should_succeed'
      );
    }
    
    // Test 2: Parallel requests from different tenants
    console.log('  Testing parallel tenant requests...');
    
    const parallelPromises = [];
    for (let i = 0; i < 5; i++) {
      const session = i % 2 === 0 ? 
        this.sessions.get('tenant1-user') : 
        this.sessions.get('tenant2-user');
      
      parallelPromises.push(
        this.testLeakageScenario(
          `Parallel request ${i}`,
          session,
          '/api/content',
          'GET',
          null,
          'should_succeed'
        )
      );
    }
    
    await Promise.all(parallelPromises);
  }

  async testOrphanDataAccess() {
    console.log('\n👻 Testing Orphan Data Access...');
    
    const tenant1User = this.sessions.get('tenant1-user');
    
    // Test 1: Access to data with null tenant_id
    await this.testOrphanScenario(
      'Access to null tenant data',
      tenant1User,
      '/api/content/orphan',
      'GET',
      null,
      'should_block'
    );
    
    // Test 2: Access to data with invalid tenant_id
    await this.testOrphanScenario(
      'Access to invalid tenant data',
      tenant1User,
      '/api/content/invalid-tenant',
      'GET',
      null,
      'should_block'
    );
  }

  async testCrossTenantScenario(testName, session, endpoint, method, body, expectedResult) {
    return this.runTest(testName, session, endpoint, method, body, expectedResult);
  }

  async testUserDataScenario(testName, session, endpoint, method, body, expectedResult) {
    return this.runTest(testName, session, endpoint, method, body, expectedResult);
  }

  async testAdminScenario(testName, session, endpoint, method, body, expectedResult) {
    return this.runTest(testName, session, endpoint, method, body, expectedResult);
  }

  async testSQLInjectionScenario(testName, session, endpoint, method, body, expectedResult) {
    return this.runTest(testName, session, endpoint, method, body, expectedResult);
  }

  async testBypassScenario(testName, session, endpoint, method, body, expectedResult) {
    return this.runTest(testName, session, endpoint, method, body, expectedResult);
  }

  async testTransactionScenario(testName, session, endpoint, method, body, expectedResult) {
    return this.runTest(testName, session, endpoint, method, body, expectedResult);
  }

  async testLeakageScenario(testName, session, endpoint, method, body, expectedResult) {
    return this.runTest(testName, session, endpoint, method, body, expectedResult);
  }

  async testOrphanScenario(testName, session, endpoint, method, body, expectedResult) {
    return this.runTest(testName, session, endpoint, method, body, expectedResult);
  }

  async runTest(testName, session, endpoint, method = 'GET', body = null, expectedResult = 'should_succeed') {
    this.results.totalTests++;
    
    try {
      const url = `${this.baseURL}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(session?.headers || {})
        }
      };
      
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }
      
      const startTime = Date.now();
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      
      const isBlocked = response.status >= 400;
      const expectedBlocked = expectedResult === 'should_block';
      const testPassed = isBlocked === expectedBlocked;
      
      if (testPassed) {
        this.results.passedTests++;
        if (expectedBlocked) {
          this.results.blockedTests++;
        }
      } else {
        this.results.failedTests++;
        
        if (!expectedBlocked && isBlocked) {
          this.results.vulnerabilities.push({
            type: 'false_positive',
            test: testName,
            endpoint,
            method,
            status: response.status,
            message: 'Legitimate request was blocked'
          });
        } else if (expectedBlocked && !isBlocked) {
          this.results.vulnerabilities.push({
            type: 'security_breach',
            test: testName,
            endpoint,
            method,
            status: response.status,
            message: 'Security policy was bypassed'
          });
        }
      }
      
      const status = testPassed ? '✅ PASS' : '❌ FAIL';
      const expectation = expectedBlocked ? 'BLOCKED' : 'ALLOWED';
      const actual = isBlocked ? 'BLOCKED' : 'ALLOWED';
      
      console.log(`    ${status} ${testName} (${response.status} - ${duration}ms) [Expected: ${expectation}, Actual: ${actual}]`);
      
      return {
        status: response.status,
        blocked: isBlocked,
        passed: testPassed,
        duration
      };
      
    } catch (error) {
      this.results.failedTests++;
      console.log(`    ❌ ERROR ${testName}: ${error.message}`);
      
      this.results.vulnerabilities.push({
        type: 'system_error',
        test: testName,
        message: error.message
      });
      
      return {
        error: error.message,
        passed: false,
        blocked: false
      };
    }
  }

  async createTestSession(tenantId, role) {
    // This would normally authenticate with real credentials
    // For testing, we'll simulate a valid session
    const mockJWT = this.generateMockJWT(tenantId, role);
    
    return {
      headers: {
        'Cookie': `authToken=${mockJWT}`
      }
    };
  }

  generateMockJWT(tenantId, role) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      uid: `user-${Math.random().toString(36).substr(2, 9)}`,
      email: `test@${tenantId}.com`,
      tenantId: tenantId,
      role: role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64url');
    const signature = 'mock-signature';
    
    return `${header}.${payload}.${signature}`;
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 RLS SECURITY TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests:     ${this.results.totalTests}`);
    console.log(`Passed:          ${this.results.passedTests} (${((this.results.passedTests/this.results.totalTests)*100).toFixed(1)}%)`);
    console.log(`Blocked:         ${this.results.blockedTests} (${((this.results.blockedTests/this.results.totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed:          ${this.results.failedTests} (${((this.results.failedTests/this.results.totalTests)*100).toFixed(1)}%)`);
    console.log(`Vulnerabilities:  ${this.results.vulnerabilities.length}`);
    
    if (this.results.vulnerabilities.length > 0) {
      console.log('\n🚨 VULNERABILITIES FOUND:');
      this.results.vulnerabilities.forEach((vuln, index) => {
        console.log(`  ${index + 1}. [${vuln.type.toUpperCase()}] ${vuln.test}`);
        console.log(`     Endpoint: ${vuln.endpoint} ${vuln.method}`);
        console.log(`     Message: ${vuln.message}`);
        if (vuln.status) {
          console.log(`     Status: ${vuln.status}`);
        }
        console.log('');
      });
    }
    
    // Security assessment
    const vulnerabilityRate = this.results.vulnerabilities.length / this.results.totalTests;
    
    console.log('🔒 SECURITY ASSESSMENT:');
    
    if (vulnerabilityRate === 0) {
      console.log('✅ EXCELLENT: No vulnerabilities detected');
    } else if (vulnerabilityRate < 0.1) {
      console.log('⚠️  GOOD: Minimal vulnerabilities detected');
    } else if (vulnerabilityRate < 0.2) {
      console.log('❌ POOR: Multiple vulnerabilities detected');
    } else {
      console.log('🚨 CRITICAL: Extensive vulnerabilities detected');
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (this.results.vulnerabilities.length > 0) {
      console.log('  - Fix identified vulnerabilities immediately');
      console.log('  - Review RLS policies for proper tenant isolation');
      console.log('  - Verify transaction context is always set');
    }
    
    if (this.results.failedTests > 0) {
      console.log('  - Fix system errors that may indicate security gaps');
    }
    
    console.log('  - Run regular security tests');
    console.log('  - Monitor for cross-tenant access attempts');
    
    console.log('='.repeat(60));
  }
}

// Run RLS security tests
if (require.main === module) {
  const tester = new RLSSecurityTester(process.argv[2] || 'http://localhost:3001');
  tester.runAllTests().catch(console.error);
}

export default RLSSecurityTester;
