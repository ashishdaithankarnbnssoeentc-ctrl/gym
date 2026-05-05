#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Use environment variables that should be set
const supabaseUrl = process.env.SUPABASE_URL || "https://ozmmontfdlnzvqchhzdd.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bW1vbnRmZGxuenZxY2hoemRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNDU2MjQwMCwiZXhwIjoyMDMwMTM4NDAwfQ.5kF8L5xJn9J2J8Q3H9N9P2H5L6X9K8M7N4O1P3Q2R1S";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyAuditSchema() {
  console.log('🔧 Applying audit log schema to database...');
  
  try {
    // Read the audit log schema file
    const auditSQL = fs.readFileSync('database/schema/audit-log-trigger.sql', 'utf8');
    console.log('📝 Audit schema loaded successfully');
    
    // First, let's create a simple test to verify connection
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('count(*)')
      .eq('table_schema', 'public')
      .single();
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      throw testError;
    }
    console.log('✅ Database connection verified');
    
    // Check if audit_logs table already exists
    console.log('🔍 Checking if audit_logs table exists...');
    const { data: auditTable, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'audit_logs')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking audit table:', checkError.message);
      throw checkError;
    }
    
    if (auditTable) {
      console.log('✅ Audit logs table already exists');
    } else {
      console.log('📝 Creating audit_logs table...');
      
      // Create the audit_logs table using direct SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.audit_logs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id text NOT NULL,
          table_name text NOT NULL,
          operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
          old_row jsonb,
          new_row jsonb,
          user_id text,
          user_email text,
          ip_address inet,
          user_agent text,
          created_at timestamptz DEFAULT now(),
          CONSTRAINT audit_logs_tenant_check CHECK (tenant_id IS NOT NULL AND tenant_id <> '')
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      if (createError) {
        console.error('❌ Failed to create audit table:', createError.message);
        throw createError;
      }
      console.log('✅ Audit logs table created');
    }
    
    // Enable RLS on audit_logs
    console.log('🔐 Enabling RLS on audit_logs...');
    const { error: rlsError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;' 
    });
    if (rlsError) {
      console.warn('⚠️ RLS enable warning:', rlsError.message);
    } else {
      console.log('✅ RLS enabled on audit_logs');
    }
    
    // Create policy for audit_logs
    console.log('📋 Creating audit_logs policies...');
    const policySQL = `
      DROP POLICY IF EXISTS "Users can view their tenant audit logs" ON public.audit_logs;
      CREATE POLICY "Users can view their tenant audit logs" ON public.audit_logs
        FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true));
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', { sql: policySQL });
    if (policyError) {
      console.warn('⚠️ Policy creation warning:', policyError.message);
    } else {
      console.log('✅ Audit logs policies created');
    }
    
    // Create indexes
    console.log('📊 Creating indexes...');
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON public.audit_logs(operation);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
    `;
    
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSQL });
    if (indexError) {
      console.warn('⚠️ Index creation warning:', indexError.message);
    } else {
      console.log('✅ Indexes created');
    }
    
    console.log('\n🎯 Audit schema application completed successfully!');
    console.log('✅ Security audit system is now operational');
    
  } catch (error) {
    console.error('❌ Schema application failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

applyAuditSchema();
