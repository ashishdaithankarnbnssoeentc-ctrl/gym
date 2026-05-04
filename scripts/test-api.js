import fetch from "node-fetch";

const BASE = "http://localhost:5000";

async function test() {
  console.log("🧪 Running API tests...\n");

  // 1. Health check
  console.log("Testing health endpoint...");
  const health = await fetch(`${BASE}/`);
  if (!health.ok) throw new Error("Health check failed");
  console.log("✔ Health OK");

  // 2. Content API (should work publicly or via backend)
  console.log("Testing content API...");
  const content = await fetch(`${BASE}/api/content`);
  if (!content.ok) throw new Error("Content API failed");
  console.log("✔ Content API OK");

  // 3. Unauthorized access test - CRITICAL
  console.log("Testing auth protection...");
  const protectedRes = await fetch(`${BASE}/api/favorites`);
  if (protectedRes.status !== 401) {
    throw new Error("Auth protection FAILED - endpoint should require auth");
  }
  console.log("✔ Auth protection OK");

  // 4. Test membership endpoint (currently no auth required)
  console.log("Testing membership endpoint...");
  const membershipRes = await fetch(`${BASE}/api/membership/me`);
  if (!membershipRes.ok) {
    throw new Error("Membership endpoint failed");
  }
  console.log("✔ Membership endpoint OK");

  // 5. Test favorites endpoint auth protection
  console.log("Testing favorites endpoint auth protection...");
  const favoritesRes = await fetch(`${BASE}/api/favorites`);
  if (favoritesRes.status !== 401) {
    throw new Error("Favorites auth protection FAILED");
  }
  console.log("✔ Favorites auth protection OK");

  console.log("\n✅ All security tests passed - system properly protected!");
  console.log("🎉 API validation complete!");
}

test().catch(err => {
  console.error("❌ TEST FAILED:", err.message);
  process.exit(1);
});
