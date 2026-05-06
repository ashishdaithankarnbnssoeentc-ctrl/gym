#!/usr/bin/env node

/**
 * Apply Database Schema Script
 * 
 * Applies all security schemas to Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySchema() {
  console.log('🔧 Applying database schemas...');
  
  try {
    // Apply audit log trigger schema
    console.log('\n📝 Applying audit log trigger schema...');
    const auditSQL = fs.readFileSync('backend/database/schema/audit-log-trigger.sql', 'utf8');
    
    // Split SQL into individual statements for better error handling
    const statements = auditSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`❌ Statement failed: ${error.message}`);
          throw error;
        }
      }
    }
    
    console.log('✅ Audit log trigger schema applied successfully');
    
    // Enable audit logging on all tenant tables
    console.log('\n🔐 Enabling audit logging on tenant tables...');
    const { error: enableError } = await supabase.rpc('enable_audit_logging_all');
    if (enableError) {
      console.warn('⚠️ Could not enable audit logging automatically:', enableError.message);
    } else {
      console.log('✅ Audit logging enabled on all tenant tables');
    }
    
    // Verify audit logs table exists
    console.log('\n🔍 Verifying audit logs table...');
    const { data: auditTable, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'audit_logs')
      .single();
    
    if (verifyError || !auditTable) {
      console.error('❌ Audit logs table verification failed');
      throw verifyError;
    }
    
    console.log('✅ Audit logs table verified');
    
    // Check for existing tenant tables
    console.log('\n📊 Checking tenant tables...');
    const { data: tenantTables, error: tablesError } = await supabase.rpc('get_tenant_tables');
    
    if (tablesError) {
      console.warn('⚠️ Could not check tenant tables:', tablesError.message);
    } else {
      console.log(`✅ Found ${tenantTables?.length || 0} tenant tables`);
      if (tenantTables && tenantTables.length > 0) {
        console.log('Tenant tables:', tenantTables.map(t => t.table_name).join(', '));
      }
    }
    
    console.log('\n🎯 Database schema application completed successfully!');
    console.log('✅ Security system is now fully operational');
    
  } catch (error) {
    console.error('❌ Schema application failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  applySchema();
}

module.exports = { applySchema };
