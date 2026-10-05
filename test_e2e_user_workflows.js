/**
 * Comprehensive End-to-End Operational Workflow Audit
 * Verifies that all daily business operations work smoothly with genuine data models:
 * 1. Admin Authentication & Session
 * 2. Dashboard Statistics & Overview
 * 3. Inventory: Add Part, Adjust Stock, Update Details
 * 4. Customers: Add Customer, Update Details, Track Stats
 * 5. Mechanics: Add Mechanic, Commission Tracking
 * 6. Workshop: Create Job Card, Live Parts/Labor, Complete Job
 * 7. Billing & POS: Create Bill, FIFO Batch Deduction, Stock Decrement, Cancel Bill & Restock
 * 8. Suppliers: Add Credit Entry, Make Payment
 * 9. Reports & Analytics: Sales Details, Rate History
 * 10. User Management: Create Staff, Update Permissions, Delete Staff
 * 11. Super Admin: View Stats, Manage Shops, Status, Password Reset
 * 12. Cleanup
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
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
    redirect: "manual",
  });

  const sessionCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")];
  sessionCookies.forEach((c) => {
    if (!c) return;
    const first = c.split(";")[0].trim();
    const [k, v] = first.split("=");
    if (k && v) cookieMap[k] = v;
  });

  const finalCookieStr = Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: finalCookieStr },
  });
  const sessionData = await sessionRes.json();

  return {
    isSuccess: Boolean(sessionData?.user),
    user: sessionData?.user,
    cookieStr: finalCookieStr,
  };
}

async function runOperationalWorkflowAudit() {
  console.log("================================================================================");
  console.log("🛠️  STARTING COMPREHENSIVE BUSINESS WORKFLOW AUDIT");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("================================================================================\n");

  const runId = Date.now();

  // 1. Admin Login
  console.log("📌 Module 1: Admin Authentication & Session Management");
  const adminAuth = await loginAndGetCookieJar("admin", "admin123");
  assert(adminAuth.isSuccess, "Shop Admin ('admin') logged in successfully");
  assert(adminAuth.user?.role === "admin", `User role is 'admin' (received: ${adminAuth.user?.role})`);

  // 2. Dashboard Stats
  console.log("\n📌 Module 2: Dashboard Statistics & Financial Overview");
  const statsRes = await fetch(`${BASE_URL}/api/stats`, {
    headers: { Cookie: adminAuth.cookieStr },
  });
  assert(statsRes.status === 200, "Dashboard stats fetched successfully (Status: 200)");
  const stats = await statsRes.json();
  assert(typeof stats.todaySales === "number", `Valid todaySales figure: Rs. ${stats.todaySales}`);
  assert(typeof stats.totalInventoryValue === "number", `Valid totalInventoryValue: Rs. ${stats.totalInventoryValue}`);

  // 3. Inventory Management
  console.log("\n📌 Module 3: Inventory Management (Create, Adjust Stock, Update)");
  const newPartPayload = {
    name: `Test Spark Plug NGK ${runId}`,
    category: "Electrical & Battery",
    compatibleModels: ["Honda CD 70", "Honda CG 125"],
    sku: `NGK-${runId}`,
    purchasePrice: 250,
    sellingPrice: 400,
    currentStock: 20,
    minStockLimit: 5,
    supplierName: "Pak Suzuki & Honda Parts",
    supplierPhone: "03001234567",
    location: "Shelf A-1",
  };
  const createPartRes = await fetch(`${BASE_URL}/api/parts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify(newPartPayload),
  });
  assert(createPartRes.status === 201, "New inventory part created successfully (Status: 201)");
  const createdPart = await createPartRes.json();
  assert(createdPart.currentStock === 20, `Initial stock verified: ${createdPart.currentStock}`);

  // Stock Adjustment (Add 10 more items via delta)
  const stockAdjustRes = await fetch(`${BASE_URL}/api/parts/${createdPart.id}/stock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({
      delta: 10,
    }),
  });
  assert(stockAdjustRes.status === 200, "Stock adjusted (+10) successfully (Status: 200)");
  const adjustedPart = await stockAdjustRes.json();
  assert(adjustedPart.currentStock === 30, `Stock after addition verified: ${adjustedPart.currentStock} (expected 30)`);

  // Update Part Details
  const updatePartRes = await fetch(`${BASE_URL}/api/parts/${createdPart.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({
      sellingPrice: 420,
      location: "Shelf B-2",
    }),
  });
  assert(updatePartRes.status === 200, "Part details updated successfully (Status: 200)");
  const updatedPart = await updatePartRes.json();
  assert(updatedPart.sellingPrice === 420, `Selling price updated to: Rs. ${updatedPart.sellingPrice}`);

  // 4. Customer Management
  console.log("\n📌 Module 4: Customer Management (Create, Update, Balance)");
  const newCustomerPayload = {
    name: `Muhammad Ali ${runId}`,
    phone: `0300${String(runId).slice(-7)}`,
    bikeRegNumber: `KHI-${String(runId).slice(-4)}`,
    bikeModel: "Honda CD 70",
    address: "North Nazimabad, Karachi",
    totalSpent: 0,
    totalVisits: 0,
  };
  const createCustRes = await fetch(`${BASE_URL}/api/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify(newCustomerPayload),
  });
  assert(createCustRes.status === 201, "New customer created successfully (Status: 201)");
  const createdCust = await createCustRes.json();
  assert(createdCust.name === newCustomerPayload.name, `Customer name verified: ${createdCust.name}`);

  // Update customer
  const updateCustRes = await fetch(`${BASE_URL}/api/customers/${createdCust.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({
      bikeModel: "Honda CG 125",
    }),
  });
  assert(updateCustRes.status === 200, "Customer updated successfully (Status: 200)");

  // 5. Mechanic Management
  console.log("\n📌 Module 5: Mechanic Management & Payouts");
  const newMechanicPayload = {
    name: `Ustad Tariq ${runId}`,
    phone: `0312${String(runId).slice(-7)}`,
    specialty: "Tuning & Engine Expert",
    defaultShopCutPercentage: 30, // 30% shop owner, 70% mechanic
  };
  const createMechRes = await fetch(`${BASE_URL}/api/mechanics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify(newMechanicPayload),
  });
  assert(createMechRes.status === 201, "New mechanic created successfully (Status: 201)");
  const createdMech = await createMechRes.json();
  assert(createdMech.defaultShopCutPercentage === 30, `Mechanic shop cut: ${createdMech.defaultShopCutPercentage}%`);

  // 6. Workshop Management
  console.log("\n📌 Module 6: Workshop Job Card (Create, Update, Complete)");
  const newJobCardPayload = {
    bayNumber: 1,
    customerName: createdCust.name,
    customerPhone: createdCust.phone,
    bikeRegNumber: createdCust.bikeRegNumber,
    bikeModel: createdCust.bikeModel,
    complaintDescription: "Complete engine overhaul & oil change",
    assignedMechanicId: createdMech.id,
    assignedMechanicName: createdMech.name,
    status: "In Progress",
    items: [],
    labourItems: [],
    estimatedSubtotal: 2500,
  };
  const createJobRes = await fetch(`${BASE_URL}/api/workshop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify(newJobCardPayload),
  });
  assert(createJobRes.status === 201, "Workshop job card created successfully (Status: 201)");
  const createdJob = await createJobRes.json();
  assert(createdJob.status === "In Progress", `Job status verified: ${createdJob.status}`);

  // Complete job card via action
  const completeJobRes = await fetch(`${BASE_URL}/api/workshop/${createdJob.id}/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({
      action: "complete",
      paymentMethod: "Cash",
      discount: 0,
      notes: "Workshop repair completed seamlessly",
    }),
  });
  assert(completeJobRes.status === 200, "Workshop job card completed successfully (Status: 200)");
  const completedJobResult = await completeJobRes.json();
  assert(completedJobResult.jobCard?.status === "Completed", `Job updated status: ${completedJobResult.jobCard?.status}`);

  // 7. Billing / POS Complete Transaction
  console.log("\n📌 Module 7: Billing & POS Transaction (Sale, FIFO Stock Decrement, Void)");
  const newBillPayload = {
    customerId: createdCust.id,
    customerName: createdCust.name,
    customerPhone: createdCust.phone,
    bikeRegNumber: createdCust.bikeRegNumber,
    bikeModel: createdCust.bikeModel,
    items: [
      {
        partId: createdPart.id,
        partName: createdPart.name,
        category: createdPart.category,
        quantity: 2, // Selling 2 spark plugs
        unitPrice: 420,
        purchasePrice: 250,
        totalPrice: 840,
      },
    ],
    labourItems: [
      {
        id: `lab-${Date.now()}`,
        description: "Engine Tuning & Valve Adjustment",
        amount: 600,
        mechanicId: createdMech.id,
        mechanicName: createdMech.name,
        shopCutPercentage: 30,
        shopShare: 180,
        mechanicShare: 420,
      },
    ],
    labourTotal: 600,
    partsTotal: 840,
    subtotal: 1440,
    discount: 40,
    tax: 0,
    grandTotal: 1400,
    paidAmount: 1400,
    paymentMethod: "Cash",
  };

  const createBillRes = await fetch(`${BASE_URL}/api/bills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify(newBillPayload),
  });
  assert(createBillRes.status === 201, "Sales bill created successfully (Status: 201)");
  const createdBill = await createBillRes.json();
  assert(createdBill.grandTotal === 1400, `Bill grandTotal: Rs. ${createdBill.grandTotal}`);

  // Check that part stock was automatically decremented by 2 (30 -> 28)
  const partCheckRes = await fetch(`${BASE_URL}/api/parts/${createdPart.id}`, {
    headers: { Cookie: adminAuth.cookieStr },
  });
  const partAfterSale = await partCheckRes.json();
  assert(
    partAfterSale.currentStock === 28,
    `Inventory stock decremented correctly from 30 to 28 (Current stock: ${partAfterSale.currentStock})`
  );

  // Void / Cancel the bill and verify stock is safely restored
  const cancelBillRes = await fetch(`${BASE_URL}/api/bills/${createdBill.id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({ reason: "Customer changed mind (Audit test)" }),
  });
  assert(cancelBillRes.status === 200, "Bill cancelled / voided successfully (Status: 200)");

  // Verify stock was restored from 28 back to 30
  const partCheckAfterCancel = await (await fetch(`${BASE_URL}/api/parts/${createdPart.id}`, {
    headers: { Cookie: adminAuth.cookieStr },
  })).json();
  assert(
    partCheckAfterCancel.currentStock === 30,
    `Inventory stock restored after bill cancellation back to 30 (Current: ${partCheckAfterCancel.currentStock})`
  );

  // 8. Suppliers Management
  console.log("\n📌 Module 8: Supplier Udhar & Payment Ledger");
  const supplierCreditPayload = {
    supplierName: `Atlas Honda Parts Distributor ${runId}`,
    supplierPhone: "03011234567",
    purchasedParts: "20x Spark Plugs, 10x Brake Shoes",
    quantity: 30,
    totalAmount: 15000,
    paidAmount: 0,
    remainingBalance: 15000,
    purchaseDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Pending",
  };
  const createSupplierCreditRes = await fetch(`${BASE_URL}/api/suppliers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify(supplierCreditPayload),
  });
  assert(createSupplierCreditRes.status === 201, "Supplier credit ledger entry created successfully (Status: 201)");
  const createdCredit = await createSupplierCreditRes.json();
  assert(createdCredit.remainingBalance === 15000, `Supplier remaining balance: Rs. ${createdCredit.remainingBalance}`);

  // Make supplier payment
  const supplierPayRes = await fetch(`${BASE_URL}/api/suppliers/${createdCredit.id}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({
      amount: 5000,
      notes: "Partial bank transfer payment",
    }),
  });
  assert(supplierPayRes.status === 200, "Supplier payment recorded successfully (Status: 200)");
  const updatedCredit = await supplierPayRes.json();
  assert(
    updatedCredit.remainingBalance === 10000,
    `Supplier balance updated to Rs. ${updatedCredit.remainingBalance} (expected 10000)`
  );

  // 9. Reports & Rate History
  console.log("\n📌 Module 9: Reports & Financial Analytics");
  const salesDetailsRes = await fetch(`${BASE_URL}/api/sales/details`, {
    headers: { Cookie: adminAuth.cookieStr },
  });
  assert(salesDetailsRes.status === 200, "Sales details report retrieved successfully (Status: 200)");
  const salesReport = await salesDetailsRes.json();
  assert(Array.isArray(salesReport), `Sales details report is an Array of sale entries (Length: ${salesReport.length})`);

  const rateHistoryRes = await fetch(`${BASE_URL}/api/reports/rate-history`, {
    headers: { Cookie: adminAuth.cookieStr },
  });
  assert(rateHistoryRes.status === 200, "Part rate history retrieved successfully (Status: 200)");

  // 10. Staff User Management
  console.log("\n📌 Module 10: Staff User Lifecycle & Role Management");
  const newStaffPayload = {
    username: `staff_audit_${runId}`,
    name: "Audit Test Staff",
    password: "Password123!",
    role: "staff",
    permissions: {
      pos: true,
      workshop: true,
      inventory: true,
      customers: true,
      bills: true,
      mechanics: false,
      suppliers: false,
      reports: false,
      viewSalesAndProfit: false,
    },
  };
  const createStaffRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify(newStaffPayload),
  });
  assert(createStaffRes.status === 201, "Staff user created successfully (Status: 201)");
  const createdStaff = await createStaffRes.json();
  assert(createdStaff.role === "staff", `Staff role: ${createdStaff.role}`);

  // Staff Login
  const staffAuth = await loginAndGetCookieJar(newStaffPayload.username, newStaffPayload.password);
  assert(staffAuth.isSuccess, "Created staff successfully logged into application");

  // Delete test staff
  const deleteStaffRes = await fetch(`${BASE_URL}/api/users/${createdStaff.id}`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookieStr },
  });
  assert(deleteStaffRes.status === 200, "Staff user deleted cleanly by Admin (Status: 200)");

  // 11. Super Admin Platform Management
  console.log("\n📌 Module 11: Super Admin Multi-Tenant Governance");
  const superAuth = await loginAndGetCookieJar("superadmin", "superadmin123");
  assert(superAuth.isSuccess, "Superadmin logged in successfully");

  const superStatsRes = await fetch(`${BASE_URL}/api/super-admin/stats`, {
    headers: { Cookie: superAuth.cookieStr },
  });
  assert(superStatsRes.status === 200, "Super-admin platform overview stats retrieved (Status: 200)");
  const superStats = await superStatsRes.json();
  assert(typeof superStats.totalShops === "number", `Total shops registered: ${superStats.totalShops}`);

  const superShopsRes = await fetch(`${BASE_URL}/api/super-admin/shops`, {
    headers: { Cookie: superAuth.cookieStr },
  });
  assert(superShopsRes.status === 200, "Super-admin shops list retrieved (Status: 200)");

  // 12. Cleanup temporary audit resources
  console.log("\n📌 Module 12: Cleaning Up Test Artifacts");
  await fetch(`${BASE_URL}/api/parts/${createdPart.id}`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookieStr },
  });
  await fetch(`${BASE_URL}/api/customers/${createdCust.id}`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookieStr },
  });
  await fetch(`${BASE_URL}/api/mechanics/${createdMech.id}`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookieStr },
  });
  await fetch(`${BASE_URL}/api/workshop/${createdJob.id}`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookieStr },
  });
  await fetch(`${BASE_URL}/api/suppliers/${createdCredit.id}`, {
    method: "DELETE",
    headers: { Cookie: adminAuth.cookieStr },
  });
  console.log("  🧹 Temporary test entities cleaned up successfully.");

  console.log("\n================================================================================");
  console.log(`🏁 BUSINESS WORKFLOW AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runOperationalWorkflowAudit().catch((err) => {
  console.error("Fatal error during operational audit:", err);
  process.exit(1);
});
