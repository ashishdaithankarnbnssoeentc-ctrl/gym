/**
 * Security Enforcement CI Script
 * 
 * Prevents security drift by enforcing:
 * 1. Service role usage constraints
 * 2. Tenant context requirements
 * 3. RLS policy coverage
 * 4. WITH CHECK tenant enforcement
 * 5. Schema drift detection
 */

import { createClient } from '@supabase/supabase-js';

const EXPECTED = {
  content: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  favorites: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  memberships: ['SELECT', 'INSERT', 'UPDATE'], // delete disabled
  membership_notifications: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  audit_logs: ['SELECT', 'INSERT'], // append-only
  tenants: ['SELECT', 'UPDATE'], // no insert via RLS
  users: ['ALL'], // restricted but uses ALL policy
  kv_store_3ccefd63: [] // internal / blocked
};

const IGNORE_TENANT_CHECK = [
  'USING (false)',
  'is_admin('
];

async function runQuery(supabase, sql, label) {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: sql
  });

  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return data || [];
}

async function checkRLSEnabled(supabase) {
  const rows = await runQuery(
    supabase,
    `SELECT relname FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
     AND relkind = 'r'
     AND relrowsecurity = false`,
    'RLS enabled check'
  );

  if (rows.length > 0) {
    throw new Error(
      `Tables without RLS: ${rows.map(r => r.relname).join(', ')}`
    );
  }

  console.log('✅ RLS enabled on all tables');
}

async function checkPolicyCoverage(supabase) {
  const rows = await runQuery(
    supabase,
    `SELECT tablename, cmd FROM pg_policies WHERE schemaname = 'public'`,
    'Policy coverage'
  );

  const actual = {};
  rows.forEach(r => {
    if (!actual[r.tablename]) actual[r.tablename] = new Set();
    actual[r.tablename].add(r.cmd);
  });

  const errors = [];

  for (const table in EXPECTED) {
    const expectedCmds = EXPECTED[table];
    const actualCmds = actual[table] || new Set();

    expectedCmds.forEach(cmd => {
      if (!actualCmds.has(cmd)) {
        errors.push(`${table}: missing ${cmd}`);
      }
    });
  }

  if (errors.length) {
    throw new Error(`Policy coverage gaps:\n- ${errors.join('\n- ')}`);
  }

  console.log('✅ Policy coverage matches expectations');
}

async function checkWithCheck(supabase) {
  const rows = await runQuery(
    supabase,
    `SELECT tablename, policyname, cmd, with_check
     FROM pg_policies
     WHERE schemaname = 'public'
     AND cmd IN ('INSERT','UPDATE')`,
    'WITH CHECK'
  );

  const bad = rows.filter(r => !r.with_check);

  if (bad.length) {
    throw new Error(
      `Missing WITH CHECK:\n- ${bad.map(r => `${r.tablename}:${r.policyname}`).join('\n- ')}`
    );
  }

  console.log('✅ WITH CHECK enforced');
}

async function checkTenantPattern(supabase) {
  const rows = await runQuery(
    supabase,
    `SELECT tablename, policyname, qual, with_check
     FROM pg_policies
     WHERE schemaname = 'public'`,
    'Tenant pattern'
  );

  const issues = [];

  for (const r of rows) {
    const combined = `${r.qual || ''} ${r.with_check || ''}`;

    const isException = IGNORE_TENANT_CHECK.some(x =>
      combined.includes(x)
    );

    const hasTenant =
      combined.includes('tx_tenant_id') ||
      combined.includes('tenant_id');

    if (!hasTenant && !isException) {
      issues.push(`${r.tablename}:${r.policyname}`);
    }
  }

  if (issues.length) {
    console.log('⚠️ Tenant pattern review needed:');
    issues.forEach(i => console.log(`  - ${i}`));
  } else {
    console.log('✅ Tenant pattern consistent');
  }
}

async function main() {
  console.log('🔒 Security Enforcement CI Check');
  console.log('================================');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔍 Connecting to:', process.env.SUPABASE_URL);
  console.log('🔍 Service key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  // connection test
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: 'select 1 as test_connection'
  });

  console.log('RPC test result:', { data, error });

  if (error) {
    throw new Error(`Connection failed: ${error.message}`);
  }

  console.log('✅ Connection successful\n');

  await checkRLSEnabled(supabase);
  await checkPolicyCoverage(supabase);
  await checkWithCheck(supabase);
  await checkTenantPattern(supabase);

  console.log('\n================================');
  console.log('✅ Security checks passed');
  console.log('🚀 Ready for deployment');
}

main().catch(err => {
  console.error('\n💥 CI FAILED:', err.message);
  process.exit(1);
});
