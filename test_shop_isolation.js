/**
 * Comprehensive Shop / Tenant Isolation & User CRUD Authorization Test Suite
 *
 * Requirements Verified:
 * 1. Shop Isolation:
 *    - Shop A admin -> Shop A user update = ALLOW (PASS)
 *    - Shop A admin -> Shop B user update = DENY (404/403)
 *    - Shop A admin -> Shop A user delete = ALLOW (PASS)
 *    - Shop A admin -> Shop B user delete = DENY (404/403)
 *    - Shop A admin -> arbitrary user ID = DENY (404)
 * 2. Shop Creation / Manipulation Prevention:
 *    - Shop A admin request with Shop B's shopId = DENY (403)
 *    - Shop A admin user ko doosri shop mein move karne ki koshish kare = DENY (403)
 * 3. Role Escalation Prevention:
 *    - Shop admin -> superadmin create = DENY (403)
 *    - Shop admin -> existing user ko superadmin promote = DENY (403)
 *    - Shop admin -> unauthorized platform role assign = DENY (403)
 * 4. Superadmin Platform Operations:
 *    - Superadmin -> intended authorized operations = ALLOW (PASS)
 * 5. Source Code Hardening:
 *    - Zero unscoped fallback queries in updateUserForShop and deleteShopUser
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function loginAndGetCookieJar(username, password) {
  const cookieMap = {};

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie() : [csrfRes.headers.get("set-cookie")];

  csrfCookies.forEach((c) => {
    if (!c) return;
    const first = c.split(";")[0].trim();
    const [k, v] = first.split("=");
    if (k && v) cookieMap[k] = v;
  });

  const cookieHeader = Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    body: new URLSearchParams({
      csrfToken,
      username,
      password,
      json: "true",
    }),
  });

  const loginCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")];
  loginCookies.forEach((c) => {
    if (!c) return;
    const first = c.split(";")[0].trim();
    const [k, v] = first.split("=");
    if (k && v) cookieMap[k] = v;
  });

  const authCookieStr = Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  const data = await res.json().catch(() => ({}));
  const isSuccess = res.status === 200 && data.url && !data.url.includes("error=CredentialsSignin");

  return { status: res.status, data, isSuccess, cookieStr: authCookieStr };
}

async function runTests() {
  console.log("==========================================================");
  console.log("🚀 STARTING SHOP / TENANT ISOLATION & USER CRUD AUDIT");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("==========================================================\n");

  // Step 1: Establish Sessions
  console.log("📌 Step 1: Establish Authenticated Sessions for Multi-Tenant Testing");

  // 1a. Superadmin
  const superAuth = await loginAndGetCookieJar("superadmin", "superadmin123");
  assert(superAuth.isSuccess, "Superadmin session established successfully");

  // 1b. Shop A Admin (default shop: shop-default)
  const shopAAuth = await loginAndGetCookieJar("admin", "admin123");
  assert(shopAAuth.isSuccess, "Shop A Admin ('admin') session established successfully");

  // 1c. Provision Shop B via Superadmin if not already present
  const shopBName = "Shop B Test Enterprise";
  const shopBAdminUsername = `shopb_admin_${Date.now()}`;
  const shopBAdminPassword = "password123";

  const createShopBRes = await fetch(`${BASE_URL}/api/super-admin/shops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAuth.cookieStr,
    },
    body: JSON.stringify({
      name: shopBName,
      adminUsername: shopBAdminUsername,
      adminPassword: shopBAdminPassword,
      seedSampleParts: false,
    }),
  });

  let shopBData = await createShopBRes.json();
  const shopBId = shopBData?.shop?.id || shopBData?.id || "shop-b-test";
  assert(
    createShopBRes.status === 201 || createShopBRes.status === 200,
    `Shop B created by Superadmin with id: ${shopBId}`
  );

  // 1d. Authenticate as Shop B Admin
  const shopBAuth = await loginAndGetCookieJar(shopBAdminUsername, shopBAdminPassword);
  assert(shopBAuth.isSuccess, `Shop B Admin ('${shopBAdminUsername}') session established successfully`);

  // 1e. Create a staff user in Shop A
  const shopAStaffUsername = `shopa_staff_${Date.now()}`;
  const createShopAStaffRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAuth.cookieStr,
    },
    body: JSON.stringify({
      username: shopAStaffUsername,
      name: "Shop A Staff Member",
      password: "password123",
      role: "staff",
    }),
  });
  const shopAStaff = await createShopAStaffRes.json();
  assert(createShopAStaffRes.status === 201, `Shop A Admin creates user in Shop A ('${shopAStaffUsername}', ID: ${shopAStaff.id})`);

  // 1f. Create a staff user in Shop B
  const shopBStaffUsername = `shopb_staff_${Date.now()}`;
  const createShopBStaffRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopBAuth.cookieStr,
    },
    body: JSON.stringify({
      username: shopBStaffUsername,
      name: "Shop B Staff Member",
      password: "password123",
      role: "staff",
    }),
  });
  const shopBStaff = await createShopBStaffRes.json();
  assert(createShopBStaffRes.status === 201, `Shop B Admin creates user in Shop B ('${shopBStaffUsername}', ID: ${shopBStaff.id})`);

  // -------------------------------------------------------------------------
  // Group 2: Shop Isolation (Update & Delete)
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 2: Shop Isolation Verification (ALLOW Own, DENY Cross-Shop)");

  // 2a: Shop A admin -> Shop A user update = PASS
  {
    const updateOwnRes = await fetch(`${BASE_URL}/api/users/${shopAStaff.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        name: "Shop A Staff Updated Successfully",
      }),
    });
    const updateOwnData = await updateOwnRes.json();
    assert(
      updateOwnRes.status === 200 && updateOwnData.name === "Shop A Staff Updated Successfully",
      `Shop A admin -> Shop A user update = ALLOW / PASS (Status: ${updateOwnRes.status})`
    );
  }

  // 2b: Shop A admin -> Shop B user update = DENY
  {
    const attackCrossUpdateRes = await fetch(`${BASE_URL}/api/users/${shopBStaff.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        name: "HACKED_BY_SHOP_A_ADMIN",
      }),
    });
    const attackCrossData = await attackCrossUpdateRes.json();
    assert(
      attackCrossUpdateRes.status === 404 || attackCrossUpdateRes.status === 403,
      `Shop A admin -> Shop B user update = DENY (Status: ${attackCrossUpdateRes.status}, Error: "${attackCrossData.error}")`
    );

    // Verify Shop B user's name was NOT modified
    const shopBUsersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Cookie: shopBAuth.cookieStr },
    });
    const shopBUsers = await shopBUsersRes.json();
    const preservedUser = shopBUsers.find((u) => u.id === shopBStaff.id);
    assert(
      preservedUser && preservedUser.name !== "HACKED_BY_SHOP_A_ADMIN",
      "Integrity verified: Shop B user's data was NOT altered by Shop A admin"
    );
  }

  // 2c: Shop A admin -> arbitrary non-existent user ID update = DENY
  {
    const arbitraryUpdateRes = await fetch(`${BASE_URL}/api/users/arbitrary_non_existent_id_99999`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        name: "Arbitrary ID User",
      }),
    });
    assert(
      arbitraryUpdateRes.status === 404 || arbitraryUpdateRes.status === 403,
      `Shop A admin -> arbitrary user ID update = DENY (Status: ${arbitraryUpdateRes.status})`
    );
  }

  // 2d: Shop A admin -> Shop B user delete = DENY
  {
    const attackCrossDeleteRes = await fetch(`${BASE_URL}/api/users/${shopBStaff.id}`, {
      method: "DELETE",
      headers: {
        Cookie: shopAAuth.cookieStr,
      },
    });
    const attackCrossDeleteData = await attackCrossDeleteRes.json();
    assert(
      attackCrossDeleteRes.status === 404 || attackCrossDeleteRes.status === 403,
      `Shop A admin -> Shop B user delete = DENY (Status: ${attackCrossDeleteRes.status}, Error: "${attackCrossDeleteData.error}")`
    );

    // Verify Shop B user still exists in Shop B!
    const shopBUsersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Cookie: shopBAuth.cookieStr },
    });
    const shopBUsers = await shopBUsersRes.json();
    const stillExists = shopBUsers.some((u) => u.id === shopBStaff.id);
    assert(stillExists, "Integrity verified: Shop B user was NOT deleted by Shop A admin");
  }

  // 2e: Shop A admin -> arbitrary non-existent user ID delete = DENY
  {
    const arbitraryDeleteRes = await fetch(`${BASE_URL}/api/users/arbitrary_non_existent_id_99999`, {
      method: "DELETE",
      headers: {
        Cookie: shopAAuth.cookieStr,
      },
    });
    assert(
      arbitraryDeleteRes.status === 404 || arbitraryDeleteRes.status === 403,
      `Shop A admin -> arbitrary user ID delete = DENY (Status: ${arbitraryDeleteRes.status})`
    );
  }

  // 2f: Shop A admin -> Shop A user delete = PASS
  {
    // Create a disposable user in Shop A
    const disposableUsername = `shopa_del_${Date.now()}`;
    const createDispRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        username: disposableUsername,
        name: "Disposable User",
        password: "password123",
        role: "staff",
      }),
    });
    const dispUser = await createDispRes.json();

    const deleteOwnRes = await fetch(`${BASE_URL}/api/users/${dispUser.id}`, {
      method: "DELETE",
      headers: {
        Cookie: shopAAuth.cookieStr,
      },
    });
    const deleteOwnData = await deleteOwnRes.json();
    assert(
      deleteOwnRes.status === 200 && deleteOwnData.success,
      `Shop A admin -> Shop A user delete = ALLOW / PASS (Status: ${deleteOwnRes.status})`
    );
  }

  // -------------------------------------------------------------------------
  // Group 3: Shop Creation & Manipulation Prevention
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 3: Cross-Shop Injection & Manipulation Prevention");

  // 3a: Shop A admin request mein Shop B ka shopId bheje (Creation) -> DENY
  {
    const crossShopCreateRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        username: `injected_user_${Date.now()}`,
        name: "Injected Shop B User",
        password: "password123",
        role: "staff",
        shopId: shopBId, // Injecting Shop B's ID!
      }),
    });
    const crossShopCreateData = await crossShopCreateRes.json();
    assert(
      crossShopCreateRes.status === 403,
      `Shop A admin sends Shop B's shopId in creation payload -> DENY (Status: ${crossShopCreateRes.status}, Error: "${crossShopCreateData.error}")`
    );
  }

  // 3b: Shop A admin request mein query parameter ?shopId=ShopB bheje (Creation) -> DENY
  {
    const queryShopCreateRes = await fetch(`${BASE_URL}/api/users?shopId=${shopBId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        username: `query_injected_${Date.now()}`,
        name: "Query Injected User",
        password: "password123",
        role: "staff",
      }),
    });
    const queryShopCreateData = await queryShopCreateRes.json();
    assert(
      queryShopCreateRes.status === 403,
      `Shop A admin sends ?shopId=ShopB in creation URL -> DENY (Status: ${queryShopCreateRes.status})`
    );
  }

  // 3c: Shop A admin user ko doosri shop mein move karne ki koshish kare (Update) -> DENY
  {
    const moveUserRes = await fetch(`${BASE_URL}/api/users/${shopAStaff.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        shopId: shopBId, // Attempt to move Shop A user to Shop B!
      }),
    });
    const moveUserData = await moveUserRes.json();
    assert(
      moveUserRes.status === 403,
      `Shop A admin attempts to move user to another shop via shopId in PUT -> DENY (Status: ${moveUserRes.status}, Error: "${moveUserData.error}")`
    );
  }

  // -------------------------------------------------------------------------
  // Group 4: Role Escalation Prevention
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 4: Role Escalation Prevention");

  // 4a: Shop admin -> superadmin create = DENY
  {
    const createSuperadminRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        username: `fake_super_${Date.now()}`,
        name: "Fake Super Admin",
        password: "password123",
        role: "superadmin", // Escalation attempt!
      }),
    });
    const createSuperadminData = await createSuperadminRes.json();
    assert(
      createSuperadminRes.status === 403,
      `Shop admin creates user with role='superadmin' -> DENY (Status: ${createSuperadminRes.status}, Error: "${createSuperadminData.error}")`
    );
  }

  // 4b: Shop admin -> existing user ko superadmin promote = DENY
  {
    const promoteSuperadminRes = await fetch(`${BASE_URL}/api/users/${shopAStaff.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        role: "superadmin", // Escalation attempt!
      }),
    });
    const promoteSuperadminData = await promoteSuperadminRes.json();
    assert(
      promoteSuperadminRes.status === 403,
      `Shop admin promotes existing user to 'superadmin' -> DENY (Status: ${promoteSuperadminRes.status}, Error: "${promoteSuperadminData.error}")`
    );
  }

  // 4c: Shop admin -> unauthorized platform role assign = DENY
  {
    const unauthorizedRoleCreateRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        username: `hacker_role_${Date.now()}`,
        name: "Hacker Role",
        password: "password123",
        role: "root_system_admin", // Arbitrary role!
      }),
    });
    assert(
      unauthorizedRoleCreateRes.status === 403,
      `Shop admin assigns arbitrary role 'root_system_admin' in create -> DENY (Status: ${unauthorizedRoleCreateRes.status})`
    );

    const unauthorizedRoleUpdateRes = await fetch(`${BASE_URL}/api/users/${shopAStaff.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAuth.cookieStr,
      },
      body: JSON.stringify({
        role: "platform_manager",
      }),
    });
    assert(
      unauthorizedRoleUpdateRes.status === 403,
      `Shop admin assigns arbitrary role 'platform_manager' in update -> DENY (Status: ${unauthorizedRoleUpdateRes.status})`
    );
  }

  // -------------------------------------------------------------------------
  // Group 5: Superadmin Authorized Platform Operations
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 5: Superadmin Authorized Platform Operations");

  // 5a: Superadmin -> intended authorized create in Shop B = ALLOW
  let superCreatedUser;
  {
    const superCreateRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: superAuth.cookieStr,
      },
      body: JSON.stringify({
        username: `super_managed_${Date.now()}`,
        name: "Super Managed Staff",
        password: "password123",
        role: "staff",
        shopId: shopBId,
      }),
    });
    superCreatedUser = await superCreateRes.json();
    assert(
      superCreateRes.status === 201 && superCreatedUser.shopId === shopBId,
      `Superadmin creates user in target Shop B = ALLOW (Status: ${superCreateRes.status})`
    );
  }

  // 5b: Superadmin -> intended authorized update = ALLOW
  {
    const superUpdateRes = await fetch(`${BASE_URL}/api/users/${superCreatedUser.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: superAuth.cookieStr,
      },
      body: JSON.stringify({
        name: "Super Managed Staff (Name Modified by Superadmin)",
        shopId: shopBId,
      }),
    });
    const superUpdateData = await superUpdateRes.json();
    assert(
      superUpdateRes.status === 200 && superUpdateData.name.includes("Modified by Superadmin"),
      `Superadmin updates user in Shop B = ALLOW (Status: ${superUpdateRes.status})`
    );
  }

  // 5c: Superadmin -> intended authorized delete = ALLOW
  {
    const superDeleteRes = await fetch(`${BASE_URL}/api/users/${superCreatedUser.id}?shopId=${shopBId}`, {
      method: "DELETE",
      headers: {
        Cookie: superAuth.cookieStr,
      },
    });
    const superDeleteData = await superDeleteRes.json();
    assert(
      superDeleteRes.status === 200 && superDeleteData.success,
      `Superadmin deletes user in Shop B = ALLOW (Status: ${superDeleteRes.status})`
    );
  }

  // -------------------------------------------------------------------------
  // Group 6: Static Codebase Security Inspection
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 6: Static Codebase Security Inspection");
  {
    const dbCode = fs.readFileSync(path.join(__dirname, "src/lib/server/db.ts"), "utf8");

    // Critical check: Unscoped fallback completely removed
    const hasUnscopedFallback = dbCode.includes('|| (await db.collection("users").findOne({ $or: idConditions }))');
    assert(
      !hasUnscopedFallback,
      "Vulnerability eliminated: No unscoped '|| findOne({ $or: idConditions })' fallback exists in db.ts"
    );

    // Critical check: Memory store scoping
    assert(
      dbCode.includes("matchesShop(u.shopId, shopId)"),
      "Memory store queries strictly enforce matchesShop(u.shopId, shopId)"
    );

    // Critical check: Zero-trust client-controlled shopId in routes
    const userRouteCode = fs.readFileSync(path.join(__dirname, "src/app/api/users/route.ts"), "utf8");
    const userIdRouteCode = fs.readFileSync(path.join(__dirname, "src/app/api/users/[id]/route.ts"), "utf8");

    assert(
      userRouteCode.includes("requestedShopId && requestedShopId !== authorizedShopId"),
      "POST /api/users rejects client-supplied cross-shop shopId"
    );

    assert(
      userIdRouteCode.includes("requestedShopId && requestedShopId !== authorizedShopId"),
      "PUT /api/users/:id rejects client-supplied cross-shop shopId"
    );

    assert(
      userRouteCode.includes('targetRole === "superadmin"') &&
      userIdRouteCode.includes('body.role === "superadmin"'),
      "Both user routes reject role escalation to 'superadmin'"
    );
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(`🏁 SHOP ISOLATION TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("==========================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
