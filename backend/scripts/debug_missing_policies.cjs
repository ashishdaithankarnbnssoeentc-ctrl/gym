const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugMissingPolicies() {
  console.log('🔍 Debugging missing policy detection...');
  
  // Check what the security check is looking for
  const query = `SELECT tablename, cmd FROM (SELECT tablename, unnest(ARRAY['SELECT','INSERT','UPDATE']) AS cmd FROM pg_tables WHERE schemaname = 'public') expected WHERE NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = expected.tablename AND p.cmd = expected.cmd)`;
  
  console.log('Query:', query);
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Missing command coverage:');
    data.forEach(r => console.log(`  - ${r.tablename}: ${r.cmd}`));
  }
  
  // Let's also check what policies exist for users table specifically
  console.log('\n🔍 Checking users table policies:');
  const usersQuery = `SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'users'`;
  
  const { data: usersData, error: usersError } = await supabase.rpc('exec_sql', { sql_query: usersQuery });
  
  if (usersError) {
    console.error('Error checking users policies:', usersError);
  } else {
    console.log('Users table policies:');
    usersData.forEach(p => console.log(`  - ${p.tablename}: ${p.policyname} (${p.cmd})`));
  }
}

debugMissingPolicies().catch(console.error);
