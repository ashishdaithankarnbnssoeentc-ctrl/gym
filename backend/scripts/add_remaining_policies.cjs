const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addRemainingPolicies() {
  console.log('🔧 Adding remaining missing RLS policies...');
  
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

  // For kv_store, we want to block all operations, so we need ALL policy with false
  try {
    await supabase.rpc('exec_sql', { 
      sql_query: 'DROP POLICY IF EXISTS "kv_store_authenticated_select" ON public.kv_store_3ccefd63' 
    });
    console.log('✅ Dropped old kv_store policy');
  } catch (err) {
    console.log('ℹ️ Old kv_store policy not found');
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

  console.log('🚀 Remaining policy addition completed');
}

addRemainingPolicies().catch(console.error);
