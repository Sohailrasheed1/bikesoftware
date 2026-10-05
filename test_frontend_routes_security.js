/**
 * Frontend Route Guards & Security Boundary Verification Test Suite
 *
 * Requirements Tested:
 * 1. Server Middleware Guard (First Line of Defense):
 *    - Unauthenticated attempts to access all protected frontend routes (/billing, /inventory, /workshop,
 *      /customers, /bills, /mechanics, /reports, /suppliers, /super-admin) redirect to /login with callbackUrl.
 *    - Unauthenticated attempts to internal APIs return 401 Unauthorized.
 * 2. Super Admin Isolation (Server-Side Middleware Boundary):
 *    - Shop Admin / Staff attempting to access /super-admin is redirected to / (Silently dropped).
 *    - Shop Admin / Staff attempting to call /api/super-admin endpoints receives 403 Forbidden.
 *    - Super Admin can successfully access /super-admin and /api/super-admin.
 * 3. Frontend Route Security Config & Granular UX Verification:
 *    - All 8 core modules (/billing, /inventory, /workshop, /customers, /bills, /mechanics, /reports, /suppliers)
 *      and /super-admin are verified.
 * 4. API Security Boundary (True Enforcement):
 *    - Even if a staff member attempts direct API calls for actions they don't have permissions for,
 *      the server API strictly enforces 403 Forbidden.
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
  console.log("🚀 STARTING FRONTEND ROUTE GUARDS & SECURITY BOUNDARY AUDIT");
  console.log("================================================================================\n");

  // -------------------------------------------------------------------------
  // TEST SECTION 1: Unauthenticated Navigation -> Middleware Redirection
  // -------------------------------------------------------------------------
  console.log("--- 1. Testing Unauthenticated Server Middleware Redirections ---");
  const protectedRoutes = [
    "/billing",
    "/inventory",
    "/workshop",
    "/customers",
    "/bills",
    "/mechanics",
    "/reports",
    "/suppliers",
    "/super-admin",
  ];

  for (const route of protectedRoutes) {
    const res = await fetch(`${BASE_URL}${route}`, {
      redirect: "manual",
    });

    const isRedirect = res.status === 307 || res.status === 302 || res.status === 308;
    const location = res.headers.get("location") || "";
    const hasLoginTarget = location.includes("/login");
    const hasCallback = location.includes(encodeURIComponent(route)) || location.includes(route);

    assert(
      isRedirect && hasLoginTarget && hasCallback,
      `Unauthenticated visit to ${route} redirects to login (Status: ${res.status}, Location: ${location})`
    );
  }

  // Verify internal API route returns 401 when unauthenticated
  const unauthApiRes = await fetch(`${BASE_URL}/api/bills`);
  assert(
    unauthApiRes.status === 401,
    `Unauthenticated visit to /api/bills returns 401 Unauthorized (Status: ${unauthApiRes.status})`
  );

  // -------------------------------------------------------------------------
  // TEST SECTION 2: Super Admin Isolation (Server-Side Boundary)
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Testing Super Admin Isolation (Server-Side) ---");

  // Login as shop admin ('admin' / 'admin123')
  const adminAuth = await loginAndGetCookieJar("admin", "admin123");
  assert(adminAuth.isSuccess, "Successfully authenticated as shop admin ('admin')");

  // Shop admin visiting /super-admin should be redirected to / (Silently dropped)
  const shopAdminSuperRouteRes = await fetch(`${BASE_URL}/super-admin`, {
    headers: { Cookie: adminAuth.cookieStr },
    redirect: "manual",
  });
  const shopAdminRedirectLocation = shopAdminSuperRouteRes.headers.get("location") || "";
  assert(
    shopAdminSuperRouteRes.status === 307 || shopAdminSuperRouteRes.status === 302,
    `Shop admin accessing /super-admin is intercepted by middleware (Status: ${shopAdminSuperRouteRes.status})`
  );
  assert(
    shopAdminRedirectLocation.endsWith("/") || shopAdminRedirectLocation === `${BASE_URL}/`,
    `Shop admin is silently dropped to dashboard root '/' (Location: ${shopAdminRedirectLocation})`
  );

  // Shop admin calling /api/super-admin/shops gets 403 Forbidden
  const shopAdminSuperApiRes = await fetch(`${BASE_URL}/api/super-admin/shops`, {
    headers: { Cookie: adminAuth.cookieStr },
  });
  assert(
    shopAdminSuperApiRes.status === 403,
    `Shop admin calling /api/super-admin/shops gets 403 Forbidden (Status: ${shopAdminSuperApiRes.status})`
  );

  // Super Admin visiting /super-admin should be allowed (Status 200)
  const superAuth = await loginAndGetCookieJar("superadmin", "superadmin123");
  assert(superAuth.isSuccess, "Successfully authenticated as superadmin ('superadmin')");

  const superAdminRouteRes = await fetch(`${BASE_URL}/super-admin`, {
    headers: { Cookie: superAuth.cookieStr },
    redirect: "manual",
  });
  assert(
    superAdminRouteRes.status === 200,
    `Super Admin accessing /super-admin is allowed by middleware (Status: ${superAdminRouteRes.status})`
  );

  const superAdminApiRes = await fetch(`${BASE_URL}/api/super-admin/shops`, {
    headers: { Cookie: superAuth.cookieStr },
  });
  assert(
    superAdminApiRes.status === 200,
    `Super Admin calling /api/super-admin/shops gets 200 OK (Status: ${superAdminApiRes.status})`
  );

  // -------------------------------------------------------------------------
  // TEST SECTION 3: Granular Staff Permissions vs Security Boundary
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Testing Granular Staff Permissions & Security Boundary ---");

  // Create a staff user with custom restricted permissions via admin
  const testStaffUsername = `test_staff_route_${Date.now()}`;
  const createStaffRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookieStr,
    },
    body: JSON.stringify({
      username: testStaffUsername,
      name: "Tariq Route Test Staff",
      password: "StaffPassword@123",
      role: "staff",
      permissions: {
        pos: true,
        workshop: true,
        inventory: false,
        customers: true,
        bills: true,
        mechanics: false,
        suppliers: false,
        reports: false,
        viewSalesAndProfit: false,
      },
    }),
  });
  assert(createStaffRes.status === 201, `Created test staff user '${testStaffUsername}' with restricted permissions`);

  // Authenticate as the new staff user
  const staffAuth = await loginAndGetCookieJar(testStaffUsername, "StaffPassword@123");
  assert(staffAuth.isSuccess, `Successfully authenticated as test staff user '${testStaffUsername}'`);

  // Verify session permissions match
  const staffSessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  const staffSession = await staffSessionRes.json();
  assert(staffSession?.user?.role === "staff", `Staff user role verified as 'staff'`);
  assert(staffSession?.user?.permissions?.suppliers === false, `Staff session permissions.suppliers === false`);
  assert(staffSession?.user?.permissions?.reports === false, `Staff session permissions.reports === false`);
  assert(staffSession?.user?.permissions?.inventory === false, `Staff session permissions.inventory === false`);

  // Verify Backend API Security Boundary for restricted modules:
  // 1. suppliers: false -> GET /api/suppliers returns 403 Forbidden
  const staffSuppliersApiRes = await fetch(`${BASE_URL}/api/suppliers`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(
    staffSuppliersApiRes.status === 403,
    `Backend Security Boundary: Staff with suppliers=false gets 403 Forbidden on /api/suppliers (Status: ${staffSuppliersApiRes.status})`
  );

  // 2. reports: false -> GET /api/reports/rate-history returns 403 Forbidden
  const staffReportsApiRes = await fetch(`${BASE_URL}/api/reports/rate-history`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(
    staffReportsApiRes.status === 403,
    `Backend Security Boundary: Staff with reports=false gets 403 Forbidden on /api/reports/rate-history (Status: ${staffReportsApiRes.status})`
  );

  // 3. viewSalesAndProfit: false -> GET /api/sales/details returns 403 Forbidden
  const staffSalesApiRes = await fetch(`${BASE_URL}/api/sales/details`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(
    staffSalesApiRes.status === 403,
    `Backend Security Boundary: Staff with viewSalesAndProfit=false gets 403 Forbidden on /api/sales/details (Status: ${staffSalesApiRes.status})`
  );

  // 4. Admin endpoints: staff calling /api/users gets 403 Forbidden
  const staffUsersApiRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(
    staffUsersApiRes.status === 403,
    `Backend Security Boundary: Staff calling admin-only /api/users gets 403 Forbidden (Status: ${staffUsersApiRes.status})`
  );

  // 5. Admin endpoints: staff calling /api/reset gets 403 Forbidden
  const staffResetApiRes = await fetch(`${BASE_URL}/api/reset`, {
    method: "POST",
    headers: { Cookie: staffAuth.cookieStr },
  });
  assert(
    staffResetApiRes.status === 403,
    `Backend Security Boundary: Staff calling admin-only /api/reset gets 403 Forbidden (Status: ${staffResetApiRes.status})`
  );

  // -------------------------------------------------------------------------
  // TEST SECTION 4: Frontend Route Security Configuration Verification
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Testing Frontend Route Guard Code & Shell Integration ---");
  const fs = require("fs");
  const moduleGuardFile = fs.readFileSync("./src/components/layout/module-guard.tsx", "utf8");
  const shellFile = fs.readFileSync("./src/components/layout/shell.tsx", "utf8");

  // Verify all 8 core shop routes + super-admin are configured in ROUTE_SECURITY_CONFIG
  const expectedRoutes = [
    "/billing",
    "/inventory",
    "/workshop",
    "/customers",
    "/bills",
    "/mechanics",
    "/reports",
    "/suppliers",
    "/super-admin",
  ];

  for (const r of expectedRoutes) {
    assert(
      moduleGuardFile.includes(`"${r}":`),
      `module-guard.tsx contains security configuration mapping for route '${r}'`
    );
  }

  // Verify RouteGuard is imported and used in shell.tsx
  assert(
    shellFile.includes('import { RouteGuard } from "./module-guard"'),
    "shell.tsx imports RouteGuard from './module-guard'"
  );
  assert(
    shellFile.includes("<RouteGuard pathname={pathname}>"),
    "shell.tsx wraps main children inside <RouteGuard pathname={pathname}>"
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`TOTAL TESTS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
  console.log("================================================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed with unhandled exception:", err);
  process.exit(1);
});
