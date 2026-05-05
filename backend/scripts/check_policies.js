const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCurrentPolicies() {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: 'SELECT tablename, policyname FROM pg_policies WHERE schemaname = \'public\' ORDER BY tablename, policyname' 
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Current policies:');
    data.forEach(p => console.log('  - ' + p.tablename + ': ' + p.policyname));
  }
}

checkCurrentPolicies().catch(console.error);
