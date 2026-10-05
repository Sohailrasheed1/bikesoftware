/**
 * Comprehensive Authentication Security Test Suite
 * Tests all required authentication security criteria:
 * 1. Correct stored password succeeds
 * 2. Wrong password fails
 * 3. Old hardcoded fallback passwords fail
 * 4. Missing/empty credentials fail
 * 5. Password shorter than 8 characters rejected by backend APIs
 * 6. Offline authentication bypass removed & restricted
 * 7. Invalid/malformed password hash handled safely
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

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
  console.log("🚀 STARTING AUTHENTICATION SECURITY AUDIT TEST SUITE");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("==========================================================\n");

  // -------------------------------------------------------------------------
  // 1. Correct password succeeds
  // -------------------------------------------------------------------------
  console.log("📌 Group 1: Correct Stored Password Authentication");
  {
    const adminLogin = await loginAndGetCookieJar("admin", "admin123");
    assert(adminLogin.isSuccess, "Admin login with correct password ('admin123') succeeds");

    const superLogin = await loginAndGetCookieJar("superadmin", "superadmin123");
    assert(superLogin.isSuccess, "Superadmin login with correct password ('superadmin123') succeeds");

    const staffLogin = await loginAndGetCookieJar("staff", "staff123");
    assert(staffLogin.isSuccess, "Staff login with correct password ('staff123') succeeds");

    const sohailLogin = await loginAndGetCookieJar("sohail", "sohail123");
    assert(sohailLogin.isSuccess, "Manager login with correct password ('sohail123') succeeds");
  }

  // -------------------------------------------------------------------------
  // 2. Wrong password fails
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 2: Wrong Password Authentication Must Fail");
  {
    const wrongAdmin = await loginAndGetCookieJar("admin", "wrong_password_999");
    assert(!wrongAdmin.isSuccess, "Admin login with wrong password fails safely");

    const wrongSuper = await loginAndGetCookieJar("superadmin", "invalid_super_pass");
    assert(!wrongSuper.isSuccess, "Superadmin login with wrong password fails safely");

    const wrongStaff = await loginAndGetCookieJar("staff", "random_wrong_pass");
    assert(!wrongStaff.isSuccess, "Staff login with wrong password fails safely");

    const wrongSohail = await loginAndGetCookieJar("sohail", "incorrect_secret");
    assert(!wrongSohail.isSuccess, "Manager login with wrong password fails safely");
  }

  // -------------------------------------------------------------------------
  // 3. Old hardcoded fallback passwords must fail
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 3: Old Hardcoded Passwords & Fallback Bypasses Must Fail");
  {
    const fallbackAdmin = await loginAndGetCookieJar("admin", "admin");
    assert(!fallbackAdmin.isSuccess, "Login using username as password ('admin') fails");

    const fallbackStaff = await loginAndGetCookieJar("staff", "staff");
    assert(!fallbackStaff.isSuccess, "Login using username as password ('staff') fails");

    const fallbackSohail = await loginAndGetCookieJar("sohail", "sohail");
    assert(!fallbackSohail.isSuccess, "Login using username as password ('sohail') fails");

    const fallbackSohailAdmin = await loginAndGetCookieJar("sohail", "admin123");
    assert(!fallbackSohailAdmin.isSuccess, "Sohail login using cross-account fallback ('admin123') fails");

    const fallbackSuperSuper = await loginAndGetCookieJar("superadmin", "superadmin");
    assert(!fallbackSuperSuper.isSuccess, "Superadmin login using 'superadmin' fails");

    const fallbackSuperAdmin123 = await loginAndGetCookieJar("superadmin", "admin123");
    assert(!fallbackSuperAdmin123.isSuccess, "Superadmin login using 'admin123' fails");

    const fallbackSuperSohail123 = await loginAndGetCookieJar("superadmin", "sohail123");
    assert(!fallbackSuperSohail123.isSuccess, "Superadmin login using 'sohail123' fails");
  }

  // -------------------------------------------------------------------------
  // 4. Missing credentials fail
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 4: Missing Credentials Must Fail");
  {
    const emptyPassword = await loginAndGetCookieJar("admin", "");
    assert(!emptyPassword.isSuccess, "Admin login with empty password fails");

    const emptyUsername = await loginAndGetCookieJar("", "admin123");
    assert(!emptyUsername.isSuccess, "Login with empty username fails");

    const nonExistentUser = await loginAndGetCookieJar("non_existent_user_xyz", "somepassword123");
    assert(!nonExistentUser.isSuccess, "Login for non-existent user fails");
  }

  // -------------------------------------------------------------------------
  // 5. Backend password validation (shorter than 8 characters rejected)
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 5: Backend Password Validation (Minimum 8 Characters Required)");
  {
    // Authenticate as shop admin
    const adminAuth = await loginAndGetCookieJar("admin", "admin123");
    assert(adminAuth.isSuccess, "Shop Admin session established for API authorization tests");

    // Test creating user with short password (< 8 chars)
    const shortUserRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminAuth.cookieStr,
      },
      body: JSON.stringify({
        username: `test_short_${Date.now()}`,
        name: "Short Pass User",
        password: "123", // 3 chars - below 8!
        role: "staff",
      }),
    });
    const shortUserData = await shortUserRes.json();
    assert(
      shortUserRes.status === 400 && shortUserData.error?.includes("8 characters"),
      `POST /api/users rejects password shorter than 8 chars (Status: ${shortUserRes.status}, Error: "${shortUserData.error}")`
    );

    // Test updating user with short password (< 8 chars)
    const shortUpdateRes = await fetch(`${BASE_URL}/api/users/user-2`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminAuth.cookieStr,
      },
      body: JSON.stringify({
        password: "abc", // 3 chars
      }),
    });
    const shortUpdateData = await shortUpdateRes.json();
    assert(
      shortUpdateRes.status === 400 && shortUpdateData.error?.includes("8 characters"),
      `PUT /api/users/:id rejects password shorter than 8 chars (Status: ${shortUpdateRes.status}, Error: "${shortUpdateData.error}")`
    );

    // Authenticate as Super Admin
    const superAuth = await loginAndGetCookieJar("superadmin", "superadmin123");
    assert(superAuth.isSuccess, "Super Admin session established for shop administration tests");

    // Test Super Admin reset password API with short password (< 8 chars)
    const shortResetRes = await fetch(`${BASE_URL}/api/super-admin/shops/shop-default/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: superAuth.cookieStr,
      },
      body: JSON.stringify({
        newPassword: "short", // 5 chars
      }),
    });
    const shortResetData = await shortResetRes.json();
    assert(
      shortResetRes.status === 400 && shortResetData.error?.includes("8 characters"),
      `POST /api/super-admin/shops/:id/reset-password rejects password shorter than 8 chars (Status: ${shortResetRes.status})`
    );

    // Test Super Admin create shop API with short admin password (< 8 chars)
    const shortShopRes = await fetch(`${BASE_URL}/api/super-admin/shops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: superAuth.cookieStr,
      },
      body: JSON.stringify({
        name: "Short Pass Shop",
        adminUsername: `short_shop_${Date.now()}`,
        adminPassword: "123", // 3 chars
      }),
    });
    const shortShopData = await shortShopRes.json();
    assert(
      shortShopRes.status === 400 && shortShopData.error?.includes("8 characters"),
      `POST /api/super-admin/shops rejects admin password shorter than 8 chars (Status: ${shortShopRes.status})`
    );
  }

  // -------------------------------------------------------------------------
  // 6. Offline authentication bypass inspection & verification
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 6: Offline Authentication Bypass Inspection");
  {
    const loginPageCode = fs.readFileSync(path.join(__dirname, "src/app/login/page.tsx"), "utf8");
    const shellCode = fs.readFileSync(path.join(__dirname, "src/components/layout/shell.tsx"), "utf8");
    const authCode = fs.readFileSync(path.join(__dirname, "src/lib/auth.ts"), "utf8");
    const useCurrentUserCode = fs.readFileSync(path.join(__dirname, "src/lib/hooks/useCurrentUser.ts"), "utf8");

    assert(
      !loginPageCode.includes("handleOfflineLogin"),
      "handleOfflineLogin is completely removed from src/app/login/page.tsx"
    );

    assert(
      !loginPageCode.includes("cachedUser.name"),
      "Name-based offline matching bypass is removed from login page"
    );

    assert(
      !authCode.includes("admin123") &&
      !authCode.includes("staff123") &&
      !authCode.includes("sohail123") &&
      !authCode.includes("superadmin123"),
      "No hardcoded fallback passwords exist in src/lib/auth.ts"
    );

    assert(
      !shellCode.includes("hasOfflineSession"),
      "Shell does not allow hasOfflineSession to bypass login redirect for unauthenticated users"
    );

    assert(
      !useCurrentUserCode.includes("offlineUser"),
      "useCurrentUser does not grant admin or superadmin privileges from localStorage"
    );
  }

  // -------------------------------------------------------------------------
  // 7. Invalid hash handling safely
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 7: Safe Handling of Corrupt / Malformed Password Hashes");
  {
    // Verify that non-matching hash string returns false safely in bcrypt
    const mismatch = bcrypt.compareSync("password123", "corrupted_non_hash_string");
    assert(mismatch === false, "Bcrypt compare on malformed hash string safely returns false without match");

    // Verify null or undefined hash throws in bcrypt and must be guarded
    let nullThrows = false;
    try {
      bcrypt.compareSync("password123", null);
    } catch {
      nullThrows = true;
    }
    assert(nullThrows, "Bcrypt throws on null hash and requires protective guard");

    // Check that auth.ts guards passwordHash string type and wraps bcrypt.compare in try/catch
    const authCode = fs.readFileSync(path.join(__dirname, "src/lib/auth.ts"), "utf8");
    const hasHashGuard = authCode.includes('typeof user.passwordHash !== "string"');
    const hasCatchBlock = authCode.includes("bcrypt.compare") && authCode.includes("catch");
    assert(hasHashGuard && hasCatchBlock, "auth.ts guards against null/non-string hashes and catches compare exceptions safely");
  }

  // -------------------------------------------------------------------------
  // 8. Production Secret & Credential Hardening Inspection
  // -------------------------------------------------------------------------
  console.log("\n📌 Group 8: Production Secret & Credential Hardening Inspection");
  {
    const authCode = fs.readFileSync(path.join(__dirname, "src/lib/auth.ts"), "utf8");
    const middlewareCode = fs.readFileSync(path.join(__dirname, "src/middleware.ts"), "utf8");
    const dbCode = fs.readFileSync(path.join(__dirname, "src/lib/server/db.ts"), "utf8");
    const envExampleCode = fs.readFileSync(path.join(__dirname, ".env.example"), "utf8");

    const oldSecret = "skander_spare_parts_super_secret_jwt_key_2026_xyz";
    assert(!authCode.includes(oldSecret), "auth.ts does not contain hardcoded default NEXTAUTH_SECRET");
    assert(!middlewareCode.includes(oldSecret), "middleware.ts does not contain hardcoded default NEXTAUTH_SECRET");
    assert(!envExampleCode.includes(oldSecret), ".env.example does not contain hardcoded default NEXTAUTH_SECRET");

    assert(
      authCode.includes('process.env.NODE_ENV === "production"') &&
      authCode.includes("throw new Error"),
      "auth.ts enforces NEXTAUTH_SECRET in production by throwing on missing variable"
    );

    assert(
      middlewareCode.includes('process.env.NODE_ENV === "production"') &&
      middlewareCode.includes("throw new Error"),
      "middleware.ts enforces NEXTAUTH_SECRET in production by throwing on missing variable"
    );

    assert(
      !dbCode.includes("// admin123") &&
      !dbCode.includes("// staff123") &&
      !dbCode.includes("// sohail123") &&
      !dbCode.includes("// superadmin123"),
      "src/lib/server/db.ts does not leak plaintext passwords in comments"
    );

    assert(
      dbCode.includes("SUPERADMIN_INITIAL_PASSWORD") &&
      dbCode.includes("ADMIN_INITIAL_PASSWORD"),
      "src/lib/server/db.ts supports environment-based initial passwords for seeding"
    );
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(`🏁 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("==========================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
