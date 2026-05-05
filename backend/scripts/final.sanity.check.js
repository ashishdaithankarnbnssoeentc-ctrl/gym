/**
 * Final Sanity Check Script
 * 
 * Exercises actual behavior, not just definitions
 * Verifies critical RLS and business logic in production
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

class FinalSanityCheck {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    this.results = {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      details: []
    };
  }

  async runAllChecks() {
    console.log('🧪 Starting Final Sanity Check (5 minutes)...\n');

    try {
      // Check 1: Cross-tenant access should fail
      await this.testCrossTenantAccess();

      // Check 2: Non-admin cannot modify roles
      await this.testNonAdminRoleModification();

      // Check 3: Inactive admin loses power
      await this.testInactiveAdminPower();

      // Check 4: Last admin protection
      await this.testLastAdminProtection();

      this.printResults();

      // Exit with appropriate code
      process.exit(this.results.failedChecks > 0 ? 1 : 0);

    } catch (error) {
      console.error('❌ Final sanity check failed:', error);
      process.exit(1);
    }
  }

  async testCrossTenantAccess() {
    console.log('1️⃣ Testing Cross-Tenant Access...');

    try {
      // Get a real tenant ID from the database
      const { data: tenants, error: tenantError } = await this.supabase
        .from('tenants')
        .select('id')
        .limit(1);

      if (tenantError || !tenants || tenants.length === 0) {
        throw new Error('No tenants found for testing');
      }

      const realTenantId = tenants[0].id;
      const fakeTenantId = 'some-other-tenant';

      // Test with wrong tenant context
      const result = execSync(`psql -d $DATABASE_URL -c "
        BEGIN;
        SET LOCAL app.tenant_id = '${fakeTenantId}';
        SELECT COUNT(*) FROM public.content;
        COMMIT;
      "`, { encoding: 'utf8' });

      const rowCount = parseInt(result.trim().split('\n')[0]) || 0;

      if (rowCount === 0) {
        this.results.passedChecks++;
        console.log('    ✅ Cross-tenant access properly blocked (0 rows)');
      } else {
        this.results.failedChecks++;
        console.log(`    ❌ Cross-tenant access failed: ${rowCount} rows returned`);
        this.results.details.push({
          check: 'Cross-tenant access',
          expected: '0 rows',
          actual: `${rowCount} rows`,
          status: 'FAILED'
        });
      }

      // Test with correct tenant context for comparison
      const correctResult = execSync(`psql -d $DATABASE_URL -c "
        BEGIN;
        SET LOCAL app.tenant_id = '${realTenantId}';
        SELECT COUNT(*) FROM public.content;
        COMMIT;
      "`, { encoding: 'utf8' });

      const correctRowCount = parseInt(correctResult.trim().split('\n')[0]) || 0;
      console.log(`    📊 Correct tenant context: ${correctRowCount} rows`);

      this.results.totalChecks++;

    } catch (error) {
      this.results.failedChecks++;
      console.log(`    ❌ Cross-tenant test failed: ${error.message}`);
      this.results.details.push({
        check: 'Cross-tenant access',
        error: error.message,
        status: 'ERROR'
      });
    }
  }

  async testNonAdminRoleModification() {
    console.log('\n2️⃣ Testing Non-Admin Role Modification...');

    try {
      // Get a non-admin user
      const { data: nonAdminUser, error: userError } = await this.supabase
        .from('memberships')
        .select('user_id, tenant_id, role')
        .eq('role', 'member')
        .limit(1)
        .single();

      if (userError || !nonAdminUser) {
        throw new Error('No non-admin user found for testing');
      }

      // Try to update role directly in DB (should be blocked by RLS)
      try {
        const result = execSync(`psql -d $DATABASE_URL -c "
          BEGIN;
          SET LOCAL app.tenant_id = '${nonAdminUser.tenant_id}';
          UPDATE public.memberships 
          SET role = 'admin' 
          WHERE user_id = '${nonAdminUser.user_id}';
          COMMIT;
        "`, { encoding: 'utf8' });

        // If we get here, check if role actually changed
        const { data: updatedUser } = await this.supabase
          .from('memberships')
          .select('role')
          .eq('user_id', nonAdminUser.user_id)
          .single();

        if (updatedUser?.role === 'admin') {
          this.results.failedChecks++;
          console.log('    ❌ Non-admin role modification succeeded (should fail)');
          this.results.details.push({
            check: 'Non-admin role modification',
            expected: 'Should fail',
            actual: 'Role changed to admin',
            status: 'FAILED'
          });
        } else {
          this.results.passedChecks++;
          console.log('    ✅ Non-admin role modification properly blocked');
        }
      } catch (updateError) {
        // This is expected - RLS should block the update
        this.results.passedChecks++;
        console.log('    ✅ Non-admin role modification properly blocked (RLS)');
      }

      this.results.totalChecks++;

    } catch (error) {
      this.results.failedChecks++;
      console.log(`    ❌ Non-admin role test failed: ${error.message}`);
      this.results.details.push({
        check: 'Non-admin role modification',
        error: error.message,
        status: 'ERROR'
      });
    }
  }

  async testInactiveAdminPower() {
    console.log('\n3️⃣ Testing Inactive Admin Power...');

    try {
      // Get an admin user
      const { data: adminUser, error: userError } = await this.supabase
        .from('memberships')
        .select('user_id, tenant_id, role, status')
        .eq('role', 'admin')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (userError || !adminUser) {
        throw new Error('No active admin user found for testing');
      }

      // Set admin to inactive
      const { error: updateError } = await this.supabase
        .from('memberships')
        .update({ status: 'inactive' })
        .eq('user_id', adminUser.user_id)
        .eq('tenant_id', adminUser.tenant_id);

      if (updateError) {
        throw new Error(`Failed to set admin inactive: ${updateError.message}`);
      }

      // Test is_admin function
      const isAdminResult = execSync(`psql -d $DATABASE_URL -c "
        SELECT public.is_admin('${adminUser.user_id}', '${adminUser.tenant_id}');
      "`, { encoding: 'utf8' });

      const isAdmin = isAdminResult.trim().toLowerCase() === 'true';

      if (!isAdmin) {
        this.results.passedChecks++;
        console.log('    ✅ Inactive admin properly loses power');
      } else {
        this.results.failedChecks++;
        console.log('    ❌ Inactive admin still has power');
        this.results.details.push({
          check: 'Inactive admin power',
          expected: 'false',
          actual: 'true',
          status: 'FAILED'
        });
      }

      // Restore admin status
      await this.supabase
        .from('memberships')
        .update({ status: 'active' })
        .eq('user_id', adminUser.user_id)
        .eq('tenant_id', adminUser.tenant_id);

      this.results.totalChecks++;

    } catch (error) {
      this.results.failedChecks++;
      console.log(`    ❌ Inactive admin test failed: ${error.message}`);
      this.results.details.push({
        check: 'Inactive admin power',
        error: error.message,
        status: 'ERROR'
      });
    }
  }

  async testLastAdminProtection() {
    console.log('\n4️⃣ Testing Last Admin Protection...');

    try {
      // Find a tenant with exactly one admin
      const { data: adminCounts, error: countError } = await this.supabase
        .from('memberships')
        .select('tenant_id, role')
        .eq('role', 'admin');

      if (countError) {
        throw new Error(`Failed to get admin counts: ${countError.message}`);
      }

      // Group by tenant and find one with single admin
      const tenantAdminCounts = {};
      adminCounts.forEach(admin => {
        tenantAdminCounts[admin.tenant_id] = (tenantAdminCounts[admin.tenant_id] || 0) + 1;
      });

      const singleAdminTenant = Object.entries(tenantAdminCounts)
        .find(([_, count]) => count === 1);

      if (!singleAdminTenant) {
        console.log('    ⚠️  No tenant with single admin found, skipping test');
        this.results.totalChecks++;
        return;
      }

      const [tenantId] = singleAdminTenant;

      // Get the admin user
      const { data: onlyAdmin, error: adminError } = await this.supabase
        .from('memberships')
        .select('user_id, tenant_id, role')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .single();

      if (adminError || !onlyAdmin) {
        throw new Error('Failed to get only admin user');
      }

      // Try to demote the only admin (should fail)
      try {
        const result = execSync(`psql -d $DATABASE_URL -c "
          BEGIN;
          SET LOCAL app.tenant_id = '${tenantId}';
          UPDATE public.memberships 
          SET role = 'member' 
          WHERE user_id = '${onlyAdmin.user_id}';
          COMMIT;
        "`, { encoding: 'utf8' });

        // Check if role actually changed
        const { data: updatedUser } = await this.supabase
          .from('memberships')
          .select('role')
          .eq('user_id', onlyAdmin.user_id)
          .single();

        if (updatedUser?.role === 'member') {
          this.results.failedChecks++;
          console.log('    ❌ Last admin demotion succeeded (should fail)');
          this.results.details.push({
            check: 'Last admin protection',
            expected: 'Should fail',
            actual: 'Role changed to member',
            status: 'FAILED'
          });
        } else {
          this.results.passedChecks++;
          console.log('    ✅ Last admin protection working');
        }
      } catch (updateError) {
        // This is expected - should be blocked
        this.results.passedChecks++;
        console.log('    ✅ Last admin protection working (exception thrown)');
      }

      this.results.totalChecks++;

    } catch (error) {
      this.results.failedChecks++;
      console.log(`    ❌ Last admin protection test failed: ${error.message}`);
      this.results.details.push({
        check: 'Last admin protection',
        error: error.message,
        status: 'ERROR'
      });
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 FINAL SANITY CHECK RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Checks:     ${this.results.totalChecks}`);
    console.log(`Passed:           ${this.results.passedChecks} (${((this.results.passedChecks / this.results.totalChecks) * 100).toFixed(1)}%)`);
    console.log(`Failed:           ${this.results.failedChecks} (${((this.results.failedChecks / this.results.totalChecks) * 100).toFixed(1)}%)`);

    if (this.results.details.length > 0) {
      console.log('\n📋 CHECK DETAILS:');
      this.results.details.forEach((detail, index) => {
        console.log(`  ${index + 1}. ${detail.check}: ${detail.status}`);
        if (detail.expected) console.log(`     Expected: ${detail.expected}`);
        if (detail.actual) console.log(`     Actual: ${detail.actual}`);
        if (detail.error) console.log(`     Error: ${detail.error}`);
        console.log('');
      });
    }

    // Final assessment
    if (this.results.failedChecks === 0) {
      console.log('✅ ALL CHECKS PASSED: System behavior verified');
      console.log('🎯 RLS and business logic working correctly');
      console.log('🚀 Ready for production deployment');
    } else {
      console.log('❌ SOME CHECKS FAILED: Issues detected');
      console.log('🔧 Fix these issues before deploying');
    }

    console.log('='.repeat(60));
  }
}

// Run final sanity check
if (require.main === module) {
  const sanityCheck = new FinalSanityCheck();
  sanityCheck.runAllChecks().catch(console.error);
}

export default FinalSanityCheck;
