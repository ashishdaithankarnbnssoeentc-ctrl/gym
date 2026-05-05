const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkExecSqlCapabilities() {
  console.log('🔍 Checking exec_sql capabilities...');
  
  // Test basic SELECT
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT 1 as test' 
    });
    console.log('✅ SELECT works:', { data, error });
  } catch (err) {
    console.error('❌ SELECT failed:', err);
  }
  
  // Test basic INSERT
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'INSERT INTO public.audit_logs (tenant_id, action) VALUES (gen_random_uuid(), \'test\')' 
    });
    console.log('✅ INSERT works:', { data, error });
  } catch (err) {
    console.error('❌ INSERT failed:', err);
  }
  
  // Test CREATE POLICY (this should fail)
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'CREATE POLICY "test" ON public.audit_logs FOR SELECT TO authenticated USING (true)' 
    });
    console.log('✅ CREATE POLICY works:', { data, error });
  } catch (err) {
    console.error('❌ CREATE POLICY failed:', err);
  }
  
  // Test ALTER TABLE
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: 'ALTER TABLE public.test_table ADD COLUMN IF NOT EXISTS test_col text' 
    });
    console.log('✅ ALTER TABLE works:', { data, error });
  } catch (err) {
    console.error('❌ ALTER TABLE failed:', err);
  }
}

checkExecSqlCapabilities().catch(console.error);
