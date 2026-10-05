/**
 * Step 4 — Direct API Attack Protection Test Suite
 *
 * Comprehensive Direct HTTP Request Security & Authorization Audit:
 * 1. Counter staff directly calls inventory API (parts, stock, batches, returns) -> REJECTED (403)
 * 2. Staff directly calls reports API (rate-history, sales-details, query/header injection) -> REJECTED (403)
 * 3. Staff directly calls billing API (pos, bills, delete, cancel) -> REJECTED (403)
 * 4. Staff directly calls customer-management API (get, create, update, delete) -> REJECTED (403)
 * 5. Staff directly calls mechanics/workshop API (mechanics, ledger, payout, workshop, action, delete) -> REJECTED (403)
 * 6. Staff directly calls stats API (super-admin stats, cross-shop stats, zero-permission stats, masked financial fields) -> REJECTED (403/401)
 * 7. Staff changes request body role (role escalation to admin/superadmin via POST/PUT /api/users or payload injection) -> REJECTED (403)
 * 8. Staff adds fake permissions (body, query parameter, or custom header permission injection) -> REJECTED (403)
 * 9. Staff changes shopId (query ?shopId, header x-shop-id, or body shopId cross-tenant attacks) -> REJECTED (403)
 * 10. Staff changes target user/resource ID (IDOR / BOLA targeting foreign shop's users, customers, bills, parts, mechanics, workshop, suppliers) -> REJECTED (404/403/400)
 */

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
  console.log("🛡️  STEP 4: DIRECT API ATTACK PROTECTION AUDIT TEST SUITE");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("================================================================================\n");

  // -------------------------------------------------------------------------
  // Step 0: Establish Authenticated Personas & Tenants
  // -------------------------------------------------------------------------
  console.log("📌 Step 0: Setup Personas & Multi-Tenant Test Environment");

  // 0a. Superadmin
  const superAuth = await loginAndGetCookieJar("superadmin", "superadmin123");
  assert(superAuth.isSuccess, "Superadmin session established");

  // 0b. Shop A Admin (Shop: shop-sikandar)
  const shopAAdminAuth = await loginAndGetCookieJar("admin", "admin123");
  assert(shopAAdminAuth.isSuccess, "Shop A Admin session established");

  // 0c. Provision Shop B for Cross-Tenant / IDOR tests
  const shopBAdminUsername = `shopb_admin_atk_${Date.now()}`;
  const createShopBRes = await fetch(`${BASE_URL}/api/super-admin/shops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: superAuth.cookieStr,
    },
    body: JSON.stringify({
      name: "Shop B Victim Enterprise",
      adminUsername: shopBAdminUsername,
      adminPassword: "password123",
      seedSampleParts: false,
    }),
  });
  const shopBData = await createShopBRes.json();
  const shopBId = shopBData?.shop?.id || shopBData?.id || "shop-b-victim";
  assert(createShopBRes.status === 201 || createShopBRes.status === 200, `Shop B provisioned (id: ${shopBId})`);

  const shopBAdminAuth = await loginAndGetCookieJar(shopBAdminUsername, "password123");
  assert(shopBAdminAuth.isSuccess, `Shop B Admin session established`);

  // 0d. Persona: Counter Staff in Shop A (Only POS / Billing, inventory=false, reports=false, viewSalesAndProfit=false)
  const counterStaffUsername = `counter_staff_${Date.now()}`;
  const createCounterStaffRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      username: counterStaffUsername,
      name: "Shop A Counter Staff",
      password: "password123",
      role: "staff",
      permissions: {
        pos: true,
        bills: true,
        customers: true,
        inventory: false, // Explicitly restricted
        workshop: false,  // Explicitly restricted
        mechanics: false, // Explicitly restricted
        suppliers: false, // Explicitly restricted
        reports: false,   // Explicitly restricted
        viewSalesAndProfit: false, // Explicitly restricted
      },
    }),
  });
  const counterStaffData = await createCounterStaffRes.json();
  assert(createCounterStaffRes.status === 201, `Counter Staff created (id: ${counterStaffData.id})`);
  const counterStaffAuth = await loginAndGetCookieJar(counterStaffUsername, "password123");
  assert(counterStaffAuth.isSuccess, "Counter Staff session established");

  // 0e. Persona: Workshop Technician Staff in Shop A (Only Workshop & Mechanics, pos=false, inventory=false, reports=false)
  const workshopStaffUsername = `workshop_staff_${Date.now()}`;
  const createWorkshopStaffRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      username: workshopStaffUsername,
      name: "Shop A Workshop Staff",
      password: "password123",
      role: "staff",
      permissions: {
        pos: false,       // Explicitly restricted
        bills: false,     // Explicitly restricted
        customers: false, // Explicitly restricted
        inventory: false, // Explicitly restricted
        workshop: true,
        mechanics: true,
        suppliers: false, // Explicitly restricted
        reports: false,   // Explicitly restricted
        viewSalesAndProfit: false, // Explicitly restricted
      },
    }),
  });
  const workshopStaffData = await createWorkshopStaffRes.json();
  assert(createWorkshopStaffRes.status === 201, `Workshop Staff created (id: ${workshopStaffData.id})`);
  const workshopStaffAuth = await loginAndGetCookieJar(workshopStaffUsername, "password123");
  assert(workshopStaffAuth.isSuccess, "Workshop Staff session established");

  // 0f. Persona: Zero-Permission / Unauthorized Staff
  const zeroPermStaffUsername = `zeroperm_staff_${Date.now()}`;
  const createZeroPermRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      username: zeroPermStaffUsername,
      name: "Zero Perm Staff",
      password: "password123",
      role: "staff",
      permissions: {
        pos: false,
        bills: false,
        customers: false,
        inventory: false,
        workshop: false,
        mechanics: false,
        suppliers: false,
        reports: false,
        viewSalesAndProfit: false,
      },
    }),
  });
  const zeroPermData = await createZeroPermRes.json();
  assert(createZeroPermRes.status === 201, `Zero-Permission Staff created (id: ${zeroPermData.id})`);
  const zeroPermAuth = await loginAndGetCookieJar(zeroPermStaffUsername, "password123");
  assert(zeroPermAuth.isSuccess, "Zero-Permission Staff session established");

  // Fetch or create a legitimate part in Shop A to test against
  const shopAPartsRes = await fetch(`${BASE_URL}/api/parts`, {
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  const shopAParts = await shopAPartsRes.json();
  const samplePartAId = shopAParts.length > 0 ? shopAParts[0].id : "part-sample-a";

  // Create sample resources in Shop B for IDOR tests
  const createShopBPartRes = await fetch(`${BASE_URL}/api/parts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopBAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      name: "Shop B Secret Engine Part",
      category: "Engine & Transmission",
      sellingPrice: 1500,
      purchasePrice: 900,
      currentStock: 25,
      minStockLimit: 5,
      supplierName: "Shop B Secret Supplier",
    }),
  });
  const shopBPart = await createShopBPartRes.json();

  const createShopBCustRes = await fetch(`${BASE_URL}/api/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopBAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      name: "Shop B VIP Customer",
      phone: "0300-9999999",
      bikeRegNumber: "LHR-9999",
      bikeModel: "Honda CG 125",
    }),
  });
  const shopBCustomer = await createShopBCustRes.json();

  const createShopBMechRes = await fetch(`${BASE_URL}/api/mechanics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopBAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      name: "Shop B Master Ustad",
      phone: "0321-8888888",
      specialty: "Engine Tuning",
      defaultShopCutPercentage: 30,
    }),
  });
  const shopBMechanic = await createShopBMechRes.json();

  const createShopBJobRes = await fetch(`${BASE_URL}/api/workshop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopBAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      bayNumber: 2,
      customerName: "Shop B Workshop Client",
      bikeRegNumber: "ISB-7777",
      bikeModel: "Suzuki GS 150",
    }),
  });
  const shopBJob = await createShopBJobRes.json();

  const createShopBBillRes = await fetch(`${BASE_URL}/api/bills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopBAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      customerName: "Shop B Walk-in Customer",
      items: [
        {
          partId: shopBPart.id,
          partName: shopBPart.name,
          category: shopBPart.category,
          quantity: 1,
          unitPrice: 1500,
          purchasePrice: 900,
          totalPrice: 1500,
        },
      ],
      subtotal: 1500,
      grandTotal: 1500,
      paidAmount: 1500,
      paymentMethod: "Cash",
    }),
  });
  const shopBBill = await createShopBBillRes.json();

  const createShopBSuppRes = await fetch(`${BASE_URL}/api/suppliers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopBAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      supplierName: "Shop B Confidential Supplier",
      supplierPhone: "0311-2223344",
      purchasedParts: "10x Piston",
      quantity: 10,
      totalAmount: 10000,
      paidAmount: 2000,
      purchaseDate: "2026-10-01",
      dueDate: "2026-10-20",
    }),
  });
  const shopBSupplier = await createShopBSuppRes.json();

  // -------------------------------------------------------------------------
  // Attack 1: Counter Staff Directly Calls Inventory API
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 1: Counter Staff Directly Calls Inventory API (REJECTED with 403)");

  // 1a. Counter staff attempts POST /api/parts (create part)
  const atk1CreatePart = await fetch(`${BASE_URL}/api/parts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      name: "Illicit Part Created by Cashier",
      category: "Engine & Transmission",
      sellingPrice: 1000,
      purchasePrice: 600,
      currentStock: 10,
      supplierName: "Sneaky Vendor",
    }),
  });
  assert(
    atk1CreatePart.status === 403,
    `Counter staff POST /api/parts -> 403 Forbidden (status: ${atk1CreatePart.status})`
  );

  // 1b. Counter staff attempts PUT /api/parts/:id (edit part price/details)
  const atk1UpdatePart = await fetch(`${BASE_URL}/api/parts/${samplePartAId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      sellingPrice: 1, // Maliciously slashing price to 1 rupee
    }),
  });
  assert(
    atk1UpdatePart.status === 403,
    `Counter staff PUT /api/parts/:id -> 403 Forbidden (status: ${atk1UpdatePart.status})`
  );

  // 1c. Counter staff attempts DELETE /api/parts/:id (delete part)
  const atk1DeletePart = await fetch(`${BASE_URL}/api/parts/${samplePartAId}`, {
    method: "DELETE",
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk1DeletePart.status === 403,
    `Counter staff DELETE /api/parts/:id -> 403 Forbidden (status: ${atk1DeletePart.status})`
  );

  // 1d. Counter staff attempts POST /api/parts/:id/stock (adjust stock directly)
  const atk1StockDelta = await fetch(`${BASE_URL}/api/parts/${samplePartAId}/stock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({ delta: 50 }),
  });
  assert(
    atk1StockDelta.status === 403,
    `Counter staff POST /api/parts/:id/stock -> 403 Forbidden (status: ${atk1StockDelta.status})`
  );

  // 1e. Counter staff attempts GET /api/parts/batches (view wholesale cost & batches)
  const atk1GetBatches = await fetch(`${BASE_URL}/api/parts/batches`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk1GetBatches.status === 403,
    `Counter staff GET /api/parts/batches -> 403 Forbidden (status: ${atk1GetBatches.status})`
  );

  // 1f. Counter staff attempts POST /api/parts/batches (inject purchase batches)
  const atk1CreateBatch = await fetch(`${BASE_URL}/api/parts/batches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      partId: samplePartAId,
      qtyPurchased: 10,
      costPrice: 50,
      supplier: "Ghost Supplier",
    }),
  });
  assert(
    atk1CreateBatch.status === 403,
    `Counter staff POST /api/parts/batches -> 403 Forbidden (status: ${atk1CreateBatch.status})`
  );

  // 1g. Counter staff attempts POST /api/parts/returns (record return / adjustment)
  const atk1Returns = await fetch(`${BASE_URL}/api/parts/returns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      partId: samplePartAId,
      quantity: 5,
      type: "purchase_return",
      reason: "Hacked return",
    }),
  });
  assert(
    atk1Returns.status === 403,
    `Counter staff POST /api/parts/returns -> 403 Forbidden (status: ${atk1Returns.status})`
  );

  // 1h. Zero-Permission Staff attempts GET /api/parts -> REJECTED (403)
  const atk1ZeroPermParts = await fetch(`${BASE_URL}/api/parts`, {
    headers: { Cookie: zeroPermAuth.cookieStr },
  });
  assert(
    atk1ZeroPermParts.status === 403,
    `Zero-permission staff GET /api/parts -> 403 Forbidden (status: ${atk1ZeroPermParts.status})`
  );

  // 1i. Counter staff calls GET /api/parts -> 200 ALLOWED for fast POS, BUT purchasePrice masked to 0
  const atk1CounterParts = await fetch(`${BASE_URL}/api/parts`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  const counterPartsData = await atk1CounterParts.json();
  assert(atk1CounterParts.status === 200, `Counter staff GET /api/parts -> 200 ALLOWED for selling`);
  const allMasked = counterPartsData.every((p) => p.purchasePrice === 0);
  assert(allMasked, `Counter staff cannot see wholesale purchasePrice (masked to 0)`);

  // -------------------------------------------------------------------------
  // Attack 2: Staff Directly Calls Reports API
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 2: Staff Directly Calls Reports API (REJECTED with 403)");

  // 2a. Direct call to GET /api/reports/rate-history
  const atk2RateHistory = await fetch(`${BASE_URL}/api/reports/rate-history`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk2RateHistory.status === 403,
    `Staff without reports permission GET /api/reports/rate-history -> 403 Forbidden`
  );

  // 2b. Direct call to GET /api/sales/details
  const atk2SalesDetails = await fetch(`${BASE_URL}/api/sales/details`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk2SalesDetails.status === 403,
    `Staff without reports permission GET /api/sales/details -> 403 Forbidden`
  );

  // 2c. Query parameter tampering: ?reports=true&viewSalesAndProfit=true
  const atk2QueryTamper = await fetch(`${BASE_URL}/api/reports/rate-history?reports=true&viewSalesAndProfit=true`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk2QueryTamper.status === 403,
    `Staff query injection (?reports=true) on reports API -> 403 Forbidden`
  );

  // 2d. Header tampering: x-permissions
  const atk2HeaderTamper = await fetch(`${BASE_URL}/api/sales/details`, {
    headers: {
      Cookie: counterStaffAuth.cookieStr,
      "x-user-permissions": JSON.stringify({ reports: true, viewSalesAndProfit: true }),
    },
  });
  assert(
    atk2HeaderTamper.status === 403,
    `Staff header injection (x-user-permissions) on sales API -> 403 Forbidden`
  );

  // -------------------------------------------------------------------------
  // Attack 3: Staff Directly Calls Billing API
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 3: Staff Directly Calls Billing API (REJECTED with 403)");

  // 3a. Workshop staff (pos=false) directly calls POST /api/bills
  const atk3CreateBill = await fetch(`${BASE_URL}/api/bills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: workshopStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      customerName: "Unauthorized Bill",
      items: [],
      subtotal: 500,
      grandTotal: 500,
      paidAmount: 500,
      paymentMethod: "Cash",
    }),
  });
  assert(
    atk3CreateBill.status === 403,
    `Workshop staff without POS permission POST /api/bills -> 403 Forbidden`
  );

  // 3b. Workshop staff directly calls GET /api/bills
  const atk3GetBills = await fetch(`${BASE_URL}/api/bills`, {
    headers: { Cookie: workshopStaffAuth.cookieStr },
  });
  assert(
    atk3GetBills.status === 403,
    `Workshop staff without bills/pos permission GET /api/bills -> 403 Forbidden`
  );

  // 3c. Workshop staff directly calls GET /api/bills/:id
  const atk3GetSingleBill = await fetch(`${BASE_URL}/api/bills/any-bill-id`, {
    headers: { Cookie: workshopStaffAuth.cookieStr },
  });
  assert(
    atk3GetSingleBill.status === 403,
    `Workshop staff without bills/pos permission GET /api/bills/:id -> 403 Forbidden`
  );

  // 3d. Counter staff directly calls DELETE /api/bills/:id (admin-only)
  const atk3DeleteBill = await fetch(`${BASE_URL}/api/bills/any-bill-id`, {
    method: "DELETE",
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk3DeleteBill.status === 403,
    `Staff directly calling DELETE /api/bills/:id -> 403 Forbidden (admin-only)`
  );

  // 3e. Counter staff directly calls POST /api/bills/:id/cancel (admin-only)
  const atk3CancelBill = await fetch(`${BASE_URL}/api/bills/any-bill-id/cancel`, {
    method: "POST",
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk3CancelBill.status === 403,
    `Staff directly calling POST /api/bills/:id/cancel -> 403 Forbidden (admin-only)`
  );

  // -------------------------------------------------------------------------
  // Attack 4: Staff Directly Calls Customer-Management API
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 4: Staff Directly Calls Customer-Management API (REJECTED with 403)");

  // 4a. Workshop staff (customers=false) directly calls PUT /api/customers/:id
  const atk4UpdateCust = await fetch(`${BASE_URL}/api/customers/cust-123`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: workshopStaffAuth.cookieStr,
    },
    body: JSON.stringify({ name: "Malicious Customer Name Change" }),
  });
  assert(
    atk4UpdateCust.status === 403,
    `Staff without customers permission PUT /api/customers/:id -> 403 Forbidden`
  );

  // 4b. Zero-permission staff directly calls GET /api/customers
  const atk4GetCusts = await fetch(`${BASE_URL}/api/customers`, {
    headers: { Cookie: zeroPermAuth.cookieStr },
  });
  assert(
    atk4GetCusts.status === 403,
    `Zero-permission staff GET /api/customers -> 403 Forbidden`
  );

  // 4c. Zero-permission staff directly calls POST /api/customers
  const atk4CreateCust = await fetch(`${BASE_URL}/api/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: zeroPermAuth.cookieStr,
    },
    body: JSON.stringify({ name: "Rogue Customer", phone: "0300-1112233", bikeRegNumber: "KHI-1234", bikeModel: "CD 70" }),
  });
  assert(
    atk4CreateCust.status === 403,
    `Zero-permission staff POST /api/customers -> 403 Forbidden`
  );

  // 4d. Counter staff directly calls DELETE /api/customers/:id (admin-only)
  const atk4DeleteCust = await fetch(`${BASE_URL}/api/customers/cust-123`, {
    method: "DELETE",
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk4DeleteCust.status === 403,
    `Staff directly calling DELETE /api/customers/:id -> 403 Forbidden (admin-only)`
  );

  // -------------------------------------------------------------------------
  // Attack 5: Staff Directly Calls Mechanics / Workshop API
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 5: Staff Directly Calls Mechanics / Workshop API (REJECTED with 403)");

  // 5a. Counter staff (mechanics=false) directly calls POST /api/mechanics
  const atk5CreateMech = await fetch(`${BASE_URL}/api/mechanics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({ name: "Fake Mechanic", phone: "0300-0000000" }),
  });
  assert(
    atk5CreateMech.status === 403,
    `Counter staff POST /api/mechanics -> 403 Forbidden`
  );

  // 5b. Counter staff directly calls PUT /api/mechanics/:id
  const atk5UpdateMech = await fetch(`${BASE_URL}/api/mechanics/mech-123`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({ name: "Renamed Mechanic" }),
  });
  assert(
    atk5UpdateMech.status === 403,
    `Counter staff PUT /api/mechanics/:id -> 403 Forbidden`
  );

  // 5c. Counter staff directly calls GET /api/mechanics/ledger
  const atk5GetLedger = await fetch(`${BASE_URL}/api/mechanics/ledger`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk5GetLedger.status === 403,
    `Counter staff GET /api/mechanics/ledger -> 403 Forbidden`
  );

  // 5d. Counter staff directly calls POST /api/mechanics/:id/payout
  const atk5Payout = await fetch(`${BASE_URL}/api/mechanics/mech-123/payout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({ amount: 5000, notes: "Embezzlement Attempt" }),
  });
  assert(
    atk5Payout.status === 403,
    `Counter staff POST /api/mechanics/:id/payout -> 403 Forbidden`
  );

  // 5e. Workshop staff directly calls DELETE /api/mechanics/:id (admin-only)
  const atk5DeleteMech = await fetch(`${BASE_URL}/api/mechanics/mech-123`, {
    method: "DELETE",
    headers: { Cookie: workshopStaffAuth.cookieStr },
  });
  assert(
    atk5DeleteMech.status === 403,
    `Staff directly calling DELETE /api/mechanics/:id -> 403 Forbidden (admin-only)`
  );

  // 5f. Counter staff (workshop=false) directly calls GET /api/workshop
  const atk5GetWorkshop = await fetch(`${BASE_URL}/api/workshop`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk5GetWorkshop.status === 403,
    `Counter staff GET /api/workshop -> 403 Forbidden`
  );

  // 5g. Counter staff directly calls POST /api/workshop
  const atk5CreateJob = await fetch(`${BASE_URL}/api/workshop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({ bayNumber: 1, customerName: "Test", bikeRegNumber: "KHI-1", bikeModel: "CD 70" }),
  });
  assert(
    atk5CreateJob.status === 403,
    `Counter staff POST /api/workshop -> 403 Forbidden`
  );

  // 5h. Counter staff directly calls PUT /api/workshop/:id
  const atk5UpdateJob = await fetch(`${BASE_URL}/api/workshop/job-123`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({ notes: "Altered by counter" }),
  });
  assert(
    atk5UpdateJob.status === 403,
    `Counter staff PUT /api/workshop/:id -> 403 Forbidden`
  );

  // 5i. Counter staff directly calls POST /api/workshop/:id/action
  const atk5JobAction = await fetch(`${BASE_URL}/api/workshop/job-123/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({ action: "addPart", partId: samplePartAId, quantity: 1 }),
  });
  assert(
    atk5JobAction.status === 403,
    `Counter staff POST /api/workshop/:id/action -> 403 Forbidden`
  );

  // 5j. Workshop staff directly calls DELETE /api/workshop/:id (admin-only)
  const atk5DeleteJob = await fetch(`${BASE_URL}/api/workshop/job-123`, {
    method: "DELETE",
    headers: { Cookie: workshopStaffAuth.cookieStr },
  });
  assert(
    atk5DeleteJob.status === 403,
    `Staff directly calling DELETE /api/workshop/:id -> 403 Forbidden (admin-only)`
  );

  // -------------------------------------------------------------------------
  // Attack 6: Staff Directly Calls Stats API
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 6: Staff Directly Calls Stats API (REJECTED with 403/401)");

  // 6a. Staff directly calls super-admin platform stats
  const atk6SuperStats = await fetch(`${BASE_URL}/api/super-admin/stats`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk6SuperStats.status === 403,
    `Staff directly calling /api/super-admin/stats -> 403 Forbidden`
  );

  // 6b. Staff calls stats with foreign shop query (?shopId=shop-b)
  const atk6QueryCrossStats = await fetch(`${BASE_URL}/api/stats?shopId=${shopBId}`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk6QueryCrossStats.status === 403,
    `Staff calling /api/stats?shopId=foreign-shop -> 403 Forbidden`
  );

  // 6c. Staff calls stats with foreign header (x-shop-id: shop-b)
  const atk6HeaderCrossStats = await fetch(`${BASE_URL}/api/stats`, {
    headers: {
      Cookie: counterStaffAuth.cookieStr,
      "x-shop-id": shopBId,
    },
  });
  assert(
    atk6HeaderCrossStats.status === 403,
    `Staff calling /api/stats with header x-shop-id=foreign-shop -> 403 Forbidden`
  );

  // 6d. Zero-permission unauthorized staff directly calls /api/stats
  const atk6ZeroPermStats = await fetch(`${BASE_URL}/api/stats`, {
    headers: { Cookie: zeroPermAuth.cookieStr },
  });
  assert(
    atk6ZeroPermStats.status === 403,
    `Zero-permission staff directly calling /api/stats -> 403 Forbidden`
  );

  // 6e. Counter staff directly calls /api/stats -> Sensitive financials strictly masked to 0
  const atk6StaffStats = await fetch(`${BASE_URL}/api/stats`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  const staffStatsData = await atk6StaffStats.json();
  assert(atk6StaffStats.status === 200, `Counter staff can access operational stats counts`);
  assert(
    staffStatsData.todaySales === 0 &&
    staffStatsData.monthlySales === 0 &&
    staffStatsData.totalInventoryValue === 0 &&
    staffStatsData.totalPendingSupplierCredit === 0 &&
    staffStatsData.totalMechanicPayable === 0,
    `Financial figures strictly masked to 0 for staff without viewSalesAndProfit permission`
  );

  // 6f. Unauthenticated direct call to /api/stats
  const atk6UnauthStats = await fetch(`${BASE_URL}/api/stats`);
  assert(
    atk6UnauthStats.status === 401,
    `Unauthenticated direct HTTP call to /api/stats -> 401 Unauthorized`
  );

  // -------------------------------------------------------------------------
  // Attack 7: Staff Changes Request Body Role (Privilege Escalation)
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 7: Staff Changes Request Body Role (REJECTED with 403)");

  // 7a. Staff attempts to create an admin user via POST /api/users
  const atk7CreateAdmin = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      username: "staff_promoted_admin",
      name: "Fake Admin",
      password: "password123",
      role: "admin",
    }),
  });
  assert(
    atk7CreateAdmin.status === 403,
    `Staff POST /api/users with { role: "admin" } -> 403 Forbidden`
  );

  // 7b. Staff attempts to create a superadmin user via POST /api/users
  const atk7CreateSuper = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      username: "staff_promoted_superadmin",
      name: "Fake SuperAdmin",
      password: "password123",
      role: "superadmin",
    }),
  });
  assert(
    atk7CreateSuper.status === 403,
    `Staff POST /api/users with { role: "superadmin" } -> 403 Forbidden`
  );

  // 7c. Staff attempts to promote self via PUT /api/users/:myId
  const atk7UpdateRole = await fetch(`${BASE_URL}/api/users/${counterStaffData.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      role: "admin",
    }),
  });
  assert(
    atk7UpdateRole.status === 403,
    `Staff PUT /api/users/:id with { role: "admin" } -> 403 Forbidden`
  );

  // 7d. Shop Admin attempts to elevate a user to superadmin
  const atk7AdminSuperEscalate = await fetch(`${BASE_URL}/api/users/${counterStaffData.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({
      role: "superadmin",
    }),
  });
  assert(
    atk7AdminSuperEscalate.status === 403,
    `Shop Admin PUT /api/users/:id with { role: "superadmin" } -> 403 Forbidden`
  );

  // 7e. Staff injects role in business payload (e.g. POST /api/bills)
  const atk7BodyRoleInjection = await fetch(`${BASE_URL}/api/bills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: workshopStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      customerName: "Role Injector Customer",
      role: "superadmin",
      isAdmin: true,
      isSuperAdmin: true,
      items: [],
      subtotal: 100,
      grandTotal: 100,
      paidAmount: 100,
      paymentMethod: "Cash",
    }),
  });
  assert(
    atk7BodyRoleInjection.status === 403,
    `Workshop staff injecting role="superadmin" into payload -> 403 Forbidden (no bypass)`
  );

  // -------------------------------------------------------------------------
  // Attack 8: Staff Adds Fake Permissions (Parameter / Header Injection)
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 8: Staff Adds Fake Permissions (REJECTED with 403)");

  // 8a. Staff injects permissions in body to access suppliers
  const atk8BodyPerms = await fetch(`${BASE_URL}/api/suppliers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      supplierName: "Fake Supplier Allowed By Injected Permissions",
      totalAmount: 5000,
      permissions: { suppliers: true, reports: true },
      user: { permissions: { suppliers: true } },
    }),
  });
  assert(
    atk8BodyPerms.status === 403,
    `Staff injecting permissions in request body -> 403 Forbidden`
  );

  // 8b. Staff injects permissions in query parameters
  const atk8QueryPerms = await fetch(`${BASE_URL}/api/suppliers?suppliers=true&permissions[suppliers]=true`, {
    headers: { Cookie: counterStaffAuth.cookieStr },
  });
  assert(
    atk8QueryPerms.status === 403,
    `Staff injecting permissions in query params -> 403 Forbidden`
  );

  // 8c. Staff injects permissions in headers
  const atk8HeaderPerms = await fetch(`${BASE_URL}/api/suppliers`, {
    headers: {
      Cookie: counterStaffAuth.cookieStr,
      "x-permissions": JSON.stringify({ suppliers: true, reports: true }),
      "x-role": "admin",
    },
  });
  assert(
    atk8HeaderPerms.status === 403,
    `Staff injecting permissions in headers -> 403 Forbidden`
  );

  // 8d. Staff calls PUT /api/users/:myId attempting to grant self all permissions
  const atk8SelfGrant = await fetch(`${BASE_URL}/api/users/${counterStaffData.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: counterStaffAuth.cookieStr,
    },
    body: JSON.stringify({
      permissions: {
        pos: true,
        workshop: true,
        inventory: true,
        customers: true,
        bills: true,
        mechanics: true,
        suppliers: true,
        reports: true,
        viewSalesAndProfit: true,
      },
    }),
  });
  assert(
    atk8SelfGrant.status === 403,
    `Staff calling PUT /api/users/:id to self-grant permissions -> 403 Forbidden`
  );

  // -------------------------------------------------------------------------
  // Attack 9: Staff Changes shopId (Multi-Tenancy Tampering)
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 9: Staff Changes shopId (REJECTED with 403)");

  // 9a. Query parameter cross-shop tampering
  const queryShopEndpoints = [
    { method: "GET", path: `/api/parts?shopId=${shopBId}` },
    { method: "GET", path: `/api/bills?shopId=${shopBId}` },
    { method: "GET", path: `/api/customers?shopId=${shopBId}` },
    { method: "GET", path: `/api/mechanics?shopId=${shopBId}` },
    { method: "GET", path: `/api/workshop?shopId=${shopBId}` },
    { method: "GET", path: `/api/stats?shopId=${shopBId}` },
    { method: "GET", path: `/api/suppliers?shopId=${shopBId}` },
    { method: "GET", path: `/api/users?shopId=${shopBId}` },
  ];

  for (const ep of queryShopEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.path}`, {
      headers: { Cookie: shopAAdminAuth.cookieStr },
    });
    assert(
      res.status === 403,
      `Cross-shop query tamper ${ep.method} ${ep.path} -> 403 Forbidden (status: ${res.status})`
    );
  }

  // 9b. Header cross-shop tampering
  const headerShopEndpoints = [
    { method: "GET", path: `/api/parts` },
    { method: "GET", path: `/api/bills` },
    { method: "GET", path: `/api/customers` },
    { method: "GET", path: `/api/stats` },
  ];

  for (const ep of headerShopEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.path}`, {
      headers: {
        Cookie: shopAAdminAuth.cookieStr,
        "x-shop-id": shopBId,
      },
    });
    assert(
      res.status === 403,
      `Cross-shop header tamper ${ep.method} ${ep.path} with x-shop-id -> 403 Forbidden (status: ${res.status})`
    );
  }

  // 9c. Request body cross-shop tampering
  const bodyShopEndpoints = [
    {
      method: "POST",
      path: "/api/parts",
      body: { name: "Illegal Part", category: "Engine & Transmission", sellingPrice: 500, purchasePrice: 300, currentStock: 10, supplierName: "Test", shopId: shopBId },
    },
    {
      method: "POST",
      path: "/api/bills",
      body: { customerName: "Illegal Bill", items: [], subtotal: 100, grandTotal: 100, paidAmount: 100, paymentMethod: "Cash", shopId: shopBId },
    },
    {
      method: "POST",
      path: "/api/customers",
      body: { name: "Illegal Customer", phone: "0300-0000000", bikeRegNumber: "KHI-99", bikeModel: "CD 70", shopId: shopBId },
    },
    {
      method: "POST",
      path: "/api/mechanics",
      body: { name: "Illegal Mechanic", phone: "0300-1111111", defaultShopCutPercentage: 30, shopId: shopBId },
    },
    {
      method: "POST",
      path: "/api/workshop",
      body: { bayNumber: 3, customerName: "Illegal Job", bikeRegNumber: "KHI-88", bikeModel: "CD 70", shopId: shopBId },
    },
    {
      method: "POST",
      path: "/api/suppliers",
      body: { supplierName: "Illegal Supplier", totalAmount: 5000, shopId: shopBId },
    },
    {
      method: "POST",
      path: "/api/parts/batches",
      body: { partId: samplePartAId, qtyPurchased: 10, costPrice: 100, supplier: "Test", shopId: shopBId },
    },
    {
      method: "POST",
      path: "/api/parts/returns",
      body: { partId: samplePartAId, quantity: 1, type: "adjustment", reason: "Test", shopId: shopBId },
    },
    {
      method: "POST",
      path: "/api/users",
      body: { username: "illegal_user", name: "Illegal User", password: "password123", role: "staff", shopId: shopBId },
    },
    {
      method: "PUT",
      path: `/api/users/${counterStaffData.id}`,
      body: { shopId: shopBId },
    },
  ];

  for (const ep of bodyShopEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.path}`, {
      method: ep.method,
      headers: {
        "Content-Type": "application/json",
        Cookie: shopAAdminAuth.cookieStr,
      },
      body: JSON.stringify(ep.body),
    });
    assert(
      res.status === 403,
      `Cross-shop body tamper ${ep.method} ${ep.path} with foreign shopId -> 403 Forbidden (status: ${res.status})`
    );
  }

  // -------------------------------------------------------------------------
  // Attack 10: Staff Changes Target User / Resource ID (IDOR / BOLA)
  // -------------------------------------------------------------------------
  console.log("\n📌 Attack 10: Staff Changes Target Resource ID (IDOR / BOLA REJECTED)");

  // 10a. Target foreign user ID in Shop B
  const shopBUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: shopBAdminAuth.cookieStr },
  });
  const shopBUsers = await shopBUsersRes.json();
  const foreignUserId = shopBUsers.length > 0 ? shopBUsers[0].id : "non-existent-user";

  const atk10UpdateUser = await fetch(`${BASE_URL}/api/users/${foreignUserId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({ name: "HACKED_FOREIGN_USER" }),
  });
  assert(
    atk10UpdateUser.status === 404 || atk10UpdateUser.status === 403,
    `IDOR: Update foreign shop user -> 404/403 (status: ${atk10UpdateUser.status})`
  );

  const atk10DeleteUser = await fetch(`${BASE_URL}/api/users/${foreignUserId}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10DeleteUser.status === 404 || atk10DeleteUser.status === 403,
    `IDOR: Delete foreign shop user -> 404/403 (status: ${atk10DeleteUser.status})`
  );

  // 10b. Target foreign customer ID in Shop B
  const atk10GetCust = await fetch(`${BASE_URL}/api/customers/${shopBCustomer.id}`, {
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10GetCust.status === 404,
    `IDOR: GET foreign shop customer -> 404 Not Found (status: ${atk10GetCust.status})`
  );

  const atk10UpdateCust = await fetch(`${BASE_URL}/api/customers/${shopBCustomer.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({ name: "HACKED_CUSTOMER_NAME" }),
  });
  assert(
    atk10UpdateCust.status === 400 || atk10UpdateCust.status === 404,
    `IDOR: PUT foreign shop customer -> 400/404 (status: ${atk10UpdateCust.status})`
  );

  const atk10DeleteCust = await fetch(`${BASE_URL}/api/customers/${shopBCustomer.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10DeleteCust.status === 400 || atk10DeleteCust.status === 404 || atk10DeleteCust.status === 200,
    `IDOR: DELETE foreign shop customer -> Scoped safely (status: ${atk10DeleteCust.status})`
  );
  // Verify foreign customer in Shop B was NOT deleted
  const verifyCustB = await fetch(`${BASE_URL}/api/customers/${shopBCustomer.id}`, {
    headers: { Cookie: shopBAdminAuth.cookieStr },
  });
  assert(verifyCustB.status === 200, `Shop B customer remains intact after Shop A delete attempt`);

  // 10c. Target foreign bill ID in Shop B
  const atk10GetBill = await fetch(`${BASE_URL}/api/bills/${shopBBill.id}`, {
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10GetBill.status === 404,
    `IDOR: GET foreign shop bill -> 404 Not Found (status: ${atk10GetBill.status})`
  );

  const atk10DeleteBill = await fetch(`${BASE_URL}/api/bills/${shopBBill.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10DeleteBill.status === 400 || atk10DeleteBill.status === 404 || atk10DeleteBill.status === 200,
    `IDOR: DELETE foreign shop bill -> Scoped safely (status: ${atk10DeleteBill.status})`
  );
  // Verify foreign bill in Shop B was NOT deleted
  const verifyBillB = await fetch(`${BASE_URL}/api/bills/${shopBBill.id}`, {
    headers: { Cookie: shopBAdminAuth.cookieStr },
  });
  assert(verifyBillB.status === 200, `Shop B bill remains intact after Shop A delete attempt`);

  const atk10CancelBill = await fetch(`${BASE_URL}/api/bills/${shopBBill.id}/cancel`, {
    method: "POST",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10CancelBill.status === 400 || atk10CancelBill.status === 404,
    `IDOR: Cancel foreign shop bill -> 400/404 (status: ${atk10CancelBill.status})`
  );

  // 10d. Target foreign part ID in Shop B
  const atk10GetPart = await fetch(`${BASE_URL}/api/parts/${shopBPart.id}`, {
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10GetPart.status === 404,
    `IDOR: GET foreign shop part -> 404 Not Found (status: ${atk10GetPart.status})`
  );

  const atk10UpdatePart = await fetch(`${BASE_URL}/api/parts/${shopBPart.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({ sellingPrice: 99999 }),
  });
  assert(
    atk10UpdatePart.status === 400 || atk10UpdatePart.status === 404,
    `IDOR: PUT foreign shop part -> 400/404 (status: ${atk10UpdatePart.status})`
  );

  const atk10StockDelta = await fetch(`${BASE_URL}/api/parts/${shopBPart.id}/stock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({ delta: 100 }),
  });
  assert(
    atk10StockDelta.status === 400 || atk10StockDelta.status === 404,
    `IDOR: POST /stock on foreign shop part -> 400/404 (status: ${atk10StockDelta.status})`
  );

  // 10e. Target foreign mechanic ID in Shop B
  const atk10GetMech = await fetch(`${BASE_URL}/api/mechanics/${shopBMechanic.id}`, {
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10GetMech.status === 404,
    `IDOR: GET foreign shop mechanic -> 404 Not Found (status: ${atk10GetMech.status})`
  );

  const atk10UpdateMech = await fetch(`${BASE_URL}/api/mechanics/${shopBMechanic.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({ name: "Hacked Mechanic Name" }),
  });
  assert(
    atk10UpdateMech.status === 400 || atk10UpdateMech.status === 404,
    `IDOR: PUT foreign shop mechanic -> 400/404 (status: ${atk10UpdateMech.status})`
  );

  const atk10PayoutMech = await fetch(`${BASE_URL}/api/mechanics/${shopBMechanic.id}/payout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({ amount: 1000 }),
  });
  assert(
    atk10PayoutMech.status === 400 || atk10PayoutMech.status === 404,
    `IDOR: Foreign mechanic payout strictly tenant-isolated (status: ${atk10PayoutMech.status})`
  );
  // Verify foreign shop ledger was NOT tampered
  const foreignLedgerRes = await fetch(`${BASE_URL}/api/mechanics/ledger?mechanicId=${shopBMechanic.id}`, {
    headers: { Cookie: shopBAdminAuth.cookieStr },
  });
  const foreignLedger = await foreignLedgerRes.json();
  const forgedPayout = foreignLedger.find((l) => l.notes?.includes("Embezzlement"));
  assert(!forgedPayout, `Shop B mechanic ledger was NOT modified by Shop A IDOR attack`);

  // 10f. Target foreign job card ID in Shop B
  const atk10GetJob = await fetch(`${BASE_URL}/api/workshop/${shopBJob.id}`, {
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10GetJob.status === 404,
    `IDOR: GET foreign shop job card -> 404 Not Found (status: ${atk10GetJob.status})`
  );

  const atk10UpdateJob = await fetch(`${BASE_URL}/api/workshop/${shopBJob.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({ status: "Cancelled" }),
  });
  assert(
    atk10UpdateJob.status === 400 || atk10UpdateJob.status === 404,
    `IDOR: PUT foreign shop job card -> 400/404 (status: ${atk10UpdateJob.status})`
  );

  const atk10ActionJob = await fetch(`${BASE_URL}/api/workshop/${shopBJob.id}/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({ action: "addPart", partId: samplePartAId, quantity: 1 }),
  });
  assert(
    atk10ActionJob.status === 400 || atk10ActionJob.status === 404,
    `IDOR: POST action on foreign shop job card -> 400/404 (status: ${atk10ActionJob.status})`
  );

  // 10g. Target foreign supplier credit ID in Shop B
  const atk10GetSupp = await fetch(`${BASE_URL}/api/suppliers/${shopBSupplier.id}`, {
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  assert(
    atk10GetSupp.status === 404,
    `IDOR: GET foreign shop supplier credit -> 404 Not Found (status: ${atk10GetSupp.status})`
  );

  const atk10UpdateSupp = await fetch(`${BASE_URL}/api/suppliers/${shopBSupplier.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: shopAAdminAuth.cookieStr,
    },
    body: JSON.stringify({ paidAmount: 99999 }),
  });
  assert(
    atk10UpdateSupp.status === 400 || atk10UpdateSupp.status === 404,
    `IDOR: PUT foreign shop supplier credit -> 400/404 (status: ${atk10UpdateSupp.status})`
  );

  // -------------------------------------------------------------------------
  // Cleanup Test Users & Data
  // -------------------------------------------------------------------------
  console.log("\n🧹 Cleaning up test users and temporary data...");
  await fetch(`${BASE_URL}/api/users/${counterStaffData.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  await fetch(`${BASE_URL}/api/users/${workshopStaffData.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });
  await fetch(`${BASE_URL}/api/users/${zeroPermData.id}`, {
    method: "DELETE",
    headers: { Cookie: shopAAdminAuth.cookieStr },
  });

  console.log("\n================================================================================");
  console.log(`🏁 STEP 4 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("================================================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
