const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUsersPolicy() {
  console.log('🔍 Checking users_tenant_isolation policy details...');
  
  const query = `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_tenant_isolation'`;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Users policy details:');
    data.forEach(p => {
      console.log(`  Policy: ${p.policyname}`);
      console.log(`  Command: ${p.cmd}`);
      console.log(`  Qualifier: ${p.qual}`);
      console.log(`  WITH CHECK: ${p.with_check}`);
    });
  }
}

checkUsersPolicy().catch(console.error);
