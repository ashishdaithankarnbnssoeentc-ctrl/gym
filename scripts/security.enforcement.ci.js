#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSecurityChecks() {
  console.log('🔒 Running security enforcement checks...');
  
  try {
    // Check 1: Verify all tables with tenant_id have RLS
    console.log('\n📋 Checking RLS policies on tenant tables...');
    const { data: tablesWithoutRLS, error: rlsError } = await supabase
      .rpc('get_tables_without_rls');
    
    if (rlsError) {
      console.error('❌ Error checking RLS policies:', rlsError);
      process.exit(1);
    }
    
    if (tablesWithoutRLS && tablesWithoutRLS.length > 0) {
      console.error('❌ Tables missing RLS policies:');
      tablesWithoutRLS.forEach(table => {
        console.error(`   - ${table.tablename}`);
      });
      process.exit(1);
    }
    
    // Check 2: Verify audit logs table exists
    console.log('\n📝 Checking audit logs table...');
    const { data: auditTable, error: auditError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'audit_logs')
      .single();
    
    if (auditError || !auditTable) {
      console.error('❌ Audit logs table not found');
      process.exit(1);
    }
    
    // Check 3: Verify tenant context function exists
    console.log('\n🔐 Checking tenant context function...');
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'current_tenant_id');
    
    if (funcError || !functions || functions.length === 0) {
      console.error('❌ current_tenant_id function not found');
      process.exit(1);
    }
    
    console.log('\n✅ All security checks passed!');
    console.log('🎯 Security enforcement is working correctly');
    
  } catch (error) {
    console.error('❌ Security check failed:', error.message);
    process.exit(1);
  }
}

// Helper function to check tables without RLS (needs to be created in DB)
async function setupSecurityFunctions() {
  console.log('🔧 Setting up security check functions...');
  
  const createFunctionSQL = `
    create or replace function get_tables_without_rls()
    returns table(tablename text)
    language plpgsql
    security definer
    as $$
    begin
      return query
      select t.tablename
      from pg_tables t
      where t.schemaname = 'public'
        and exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = t.tablename
            and c.column_name = 'tenant_id'
        )
        and not exists (
          select 1
          from pg_policies p
          where p.tablename = t.tablename
        );
    end;
    $$;
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
  if (error) {
    console.error('⚠️  Could not setup security functions:', error);
  }
}

if (require.main === module) {
  setupSecurityFunctions().then(() => runSecurityChecks());
}

module.exports = { runSecurityChecks };
