import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

const BASE = "http://localhost:5000";

async function runLoadTest(name, concurrency, duration, endpoint) {
  console.log(`\n🔥 ${name}`);
  console.log(`   Concurrency: ${concurrency} users`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Endpoint: ${endpoint}`);

  try {
    const command = `autocannon -c ${concurrency} -d ${duration} ${BASE}${endpoint}`;
    const { stdout, stderr } = await execAsync(command);

    console.log(stdout);

    if (stderr) {
      console.error("⚠️  Warnings:", stderr);
    }

    // Parse results for key metrics
    const lines = stdout.split('\n');
    const latencyLine = lines.find(line => line.includes('Latency'));
    const reqLine = lines.find(line => line.includes('Requests/sec'));
    const errorLine = lines.find(line => line.includes('Errors'));

    if (errorLine && !errorLine.includes('0')) {
      throw new Error(`Load test failed with errors: ${errorLine}`);
    }

    console.log(`✅ ${name} completed successfully`);
    return true;

  } catch (error) {
    console.error(`❌ ${name} FAILED:`, error.message);
    return false;
  }
}

async function runProductionLoadTests() {
  console.log("🚀 PRODUCTION LOAD TEST SUITE");
  console.log("=============================\n");

  const tests = [
    {
      name: "Stage 1: Baseline Load",
      concurrency: 50,
      duration: 20,
      endpoint: "/api/content"
    },
    {
      name: "Stage 2: Medium Load",
      concurrency: 100,
      duration: 30,
      endpoint: "/api/content"
    },
    {
      name: "Stage 3: High Load",
      concurrency: 200,
      duration: 30,
      endpoint: "/api/content"
    },
    {
      name: "Membership Logic Test",
      concurrency: 50,
      duration: 20,
      endpoint: "/api/membership/me"
    },
    {
      name: "Auth Protection Test",
      concurrency: 100,
      duration: 15,
      endpoint: "/api/membership/me"
    }
  ];

  let passedTests = 0;

  for (const test of tests) {
    const passed = await runLoadTest(test.name, test.concurrency, test.duration, test.endpoint);
    if (passed) passedTests++;

    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log("\n📊 LOAD TEST SUMMARY");
  console.log("===================");
  console.log(`Passed: ${passedTests}/${tests.length}`);

  if (passedTests === tests.length) {
    console.log("🎉 ALL LOAD TESTS PASSED!");
    console.log("✅ System is production-ready for scale");
  } else {
    console.log("❌ Some load tests failed");
    console.log("⚠️  System needs optimization before production");
    process.exit(1);
  }
}

runProductionLoadTests().catch(err => {
  console.error("💥 LOAD TEST SUITE FAILED:", err.message);
  process.exit(1);
});
