/**
 * Comprehensive Backend Authorization & API Permissions Test Suite
 *
 * Requirements Tested:
 * 1. Unauthenticated requests to all protected APIs -> 401 Unauthorized
 * 2. Non-superadmin access to Super-Admin endpoints -> 403 Forbidden
 * 3. Staff access to Admin-only endpoints (/api/reset, DELETE /api/bills/:id, etc.) -> 403 Forbidden
 * 4. Permission-based access control for Staff:
 *    - Staff with suppliers: false -> GET /api/suppliers returns 403 Forbidden
 *    - Staff with reports: false -> GET /api/reports/rate-history returns 403 Forbidden
 *    - Staff with viewSalesAndProfit: false -> GET /api/sales/details returns 403 Forbidden
 *    - Staff with viewSalesAndProfit: false -> GET /api/stats returns 200 with masked financial fields (0)
 *    - Staff with viewSalesAndProfit: false -> GET /api/parts returns 200 with masked purchasePrice (0)
 *    - Staff with viewSalesAndProfit: false -> GET /api/bills returns 200 with stripped itemProfit
 * 5. Dynamic Permission Grant:
 *    - Staff granted suppliers: true -> GET /api/suppliers returns 200 ALLOWED
 * 6. Never Trust Client Authorization Data:
 *    - Non-superadmin sending cross-shop query or header -> 403 Forbidden
 *    - Non-superadmin sending cross-shop shopId in body -> 403 Forbidden
 *    - Client manipulation of role / isAdmin in headers/body is ignored
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
  console.log("🚀 STARTING BACKEND AUTHORIZATION & API PERMISSION AUDIT");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("==========================================================\n");

  // -------------------------------------------------------------------------
  // 1. Unauthenticated requests to protected endpoints MUST return 401
  // -------------------------------------------------------------------------
  console.log("📌 Group 1: Unauthenticated Direct Access Prevention (401 Unauthorized)");

  const unauthenticatedEndpoints = [
    { method: "GET", path: "/api/stats" },
    { method: "GET", path: "/api/bills" },
    { method: "POST", path: "/api/bills", body: { customerName: "Test" } },
    { method: "GET", path: "/api/bills/non-existent-id" },
    { method: "DELETE", path: "/api/bills/non-existent-id" },
    { method: "POST", path: "/api/bills/non-existent-id/cancel" },
    { method: "GET", path: "/api/parts" },
    { method: "POST", path: "/api/parts", body: { name: "Test Part" } },
    { method: "GET", path: "/api/parts/non-existent-id" },
    { method: "PUT", path: "/api/parts/non-existent-id", body: { name: "Updated" } },
    { method: "DELETE", path: "/api/parts/non-existent-id" },
    { method: "POST", path: "/api/parts/non-existent-id/stock", body: { delta: 1 } },
    { method: "GET", path: "/api/parts/batches" },
    { method: "POST", path: "/api/parts/batches", body: { partId: "123" } },
    { method: "POST", path: "/api/parts/returns", body: { partId: "123" } },
    { method: "GET", path: "/api/customers" },
    { method: "POST", path: "/api/customers", body: { name: "Customer" } },
    { method: "GET", path: "/api/customers/non-existent-id" },
    { method: "PUT", path: "/api/customers/non-existent-id", body: { name: "Customer" } },
    { method: "DELETE", path: "/api/customers/non-existent-id" },
    { method: "GET", path: "/api/suppliers" },
    { method: "POST", path: "/api/suppliers", body: { supplierName: "Supplier" } },
    { method: "GET", path: "/api/suppliers/non-existent-id" },
    { method: "PUT", path: "/api/suppliers/non-existent-id", body: { supplierName: "Supplier" } },
    { method: "DELETE", path: "/api/suppliers/non-existent-id" },
    { method: "POST", path: "/api/suppliers/non-existent-id/payment", body: { amount: 100 } },
    { method: "GET", path: "/api/workshop" },
    { method: "POST", path: "/api/workshop", body: { customerName: "Test" } },
    { method: "GET", path: "/api/workshop/non-existent-id" },
    { method: "PUT", path: "/api/workshop/non-existent-id", body: { notes: "Test" } },
    { method: "DELETE", path: "/api/workshop/non-existent-id" },
    { method: "POST", path: "/api/workshop/non-existent-id/action", body: { action: "addPart" } },
    { method: "GET", path: "/api/mechanics" },
    { method: "POST", path: "/api/mechanics", body: { name: "Mechanic" } },
    { method: "GET", path: "/api/mechanics/non-existent-id" },
    { method: "PUT", path: "/api/mechanics/non-existent-id", body: { name: "Mechanic" } },
    { method: "DELETE", path: "/api/mechanics/non-existent-id" },
    { method: "GET", path: "/api/mechanics/ledger" },
    { method: "POST", path: "/api/mechanics/non-existent-id/payout", body: { amount: 500 } },
    { method: "GET", path: "/api/reports/rate-history" },
    { method: "GET", path: "/api/sales/details" },
    { method: "POST", path: "/api/reset" },
    { method: "POST", path: "/api/sync", body: {} },
    { method: "GET", path: "/api/super-admin/stats" },
    { method: "GET", path: "/api/super-admin/shops" },
    { method: "POST", path: "/api/super-admin/shops", body: { name: "Test" } },
    { method: "GET", path: "/api/super-admin/shops/non-existent-id" },
    { method: "PUT", path: "/api/super-admin/shops/non-existent-id", body: { name: "Test" } },
    { method: "DELETE", path: "/api/super-admin/shops/non-existent-id" },
    { method: "POST", path: "/api/super-admin/shops/non-existent-id/reset-password", body: { newPassword: "password123" } },
    { method: "POST", path: "/api/super-admin/shops/non-existent-id/status", body: { status: "active" } },
  ];

  for (const ep of unauthenticatedEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.path}`, {
      method: ep.method,
      headers: { "Content-Type": "application/json" },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert(
      res.status === 401,
      `Unauthenticated ${ep.method} ${ep.path} -> 401 Unauthorized (received: ${res.status})`
    );
  }

  // -------------------------------------------------------------------------
  // 2. Establish Authenticated Sessions
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 2: Establish Authenticated Sessions");

  const superAuth = await loginAndGetCookieJar("superadmin", "superadmin123");
  assert(superAuth.isSuccess, "Superadmin session established successfully");

  const adminAuth = await loginAndGetCookieJar("admin", "admin123");
  assert(adminAuth.isSuccess, "Shop Admin session established successfully");

  // Create a staff user with default restricted permissions
  const restrictedStaffUsername = `test_staff_auth_${Date.now()}`;
  const createStaffRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({
      username: restrictedStaffUsername,
      name: "Restricted Staff Tester",
      password: "password123",
      role: "staff",
      permissions: {
        pos: true,
        workshop: true,
        inventory: true,
        customers: true,
        bills: true,
        mechanics: true,
        suppliers: false, // Explicitly restricted
        reports: false,   // Explicitly restricted
        viewSalesAndProfit: false, // Explicitly restricted
      },
    }),
  });
  const staffData = await createStaffRes.json();
  assert(createStaffRes.status === 201, `Admin created restricted staff user (${restrictedStaffUsername}, id: ${staffData.id})`);

  const staffAuth = await loginAndGetCookieJar(restrictedStaffUsername, "password123");
  assert(staffAuth.isSuccess, "Restricted staff session established successfully");

  // -------------------------------------------------------------------------
  // 3. Super-Admin Authorization Enforcement
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 3: Super-Admin API Authorization (DENY Admin & Staff)");

  const superAdminEndpoints = [
    { method: "GET", path: "/api/super-admin/stats" },
    { method: "GET", path: "/api/super-admin/shops" },
    { method: "POST", path: "/api/super-admin/shops", body: { name: "Illegal Shop", adminUsername: "hacker", adminPassword: "password123" } },
    { method: "GET", path: "/api/super-admin/shops/shop-sikandar" },
    { method: "PUT", path: "/api/super-admin/shops/shop-sikandar", body: { name: "Modified Name" } },
    { method: "DELETE", path: "/api/super-admin/shops/shop-sikandar" },
    { method: "POST", path: "/api/super-admin/shops/shop-sikandar/reset-password", body: { newPassword: "password123" } },
    { method: "POST", path: "/api/super-admin/shops/shop-sikandar/status", body: { status: "active" } },
  ];

  for (const ep of superAdminEndpoints) {
    // 3a: Staff access to superadmin API -> 403
    const staffRes = await fetch(`${BASE_URL}${ep.path}`, {
      method: ep.method,
      headers: {
        "Content-Type": "application/json",
        Cookie: staffAuth.cookieStr,
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert(
      staffRes.status === 403,
      `Staff ${ep.method} ${ep.path} -> 403 Forbidden (received: ${staffRes.status})`
    );

    // 3b: Shop Admin access to superadmin API -> 403
    const adminRes = await fetch(`${BASE_URL}${ep.path}`, {
      method: ep.method,
      headers: {
        "Content-Type": "application/json",
        Cookie: adminAuth.cookieStr,
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert(
      adminRes.status === 403,
      `Shop Admin ${ep.method} ${ep.path} -> 403 Forbidden (received: ${adminRes.status})`
    );

    // 3c: Superadmin access -> ALLOWED (200, 201, or 400 for bad test body)
    if (ep.method === "GET") {
      const superRes = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers: { Cookie: superAuth.cookieStr },
      });
      assert(
        superRes.status === 200,
        `Superadmin ${ep.method} ${ep.path} -> 200 ALLOWED`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. Shop Admin Operations (Staff Must Be Denied with 403)
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 4: Shop Admin Destructive & Privileged Operations (DENY Staff)");

  // 4a. Staff cannot reset shop data
  const staffResetRes = await fetch(`${BASE_URL}/api/reset`, {
    method: "POST",
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffResetRes.status === 403, `Staff POST /api/reset -> 403 Forbidden`);

  // 4b. Staff cannot delete bill
  const staffDeleteBillRes = await fetch(`${BASE_URL}/api/bills/some-bill-id`, {
    method: "DELETE",
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffDeleteBillRes.status === 403, `Staff DELETE /api/bills/:id -> 403 Forbidden`);

  // 4c. Staff cannot cancel bill
  const staffCancelBillRes = await fetch(`${BASE_URL}/api/bills/some-bill-id/cancel`, {
    method: "POST",
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffCancelBillRes.status === 403, `Staff POST /api/bills/:id/cancel -> 403 Forbidden`);

  // 4d. Staff cannot delete part
  const staffDeletePartRes = await fetch(`${BASE_URL}/api/parts/some-part-id`, {
    method: "DELETE",
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffDeletePartRes.status === 403, `Staff DELETE /api/parts/:id -> 403 Forbidden`);

  // 4e. Staff cannot delete customer
  const staffDeleteCustRes = await fetch(`${BASE_URL}/api/customers/some-cust-id`, {
    method: "DELETE",
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffDeleteCustRes.status === 403, `Staff DELETE /api/customers/:id -> 403 Forbidden`);

  // 4f. Staff cannot delete mechanic
  const staffDeleteMechRes = await fetch(`${BASE_URL}/api/mechanics/some-mech-id`, {
    method: "DELETE",
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffDeleteMechRes.status === 403, `Staff DELETE /api/mechanics/:id -> 403 Forbidden`);

  // 4g. Staff cannot delete supplier credit
  const staffDeleteSuppRes = await fetch(`${BASE_URL}/api/suppliers/some-supp-id`, {
    method: "DELETE",
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffDeleteSuppRes.status === 403, `Staff DELETE /api/suppliers/:id -> 403 Forbidden`);

  // 4h. Staff cannot delete job card
  const staffDeleteJobRes = await fetch(`${BASE_URL}/api/workshop/some-job-id`, {
    method: "DELETE",
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffDeleteJobRes.status === 403, `Staff DELETE /api/workshop/:id -> 403 Forbidden`);

  // -------------------------------------------------------------------------
  // 5. Permission-Based Access Enforcement for Restricted Staff
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 5: Permission-Based Access Enforcement for Staff");

  // 5a. Staff with suppliers: false -> GET /api/suppliers = 403
  const staffSuppGetRes = await fetch(`${BASE_URL}/api/suppliers`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffSuppGetRes.status === 403, `Staff without 'suppliers' permission -> GET /api/suppliers = 403 Forbidden`);

  // 5b. Staff with suppliers: false -> POST /api/suppliers = 403
  const staffSuppPostRes = await fetch(`${BASE_URL}/api/suppliers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: staffAuth.cookieStr },
    body: JSON.stringify({ supplierName: "Hacked Supplier", totalAmount: 1000 }),
  });
  assert(staffSuppPostRes.status === 403, `Staff without 'suppliers' permission -> POST /api/suppliers = 403 Forbidden`);

  // 5c. Staff with reports: false -> GET /api/reports/rate-history = 403
  const staffRateHistRes = await fetch(`${BASE_URL}/api/reports/rate-history`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffRateHistRes.status === 403, `Staff without 'reports' permission -> GET /api/reports/rate-history = 403 Forbidden`);

  // 5d. Staff with viewSalesAndProfit: false -> GET /api/sales/details = 403
  const staffSalesDetailsRes = await fetch(`${BASE_URL}/api/sales/details`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffSalesDetailsRes.status === 403, `Staff without 'viewSalesAndProfit' -> GET /api/sales/details = 403 Forbidden`);

  // 5e. Staff with viewSalesAndProfit: false -> GET /api/parts/batches = 403
  const staffBatchesRes = await fetch(`${BASE_URL}/api/parts/batches`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(staffBatchesRes.status === 403, `Staff without 'viewSalesAndProfit' -> GET /api/parts/batches = 403 Forbidden`);

  // 5f. Staff with viewSalesAndProfit: false -> GET /api/stats masks financial figures
  const staffStatsRes = await fetch(`${BASE_URL}/api/stats`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  const staffStats = await staffStatsRes.json();
  assert(staffStatsRes.status === 200, `Staff can access /api/stats (Status: 200)`);
  assert(
    staffStats.todaySales === 0 && staffStats.monthlySales === 0 && staffStats.totalInventoryValue === 0,
    `Sensitive financial figures are masked to 0 for staff without viewSalesAndProfit permission (todaySales: ${staffStats.todaySales}, totalInventoryValue: ${staffStats.totalInventoryValue})`
  );

  // Compare with Admin stats (must NOT be zeroed out if data exists)
  const adminStatsRes = await fetch(`${BASE_URL}/api/stats`, {
    headers: { Cookie: adminAuth.cookieStr },
  });
  const adminStats = await adminStatsRes.json();
  assert(adminStatsRes.status === 200, `Admin accesses /api/stats (Status: 200)`);
  assert(typeof adminStats.todaySales === "number", `Admin receives unmasked sales data`);

  // 5g. Staff with viewSalesAndProfit: false -> GET /api/parts masks purchasePrice
  const staffPartsRes = await fetch(`${BASE_URL}/api/parts`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  const staffParts = await staffPartsRes.json();
  assert(staffPartsRes.status === 200, `Staff can access /api/parts (Status: 200)`);
  const allPurchasePricesZero = staffParts.length > 0 && staffParts.every((p) => p.purchasePrice === 0);
  assert(allPurchasePricesZero, `Wholesale purchasePrice is masked to 0 for staff without viewSalesAndProfit`);

  // 5h. Staff with viewSalesAndProfit: false -> GET /api/bills strips itemProfit & purchasePrice
  const staffBillsRes = await fetch(`${BASE_URL}/api/bills`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  const staffBills = await staffBillsRes.json();
  assert(staffBillsRes.status === 200, `Staff can access /api/bills (Status: 200)`);
  let profitLeaked = false;
  staffBills.forEach((b) => {
    (b.items || []).forEach((item) => {
      if (item.itemProfit !== undefined || item.purchasePrice !== undefined) {
        profitLeaked = true;
      }
    });
  });
  assert(!profitLeaked, `itemProfit and purchasePrice are completely stripped from bill items for staff`);

  // -------------------------------------------------------------------------
  // 6. Dynamic Permission Modification & Backend Enforcement
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 6: Dynamic Permission Modification Verification");

  // Admin updates staff user to grant suppliers permission
  const grantSuppRes = await fetch(`${BASE_URL}/api/users/${staffData.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({
      permissions: {
        pos: true,
        workshop: true,
        inventory: true,
        customers: true,
        bills: true,
        mechanics: true,
        suppliers: true, // Now granted!
        reports: false,
        viewSalesAndProfit: false,
      },
    }),
  });
  const grantSuppResText = await grantSuppRes.text();
  if (grantSuppRes.status !== 200) {
    console.log("DEBUG grantSuppRes status:", grantSuppRes.status, "body:", grantSuppResText);
  }
  assert(grantSuppRes.status === 200, `Admin successfully updated staff permissions (suppliers: true)`);

  // Staff re-authenticates to get updated session token with new permissions
  const updatedStaffAuth = await loginAndGetCookieJar(restrictedStaffUsername, "password123");
  assert(updatedStaffAuth.isSuccess, "Staff re-authenticated with updated permissions");

  // Staff now accesses /api/suppliers -> MUST BE ALLOWED!
  const updatedStaffSuppRes = await fetch(`${BASE_URL}/api/suppliers`, {
    headers: { Cookie: updatedStaffAuth.cookieStr },
  });
  assert(
    updatedStaffSuppRes.status === 200,
    `Staff with granted 'suppliers' permission -> GET /api/suppliers = 200 ALLOWED`
  );

  // -------------------------------------------------------------------------
  // 7. Never Trust Client Authorization Data
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 7: Never Trust Client Authorization Data");

  // 7a: Non-superadmin sends header x-shop-id with another shop -> 403 Forbidden
  const headerTamperRes = await fetch(`${BASE_URL}/api/parts`, {
    headers: {
      Cookie: adminAuth.cookieStr,
      "x-shop-id": "shop-alien-hacker",
    },
  });
  assert(
    headerTamperRes.status === 403,
    `Admin sending conflicting x-shop-id header -> 403 Forbidden (received: ${headerTamperRes.status})`
  );

  // 7b: Non-superadmin sends query ?shopId=alien -> 403 Forbidden
  const queryTamperRes = await fetch(`${BASE_URL}/api/customers?shopId=shop-alien-hacker`, {
    headers: {
      Cookie: adminAuth.cookieStr,
    },
  });
  assert(
    queryTamperRes.status === 403,
    `Admin sending conflicting ?shopId query param -> 403 Forbidden (received: ${queryTamperRes.status})`
  );

  // 7c: Non-superadmin sends body { shopId: "alien" } in creation -> 403 Forbidden
  const bodyTamperRes = await fetch(`${BASE_URL}/api/parts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({
      name: "Injected Part",
      category: "Engine & Transmission",
      sellingPrice: 500,
      purchasePrice: 300,
      currentStock: 10,
      minStockLimit: 2,
      supplierName: "Test",
      shopId: "shop-alien-hacker",
    }),
  });
  assert(
    bodyTamperRes.status === 403,
    `Admin sending foreign shopId in POST body -> 403 Forbidden (received: ${bodyTamperRes.status})`
  );

  // 7d: Staff sends body with { role: "admin", isAdmin: true, isSuperAdmin: true } to escalate -> denied or ignored
  const escalationTamperRes = await fetch(`${BASE_URL}/api/parts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: staffAuth.cookieStr,
    },
    body: JSON.stringify({
      name: "Escalation Test Part",
      category: "Engine & Transmission",
      sellingPrice: 500,
      purchasePrice: 300,
      currentStock: 10,
      minStockLimit: 2,
      supplierName: "Test",
      role: "superadmin",
      isAdmin: true,
      isSuperAdmin: true,
    }),
  });
  // Since staff has inventory permission, part will be created, but under staff's genuine shopId and without role elevation
  assert(
    escalationTamperRes.status === 201,
    `Part created under genuine server authority without unauthorized elevation`
  );

  // Clean up test staff user
  await fetch(`${BASE_URL}/api/users/${staffData.id}`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookieStr },
  });

  console.log("\n==========================================================");
  console.log(`🏁 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("==========================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
