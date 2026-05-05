const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAvailableFunctions() {
  console.log('🔍 Checking available RPC functions...');
  
  // Check all functions in the database
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: `SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%sql%' OR routine_name LIKE '%exec%' OR routine_name LIKE '%ddl%' ORDER BY routine_name` 
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Available functions:');
    data.forEach(f => console.log(`  - ${f.routine_name} (${f.routine_type})`));
  }
}

checkAvailableFunctions().catch(console.error);
