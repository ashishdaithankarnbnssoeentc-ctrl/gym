#!/usr/bin/env node

/**
 * Production Security Check Script
 * 
 * Run this script periodically to verify security posture
 * Usage: node scripts/production.security.check.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

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
    // Check 1: Tables with tenant_id must have RLS policies
    console.log('📋 Check 1: Tables with tenant_id must have RLS policies');
    const { data: tablesWithoutRLS, error: rlsError } = await supabase
      .rpc('get_tables_without_rls');
    
    if (rlsError) {
      console.error('❌ Error checking RLS policies:', rlsError.message);
      results.failed++;
      results.details.push(`RLS check failed: ${rlsError.message}`);
    } else if (tablesWithoutRLS && tablesWithoutRLS.length > 0) {
      console.error('❌ Tables missing RLS policies:');
      tablesWithoutRLS.forEach(table => {
        console.error(`   - ${table.tablename}`);
      });
      results.failed++;
      results.details.push(`${tablesWithoutRLS.length} tables missing RLS policies`);
    } else {
      console.log('✅ All tenant tables have RLS policies');
      results.passed++;
    }

    // Check 2: Verify audit logging is enabled
    console.log('\n📝 Check 2: Audit logging configuration');
    const { data: auditTable, error: auditError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'audit_logs')
      .single();
    
    if (auditError || !auditTable) {
      console.error('❌ Audit logs table not found');
      results.failed++;
      results.details.push('Audit logs table missing');
    } else {
      console.log('✅ Audit logs table exists');
      
      // Check if audit triggers are enabled on key tables
      const { data: triggers, error: triggerError } = await supabase
        .from('information_schema.triggers')
        .select('trigger_name, event_manipulation, event_object_table')
        .eq('trigger_schema', 'public')
        .like('trigger_name', 'audit_%');
      
      if (triggerError) {
        console.warn('⚠️  Could not verify audit triggers:', triggerError.message);
        results.warnings++;
        results.details.push(`Audit trigger check failed: ${triggerError.message}`);
      } else {
        const tenantTables = await supabase.rpc('get_tenant_tables');
        if (tenantTables && tenantTables.length > 0) {
          const tablesWithTriggers = new Set(triggers?.map(t => t.event_object_table) || []);
          const tablesMissingTriggers = tenantTables.filter(t => !tablesWithTriggers.has(t.table_name));
          
          if (tablesMissingTriggers.length > 0) {
            console.warn('⚠️  Tables missing audit triggers:');
            tablesMissingTriggers.forEach(table => {
              console.warn(`   - ${table.table_name}`);
            });
            results.warnings++;
            results.details.push(`${tablesMissingTriggers.length} tables missing audit triggers`);
          } else {
            console.log('✅ Audit triggers enabled on all tenant tables');
            results.passed++;
          }
        }
      }
    }

    // Check 3: Verify security functions exist
    console.log('\n🔐 Check 3: Security functions');
    const requiredFunctions = [
      'current_tenant_id',
      'set_tenant_context',
      'audit_trigger',
      'get_tenant_tables'
    ];
    
    let functionsOk = true;
    for (const funcName of requiredFunctions) {
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
    }
    
    if (functionsOk) {
      console.log('✅ All required security functions exist');
      results.passed++;
    } else {
      results.failed++;
      results.details.push('Missing required security functions');
    }

    // Check 4: Verify no public access to sensitive tables
    console.log('\n🚫 Check 4: Public access restrictions');
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

    // Check 5: Recent audit log activity
    console.log('\n📊 Check 5: Recent audit activity');
    const { data: recentAudits, error: auditCheckError } = await supabase
      .from('audit_logs')
      .select('count(*)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (auditCheckError) {
      console.warn('⚠️  Could not check recent audit activity:', auditCheckError.message);
      results.warnings++;
    } else {
      const count = recentAudits?.[0]?.count || 0;
      if (count === 0) {
        console.warn('⚠️  No audit activity in the last 24 hours');
        results.warnings++;
        results.details.push('No recent audit activity');
      } else {
        console.log(`✅ Found ${count} audit entries in the last 24 hours`);
        results.passed++;
      }
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

// Helper function to run a specific check
async function runSpecificCheck(checkName) {
  console.log(`🔍 Running specific check: ${checkName}`);
  
  switch (checkName) {
    case 'rls':
      await checkRLSPolicies();
      break;
    case 'audit':
      await checkAuditLogging();
      break;
    case 'functions':
      await checkSecurityFunctions();
      break;
    default:
      console.error('❌ Unknown check:', checkName);
      console.log('Available checks: rls, audit, functions');
      process.exit(1);
  }
}

async function checkRLSPolicies() {
  const { data: tablesWithoutRLS } = await supabase.rpc('get_tables_without_rls');
  
  if (tablesWithoutRLS && tablesWithoutRLS.length > 0) {
    console.error('❌ Tables missing RLS policies:');
    tablesWithoutRLS.forEach(table => {
      console.error(`   - ${table.tablename}`);
    });
    process.exit(1);
  } else {
    console.log('✅ All tenant tables have RLS policies');
  }
}

async function checkAuditLogging() {
  const { data: auditTable } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'audit_logs')
    .single();
  
  if (!auditTable) {
    console.error('❌ Audit logs table not found');
    process.exit(1);
  } else {
    console.log('✅ Audit logs table exists');
  }
}

async function checkSecurityFunctions() {
  const { data: func } = await supabase
    .from('information_schema.routines')
    .select('routine_name')
    .eq('routine_schema', 'public')
    .eq('routine_name', 'current_tenant_id')
    .single();
  
  if (!func) {
    console.error('❌ Security functions not found');
    process.exit(1);
  } else {
    console.log('✅ Security functions exist');
  }
}

if (require.main === module) {
  const checkName = process.argv[2];
  if (checkName) {
    runSpecificCheck(checkName);
  } else {
    runProductionSecurityChecks();
  }
}

module.exports = { runProductionSecurityChecks };
