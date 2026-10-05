/**
 * Step 6 — Shop Isolation & Multi-Tenant Security Verification Test Suite
 *
 * Requirements Verified:
 * Step 2 tenant isolation preservation:
 * A user authorized for Shop A must NEVER access Shop B resources even if:
 * 1. Resource ID is changed (IDOR / BOLA attacks)
 * 2. shopId is changed (query, headers, body tampering)
 * 3. Query parameter is changed (?shopId, ?tenantId, ?shop, ?tenant)
 * 4. Request body is changed (shopId, fake role, fake permissions)
 * 5. Headers are manipulated (x-shop-id, x-tenant-id, x-shop, shop-id, tenant-id)
 *
 * Permission Categories Audited Across ALL Sensitive Endpoint Groups:
 * 1. Unauthenticated request -> 401 Unauthorized
 * 2. Authorized user -> 200 OK / 201 Created
 * 3. Unauthorized staff -> 403 Forbidden
 * 4. Direct API request -> Still blocked (Server API enforcement)
 * 5. Fake role in request body -> Blocked (403 Forbidden)
 * 6. Fake permissions in request -> Blocked (403 Forbidden)
 * 7. Fake shopId (query / header / body) -> Blocked (403 Forbidden)
 * 8. Cross-shop resource ID -> Blocked (404 Not Found / 400 Bad Request)
 * 9. Frontend route guard -> Server middleware redirect to /login or /
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
  console.log("================================================================================");
  console.log("🔒 STEP 6: COMPREHENSIVE SHOP ISOLATION & MULTI-TENANT AUDIT TEST SUITE");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("================================================================================\n");

  // -------------------------------------------------------------------------
  // 0. Establish Authenticated Personas for Shop A, Shop B, Staff, and Superadmin
  // -------------------------------------------------------------------------
  console.log("📌 Step 0: Setup Personas & Multi-Tenant Test Environment");

  // 0a. Superadmin
  const superAuth = await loginAndGetCookieJar("superadmin", "superadmin123");
  assert(superAuth.isSuccess, "Superadmin session established");

  // 0b. Shop A Admin (Shop: default / primary)
  const shopAAdminAuth = await loginAndGetCookieJar("admin", "admin123");
  assert(shopAAdminAuth.isSuccess, "Shop A Admin session established");

  // 0c. Provision Shop B via Superadmin API
  const shopBAdminUsername = `shopb_step6_admin_${Date.now()}`;
  const createShopBRes = await fetch(`${BASE_URL}/api/super-admin/shops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAuth.cookieStr,
    },
    body: JSON.stringify({
      name: "Shop B Isolation Target Store",
      ownerName: "Shop B Target Owner",
      adminUsername: shopBAdminUsername,
      adminPassword: "password123",
      seedSampleParts: false,
    }),
  });
  const shopBData = await createShopBRes.json();
  const shopBId = shopBData?.shop?.id || shopBData?.id || `shop-b-${Date.now()}`;
  assert(createShopBRes.status === 201 || createShopBRes.status === 200, `Shop B provisioned with id: ${shopBId}`);

  const shopBAdminAuth = await loginAndGetCookieJar(shopBAdminUsername, "password123");
  assert(shopBAdminAuth.isSuccess, "Shop B Admin session established");

  // 0d. Create Staff in Shop A (restricted: only POS allowed, no suppliers/reports/inventory management)
  const shopAStaffUsername = `staff_step6_a_${Date.now()}`;
  const createShopAStaffRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      username: shopAStaffUsername,
      name: "Shop A Restricted Staff",
      password: "password123",
      role: "staff",
      permissions: {
        pos: true,
        bills: true,
        inventory: false,
        customers: false,
        mechanics: false,
        workshop: false,
        suppliers: false,
        reports: false,
        viewSalesAndProfit: false,
      },
    }),
  });
  const shopAStaffData = await createShopAStaffRes.json();
  assert(createShopAStaffRes.status === 201, `Shop A Restricted Staff created (id: ${shopAStaffData.id})`);

  const shopAStaffAuth = await loginAndGetCookieJar(shopAStaffUsername, "password123");
  assert(shopAStaffAuth.isSuccess, "Shop A Staff session established");

  // 0e. Seed Target Resources in Shop B for IDOR / cross-shop tampering checks
  console.log("\n📌 Step 0b: Provision Sample Resources inside Shop B (Victim Shop)");

  // Part in Shop B
  const createPartBRes = await fetch(`${BASE_URL}/api/parts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopBAdminAuth.cookieStr },
    body: JSON.stringify({
      name: "Shop B Protected Piston",
      category: "Engine & Transmission",
      sellingPrice: 1800,
      purchasePrice: 1100,
      currentStock: 30,
      supplierName: "Shop B Direct Parts",
    }),
  });
  const partB = await createPartBRes.json();
  assert(createPartBRes.status === 201, `Part created in Shop B (id: ${partB.id})`);

  // Customer in Shop B
  const createCustBRes = await fetch(`${BASE_URL}/api/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopBAdminAuth.cookieStr },
    body: JSON.stringify({
      name: "Shop B Private Customer",
      phone: "0300-8888888",
      bikeRegNumber: "KHI-1111",
      bikeModel: "Yamaha YBR 125",
    }),
  });
  const custB = await createCustBRes.json();
  assert(createCustBRes.status === 201, `Customer created in Shop B (id: ${custB.id})`);

  // Bill in Shop B
  const createBillBRes = await fetch(`${BASE_URL}/api/bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopBAdminAuth.cookieStr },
    body: JSON.stringify({
      customerName: "Shop B Private Walk-in",
      items: [
        {
          partId: partB.id,
          partName: partB.name,
          category: partB.category,
          quantity: 1,
          unitPrice: 1800,
          purchasePrice: 1100,
          totalPrice: 1800,
        },
      ],
      subtotal: 1800,
      grandTotal: 1800,
      paidAmount: 1800,
      paymentMethod: "Cash",
    }),
  });
  const billB = await createBillBRes.json();
  assert(createBillBRes.status === 201, `Bill created in Shop B (id: ${billB.id})`);

  // Mechanic in Shop B
  const createMechBRes = await fetch(`${BASE_URL}/api/mechanics`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopBAdminAuth.cookieStr },
    body: JSON.stringify({
      name: "Shop B Chief Mechanic",
      phone: "0321-7777777",
      specialty: "Wiring & Electrical",
      defaultShopCutPercentage: 35,
    }),
  });
  const mechB = await createMechBRes.json();
  assert(createMechBRes.status === 201, `Mechanic created in Shop B (id: ${mechB.id})`);

  // Workshop Job in Shop B
  const createJobBRes = await fetch(`${BASE_URL}/api/workshop`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopBAdminAuth.cookieStr },
    body: JSON.stringify({
      bayNumber: 1,
      customerName: "Shop B Private Job Client",
      bikeRegNumber: "RAW-4444",
      bikeModel: "Honda CD 70",
    }),
  });
  const jobB = await createJobBRes.json();
  assert(createJobBRes.status === 201, `Job card created in Shop B (id: ${jobB.id})`);

  // Supplier Credit in Shop B
  const createSuppBRes = await fetch(`${BASE_URL}/api/suppliers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopBAdminAuth.cookieStr },
    body: JSON.stringify({
      supplierName: "Shop B Confidential Supplier",
      totalAmount: 25000,
      paidAmount: 5000,
      notes: "Private Supplier Credit",
    }),
  });
  const suppB = await createSuppBRes.json();
  assert(createSuppBRes.status === 201, `Supplier Credit created in Shop B (id: ${suppB.id})`);

  // -------------------------------------------------------------------------
  // 1. UNAUTHENTICATED REQUESTS -> 401 UNAUTHORIZED
  // -------------------------------------------------------------------------
  console.log("\n📌 Category 1: Unauthenticated Requests to All Sensitive Endpoints -> 401 Unauthorized");
  const unauthEndpoints = [
    { method: "GET", path: "/api/parts" },
    { method: "POST", path: "/api/parts" },
    { method: "GET", path: `/api/parts/${partB.id}` },
    { method: "PUT", path: `/api/parts/${partB.id}` },
    { method: "DELETE", path: `/api/parts/${partB.id}` },
    { method: "GET", path: "/api/bills" },
    { method: "POST", path: "/api/bills" },
    { method: "GET", path: `/api/bills/${billB.id}` },
    { method: "DELETE", path: `/api/bills/${billB.id}` },
    { method: "POST", path: `/api/bills/${billB.id}/cancel` },
    { method: "GET", path: "/api/customers" },
    { method: "POST", path: "/api/customers" },
    { method: "GET", path: `/api/customers/${custB.id}` },
    { method: "PUT", path: `/api/customers/${custB.id}` },
    { method: "DELETE", path: `/api/customers/${custB.id}` },
    { method: "GET", path: "/api/mechanics" },
    { method: "POST", path: "/api/mechanics" },
    { method: "GET", path: `/api/mechanics/${mechB.id}` },
    { method: "PUT", path: `/api/mechanics/${mechB.id}` },
    { method: "DELETE", path: `/api/mechanics/${mechB.id}` },
    { method: "GET", path: "/api/mechanics/ledger" },
    { method: "POST", path: `/api/mechanics/${mechB.id}/payout` },
    { method: "GET", path: "/api/workshop" },
    { method: "POST", path: "/api/workshop" },
    { method: "GET", path: `/api/workshop/${jobB.id}` },
    { method: "PUT", path: `/api/workshop/${jobB.id}` },
    { method: "DELETE", path: `/api/workshop/${jobB.id}` },
    { method: "POST", path: `/api/workshop/${jobB.id}/action` },
    { method: "GET", path: "/api/suppliers" },
    { method: "POST", path: "/api/suppliers" },
    { method: "GET", path: `/api/suppliers/${suppB.id}` },
    { method: "PUT", path: `/api/suppliers/${suppB.id}` },
    { method: "DELETE", path: `/api/suppliers/${suppB.id}` },
    { method: "POST", path: `/api/suppliers/${suppB.id}/payment` },
    { method: "GET", path: "/api/reports/rate-history" },
    { method: "GET", path: "/api/sales/details" },
    { method: "GET", path: "/api/stats" },
    { method: "GET", path: "/api/users" },
    { method: "POST", path: "/api/users" },
    { method: "POST", path: "/api/reset" },
    { method: "POST", path: "/api/sync" },
    { method: "GET", path: "/api/super-admin/shops" },
    { method: "GET", path: "/api/super-admin/stats" },
  ];

  for (const ep of unauthEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.path}`, { method: ep.method });
    assert(res.status === 401, `Unauthenticated ${ep.method} ${ep.path} -> 401 Unauthorized (got: ${res.status})`);
  }

  // -------------------------------------------------------------------------
  // 2. AUTHORIZED USER -> 200/201 ALLOWED ON OWN SHOP
  // -------------------------------------------------------------------------
  console.log("\n📌 Category 2: Authorized Shop User Allowed on Own Resources");
  {
    const ownPartsRes = await fetch(`${BASE_URL}/api/parts`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
    assert(ownPartsRes.status === 200, "Shop A Admin GET /api/parts -> 200 OK");

    const ownBillsRes = await fetch(`${BASE_URL}/api/bills`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
    assert(ownBillsRes.status === 200, "Shop A Admin GET /api/bills -> 200 OK");

    const ownCustsRes = await fetch(`${BASE_URL}/api/customers`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
    assert(ownCustsRes.status === 200, "Shop A Admin GET /api/customers -> 200 OK");

    const ownMechsRes = await fetch(`${BASE_URL}/api/mechanics`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
    assert(ownMechsRes.status === 200, "Shop A Admin GET /api/mechanics -> 200 OK");

    const ownWorkshopRes = await fetch(`${BASE_URL}/api/workshop`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
    assert(ownWorkshopRes.status === 200, "Shop A Admin GET /api/workshop -> 200 OK");

    const ownSuppliersRes = await fetch(`${BASE_URL}/api/suppliers`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
    assert(ownSuppliersRes.status === 200, "Shop A Admin GET /api/suppliers -> 200 OK");

    const ownStatsRes = await fetch(`${BASE_URL}/api/stats`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
    assert(ownStatsRes.status === 200, "Shop A Admin GET /api/stats -> 200 OK");

    const ownUsersRes = await fetch(`${BASE_URL}/api/users`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
    assert(ownUsersRes.status === 200, "Shop A Admin GET /api/users -> 200 OK");
  }

  // -------------------------------------------------------------------------
  // 3. UNAUTHORIZED STAFF -> 403 FORBIDDEN
  // -------------------------------------------------------------------------
  console.log("\n📌 Category 3: Unauthorized Staff Rejected on Sensitive Restricted APIs -> 403 Forbidden");
  {
    // Staff lacks inventory permission
    const staffPostPart = await fetch(`${BASE_URL}/api/parts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: shopAStaffAuth.cookieStr },
      body: JSON.stringify({ name: "Illegal Part", category: "Engine", sellingPrice: 500, purchasePrice: 300, currentStock: 10 }),
    });
    assert(staffPostPart.status === 403, `Staff without inventory POST /api/parts -> 403 Forbidden (got: ${staffPostPart.status})`);

    // Staff lacks suppliers permission
    const staffSuppliers = await fetch(`${BASE_URL}/api/suppliers`, { headers: { Cookie: shopAStaffAuth.cookieStr } });
    assert(staffSuppliers.status === 403, `Staff without suppliers GET /api/suppliers -> 403 Forbidden (got: ${staffSuppliers.status})`);

    // Staff lacks reports permission
    const staffReports = await fetch(`${BASE_URL}/api/reports/rate-history`, { headers: { Cookie: shopAStaffAuth.cookieStr } });
    assert(staffReports.status === 403, `Staff without reports GET /api/reports/rate-history -> 403 Forbidden (got: ${staffReports.status})`);

    // Staff lacks viewSalesAndProfit permission
    const staffSalesDetails = await fetch(`${BASE_URL}/api/sales/details`, { headers: { Cookie: shopAStaffAuth.cookieStr } });
    assert(staffSalesDetails.status === 403, `Staff without viewSalesAndProfit GET /api/sales/details -> 403 Forbidden (got: ${staffSalesDetails.status})`);

    // Staff calls admin-only reset endpoint
    const staffReset = await fetch(`${BASE_URL}/api/reset`, { method: "POST", headers: { Cookie: shopAStaffAuth.cookieStr } });
    assert(staffReset.status === 403, `Staff POST /api/reset -> 403 Forbidden (got: ${staffReset.status})`);

    // Staff calls admin-only user management endpoint
    const staffUsers = await fetch(`${BASE_URL}/api/users`, { headers: { Cookie: shopAStaffAuth.cookieStr } });
    assert(staffUsers.status === 403, `Staff GET /api/users -> 403 Forbidden (got: ${staffUsers.status})`);
  }

  // -------------------------------------------------------------------------
  // 4. DIRECT API REQUESTS -> SERVER-SIDE REJECTION ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log("\n📌 Category 4: Direct Raw HTTP Requests (No UI context) -> Enforced Strictly by Server");
  {
    const directSuperAdmin = await fetch(`${BASE_URL}/api/super-admin/shops`, {
      headers: { Cookie: shopAAdminAuth.cookieStr },
    });
    assert(directSuperAdmin.status === 403, `Shop Admin directly calling /api/super-admin/shops -> 403 Forbidden (got: ${directSuperAdmin.status})`);

    const directSuperStats = await fetch(`${BASE_URL}/api/super-admin/stats`, {
      headers: { Cookie: shopAAdminAuth.cookieStr },
    });
    assert(directSuperStats.status === 403, `Shop Admin directly calling /api/super-admin/stats -> 403 Forbidden (got: ${directSuperStats.status})`);
  }

  // -------------------------------------------------------------------------
  // 5. FAKE ROLE IN REQUEST BODY -> BLOCKED (403)
  // -------------------------------------------------------------------------
  console.log("\n📌 Category 5: Fake Role in Request Body -> Blocked (403 Forbidden)");
  {
    // 5a. Staff sends body with { role: "admin" } in POST /api/users
    const fakeRoleStaffCreate = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: shopAStaffAuth.cookieStr },
      body: JSON.stringify({
        username: `fake_admin_${Date.now()}`,
        name: "Fake Admin Escalation",
        password: "password123",
        role: "admin",
      }),
    });
    assert(fakeRoleStaffCreate.status === 403, `Staff creating user with role: 'admin' -> 403 Forbidden (got: ${fakeRoleStaffCreate.status})`);

    // 5b. Shop Admin tries to create user with role: "superadmin"
    const fakeSuperCreate = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
      body: JSON.stringify({
        username: `fake_super_${Date.now()}`,
        name: "Fake Superadmin",
        password: "password123",
        role: "superadmin",
      }),
    });
    assert(fakeSuperCreate.status === 403, `Shop Admin creating user with role: 'superadmin' -> 403 Forbidden (got: ${fakeSuperCreate.status})`);

    // 5c. Shop Admin tries to elevate user to "superadmin" in PUT /api/users/:id
    const fakeSuperUpdate = await fetch(`${BASE_URL}/api/users/${shopAStaffData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
      body: JSON.stringify({ role: "superadmin" }),
    });
    assert(fakeSuperUpdate.status === 403, `Shop Admin elevating user to role: 'superadmin' -> 403 Forbidden (got: ${fakeSuperUpdate.status})`);

    // 5d. Staff attempts self-escalation in PUT /api/users/:id
    const staffSelfEscalate = await fetch(`${BASE_URL}/api/users/${shopAStaffData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: shopAStaffAuth.cookieStr },
      body: JSON.stringify({ role: "admin" }),
    });
    assert(staffSelfEscalate.status === 403, `Staff self-escalating role to 'admin' -> 403 Forbidden (got: ${staffSelfEscalate.status})`);
  }

  // -------------------------------------------------------------------------
  // 6. FAKE PERMISSIONS IN REQUEST -> BLOCKED (403)
  // -------------------------------------------------------------------------
  console.log("\n📌 Category 6: Fake Permissions in Request -> Blocked (403 Forbidden)");
  {
    // 6a. Staff attempts to self-grant permissions via PUT /api/users/:id
    const staffSelfPerm = await fetch(`${BASE_URL}/api/users/${shopAStaffData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: shopAStaffAuth.cookieStr },
      body: JSON.stringify({
        permissions: { suppliers: true, reports: true, viewSalesAndProfit: true },
      }),
    });
    assert(staffSelfPerm.status === 403, `Staff attempting to self-grant permissions -> 403 Forbidden (got: ${staffSelfPerm.status})`);

    // 6b. Staff calls supplier endpoint injecting permissions in body
    const staffInjectBodyPerm = await fetch(`${BASE_URL}/api/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: shopAStaffAuth.cookieStr },
      body: JSON.stringify({
        supplierName: "Fake Allowed Supplier",
        totalAmount: 10000,
        permissions: { suppliers: true },
      }),
    });
    assert(staffInjectBodyPerm.status === 403, `Staff injecting permissions into suppliers body -> 403 Forbidden (got: ${staffInjectBodyPerm.status})`);

    // 6c. Staff injects permissions in query parameters
    const staffQueryPerm = await fetch(`${BASE_URL}/api/suppliers?permissions[suppliers]=true&suppliers=true`, {
      headers: { Cookie: shopAStaffAuth.cookieStr },
    });
    assert(staffQueryPerm.status === 403, `Staff injecting permissions into query parameter -> 403 Forbidden (got: ${staffQueryPerm.status})`);

    // 6d. Staff injects permissions via custom HTTP header
    const staffHeaderPerm = await fetch(`${BASE_URL}/api/suppliers`, {
      headers: {
        Cookie: shopAStaffAuth.cookieStr,
        "x-user-permissions": JSON.stringify({ suppliers: true }),
        "x-role": "admin",
      },
    });
    assert(staffHeaderPerm.status === 403, `Staff injecting permissions/role via header -> 403 Forbidden (got: ${staffHeaderPerm.status})`);
  }

  // -------------------------------------------------------------------------
  // 7. FAKE SHOPID (QUERY / HEADER / BODY TAMPERING) -> BLOCKED (403)
  // -------------------------------------------------------------------------
  console.log("\n📌 Category 7: Fake shopId Tampering in Query, Header, or Body -> 403 Forbidden");

  // 7a. Query parameter tampering (?shopId, ?tenantId, ?shop)
  const queryVariations = [
    `/api/parts?shopId=${shopBId}`,
    `/api/parts?tenantId=${shopBId}`,
    `/api/parts?shop=${shopBId}`,
    `/api/bills?shopId=${shopBId}`,
    `/api/customers?shopId=${shopBId}`,
    `/api/mechanics?shopId=${shopBId}`,
    `/api/workshop?shopId=${shopBId}`,
    `/api/suppliers?shopId=${shopBId}`,
    `/api/stats?shopId=${shopBId}`,
    `/api/users?shopId=${shopBId}`,
  ];
  for (const urlPath of queryVariations) {
    const res = await fetch(`${BASE_URL}${urlPath}`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
    assert(res.status === 403, `Query tamper ${urlPath} -> 403 Forbidden (got: ${res.status})`);
  }

  // 7b. Header tampering (x-shop-id, x-tenant-id, x-shop, shop-id, tenant-id)
  const headerVariations = [
    { header: "x-shop-id", value: shopBId },
    { header: "x-tenant-id", value: shopBId },
    { header: "x-shop", value: shopBId },
    { header: "shop-id", value: shopBId },
    { header: "tenant-id", value: shopBId },
  ];
  for (const h of headerVariations) {
    const res = await fetch(`${BASE_URL}/api/parts`, {
      headers: {
        Cookie: shopAAdminAuth.cookieStr,
        [h.header]: h.value,
      },
    });
    assert(res.status === 403, `Header tamper with '${h.header}: ${h.value}' -> 403 Forbidden (got: ${res.status})`);
  }

  // 7c. Body tampering across ALL creation & update endpoints
  const bodyShopTamperCases = [
    { path: "/api/parts", method: "POST", body: { name: "Illegal Part", category: "Engine", sellingPrice: 500, purchasePrice: 300, currentStock: 10, supplierName: "Test", shopId: shopBId } },
    { path: `/api/parts/${partB.id}`, method: "PUT", body: { sellingPrice: 999, shopId: shopBId } },
    { path: `/api/parts/${partB.id}/stock`, method: "POST", body: { delta: 10, shopId: shopBId } },
    { path: "/api/parts/batches", method: "POST", body: { partId: "part-any", qtyPurchased: 10, costPrice: 100, supplier: "Test", shopId: shopBId } },
    { path: "/api/parts/returns", method: "POST", body: { partId: "part-any", quantity: 1, type: "adjustment", reason: "Test", shopId: shopBId } },
    { path: "/api/bills", method: "POST", body: { customerName: "Illegal Bill", items: [], subtotal: 100, grandTotal: 100, paidAmount: 100, paymentMethod: "Cash", shopId: shopBId } },
    { path: "/api/customers", method: "POST", body: { name: "Illegal Cust", phone: "0300-0000000", bikeRegNumber: "KHI-00", bikeModel: "CD 70", shopId: shopBId } },
    { path: `/api/customers/${custB.id}`, method: "PUT", body: { name: "New Name", shopId: shopBId } },
    { path: "/api/mechanics", method: "POST", body: { name: "Illegal Mech", phone: "0300-1111111", defaultShopCutPercentage: 30, shopId: shopBId } },
    { path: `/api/mechanics/${mechB.id}`, method: "PUT", body: { name: "New Mech Name", shopId: shopBId } },
    { path: `/api/mechanics/${mechB.id}/payout`, method: "POST", body: { amount: 500, shopId: shopBId } },
    { path: "/api/workshop", method: "POST", body: { bayNumber: 2, customerName: "Illegal Job", bikeRegNumber: "KHI-22", bikeModel: "CD 70", shopId: shopBId } },
    { path: `/api/workshop/${jobB.id}`, method: "PUT", body: { notes: "New Notes", shopId: shopBId } },
    { path: `/api/workshop/${jobB.id}/action`, method: "POST", body: { action: "addPart", partId: "some-part", quantity: 1, shopId: shopBId } },
    { path: "/api/suppliers", method: "POST", body: { supplierName: "Illegal Supplier", totalAmount: 5000, shopId: shopBId } },
    { path: `/api/suppliers/${suppB.id}`, method: "PUT", body: { notes: "New Notes", shopId: shopBId } },
    { path: `/api/suppliers/${suppB.id}/payment`, method: "POST", body: { amount: 500, shopId: shopBId } },
    { path: "/api/users", method: "POST", body: { username: `injected_u_${Date.now()}`, name: "Injected User", password: "password123", role: "staff", shopId: shopBId } },
    { path: `/api/users/${shopAStaffData.id}`, method: "PUT", body: { shopId: shopBId } },
    { path: "/api/sync", method: "POST", body: { shopId: shopBId, parts: [] } },
  ];

  for (const c of bodyShopTamperCases) {
    const res = await fetch(`${BASE_URL}${c.path}`, {
      method: c.method,
      headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
      body: JSON.stringify(c.body),
    });
    assert(
      res.status === 403,
      `Body tamper ${c.method} ${c.path} with foreign shopId -> 403 Forbidden (got: ${res.status})`
    );
  }

  // -------------------------------------------------------------------------
  // 8. CROSS-SHOP RESOURCE ID (IDOR / BOLA) -> BLOCKED (404 / 400)
  // -------------------------------------------------------------------------
  console.log("\n📌 Category 8: Cross-Shop Resource ID (IDOR / BOLA) -> Blocked (404/400)");

  // 8a. Target Foreign Part in Shop B from Shop A Admin
  const idorGetPart = await fetch(`${BASE_URL}/api/parts/${partB.id}`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
  assert(idorGetPart.status === 404, `IDOR: Shop A GET /api/parts/:partBId -> 404 Not Found (got: ${idorGetPart.status})`);

  const idorPutPart = await fetch(`${BASE_URL}/api/parts/${partB.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ sellingPrice: 99999 }),
  });
  assert(idorPutPart.status === 404 || idorPutPart.status === 400, `IDOR: Shop A PUT /api/parts/:partBId -> 404/400 Blocked (got: ${idorPutPart.status})`);

  const idorStockPart = await fetch(`${BASE_URL}/api/parts/${partB.id}/stock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ delta: 50 }),
  });
  assert(idorStockPart.status === 404 || idorStockPart.status === 400, `IDOR: Shop A POST /api/parts/:partBId/stock -> 404/400 Blocked (got: ${idorStockPart.status})`);

  const idorDelPart = await fetch(`${BASE_URL}/api/parts/${partB.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(idorDelPart.status === 404 || idorDelPart.status === 400, `IDOR: Shop A DELETE /api/parts/:partBId -> 404/400 Blocked (got: ${idorDelPart.status})`);

  // Verify part in Shop B was NOT deleted or altered
  const verifyPartB = await fetch(`${BASE_URL}/api/parts/${partB.id}`, { headers: { Cookie: shopBAdminAuth.cookieStr } });
  const verifyPartBData = await verifyPartB.json();
  assert(verifyPartB.status === 200 && verifyPartBData.sellingPrice === 1800, "Integrity verified: Shop B Part remains intact and unmodified");

  // 8b. Target Foreign Bill in Shop B from Shop A Admin
  const idorGetBill = await fetch(`${BASE_URL}/api/bills/${billB.id}`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
  assert(idorGetBill.status === 404, `IDOR: Shop A GET /api/bills/:billBId -> 404 Not Found (got: ${idorGetBill.status})`);

  const idorCancelBill = await fetch(`${BASE_URL}/api/bills/${billB.id}/cancel`, {
    method: "POST",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(idorCancelBill.status === 404 || idorCancelBill.status === 400, `IDOR: Shop A POST /api/bills/:billBId/cancel -> 404/400 Blocked (got: ${idorCancelBill.status})`);

  const idorDelBill = await fetch(`${BASE_URL}/api/bills/${billB.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(idorDelBill.status === 404 || idorDelBill.status === 400, `IDOR: Shop A DELETE /api/bills/:billBId -> 404/400 Blocked (got: ${idorDelBill.status})`);

  // Verify bill in Shop B was NOT deleted
  const verifyBillB = await fetch(`${BASE_URL}/api/bills/${billB.id}`, { headers: { Cookie: shopBAdminAuth.cookieStr } });
  assert(verifyBillB.status === 200, "Integrity verified: Shop B Bill remains intact in Shop B");

  // 8c. Target Foreign Customer in Shop B from Shop A Admin
  const idorGetCust = await fetch(`${BASE_URL}/api/customers/${custB.id}`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
  assert(idorGetCust.status === 404, `IDOR: Shop A GET /api/customers/:custBId -> 404 Not Found (got: ${idorGetCust.status})`);

  const idorPutCust = await fetch(`${BASE_URL}/api/customers/${custB.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ name: "Hacked Customer Name" }),
  });
  assert(idorPutCust.status === 404 || idorPutCust.status === 400, `IDOR: Shop A PUT /api/customers/:custBId -> 404/400 Blocked (got: ${idorPutCust.status})`);

  const idorDelCust = await fetch(`${BASE_URL}/api/customers/${custB.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(idorDelCust.status === 404 || idorDelCust.status === 400, `IDOR: Shop A DELETE /api/customers/:custBId -> 404/400 Blocked (got: ${idorDelCust.status})`);

  // Verify customer in Shop B was NOT deleted or altered
  const verifyCustB = await fetch(`${BASE_URL}/api/customers/${custB.id}`, { headers: { Cookie: shopBAdminAuth.cookieStr } });
  const verifyCustBData = await verifyCustB.json();
  assert(verifyCustB.status === 200 && verifyCustBData.name === "Shop B Private Customer", "Integrity verified: Shop B Customer remains intact");

  // 8d. Target Foreign Mechanic in Shop B from Shop A Admin
  const idorGetMech = await fetch(`${BASE_URL}/api/mechanics/${mechB.id}`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
  assert(idorGetMech.status === 404, `IDOR: Shop A GET /api/mechanics/:mechBId -> 404 Not Found (got: ${idorGetMech.status})`);

  const idorPutMech = await fetch(`${BASE_URL}/api/mechanics/${mechB.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ name: "Hacked Mechanic Name" }),
  });
  assert(idorPutMech.status === 404 || idorPutMech.status === 400, `IDOR: Shop A PUT /api/mechanics/:mechBId -> 404/400 Blocked (got: ${idorPutMech.status})`);

  const idorPayoutMech = await fetch(`${BASE_URL}/api/mechanics/${mechB.id}/payout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ amount: 5000, notes: "Malicious Payout" }),
  });
  assert(idorPayoutMech.status === 404 || idorPayoutMech.status === 400, `IDOR: Shop A POST /api/mechanics/:mechBId/payout -> 404/400 Blocked (got: ${idorPayoutMech.status})`);

  const idorDelMech = await fetch(`${BASE_URL}/api/mechanics/${mechB.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(idorDelMech.status === 404 || idorDelMech.status === 400, `IDOR: Shop A DELETE /api/mechanics/:mechBId -> 404/400 Blocked (got: ${idorDelMech.status})`);

  // Verify mechanic in Shop B was NOT deleted or altered
  const verifyMechB = await fetch(`${BASE_URL}/api/mechanics/${mechB.id}`, { headers: { Cookie: shopBAdminAuth.cookieStr } });
  assert(verifyMechB.status === 200, "Integrity verified: Shop B Mechanic remains intact");

  // 8e. Target Foreign Workshop Job Card in Shop B from Shop A Admin
  const idorGetJob = await fetch(`${BASE_URL}/api/workshop/${jobB.id}`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
  assert(idorGetJob.status === 404, `IDOR: Shop A GET /api/workshop/:jobBId -> 404 Not Found (got: ${idorGetJob.status})`);

  const idorPutJob = await fetch(`${BASE_URL}/api/workshop/${jobB.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ customerName: "Hacked Job Customer" }),
  });
  assert(idorPutJob.status === 404 || idorPutJob.status === 400, `IDOR: Shop A PUT /api/workshop/:jobBId -> 404/400 Blocked (got: ${idorPutJob.status})`);

  const idorActionJob = await fetch(`${BASE_URL}/api/workshop/${jobB.id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ action: "addPart", partId: partB.id, quantity: 1 }),
  });
  assert(idorActionJob.status === 404 || idorActionJob.status === 400, `IDOR: Shop A POST /api/workshop/:jobBId/action -> 404/400 Blocked (got: ${idorActionJob.status})`);

  const idorDelJob = await fetch(`${BASE_URL}/api/workshop/${jobB.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(idorDelJob.status === 404 || idorDelJob.status === 400, `IDOR: Shop A DELETE /api/workshop/:jobBId -> 404/400 Blocked (got: ${idorDelJob.status})`);

  // Verify job card in Shop B was NOT deleted or altered
  const verifyJobB = await fetch(`${BASE_URL}/api/workshop/${jobB.id}`, { headers: { Cookie: shopBAdminAuth.cookieStr } });
  assert(verifyJobB.status === 200, "Integrity verified: Shop B Job Card remains intact");

  // 8f. Target Foreign Supplier Credit in Shop B from Shop A Admin
  const idorGetSupp = await fetch(`${BASE_URL}/api/suppliers/${suppB.id}`, { headers: { Cookie: shopAAdminAuth.cookieStr } });
  assert(idorGetSupp.status === 404, `IDOR: Shop A GET /api/suppliers/:suppBId -> 404 Not Found (got: ${idorGetSupp.status})`);

  const idorPutSupp = await fetch(`${BASE_URL}/api/suppliers/${suppB.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ totalAmount: 99999 }),
  });
  assert(idorPutSupp.status === 404 || idorPutSupp.status === 400, `IDOR: Shop A PUT /api/suppliers/:suppBId -> 404/400 Blocked (got: ${idorPutSupp.status})`);

  const idorPaySupp = await fetch(`${BASE_URL}/api/suppliers/${suppB.id}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ amount: 1000 }),
  });
  assert(idorPaySupp.status === 404 || idorPaySupp.status === 400, `IDOR: Shop A POST /api/suppliers/:suppBId/payment -> 404/400 Blocked (got: ${idorPaySupp.status})`);

  const idorDelSupp = await fetch(`${BASE_URL}/api/suppliers/${suppB.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(idorDelSupp.status === 404 || idorDelSupp.status === 400, `IDOR: Shop A DELETE /api/suppliers/:suppBId -> 404/400 Blocked (got: ${idorDelSupp.status})`);

  // Verify supplier credit in Shop B was NOT deleted or altered
  const verifySuppB = await fetch(`${BASE_URL}/api/suppliers/${suppB.id}`, { headers: { Cookie: shopBAdminAuth.cookieStr } });
  assert(verifySuppB.status === 200, "Integrity verified: Shop B Supplier Credit remains intact");

  // 8g. Target Foreign User in Shop B from Shop A Admin
  const shopBUsersRes = await fetch(`${BASE_URL}/api/users`, { headers: { Cookie: shopBAdminAuth.cookieStr } });
  const shopBUsers = await shopBUsersRes.json();
  const shopBTargetUser = shopBUsers.find((u) => u.username === shopBAdminUsername) || shopBUsers[0];

  const idorPutUser = await fetch(`${BASE_URL}/api/users/${shopBTargetUser.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: shopAAdminAuth.cookieStr },
    body: JSON.stringify({ name: "Hacked Foreign User" }),
  });
  assert(idorPutUser.status === 404 || idorPutUser.status === 403, `IDOR: Shop A PUT /api/users/:userBId -> 404/403 Blocked (got: ${idorPutUser.status})`);

  const idorDelUser = await fetch(`${BASE_URL}/api/users/${shopBTargetUser.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(idorDelUser.status === 404 || idorDelUser.status === 403, `IDOR: Shop A DELETE /api/users/:userBId -> 404/403 Blocked (got: ${idorDelUser.status})`);

  // -------------------------------------------------------------------------
  // 9. FRONTEND ROUTE GUARDS -> APPROPRIATE REDIRECT / BLOCK
  // -------------------------------------------------------------------------
  console.log("\n📌 Category 9: Frontend Route Guards -> Appropriate Server Redirection & Boundary");
  {
    // Unauthenticated visit to protected route redirects to /login?callbackUrl=...
    const unauthNav = await fetch(`${BASE_URL}/billing`, { redirect: "manual" });
    assert(
      unauthNav.status === 307 || unauthNav.status === 302,
      `Unauthenticated visit to /billing intercepted by middleware (Status: ${unauthNav.status})`
    );
    const unauthLoc = unauthNav.headers.get("location") || "";
    assert(
      unauthLoc.includes("/login") && unauthLoc.includes("callbackUrl"),
      `Unauthenticated visitor redirected to login with callbackUrl (Location: ${unauthLoc})`
    );

    // Shop Admin / Staff visiting /super-admin is intercepted and redirected to '/'
    const shopAdminNav = await fetch(`${BASE_URL}/super-admin`, {
      headers: { Cookie: shopAAdminAuth.cookieStr },
      redirect: "manual",
    });
    assert(
      shopAdminNav.status === 307 || shopAdminNav.status === 302,
      `Shop Admin visit to /super-admin intercepted by middleware (Status: ${shopAdminNav.status})`
    );
    const shopAdminLoc = shopAdminNav.headers.get("location") || "";
    assert(
      shopAdminLoc === "/" || shopAdminLoc.endsWith("/"),
      `Shop Admin redirected away to root '/' without leaking super-admin (Location: ${shopAdminLoc})`
    );

    // Super Admin visiting /super-admin is ALLOWED (200 OK)
    const superNav = await fetch(`${BASE_URL}/super-admin`, {
      headers: { Cookie: superAuth.cookieStr },
      redirect: "manual",
    });
    assert(superNav.status === 200, `Super Admin visiting /super-admin -> 200 OK (got: ${superNav.status})`);
  }

  // -------------------------------------------------------------------------
  // Cleanup Test Data
  // -------------------------------------------------------------------------
  console.log("\n🧹 Cleaning up test artifacts...");
  await fetch(`${BASE_URL}/api/users/${shopAStaffData.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });

  console.log("\n================================================================================");
  console.log(`🏁 STEP 6 SHOP ISOLATION AUDIT COMPLETED: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("================================================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test suite execution error:", err);
  process.exit(1);
});
