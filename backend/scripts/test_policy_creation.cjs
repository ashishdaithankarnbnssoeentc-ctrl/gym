const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPolicyCreation() {
  console.log('🧪 Testing policy creation...');
  
  // Try to create a simple test policy
  try {
    const result = await supabase.rpc('exec_sql', { 
      sql_query: 'CREATE POLICY "test_policy" ON public.audit_logs FOR SELECT TO authenticated USING (tenant_id = public.tx_tenant_id())' 
    });
    console.log('✅ Test policy creation result:', result);
  } catch (err) {
    console.error('❌ Error creating test policy:', err);
  }
  
  // Check if it appears
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT policyname FROM pg_policies WHERE policyname = \'test_policy\'' 
    });
    console.log('Test policy check result:', { data, error });
  } catch (err) {
    console.error('❌ Error checking test policy:', err);
  }
  
  // Try to drop it
  try {
    await supabase.rpc('exec_sql', { 
      sql_query: 'DROP POLICY IF EXISTS "test_policy" ON public.audit_logs' 
    });
    console.log('✅ Test policy dropped');
  } catch (err) {
    console.error('❌ Error dropping test policy:', err);
  }
}

testPolicyCreation().catch(console.error);
