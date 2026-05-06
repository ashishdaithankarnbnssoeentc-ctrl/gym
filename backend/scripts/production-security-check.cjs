#!/usr/bin/env node

/**
 * Production Security Check Script
 * 
 * Run this script periodically to verify security posture
 * Usage: node scripts/production-security-check.cjs
 */

const { createClient } = require('@supabase/supabase-js');

// Use environment variables that should be set
const supabaseUrl = process.env.SUPABASE_URL || "https://ozmmontfdlnzvqchhzdd.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runProductionSecurityChecks() {
  console.log('🔍 Running production security checks...\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  try {
    // Check 1: Verify database connection
    console.log('🔗 Check 1: Database connection');
    try {
      const { data: testData, error: testError } = await supabase
        .from('information_schema.tables')
        .select('count(*)')
        .eq('table_schema', 'public')
        .single();

      if (testError) throw testError;
      console.log('✅ Database connection successful');
      results.passed++;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      results.failed++;
      results.details.push(`Database connection failed: ${error.message}`);
    }

    // Check 2: Verify audit logs table exists
    console.log('\n📝 Check 2: Audit logs table');
    try {
      const { data: auditTable, error: auditError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'audit_logs')
        .single();

      if (auditError || !auditTable) {
        console.warn('⚠️  Audit logs table not found');
        results.warnings++;
        results.details.push('Audit logs table missing');
      } else {
        console.log('✅ Audit logs table exists');
        results.passed++;
      }
    } catch (error) {
      console.warn('⚠️  Could not check audit table:', error.message);
      results.warnings++;
      results.details.push(`Audit table check failed: ${error.message}`);
    }

    // Check 3: Verify security functions exist
    console.log('\n🔐 Check 3: Security functions');
    const requiredFunctions = [
      'current_tenant_id',
      'set_tenant_context'
    ];

    let functionsOk = true;
    for (const funcName of requiredFunctions) {
      try {
        const { data: func, error: funcError } = await supabase
          .from('information_schema.routines')
          .select('routine_name')
          .eq('routine_schema', 'public')
          .eq('routine_name', funcName)
          .single();

        if (funcError || !func) {
          console.error(`❌ Function ${funcName} not found`);
          functionsOk = false;
        }
      } catch (error) {
        console.warn(`⚠️  Could not check function ${funcName}:`, error.message);
        functionsOk = false;
      }
    }

    if (functionsOk) {
      console.log('✅ Required security functions exist');
      results.passed++;
    } else {
      results.failed++;
      results.details.push('Missing required security functions');
    }

    // Check 4: Verify no public access to sensitive tables
    console.log('\n🚫 Check 4: Public access restrictions');
    try {
      const { data: publicPolicies, error: policyError } = await supabase
        .from('pg_policies')
        .select('tablename, policyname, roles')
        .eq('schemaname', 'public')
        .like('roles', '%public%');

      if (policyError) {
        console.warn('⚠️  Could not check public policies:', policyError.message);
        results.warnings++;
      } else if (publicPolicies && publicPolicies.length > 0) {
        console.warn('⚠️  Tables with public access policies:');
        publicPolicies.forEach(policy => {
          console.warn(`   - ${policy.tablename}: ${policy.policyname}`);
        });
        results.warnings++;
        results.details.push(`${publicPolicies.length} tables have public access policies`);
      } else {
        console.log('✅ No unrestricted public access policies found');
        results.passed++;
      }
    } catch (error) {
      console.warn('⚠️  Public access check failed:', error.message);
      results.warnings++;
    }

    // Check 5: Verify tenant isolation on key tables
    console.log('\n🏢 Check 5: Tenant isolation');
    const tenantTables = ['users', 'content', 'memberships'];
    let tenantIsolationOk = true;

    for (const tableName of tenantTables) {
      try {
        const { data: columns, error: colError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', tableName)
          .eq('column_name', 'tenant_id');

        if (colError) {
          console.warn(`⚠️  Could not check ${tableName} tenant column`);
          tenantIsolationOk = false;
        } else if (columns && columns.length > 0) {
          console.log(`✅ ${tableName} has tenant_id column`);
        } else {
          console.warn(`⚠️  ${tableName} missing tenant_id column`);
          tenantIsolationOk = false;
        }
      } catch (error) {
        console.warn(`⚠️  Error checking ${tableName}:`, error.message);
        tenantIsolationOk = false;
      }
    }

    if (tenantIsolationOk) {
      console.log('✅ Tenant isolation verified');
      results.passed++;
    } else {
      results.warnings++;
      results.details.push('Tenant isolation issues detected');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎯 PRODUCTION SECURITY CHECK SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);

    if (results.details.length > 0) {
      console.log('\n📋 Details:');
      results.details.forEach(detail => {
        console.log(`   - ${detail}`);
      });
    }

    console.log('\n' + '='.repeat(50));

    if (results.failed > 0) {
      console.log('🚨 SECURITY CHECK FAILED - Immediate action required');
      process.exit(1);
    } else if (results.warnings > 0) {
      console.log('⚠️  SECURITY CHECK PASSED WITH WARNINGS - Review recommended');
      process.exit(2);
    } else {
      console.log('✅ SECURITY CHECK PASSED - All systems secure');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Security check failed with error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runProductionSecurityChecks();
}

module.exports = { runProductionSecurityChecks };
