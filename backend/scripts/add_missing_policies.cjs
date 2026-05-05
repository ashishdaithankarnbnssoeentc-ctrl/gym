const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addMissingPolicies() {
  console.log('🔧 Adding missing RLS policies...');
  
  // Enable RLS on users table
  try {
    await supabase.rpc('exec_sql', { sql_query: 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY' });
    console.log('✅ Enabled RLS on users table');
  } catch (err) {
    console.log('ℹ️ RLS already enabled on users table');
  }

  // Add missing users policies
  const usersPolicies = [
    'CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (id = auth.uid() AND tenant_id = public.tx_tenant_id())',
    'CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (id = auth.uid() AND tenant_id = public.tx_tenant_id())',
    'CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid() AND tenant_id = public.tx_tenant_id()) WITH CHECK (id = auth.uid() AND tenant_id = public.tx_tenant_id())'
  ];

  for (const policy of usersPolicies) {
    try {
      await supabase.rpc('exec_sql', { sql_query: policy });
      console.log('✅ Created:', policy.split(' ON ')[0].split('"')[1]);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️ Policy already exists:', policy.split(' ON ')[0].split('"')[1]);
      } else {
        console.error('❌ Error creating policy:', err.message);
      }
    }
  }

  // Add missing tenants INSERT policy
  try {
    await supabase.rpc('exec_sql', { 
      sql_query: 'CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT TO authenticated WITH CHECK (id = public.tx_tenant_id() AND public.is_admin(auth.uid(), id))' 
    });
    console.log('✅ Created tenants_insert');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('ℹ️ tenants_insert already exists');
    } else {
      console.error('❌ Error creating tenants_insert:', err.message);
    }
  }

  // Add missing audit_logs UPDATE policy
  try {
    await supabase.rpc('exec_sql', { 
      sql_query: 'CREATE POLICY "audit_update" ON public.audit_logs FOR UPDATE TO authenticated USING (tenant_id = public.tx_tenant_id() AND public.is_admin(auth.uid(), tenant_id)) WITH CHECK (tenant_id = public.tx_tenant_id() AND public.is_admin(auth.uid(), tenant_id))' 
    });
    console.log('✅ Created audit_update');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('ℹ️ audit_update already exists');
    } else {
      console.error('❌ Error creating audit_update:', err.message);
    }
  }

  // Remove problematic kv_store policy and recreate
  try {
    await supabase.rpc('exec_sql', { sql_query: 'DROP POLICY IF EXISTS "kv_store_authenticated_select" ON public.kv_store_3ccefd63' });
    console.log('✅ Dropped problematic kv_store policy');
  } catch (err) {
    console.log('ℹ️ kv_store_authenticated_select not found');
  }

  try {
    await supabase.rpc('exec_sql', { 
      sql_query: 'CREATE POLICY "kv_store_block_all" ON public.kv_store_3ccefd63 FOR ALL TO authenticated USING (false) WITH CHECK (false)' 
    });
    console.log('✅ Created kv_store_block_all');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('ℹ️ kv_store_block_all already exists');
    } else {
      console.error('❌ Error creating kv_store_block_all:', err.message);
    }
  }

  console.log('🚀 Policy addition completed');
}

addMissingPolicies().catch(console.error);
