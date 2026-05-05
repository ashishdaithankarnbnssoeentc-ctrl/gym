const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUsersPolicies() {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: 'SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = \'users\'' 
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Users table policies:');
    data.forEach(p => console.log('  - ' + p.tablename + ': ' + p.policyname + ' (' + p.cmd + ')'));
  }
}

checkUsersPolicies().catch(console.error);
