#!/usr/bin/env node

/**
 * Final Deployment Checklist
 * 
 * Complete verification before production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 FINAL PRODUCTION DEPLOYMENT CHECKLIST');
console.log('==========================================\n');

const checklist = {
  security: {
    title: '🔒 Security Configuration',
    items: [
      {
        check: 'No service role key in frontend code',
        verify: () => {
          const frontendDir = path.join(__dirname, '../frontend');
          const files = fs.readdirSync(frontendDir, { recursive: true });
          const jsFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx'));
          
          for (const file of jsFiles) {
            try {
              const content = fs.readFileSync(path.join(frontendDir, file), 'utf8');
              if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('service_role')) {
                return { passed: false, details: `Found service role key in ${file}` };
              }
            } catch (error) {
              // Skip files that can't be read
            }
          }
          return { passed: true };
        }
      },
      {
        check: 'Environment variables configured',
        verify: () => {
          const envFile = path.join(__dirname, '../backend/.env.example');
          if (fs.existsSync(envFile)) {
            const content = fs.readFileSync(envFile, 'utf8');
            const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'FIREBASE_PROJECT_ID', 'NODE_ENV'];
            const missing = requiredVars.filter(v => !content.includes(v));
            return { 
              passed: missing.length === 0, 
              details: missing.length > 0 ? `Missing: ${missing.join(', ')}` : null 
            };
          }
          return { passed: false, details: '.env.example file not found' };
        }
      },
      {
        check: 'Security middleware integrated',
        verify: () => {
          const indexFile = path.join(__dirname, '../backend/src/index.ts');
          const content = fs.readFileSync(indexFile, 'utf8');
          const securityMiddleware = [
            'productionSecurity',
            'requireAuth',
            'rateLimit',
            'ownershipEnforcement',
            'massAssignmentPrevention'
          ];
          
          const missing = securityMiddleware.filter(mw => !content.includes(mw));
          return { 
            passed: missing.length === 0, 
            details: missing.length > 0 ? `Missing middleware: ${missing.join(', ')}` : null 
          };
        }
      }
    ]
  },
  database: {
    title: '🗄️ Database Configuration',
    items: [
      {
        check: 'Audit log schema exists',
        verify: () => {
          const schemaFile = path.join(__dirname, '../backend/database/schema/audit-log-trigger.sql');
          return { 
            passed: fs.existsSync(schemaFile), 
            details: fs.existsSync(schemaFile) ? null : 'Audit log schema file not found' 
          };
        }
      },
      {
        check: 'Security functions defined',
        verify: () => {
          const schemaDir = path.join(__dirname, '../backend/database/schema');
          const files = fs.readdirSync(schemaDir);
          const securityFiles = files.filter(f => 
            f.includes('security') || f.includes('rls') || f.includes('policy')
          );
          return { 
            passed: securityFiles.length > 0, 
            details: securityFiles.length > 0 ? null : 'No security schema files found' 
          };
        }
      }
    ]
  },
  ci: {
    title: '🔄 CI/CD Configuration',
    items: [
      {
        check: 'GitHub Actions workflow exists',
        verify: () => {
          const workflowFile = path.join(__dirname, '../.github/workflows/security.yml');
          return { 
            passed: fs.existsSync(workflowFile), 
            details: fs.existsSync(workflowFile) ? null : 'Security workflow not found' 
          };
        }
      },
      {
        check: 'Production security gate configured',
        verify: () => {
          const workflowFile = path.join(__dirname, '../.github/workflows/security.yml');
          if (!fs.existsSync(workflowFile)) return { passed: false, details: 'Workflow file missing' };
          
          const content = fs.readFileSync(workflowFile, 'utf8');
          const requiredSteps = [
            'npm ci',
            'security schema validation',
            'API behavioral validation',
            'Load testing'
          ];
          
          const missing = requiredSteps.filter(step => !content.includes(step));
          return { 
            passed: missing.length === 0, 
            details: missing.length > 0 ? `Missing CI steps: ${missing.join(', ')}` : null 
          };
        }
      }
    ]
  },
  deployment: {
    title: '🚀 Deployment Readiness',
    items: [
      {
        check: 'Package.json scripts configured',
        verify: () => {
          const packageFile = path.join(__dirname, '../backend/package.json');
          const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
          const requiredScripts = ['start', 'build'];
          const missing = requiredScripts.filter(script => !packageJson.scripts[script]);
          return { 
            passed: missing.length === 0, 
            details: missing.length > 0 ? `Missing scripts: ${missing.join(', ')}` : null 
          };
        }
      },
      {
        check: 'Environment validation implemented',
        verify: () => {
          const envValidationFile = path.join(__dirname, '../backend/src/config/env.validation.ts');
          return { 
            passed: fs.existsSync(envValidationFile), 
            details: fs.existsSync(envValidationFile) ? null : 'Environment validation not implemented' 
          };
        }
      }
    ]
  }
};

async function runChecklist() {
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  const allIssues = [];

  for (const [category, config] of Object.entries(checklist)) {
    console.log(config.title);
    console.log('-'.repeat(config.title.length));
    
    for (const item of config.items) {
      totalChecks++;
      const result = item.verify();
      
      if (result.passed) {
        console.log(`✅ ${item.check}`);
        passedChecks++;
      } else {
        console.log(`❌ ${item.check}`);
        if (result.details) {
          console.log(`   ${result.details}`);
          allIssues.push(`${item.check}: ${result.details}`);
        }
        failedChecks++;
      }
    }
    console.log('');
  }

  // Summary
  console.log('📊 SUMMARY');
  console.log('==========');
  console.log(`Total checks: ${totalChecks}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${failedChecks}`);
  console.log(`Success rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);

  if (allIssues.length > 0) {
    console.log('\n🚨 ISSUES TO ADDRESS:');
    allIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }

  console.log('\n🎯 DEPLOYMENT READINESS:');
  if (failedChecks === 0) {
    console.log('✅ READY FOR PRODUCTION DEPLOYMENT');
    console.log('All security and configuration checks passed');
  } else {
    console.log('❌ NOT READY FOR PRODUCTION');
    console.log(`Address ${failedChecks} issue(s) before deployment`);
  }

  return failedChecks === 0;
}

if (require.main === module) {
  runChecklist();
}

module.exports = { runChecklist };
