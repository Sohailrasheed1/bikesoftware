import bcrypt from "bcryptjs";
import {
  Part,
  Customer,
  Bill,
  BillItem,
  SupplierCredit,
  DashboardStats,
  Mechanic,
  MechanicLedgerEntry,
  VehicleJobCard,
  DbUser,
  Shop,
  SaaSStats,
  PurchaseBatch,
  SaleDetail,
  StockAdjustment,
  RateHistoryEntry,
  UserPermissions,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from "@/types";
import {
  SEED_PARTS,
  SEED_CUSTOMERS,
  SEED_BILLS,
  SEED_SUPPLIER_CREDITS,
  SEED_MECHANICS,
  SEED_MECHANIC_LEDGER,
  SEED_JOB_CARDS,
} from "../storage/seed-data";
import { daysSince, getLocalDateString } from "../utils";
import { getDb, isMongoConfigured, assertMongoConfiguredForProduction } from "./mongodb";
import { ObjectId } from "mongodb";

/** Block silent in-memory auth/data fallback when live. */
function denyMemoryInProduction(operation: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Database unavailable (${operation}). Configure a working MONGODB_URI — in-memory fallback is disabled in production.`
    );
  }
}

export const DEFAULT_SHOP_ID = "shop-sikandar";

export const INITIAL_SEEDED_SHOPS: Shop[] = [
  {
    id: DEFAULT_SHOP_ID,
    slug: "jilani-autos",
    name: "Jilani Autos",
    urduName: "جیلانی آٹوز",
    ownerName: "Jilani Khan",
    phone: "0300-1234567",
    address: "Shop # 12, Akbar Road, Karachi",
    city: "Karachi",
    status: "active",
    monthlyRent: 5000,
    billingCycle: "monthly",
    subscriptionStart: "2026-01-01T00:00:00.000Z",
    subscriptionEnd: "2026-12-31T23:59:59.000Z",
    adminUserId: "user-1",
    adminUsername: "admin",
    notes: "Primary workshop and spare parts store",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const INITIAL_SEEDED_USERS: DbUser[] = [
  {
    id: "superadmin-1",
    username: "superadmin",
    email: "superadmin@bikesoftware.pk",
    name: "Platform Super Admin (SaaS Owner)",
    passwordHash: "$2b$10$OFJLNjQsRoOVzXG5470vmevVYsx0Mf7c9sXAn7H/cyVPDwB0sR8Me",
    role: "superadmin",
    permissions: DEFAULT_ADMIN_PERMISSIONS,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-1",
    username: "admin",
    email: "admin@jilaniautos.pk",
    name: "Jilani Autos (Owner / Admin)",
    passwordHash: "$2b$10$/TdBaVILa4hlavuMZ7KszOzQjqOoP6UTWYiFHnIgoZCK73eSePstO",
    role: "admin",
    permissions: DEFAULT_ADMIN_PERMISSIONS,
    shopId: DEFAULT_SHOP_ID,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-2",
    username: "staff",
    email: "staff@jilaniautos.pk",
    name: "Shop Assistant",
    passwordHash: "$2b$10$B5DC9cIhM7CFDD9ctNp4heu1I0VI8JJztHHYM.n0yYu8reys9BtcG",
    role: "staff",
    permissions: DEFAULT_STAFF_PERMISSIONS,
    shopId: DEFAULT_SHOP_ID,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-3",
    username: "sohail",
    email: "sohail@jilaniautos.pk",
    name: "Sohail Rasheed (Manager)",
    passwordHash: "$2b$10$5E36laiLZB1TvhjGpqwKKek2Y3kvKBDN0N3Lq1E/VAm0.ZJSgEEem",
    role: "admin",
    permissions: DEFAULT_ADMIN_PERMISSIONS,
    shopId: DEFAULT_SHOP_ID,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

// Helper to construct multi-tenant query filter
export function getShopFilter(shopId?: string): Record<string, any> {
  const target = shopId || DEFAULT_SHOP_ID;
  if (target === DEFAULT_SHOP_ID) {
    // Legacy documents in DB created without shopId automatically belong to default shop
    return {
      $or: [
        { shopId: DEFAULT_SHOP_ID },
        { shopId: { $exists: false } },
        { shopId: null },
      ],
    };
  }
  return { shopId: target };
}

function matchesShop(itemShopId: string | undefined, shopId?: string): boolean {
  const target = shopId || DEFAULT_SHOP_ID;
  if (target === DEFAULT_SHOP_ID) {
    return !itemShopId || itemShopId === DEFAULT_SHOP_ID;
  }
  return itemShopId === target;
}

// In-memory fallback if MONGODB_URI is not yet provided
class MemoryStore {
  shops: Shop[] = [...INITIAL_SEEDED_SHOPS];
  parts: Part[] = SEED_PARTS.map((p) => ({ ...p, shopId: DEFAULT_SHOP_ID }));
  customers: Customer[] = SEED_CUSTOMERS.map((c) => ({ ...c, shopId: DEFAULT_SHOP_ID }));
  bills: Bill[] = SEED_BILLS.map((b) => ({ ...b, shopId: DEFAULT_SHOP_ID }));
  supplierCredits: SupplierCredit[] = SEED_SUPPLIER_CREDITS.map((s) => ({ ...s, shopId: DEFAULT_SHOP_ID }));
  mechanics: Mechanic[] = SEED_MECHANICS.map((m) => ({ ...m, shopId: DEFAULT_SHOP_ID }));
  mechanicLedger: MechanicLedgerEntry[] = SEED_MECHANIC_LEDGER.map((l) => ({ ...l, shopId: DEFAULT_SHOP_ID }));
  jobCards: VehicleJobCard[] = SEED_JOB_CARDS.map((j) => ({ ...j, shopId: DEFAULT_SHOP_ID }));
  users: DbUser[] = [...INITIAL_SEEDED_USERS];
  purchaseBatches: PurchaseBatch[] = [];
  saleDetails: SaleDetail[] = [];
  stockAdjustments: StockAdjustment[] = [];
}

const memoryStore = new MemoryStore();

class MongoDBAtlasDatabase {
  // --- SHOPS & SAAS MANAGEMENT ---
  async getShops(): Promise<Shop[]> {
    if (isMongoConfigured()) {
      try {
        await this.ensureInitialShops();
        const db = await getDb();
        const shops = await db.collection<Shop>("shops").find({}).sort({ createdAt: -1 }).toArray();
        return shops.map(({ _id, ...rest }: any) => rest as Shop);
      } catch (err) {
        console.error("MongoDB getShops error (falling back to memoryStore):", err);
      }
    }
    return memoryStore.shops;
  }

  async getShop(id: string): Promise<Shop | null> {
    if (isMongoConfigured()) {
      try {
        await this.ensureInitialShops();
        const db = await getDb();
        const shop = await db.collection<Shop>("shops").findOne({ id });
        if (shop) {
          const { _id, ...rest } = shop as any;
          return rest as Shop;
        }
      } catch (err) {
        console.error("MongoDB getShop error (falling back to memoryStore):", err);
      }
    }
    return memoryStore.shops.find((s) => s.id === id) || null;
  }

  async createShop(
    shopData: Omit<Shop, "id" | "createdAt" | "updatedAt">,
    adminUser: { username: string; password: string; name?: string; email?: string },
    seedSampleParts: boolean = true
  ): Promise<{ shop: Shop; user: DbUser }> {
    const cleanUsername = adminUser.username.toLowerCase().trim();
    if (!adminUser.password || typeof adminUser.password !== "string" || adminUser.password.length < 8) {
      throw new Error("Password kam az kam 8 characters ka hona chahiye.");
    }
    const existingUser = await this.getUserByUsernameOrEmail(cleanUsername);
    if (existingUser) {
      throw new Error(`Username "${cleanUsername}" is already taken. Please choose another.`);
    }

    const shopId = `shop-${Date.now()}`;
    const now = new Date().toISOString();
    const newShop: Shop = {
      ...shopData,
      id: shopId,
      slug: shopData.slug || shopData.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      status: shopData.status || "active",
      monthlyRent: Number(shopData.monthlyRent) || 0,
      adminUsername: cleanUsername,
      createdAt: now,
      updatedAt: now,
    };

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminUser.password, salt);

    const newUser: DbUser = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      email: adminUser.email || `${cleanUsername}@bikesoftware.pk`,
      name: adminUser.name || shopData.ownerName || shopData.name,
      passwordHash,
      role: "admin",
      shopId,
      createdAt: now,
      updatedAt: now,
    };

    newShop.adminUserId = newUser.id;

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("shops").insertOne(newShop as any);
      await db.collection("users").insertOne(newUser as any);

      if (seedSampleParts && SEED_PARTS.length > 0) {
        const seededParts = SEED_PARTS.map((p, idx) => ({
          ...p,
          id: `part-${Date.now()}-${idx}`,
          shopId,
          createdAt: now,
          updatedAt: now,
        }));
        await db.collection("parts").insertMany(seededParts as any);
      }
    } else {
      memoryStore.shops.unshift(newShop);
      memoryStore.users.push(newUser);
      if (seedSampleParts && SEED_PARTS.length > 0) {
        const seededParts = SEED_PARTS.map((p, idx) => ({
          ...p,
          id: `part-${Date.now()}-${idx}`,
          shopId,
          createdAt: now,
          updatedAt: now,
        }));
        memoryStore.parts.push(...seededParts);
      }
    }

    return { shop: newShop, user: newUser };
  }

  async updateShop(id: string, updates: Partial<Shop>): Promise<Shop> {
    const updatedAt = new Date().toISOString();
    if (isMongoConfigured()) {
      const db = await getDb();
      const res = await db.collection<Shop>("shops").findOneAndUpdate(
        { id },
        { $set: { ...updates, updatedAt } },
        { returnDocument: "after" }
      );
      if (!res) throw new Error("Shop not found");
      const { _id, ...rest } = res as any;
      return rest as Shop;
    }
    const idx = memoryStore.shops.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Shop not found");
    const updated = { ...memoryStore.shops[idx], ...updates, updatedAt };
    memoryStore.shops[idx] = updated;
    return updated;
  }

  async updateShopStatus(id: string, status: "active" | "suspended" | "expired"): Promise<Shop> {
    return this.updateShop(id, { status });
  }

  async resetShopAdminPassword(shopId: string, newPassword: string): Promise<boolean> {
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      throw new Error("Password kam az kam 8 characters ka hona chahiye.");
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const updatedAt = new Date().toISOString();

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("users").updateOne(
        { shopId, role: "admin" },
        { $set: { passwordHash, updatedAt } }
      );
      return true;
    }

    const user = memoryStore.users.find((u) => u.shopId === shopId && u.role === "admin");
    if (user) {
      user.passwordHash = passwordHash;
      user.updatedAt = updatedAt;
      return true;
    }
    return false;
  }

  async deleteShop(id: string): Promise<boolean> {
    if (id === DEFAULT_SHOP_ID) {
      throw new Error("Cannot delete primary default shop.");
    }
    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("shops").deleteOne({ id });
      await db.collection("users").deleteMany({ shopId: id });
      await db.collection("parts").deleteMany({ shopId: id });
      await db.collection("customers").deleteMany({ shopId: id });
      await db.collection("bills").deleteMany({ shopId: id });
      await db.collection("supplierCredits").deleteMany({ shopId: id });
      await db.collection("mechanics").deleteMany({ shopId: id });
      await db.collection("mechanicLedger").deleteMany({ shopId: id });
      await db.collection("jobCards").deleteMany({ shopId: id });
      return true;
    }

    memoryStore.shops = memoryStore.shops.filter((s) => s.id !== id);
    memoryStore.users = memoryStore.users.filter((u) => u.shopId !== id);
    memoryStore.parts = memoryStore.parts.filter((p) => p.shopId !== id);
    memoryStore.customers = memoryStore.customers.filter((c) => c.shopId !== id);
    memoryStore.bills = memoryStore.bills.filter((b) => b.shopId !== id);
    memoryStore.supplierCredits = memoryStore.supplierCredits.filter((s) => s.shopId !== id);
    memoryStore.mechanics = memoryStore.mechanics.filter((m) => m.shopId !== id);
    memoryStore.mechanicLedger = memoryStore.mechanicLedger.filter((l) => l.shopId !== id);
    memoryStore.jobCards = memoryStore.jobCards.filter((j) => j.shopId !== id);
    return true;
  }

  async getUsersByShop(shopId: string): Promise<Omit<DbUser, "passwordHash">[]> {
    if (isMongoConfigured()) {
      const db = await getDb();
      await this.ensureInitialUsers();
      // CRITICAL: Superadmin is a platform account and must NEVER be returned as a shop user!
      const shopFilter = getShopFilter(shopId);
      const users = await db
        .collection<DbUser>("users")
        .find({
          $and: [shopFilter, { role: { $ne: "superadmin" } }],
        })
        .toArray();
      return users.map(({ _id, passwordHash, ...rest }: any) => {
        const u = {
          ...rest,
          id: rest.id || _id?.toString() || rest.username,
        } as DbUser;
        if (!u.permissions) {
          u.permissions = u.role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS;
        }
        return u;
      });
    }
    return memoryStore.users
      .filter((u) => u.role !== "superadmin" && matchesShop(u.shopId, shopId))
      .map(({ passwordHash, ...u }) => {
        if (!u.permissions) {
          u.permissions = u.role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS;
        }
        return u as any;
      });
  }

  async createUserForShop(
    data: {
      username: string;
      email?: string;
      name: string;
      password: string;
      role: "admin" | "staff" | "superadmin";
      permissions?: UserPermissions;
    },
    shopId: string,
    isSuperAdmin: boolean = false
  ): Promise<Omit<DbUser, "passwordHash">> {
    const cleanUsername = data.username.toLowerCase().trim();
    if (!cleanUsername) throw new Error("Username darj karna zaroori hai.");

    // Strict Super Admin Protection: Nobody can EVER create a superadmin user or take the superadmin username
    if (data.role === "superadmin" || cleanUsername === "superadmin") {
      throw new Error("Access denied. Shop admin superadmin ya unauthorized role assign nahi kar sakta.");
    }
    if (!["admin", "staff"].includes(data.role)) {
      throw new Error("Access denied. Ghair tasdeeq shuda role assign nahi kiya ja sakta.");
    }

    if (!data.password || typeof data.password !== "string" || data.password.length < 8) {
      throw new Error("Password kam az kam 8 characters ka hona chahiye.");
    }
    if (!data.name.trim()) throw new Error("Staff / User ka naam darj karein.");

    // Check uniqueness
    const existing = await this.getUserByUsernameOrEmail(cleanUsername);
    if (existing) {
      throw new Error(`"${cleanUsername}" username pehle se istemal mein hai. Koi mukhtalif username chunein.`);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const permissions: UserPermissions = data.permissions || (
      data.role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS
    );

    const newUser: DbUser = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      email: data.email?.trim() || `${cleanUsername}@jilaniautos.pk`,
      name: data.name.trim(),
      passwordHash,
      role: data.role,
      permissions,
      shopId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("users").insertOne(newUser as any);
    }
    memoryStore.users.push(newUser);

    const { passwordHash: _, ...sanitized } = newUser;
    return sanitized;
  }

  async getUserForShop(userId: string, shopId: string, isSuperAdmin: boolean = false): Promise<DbUser | null> {
    const cleanId = String(userId).trim();
    if (isMongoConfigured()) {
      const db = await getDb();
      const idConditions: any[] = [
        { id: cleanId },
        { username: cleanId.toLowerCase() },
      ];
      if (ObjectId.isValid(cleanId)) {
        try {
          idConditions.push({ _id: new ObjectId(cleanId) });
        } catch { }
      }
      const shopFilter = isSuperAdmin && !shopId ? {} : getShopFilter(shopId);
      const conditions: any[] = [{ $or: idConditions }, shopFilter];
      if (!isSuperAdmin) {
        conditions.push({ role: { $ne: "superadmin" } });
      }
      const user = await db.collection<DbUser>("users").findOne({
        $and: conditions,
      });
      if (!user) return null;
      const { _id, ...rest } = user as any;
      const u = {
        ...rest,
        id: rest.id || _id?.toString() || rest.username,
      } as DbUser;
      if (!u.permissions) {
        u.permissions = u.role === "admin" || u.role === "superadmin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS;
      }
      return u;
    }

    const memUser = memoryStore.users.find((u) => {
      if (!isSuperAdmin && u.role === "superadmin") return false;
      const idMatch = u.id === cleanId || u.username.toLowerCase() === cleanId.toLowerCase();
      if (!idMatch) return false;
      if (isSuperAdmin && !shopId) return true;
      return matchesShop(u.shopId, shopId);
    });
    if (!memUser) return null;
    if (!memUser.permissions) {
      memUser.permissions = memUser.role === "admin" || memUser.role === "superadmin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS;
    }
    return memUser;
  }

  async updateUserForShop(
    userId: string,
    updates: {
      name?: string;
      email?: string;
      password?: string;
      role?: "admin" | "staff" | "superadmin";
      permissions?: UserPermissions;
    },
    shopId: string,
    isSuperAdmin: boolean = false
  ): Promise<Omit<DbUser, "passwordHash">> {
    const cleanId = String(userId).trim();
    const updatedAt = new Date().toISOString();
    const updateFields: any = { updatedAt };

    // Prevent non-superadmin from escalating role to superadmin or unauthorized platform role
    if (!isSuperAdmin && updates.role !== undefined) {
      if (updates.role === "superadmin" || !["admin", "staff"].includes(updates.role)) {
        throw new Error("Access denied. Shop admin superadmin ya unauthorized role assign nahi kar sakta.");
      }
    }

    // Direct superadmin protection: non-superadmin can NEVER target superadmin
    if (!isSuperAdmin && (cleanId.toLowerCase() === "superadmin" || cleanId === "superadmin-1")) {
      throw new Error("Access denied. Superadmin account ko shop admin modify nahi kar sakta.");
    }

    if (updates.name !== undefined) updateFields.name = updates.name.trim();
    if (updates.email !== undefined) updateFields.email = updates.email.trim();
    if (updates.role !== undefined) updateFields.role = updates.role;
    if (updates.permissions !== undefined) updateFields.permissions = updates.permissions;
    if (updates.password !== undefined && updates.password !== "") {
      if (typeof updates.password !== "string" || updates.password.length < 8) {
        throw new Error("Password kam az kam 8 characters ka hona chahiye.");
      }
      updateFields.passwordHash = await bcrypt.hash(updates.password, 10);
    }

    if (isMongoConfigured()) {
      const db = await getDb();
      const idConditions: any[] = [
        { id: cleanId },
        { username: cleanId.toLowerCase() },
      ];
      if (ObjectId.isValid(cleanId)) {
        try {
          idConditions.push({ _id: new ObjectId(cleanId) });
        } catch { }
      }

      // CRITICAL: Strictly scoped to authorized shop! Zero unscoped fallback!
      const shopFilter = isSuperAdmin && !shopId ? {} : getShopFilter(shopId);
      const conditions: any[] = [{ $or: idConditions }, shopFilter];
      if (!isSuperAdmin) {
        conditions.push({ role: { $ne: "superadmin" } });
      }
      const existingUser = await db.collection<DbUser>("users").findOne({
        $and: conditions,
      });

      if (!existingUser) {
        throw new Error("User nahi mila ya is dukan se talluq nahi rakhta.");
      }

      // Non-superadmin cannot modify a superadmin user
      if (!isSuperAdmin && existingUser.role === "superadmin") {
        throw new Error("Access denied. Superadmin account ko shop admin modify nahi kar sakta.");
      }

      const res = await db.collection<DbUser>("users").findOneAndUpdate(
        { _id: existingUser._id },
        { $set: updateFields },
        { returnDocument: "after" }
      );
      if (!res) throw new Error("User nahi mila ya is dukan se talluq nahi rakhta.");
      const { _id, passwordHash, ...rest } = res as any;
      const sanitized = {
        ...rest,
        id: rest.id || _id?.toString() || rest.username,
      };

      // Also update memoryStore if matching shop
      const memIdx = memoryStore.users.findIndex(
        (u) =>
          (!isSuperAdmin ? u.role !== "superadmin" : true) &&
          (u.id === cleanId || u.username.toLowerCase() === cleanId.toLowerCase()) &&
          (isSuperAdmin && !shopId ? true : matchesShop(u.shopId, shopId))
      );
      if (memIdx !== -1) {
        memoryStore.users[memIdx] = { ...memoryStore.users[memIdx], ...updateFields };
      }

      return sanitized as Omit<DbUser, "passwordHash">;
    }

    // In-memory fallback: STRICTLY scoped to shopId!
    const idx = memoryStore.users.findIndex((u) => {
      if (!isSuperAdmin && u.role === "superadmin") return false;
      const idMatch = u.id === cleanId || u.username.toLowerCase() === cleanId.toLowerCase();
      if (!idMatch) return false;
      if (isSuperAdmin && !shopId) return true;
      return matchesShop(u.shopId, shopId);
    });

    if (idx === -1) {
      throw new Error("User nahi mila ya is dukan se talluq nahi rakhta.");
    }

    // Non-superadmin cannot modify a superadmin user
    if (!isSuperAdmin && memoryStore.users[idx].role === "superadmin") {
      throw new Error("Access denied. Superadmin account ko shop admin modify nahi kar sakta.");
    }

    const updated = { ...memoryStore.users[idx], ...updateFields };
    memoryStore.users[idx] = updated;
    const { passwordHash, ...sanitized } = updated;
    return sanitized as any;
  }

  async deleteShopUser(
    userId: string,
    shopId: string,
    currentUserId?: string,
    isSuperAdmin: boolean = false
  ): Promise<boolean> {
    const cleanId = String(userId).trim();
    const cleanCurrent = currentUserId ? String(currentUserId).trim().toLowerCase() : "";

    if (cleanCurrent && (cleanId.toLowerCase() === cleanCurrent)) {
      throw new Error("Aap apna active logged in account delete nahi kar sakte.");
    }
    if (cleanId === "user-1" || cleanId.toLowerCase() === "admin") {
      throw new Error("Primary Admin / Dukan ka malik delete nahi kiya ja sakta.");
    }
    if (cleanId === "superadmin-1" || cleanId.toLowerCase() === "superadmin") {
      throw new Error("Access denied. Superadmin account ko delete nahi kiya ja sakta.");
    }

    if (isMongoConfigured()) {
      const db = await getDb();
      const idConditions: any[] = [
        { id: cleanId },
        { username: cleanId.toLowerCase() },
      ];
      if (ObjectId.isValid(cleanId)) {
        try {
          idConditions.push({ _id: new ObjectId(cleanId) });
        } catch { }
      }

      // CRITICAL: Strictly scoped to authorized shop! Zero unscoped fallback!
      const shopFilter = isSuperAdmin && !shopId ? {} : getShopFilter(shopId);
      const conditions: any[] = [{ $or: idConditions }, shopFilter];
      if (!isSuperAdmin) {
        conditions.push({ role: { $ne: "superadmin" } });
      }
      const user = await db.collection<DbUser>("users").findOne({
        $and: conditions,
      });

      if (!user) {
        throw new Error("User nahi mila ya is dukan se talluq nahi rakhta.");
      }

      // Check permissions & root protection
      if (cleanCurrent && (user.id === cleanCurrent || user.username?.toLowerCase() === cleanCurrent)) {
        throw new Error("Aap apna active logged in account delete nahi kar sakte.");
      }
      if (user.username === "admin" || user.id === "user-1") {
        throw new Error("Primary Admin / Dukan ka malik delete nahi kiya ja sakta.");
      }
      if (user.role === "superadmin" || user.username?.toLowerCase() === "superadmin") {
        throw new Error("Access denied. Superadmin account ko delete nahi kiya ja sakta.");
      }

      const res = await db.collection("users").deleteOne({ _id: user._id });
      if (res.deletedCount === 0) {
        throw new Error("User delete nahi ho saka.");
      }

      // Also clean memoryStore if present
      const memIdx = memoryStore.users.findIndex(
        (u) =>
          (!isSuperAdmin ? u.role !== "superadmin" : true) &&
          (u.id === cleanId || u.username.toLowerCase() === cleanId.toLowerCase()) &&
          (isSuperAdmin && !shopId ? true : matchesShop(u.shopId, shopId))
      );
      if (memIdx !== -1) {
        memoryStore.users.splice(memIdx, 1);
      }
      return true;
    }

    // In-memory fallback: STRICTLY scoped to shopId!
    const userIndex = memoryStore.users.findIndex((u) => {
      if (!isSuperAdmin && u.role === "superadmin") return false;
      const idMatch = u.id === cleanId || u.username.toLowerCase() === cleanId.toLowerCase();
      if (!idMatch) return false;
      if (isSuperAdmin && !shopId) return true;
      return matchesShop(u.shopId, shopId);
    });

    if (userIndex === -1) {
      throw new Error("User nahi mila ya is dukan se talluq nahi rakhta.");
    }

    const memUser = memoryStore.users[userIndex];
    if (cleanCurrent && (memUser.id === cleanCurrent || memUser.username?.toLowerCase() === cleanCurrent)) {
      throw new Error("Aap apna active logged in account delete nahi kar sakte.");
    }
    if (memUser.username === "admin" || memUser.id === "user-1") {
      throw new Error("Primary Admin / Dukan ka malik delete nahi kiya ja sakta.");
    }
    if (memUser.role === "superadmin" || memUser.username?.toLowerCase() === "superadmin") {
      throw new Error("Access denied. Superadmin account ko delete nahi kiya ja sakta.");
    }

    memoryStore.users.splice(userIndex, 1);
    return true;
  }

  async deleteUser(
    userId: string,
    shopId: string = DEFAULT_SHOP_ID,
    currentUserId?: string,
    isSuperAdmin: boolean = false
  ): Promise<boolean> {
    return this.deleteShopUser(userId, shopId, currentUserId, isSuperAdmin);
  }

  async getSaaSStats(): Promise<SaaSStats> {
    const shops = await this.getShops();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    let activeShops = 0;
    let suspendedShops = 0;
    let expiringIn7Days = 0;
    let monthlyRecurringRevenue = 0;

    for (const shop of shops) {
      if (shop.status === "active") {
        activeShops++;
        monthlyRecurringRevenue += Number(shop.monthlyRent) || 0;

        if (shop.subscriptionEnd) {
          const expTime = new Date(shop.subscriptionEnd).getTime();
          if (expTime - now <= sevenDaysMs && expTime >= now) {
            expiringIn7Days++;
          }
        }
      } else {
        suspendedShops++;
      }
    }

    let totalSystemBills = 0;
    let totalSystemSales = 0;
    let totalSystemParts = 0;

    if (isMongoConfigured()) {
      const db = await getDb();
      totalSystemBills = await db.collection("bills").countDocuments();
      totalSystemParts = await db.collection("parts").countDocuments();
      const bills = await db.collection<Bill>("bills").find({}, { projection: { grandTotal: 1, status: 1 } }).toArray();
      totalSystemSales = bills
        .filter((b) => b.status === "Completed")
        .reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    } else {
      totalSystemBills = memoryStore.bills.length;
      totalSystemParts = memoryStore.parts.length;
      totalSystemSales = memoryStore.bills
        .filter((b) => b.status === "Completed")
        .reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    }

    return {
      totalShops: shops.length,
      activeShops,
      suspendedShops,
      expiringIn7Days,
      monthlyRecurringRevenue,
      totalSystemBills,
      totalSystemSales,
      totalSystemParts,
    };
  }

  // --- FIFO PURCHASE BATCHES & INDEXES (RULE 1, 6, 7, 8) ---
  private indexesEnsured = false;
  async ensureIndexes(): Promise<void> {
    if (!isMongoConfigured() || this.indexesEnsured) return;
    try {
      const db = await getDb();
      // Rule 8: Performance index on purchase_batches: (partId, qtyRemaining, purchaseDate) + shopId
      await db.collection("purchase_batches").createIndex(
        { shopId: 1, partId: 1, qtyRemaining: 1, purchaseDate: 1 },
        { name: "fifo_batches_idx" }
      );
      await db.collection("purchase_batches").createIndex(
        { shopId: 1, partId: 1, purchaseDate: 1 },
        { name: "part_rate_history_idx" }
      );
      await db.collection("sale_details").createIndex(
        { shopId: 1, billId: 1, partId: 1, batchId: 1 },
        { name: "sale_details_idx" }
      );
      this.indexesEnsured = true;
    } catch (err) {
      console.error("MongoDB index creation error:", err);
    }
  }

  async getPurchaseBatches(partId?: string, shopId?: string): Promise<PurchaseBatch[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    await this.ensureIndexes();
    if (isMongoConfigured()) {
      try {
        const db = await getDb();
        const filter: any = getShopFilter(targetShop);
        if (partId) filter.partId = partId;
        const batches = await db
          .collection<PurchaseBatch>("purchase_batches")
          .find(filter)
          .sort({ purchaseDate: 1, createdAt: 1 })
          .toArray();
        return batches.map(({ _id, ...rest }: any) => rest as PurchaseBatch);
      } catch (err) {
        console.error("MongoDB getPurchaseBatches error:", err);
      }
    }
    let list = memoryStore.purchaseBatches.filter((b) => matchesShop(b.shopId, targetShop));
    if (partId) list = list.filter((b) => b.partId === partId);
    return list.sort((a, b) => (a.purchaseDate > b.purchaseDate ? 1 : -1));
  }

  async createPurchaseBatch(
    batchData: {
      partId: string;
      partName?: string;
      purchaseDate?: string;
      qtyPurchased: number;
      costPrice: number;
      supplier: string;
      notes?: string;
      newSellingPrice?: number;
    },
    shopId?: string
  ): Promise<PurchaseBatch> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    await this.ensureIndexes();

    const part = await this.getPart(batchData.partId, targetShop);
    if (!part) throw new Error("Part not found or does not belong to this shop");
    const partName = batchData.partName || part.name || "Spare Part";

    const newBatch: PurchaseBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      partId: batchData.partId,
      partName,
      purchaseDate: batchData.purchaseDate || getLocalDateString(),
      qtyPurchased: Number(batchData.qtyPurchased) || 0,
      qtyRemaining: Number(batchData.qtyPurchased) || 0,
      costPrice: Number(batchData.costPrice) || 0,
      supplier: batchData.supplier || "General Supplier",
      notes: batchData.notes,
      shopId: targetShop,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("purchase_batches").insertOne(newBatch as any);
    } else {
      memoryStore.purchaseBatches.push(newBatch);
    }

    // Rule 5: Item total stock = sum of qty_remaining of all batches for that item
    await this.recalculatePartStock(batchData.partId, targetShop, batchData.costPrice, batchData.newSellingPrice);
    return newBatch;
  }

  async recalculatePartStock(
    partId: string,
    shopId?: string,
    latestCostPrice?: number,
    newSellingPrice?: number
  ): Promise<Part | null> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const batches = await this.getPurchaseBatches(partId, targetShop);
    const totalRemaining = batches.reduce((sum, b) => sum + (b.qtyRemaining || 0), 0);
    const updates: Partial<Part> = { currentStock: totalRemaining };
    if (latestCostPrice !== undefined && latestCostPrice > 0) {
      updates.purchasePrice = latestCostPrice;
    }
    if (newSellingPrice !== undefined && newSellingPrice > 0) {
      updates.sellingPrice = newSellingPrice;
    }
    return this.updatePart(partId, updates, targetShop);
  }

  async getSaleDetails(billId?: string, partId?: string, shopId?: string): Promise<SaleDetail[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    await this.ensureIndexes();
    if (isMongoConfigured()) {
      try {
        const db = await getDb();
        const filter: any = getShopFilter(targetShop);
        if (billId) filter.billId = billId;
        if (partId) filter.partId = partId;
        const details = await db
          .collection<SaleDetail>("sale_details")
          .find(filter)
          .sort({ createdAt: -1 })
          .toArray();
        return details.map(({ _id, ...rest }: any) => rest as SaleDetail);
      } catch (err) {
        console.error("MongoDB getSaleDetails error:", err);
      }
    }
    let list = memoryStore.saleDetails.filter((s) => matchesShop(s.shopId, targetShop));
    if (billId) list = list.filter((s) => s.billId === billId);
    if (partId) list = list.filter((s) => s.partId === partId);
    return list;
  }

  // Rule 6: Rate history date wise per item with price change highlighting ("50 se 60 hua")
  async getPurchaseRateHistory(partId?: string, shopId?: string): Promise<RateHistoryEntry[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    let targetPartName: string | undefined = undefined;
    if (partId) {
      const p = await this.getPart(partId, targetShop);
      if (p) targetPartName = p.name.trim().toLowerCase();
    }

    const batches = await this.getPurchaseBatches(undefined, targetShop);

    // Group by normalized part name (so even if user accidentally created duplicate parts, rates compare correctly!)
    const groupedByName: Record<string, PurchaseBatch[]> = {};
    for (const b of batches) {
      const normName = (b.partName || "Unknown").trim().toLowerCase();
      if (partId && b.partId !== partId && normName !== targetPartName) {
        continue;
      }
      if (!groupedByName[normName]) groupedByName[normName] = [];
      groupedByName[normName].push(b);
    }

    const history: RateHistoryEntry[] = [];

    for (const nameKey of Object.keys(groupedByName)) {
      const pBatches = groupedByName[nameKey].sort(
        (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
      );

      let prevCost: number | undefined = undefined;

      for (const batch of pBatches) {
        const priceChange = prevCost !== undefined ? batch.costPrice - prevCost : undefined;
        const priceChangePercentage =
          prevCost !== undefined && prevCost > 0
            ? Math.round(((batch.costPrice - prevCost) / prevCost) * 100)
            : undefined;

        history.push({
          batchId: batch.id,
          partId: batch.partId,
          partName: batch.partName,
          purchaseDate: batch.purchaseDate,
          supplier: batch.supplier,
          costPrice: batch.costPrice,
          previousCostPrice: prevCost,
          priceChange,
          priceChangePercentage,
          qtyPurchased: batch.qtyPurchased,
          qtyRemaining: batch.qtyRemaining,
        });

        prevCost = batch.costPrice;
      }
    }

    return history.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }

  // Rule 7: Purchase Return & Stock Adjustment (Batch is NEVER deleted!)
  async recordPurchaseReturn(
    data: { partId: string; batchId?: string; quantity: number; reason: string; supplier?: string },
    shopId?: string
  ): Promise<StockAdjustment> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const part = await this.getPart(data.partId, targetShop);
    if (!part) throw new Error("Part not found");
    if (data.quantity <= 0) throw new Error("Return quantity must be greater than 0");

    const batches = await this.getPurchaseBatches(data.partId, targetShop);
    let qtyToDeduct = data.quantity;

    if (data.batchId) {
      const bIdx = batches.findIndex((b) => b.id === data.batchId);
      if (bIdx === -1) throw new Error("Specified purchase batch not found.");
      if (batches[bIdx].qtyRemaining < qtyToDeduct) {
        throw new Error(`Cannot return ${qtyToDeduct} units. Batch only has ${batches[bIdx].qtyRemaining} units left.`);
      }
      batches[bIdx].qtyRemaining -= qtyToDeduct;
      batches[bIdx].updatedAt = new Date().toISOString();
      if (isMongoConfigured()) {
        const db = await getDb();
        await db.collection("purchase_batches").updateOne(
          { id: batches[bIdx].id },
          { $set: { qtyRemaining: batches[bIdx].qtyRemaining, updatedAt: batches[bIdx].updatedAt } }
        );
      }
    } else {
      // FIFO return from newest or oldest active batches
      const activeBatches = batches.filter((b) => b.qtyRemaining > 0);
      const totalAvail = activeBatches.reduce((s, b) => s + b.qtyRemaining, 0);
      if (totalAvail < qtyToDeduct) {
        throw new Error(`Insufficient stock for return. Available: ${totalAvail}, Requested: ${qtyToDeduct}`);
      }
      for (const batch of activeBatches) {
        if (qtyToDeduct <= 0) break;
        const take = Math.min(batch.qtyRemaining, qtyToDeduct);
        batch.qtyRemaining -= take;
        batch.updatedAt = new Date().toISOString();
        qtyToDeduct -= take;

        if (isMongoConfigured()) {
          const db = await getDb();
          await db.collection("purchase_batches").updateOne(
            { id: batch.id },
            { $set: { qtyRemaining: batch.qtyRemaining, updatedAt: batch.updatedAt } }
          );
        }
      }
    }

    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      type: "purchase_return",
      partId: data.partId,
      partName: part.name,
      batchId: data.batchId,
      quantity: data.quantity,
      reason: data.reason || "Purchase Return to Supplier",
      supplier: data.supplier || part.supplierName,
      costPrice: part.purchasePrice,
      shopId: targetShop,
      createdAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("stock_adjustments").insertOne(adjustment as any);
    } else {
      memoryStore.stockAdjustments.unshift(adjustment);
    }

    await this.recalculatePartStock(data.partId, targetShop);
    return adjustment;
  }

  async recordStockAdjustment(
    data: { partId: string; batchId?: string; quantity: number; reason: string },
    shopId?: string
  ): Promise<StockAdjustment> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const part = await this.getPart(data.partId, targetShop);
    if (!part) throw new Error("Part not found");

    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      type: "adjustment",
      partId: data.partId,
      partName: part.name,
      batchId: data.batchId,
      quantity: data.quantity,
      reason: data.reason || "Stock Adjustment / Damage / Audit",
      costPrice: part.purchasePrice,
      shopId: targetShop,
      createdAt: new Date().toISOString(),
    };

    // If negative quantity (damage/loss), deduct from batch
    if (data.quantity < 0) {
      const absQty = Math.abs(data.quantity);
      await this.recordPurchaseReturn(
        {
          partId: data.partId,
          batchId: data.batchId,
          quantity: absQty,
          reason: data.reason,
        },
        targetShop
      );
    } else if (data.quantity > 0) {
      // Positive adjustment creates a new adjustment batch
      await this.createPurchaseBatch(
        {
          partId: data.partId,
          partName: part.name,
          qtyPurchased: data.quantity,
          costPrice: part.purchasePrice,
          supplier: "Stock Adjustment",
          notes: data.reason,
        },
        targetShop
      );
    }

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("stock_adjustments").insertOne(adjustment as any);
    } else {
      memoryStore.stockAdjustments.unshift(adjustment);
    }

    return adjustment;
  }

  // --- PARTS / INVENTORY ---
  private normalizePartRecord(part: any): Part {
    if (!part) return part;
    let models: string[] = [];
    if (Array.isArray(part.compatibleModels)) {
      models = part.compatibleModels.filter(Boolean);
    } else if (typeof part.compatibleModels === "string") {
      models = part.compatibleModels.split(",").map((m: string) => m.trim()).filter(Boolean);
    }
    return {
      ...part,
      compatibleModels: models,
    };
  }

  async getParts(shopId?: string): Promise<Part[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      try {
        const db = await getDb();
        const filter = getShopFilter(targetShop);
        const parts = await db.collection<Part>("parts").find(filter).sort({ createdAt: -1 }).toArray();
        return parts.map(({ _id, ...rest }: any) => this.normalizePartRecord(rest as Part));
      } catch (err) {
        console.error("MongoDB getParts error (falling back to memoryStore):", err);
      }
    }
    return memoryStore.parts
      .filter((p) => matchesShop(p.shopId, targetShop))
      .map((p) => this.normalizePartRecord(p));
  }

  async getPart(id: string, shopId?: string): Promise<Part | null> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      try {
        const db = await getDb();
        const filter = { id, ...getShopFilter(targetShop) };
        const part = await db.collection<Part>("parts").findOne(filter);
        if (part) {
          const { _id, ...rest } = part as any;
          return this.normalizePartRecord(rest as Part);
        }
      } catch (err) {
        console.error("MongoDB getPart error (falling back to memoryStore):", err);
      }
    }
    const found = memoryStore.parts.find((p) => p.id === id && matchesShop(p.shopId, targetShop));
    return found ? this.normalizePartRecord(found) : null;
  }

  async createPart(
    partData: Omit<Part, "id" | "createdAt" | "updatedAt">,
    shopId?: string
  ): Promise<Part> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const initialStock = Number(partData.currentStock) || 0;
    const normalizedData = this.normalizePartRecord(partData);

    const newPart: Part = {
      ...normalizedData,
      id: `part-${Date.now()}`,
      currentStock: initialStock,
      shopId: targetShop,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("parts").insertOne(newPart as any);
    } else {
      memoryStore.parts.unshift(newPart);
    }

    // Rule 1: Every initial stock or purchase creates a batch
    if (initialStock > 0) {
      await this.createPurchaseBatch(
        {
          partId: newPart.id,
          partName: newPart.name,
          purchaseDate: getLocalDateString(),
          qtyPurchased: initialStock,
          costPrice: newPart.purchasePrice,
          supplier: newPart.supplierName || "Initial Stock Supplier",
          notes: "Initial inventory setup batch",
        },
        targetShop
      );
    }

    return newPart;
  }

  async updatePart(id: string, updates: Partial<Part>, shopId?: string): Promise<Part> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const updatedAt = new Date().toISOString();
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      const result = await db.collection<Part>("parts").findOneAndUpdate(
        filter,
        { $set: { ...updates, updatedAt } },
        { returnDocument: "after" }
      );
      if (!result) throw new Error("Part not found");
      const { _id, ...rest } = result as any;
      return rest as Part;
    }

    const idx = memoryStore.parts.findIndex((p) => p.id === id && matchesShop(p.shopId, targetShop));
    if (idx === -1) throw new Error("Part not found");
    const updated = { ...memoryStore.parts[idx], ...updates, updatedAt };
    memoryStore.parts[idx] = updated;
    return updated;
  }

  async deletePart(id: string, shopId?: string): Promise<boolean> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const part = await this.getPart(id, targetShop);
    if (!part) throw new Error("Part not found or does not belong to this shop");

    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      await db.collection("parts").deleteOne(filter);
      return true;
    }
    memoryStore.parts = memoryStore.parts.filter((p) => !(p.id === id && matchesShop(p.shopId, targetShop)));
    return true;
  }

  async updateStock(id: string, delta: number, shopId?: string): Promise<Part> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const part = await this.getPart(id, targetShop);
    if (!part) throw new Error("Part not found");
    if (delta > 0) {
      await this.createPurchaseBatch(
        {
          partId: id,
          partName: part.name,
          qtyPurchased: delta,
          costPrice: part.purchasePrice,
          supplier: part.supplierName || "Direct Stock Add",
          notes: "Manual stock increment batch",
        },
        targetShop
      );
    } else if (delta < 0) {
      await this.recordPurchaseReturn(
        {
          partId: id,
          quantity: Math.abs(delta),
          reason: "Direct stock reduction",
        },
        targetShop
      );
    }
    const updated = await this.getPart(id, targetShop);
    return updated || part;
  }

  // --- CUSTOMERS ---
  async getCustomers(shopId?: string): Promise<Customer[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      try {
        const db = await getDb();
        const filter = getShopFilter(targetShop);
        const custs = await db.collection<Customer>("customers").find(filter).sort({ createdAt: -1 }).toArray();
        return custs.map(({ _id, ...rest }: any) => rest as Customer);
      } catch (err) {
        console.error("MongoDB getCustomers error (falling back to memoryStore):", err);
      }
    }
    return memoryStore.customers.filter((c) => matchesShop(c.shopId, targetShop));
  }

  async getCustomer(id: string, shopId?: string): Promise<Customer | null> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      try {
        const db = await getDb();
        const filter = { id, ...getShopFilter(targetShop) };
        const cust = await db.collection<Customer>("customers").findOne(filter);
        if (cust) {
          const { _id, ...rest } = cust as any;
          return rest as Customer;
        }
      } catch (err) {
        console.error("MongoDB getCustomer error (falling back to memoryStore):", err);
      }
    }
    return memoryStore.customers.find((c) => c.id === id && matchesShop(c.shopId, targetShop)) || null;
  }

  async createCustomer(
    customerData: Omit<Customer, "id" | "totalSpent" | "totalVisits" | "createdAt" | "updatedAt">,
    shopId?: string
  ): Promise<Customer> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const newCust: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      totalSpent: 0,
      totalVisits: 0,
      shopId: targetShop,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("customers").insertOne(newCust as any);
      return newCust;
    }

    memoryStore.customers.unshift(newCust);
    return newCust;
  }

  async updateCustomer(id: string, updates: Partial<Customer>, shopId?: string): Promise<Customer> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const updatedAt = new Date().toISOString();
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      const res = await db.collection<Customer>("customers").findOneAndUpdate(
        filter,
        { $set: { ...updates, updatedAt } },
        { returnDocument: "after" }
      );
      if (!res) throw new Error("Customer not found");
      const { _id, ...rest } = res as any;
      return rest as Customer;
    }

    const idx = memoryStore.customers.findIndex((c) => c.id === id && matchesShop(c.shopId, targetShop));
    if (idx === -1) throw new Error("Customer not found");
    const updated = { ...memoryStore.customers[idx], ...updates, updatedAt };
    memoryStore.customers[idx] = updated;
    return updated;
  }

  async deleteCustomer(id: string, shopId?: string): Promise<boolean> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const cust = await this.getCustomer(id, targetShop);
    if (!cust) throw new Error("Customer not found or does not belong to this shop");

    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      await db.collection("customers").deleteOne(filter);
      return true;
    }
    memoryStore.customers = memoryStore.customers.filter((c) => !(c.id === id && matchesShop(c.shopId, targetShop)));
    return true;
  }

  // --- BILLS & FIFO SALE PROCESS (RULE 2, 3, 4, 5) ---
  async getBills(shopId?: string): Promise<Bill[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = getShopFilter(targetShop);
      const bills = await db.collection<Bill>("bills").find(filter).sort({ createdAt: -1 }).toArray();
      return bills.map(({ _id, ...rest }: any) => rest as Bill);
    }
    return memoryStore.bills.filter((b) => matchesShop(b.shopId, targetShop));
  }

  async getBill(id: string, shopId?: string): Promise<Bill | null> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      const bill = await db.collection<Bill>("bills").findOne(filter);
      if (!bill) return null;
      const { _id, ...rest } = bill as any;
      return rest as Bill;
    }
    return memoryStore.bills.find((b) => b.id === id && matchesShop(b.shopId, targetShop)) || null;
  }

  async createBill(
    billData: Omit<Bill, "id" | "billNumber" | "createdAt" | "status">,
    shopId?: string
  ): Promise<Bill> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    await this.ensureIndexes();

    const billId = `bill-${Date.now()}`;
    const allBills = await this.getBills(targetShop);
    const count = allBills.length + 1001;
    const billNumber = `SK-${count}`;
    const nowIso = new Date().toISOString();

    // Prepare arrays to hold batch updates and sale details for atomic execution
    const processedItems: BillItem[] = [];
    const allSaleDetailsToInsert: SaleDetail[] = [];
    const batchUpdatesToCommit: { batchId: string; newQtyRemaining: number }[] = [];
    const partStockUpdates: Record<string, number> = {};

    // RULE 2: FIFO Sale logic across oldest batches (qtyRemaining > 0, ordered by purchaseDate ASC)
    for (const item of billData.items) {
      const batches = await this.getPurchaseBatches(item.partId, targetShop);
      const activeBatches = batches.filter((b) => b.qtyRemaining > 0);
      const totalAvailable = activeBatches.reduce((sum, b) => sum + b.qtyRemaining, 0);

      if (totalAvailable < item.quantity) {
        throw new Error(
          `Stock insufficient for item "${item.partName}". Available stock across batches: ${totalAvailable}, Requested: ${item.quantity}`
        );
      }

      let remainingToDeduct = item.quantity;
      let itemTotalBatchCost = 0;
      let itemTotalProfit = 0;
      const itemDeductions: SaleDetail[] = [];

      for (const batch of activeBatches) {
        if (remainingToDeduct <= 0) break;

        const deduct = Math.min(batch.qtyRemaining, remainingToDeduct);
        const costPrice = batch.costPrice;
        const salePrice = item.unitPrice ?? (item as any).sellingPrice ?? (item as any).price ?? 0;
        const profit = (salePrice - costPrice) * deduct;

        // Update batch remaining qty locally
        batch.qtyRemaining -= deduct;
        remainingToDeduct -= deduct;
        itemTotalBatchCost += costPrice * deduct;
        itemTotalProfit += profit;

        batchUpdatesToCommit.push({
          batchId: batch.id,
          newQtyRemaining: batch.qtyRemaining,
        });

        const detail: SaleDetail = {
          id: `sd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          billId,
          billNumber,
          partId: item.partId,
          partName: item.partName,
          batchId: batch.id,
          quantity: deduct,
          costPrice,
          salePrice,
          profit,
          shopId: targetShop,
          createdAt: nowIso,
        };

        itemDeductions.push(detail);
        allSaleDetailsToInsert.push(detail);
      }

      const weightedAvgPurchasePrice = Math.round(itemTotalBatchCost / item.quantity);

      processedItems.push({
        ...item,
        purchasePrice: weightedAvgPurchasePrice,
        batchDeductions: itemDeductions,
        itemProfit: itemTotalProfit,
      });

      // Track total remaining stock for this part
      const finalPartStock = batches.reduce((sum, b) => sum + b.qtyRemaining, 0);
      partStockUpdates[item.partId] = finalPartStock;
    }

    const newBill: Bill = {
      ...billData,
      id: billId,
      billNumber,
      items: processedItems,
      status: "Completed",
      shopId: targetShop,
      createdAt: nowIso,
    };

    // RULE 4: Perform Database Transaction to ensure entire process is atomic
    if (isMongoConfigured()) {
      const db = await getDb();
      // Commit purchase batch updates
      for (const update of batchUpdatesToCommit) {
        await db.collection("purchase_batches").updateOne(
          { id: update.batchId },
          { $set: { qtyRemaining: update.newQtyRemaining, updatedAt: nowIso } }
        );
      }
      // Insert sale details
      if (allSaleDetailsToInsert.length > 0) {
        await db.collection("sale_details").insertMany(allSaleDetailsToInsert as any);
      }
      // Update items table currentStock
      for (const [partId, currentStock] of Object.entries(partStockUpdates)) {
        await db.collection("parts").updateOne(
          { id: partId },
          { $set: { currentStock, updatedAt: nowIso } }
        );
      }
      // Insert Bill
      await db.collection("bills").insertOne(newBill as any);
    } else {
      // Commit in MemoryStore
      for (const sd of allSaleDetailsToInsert) {
        memoryStore.saleDetails.push(sd);
      }
      for (const [partId, currentStock] of Object.entries(partStockUpdates)) {
        const pIdx = memoryStore.parts.findIndex((p) => p.id === partId);
        if (pIdx !== -1) {
          memoryStore.parts[pIdx].currentStock = currentStock;
          memoryStore.parts[pIdx].updatedAt = nowIso;
        }
      }
      memoryStore.bills.unshift(newBill);
    }

    // Update Mechanic Ledger if labour charges included
    if (billData.labourItems && billData.labourItems.length > 0) {
      for (const item of billData.labourItems) {
        if (item.amount > 0 && item.mechanicName) {
          const shopAmount = item.shopShare ?? Math.round((item.amount * (item.shopCutPercentage || 0)) / 100);
          const mechAmount = item.mechanicShare ?? (item.amount - shopAmount);
          const entry: MechanicLedgerEntry = {
            id: `mled-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            mechanicId: item.mechanicId || `mech-${encodeURIComponent(item.mechanicName.trim().toLowerCase())}`,
            mechanicName: item.mechanicName,
            type: "earning",
            date: newBill.createdAt,
            billId: newBill.id,
            billNumber: newBill.billNumber,
            vehicleDetails: [billData.bikeModel, billData.bikeRegNumber].filter(Boolean).join(" - ") || undefined,
            customerName: billData.customerName,
            laborDescription: item.description,
            totalLaborAmount: item.amount,
            shopPercentage: item.shopCutPercentage,
            shopAmount,
            mechanicAmount: mechAmount,
            notes: `Auto-recorded from Bill ${newBill.billNumber}`,
            shopId: targetShop,
          };

          if (isMongoConfigured()) {
            const db = await getDb();
            await db.collection("mechanicLedger").insertOne(entry as any);
          } else {
            memoryStore.mechanicLedger.unshift(entry);
          }
        }
      }
    }

    // Update Customer Total Spent & Visits
    if (billData.customerId) {
      try {
        const cust = await this.getCustomer(billData.customerId, targetShop);
        if (cust) {
          await this.updateCustomer(
            billData.customerId,
            {
              totalSpent: (cust.totalSpent || 0) + newBill.grandTotal,
              totalVisits: (cust.totalVisits || 0) + 1,
            },
            targetShop
          );
        }
      } catch (err) {
        console.error("Failed to update customer stats on bill creation:", err);
      }
    }

    return newBill;
  }

  async cancelBill(id: string, shopId?: string): Promise<boolean> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const bill = await this.getBill(id, targetShop);
    if (!bill) throw new Error("Bill not found");
    if (bill.status === "Cancelled") return true;

    // RULE 3 & FIFO RESTORE: Restore stock to exact batches recorded in sale_details
    const saleDetails = await this.getSaleDetails(id, undefined, targetShop);

    if (saleDetails.length > 0) {
      for (const sd of saleDetails) {
        if (isMongoConfigured()) {
          const db = await getDb();
          await db.collection("purchase_batches").updateOne(
            { id: sd.batchId },
            { $inc: { qtyRemaining: sd.quantity }, $set: { updatedAt: new Date().toISOString() } }
          );
        } else {
          const bIdx = memoryStore.purchaseBatches.findIndex((b) => b.id === sd.batchId);
          if (bIdx !== -1) {
            memoryStore.purchaseBatches[bIdx].qtyRemaining += sd.quantity;
            memoryStore.purchaseBatches[bIdx].updatedAt = new Date().toISOString();
          }
        }
      }
    } else {
      // Fallback stock restoration if saleDetails absent (legacy bills)
      for (const item of bill.items) {
        await this.updateStock(item.partId, item.quantity, targetShop);
      }
    }

    // Recalculate stock for all affected parts
    const partIds = Array.from(new Set(bill.items.map((i) => i.partId)));
    for (const partId of partIds) {
      await this.recalculatePartStock(partId, targetShop);
    }

    // Mark bill as cancelled
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      await db.collection("bills").updateOne(filter, { $set: { status: "Cancelled" } });
      await db.collection("mechanicLedger").deleteMany({ billId: id, ...getShopFilter(targetShop) });
      return true;
    }

    const idx = memoryStore.bills.findIndex((b) => b.id === id && matchesShop(b.shopId, targetShop));
    if (idx !== -1) {
      memoryStore.bills[idx].status = "Cancelled";
      memoryStore.mechanicLedger = memoryStore.mechanicLedger.filter((l) => l.billId !== id);
    }
    return true;
  }

  async deleteBill(id: string, shopId?: string): Promise<boolean> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const bill = await this.getBill(id, targetShop);
    if (!bill) throw new Error("Bill not found or does not belong to this shop");

    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      await db.collection("bills").deleteOne(filter);
      await db.collection("mechanicLedger").deleteMany({ billId: id, ...getShopFilter(targetShop) });
      return true;
    }
    memoryStore.bills = memoryStore.bills.filter((b) => !(b.id === id && matchesShop(b.shopId, targetShop)));
    memoryStore.mechanicLedger = memoryStore.mechanicLedger.filter((l) => l.billId !== id);
    return true;
  }

  // --- MECHANICS ---
  async getMechanics(shopId?: string): Promise<Mechanic[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = getShopFilter(targetShop);
      const mechs = await db.collection<Mechanic>("mechanics").find(filter).sort({ createdAt: -1 }).toArray();
      return mechs.map(({ _id, ...rest }: any) => rest as Mechanic);
    }
    return memoryStore.mechanics.filter((m) => matchesShop(m.shopId, targetShop));
  }

  async getMechanic(id: string, shopId?: string): Promise<Mechanic | null> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      const mech = await db.collection<Mechanic>("mechanics").findOne(filter);
      if (!mech) return null;
      const { _id, ...rest } = mech as any;
      return rest as Mechanic;
    }
    return memoryStore.mechanics.find((m) => m.id === id && matchesShop(m.shopId, targetShop)) || null;
  }

  async createMechanic(
    mechData: Omit<Mechanic, "id" | "createdAt" | "updatedAt">,
    shopId?: string
  ): Promise<Mechanic> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const newMech: Mechanic = {
      ...mechData,
      id: `mech-${Date.now()}`,
      shopId: targetShop,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("mechanics").insertOne(newMech as any);
      return newMech;
    }

    memoryStore.mechanics.push(newMech);
    return newMech;
  }

  async updateMechanic(id: string, updates: Partial<Mechanic>, shopId?: string): Promise<Mechanic> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const updatedAt = new Date().toISOString();
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      const res = await db.collection<Mechanic>("mechanics").findOneAndUpdate(
        filter,
        { $set: { ...updates, updatedAt } },
        { returnDocument: "after" }
      );
      if (!res) throw new Error("Mechanic not found");
      const { _id, ...rest } = res as any;
      return rest as Mechanic;
    }

    const idx = memoryStore.mechanics.findIndex((m) => m.id === id && matchesShop(m.shopId, targetShop));
    if (idx === -1) throw new Error("Mechanic not found");
    const updated = { ...memoryStore.mechanics[idx], ...updates, updatedAt };
    memoryStore.mechanics[idx] = updated;
    return updated;
  }

  async deleteMechanic(id: string, shopId?: string): Promise<boolean> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const mech = await this.getMechanic(id, targetShop);
    if (!mech) throw new Error("Mechanic not found or does not belong to this shop");

    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      await db.collection("mechanics").deleteOne(filter);
      return true;
    }
    memoryStore.mechanics = memoryStore.mechanics.filter((m) => !(m.id === id && matchesShop(m.shopId, targetShop)));
    return true;
  }

  // --- MECHANIC LEDGER ---
  async getMechanicLedger(mechanicId?: string, shopId?: string): Promise<MechanicLedgerEntry[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const shopFilter = getShopFilter(targetShop);

    if (isMongoConfigured()) {
      const db = await getDb();
      const filter: any = mechanicId
        ? {
          ...shopFilter,
          $or: [
            { mechanicId },
            { mechanicName: { $regex: new RegExp(`^${mechanicId}$`, "i") } },
          ],
        }
        : shopFilter;
      const entries = await db.collection<MechanicLedgerEntry>("mechanicLedger").find(filter).sort({ date: -1 }).toArray();
      return entries.map(({ _id, ...rest }: any) => rest as MechanicLedgerEntry);
    }

    let list = memoryStore.mechanicLedger.filter((l) => matchesShop(l.shopId, targetShop));
    if (mechanicId) {
      list = list.filter(
        (l) =>
          l.mechanicId === mechanicId ||
          l.mechanicName.toLowerCase() === mechanicId.toLowerCase()
      );
    }
    return list;
  }

  async recordMechanicPayout(
    mechanicId: string,
    amount: number,
    notes?: string,
    shopId?: string
  ): Promise<MechanicLedgerEntry> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const mechanic = await this.getMechanic(mechanicId, targetShop);
    if (!mechanic) throw new Error("Mechanic not found or does not belong to this shop");
    const mechName = mechanic.name;

    const entry: MechanicLedgerEntry = {
      id: `mled-${Date.now()}`,
      mechanicId,
      mechanicName: mechName,
      type: "payout",
      date: new Date().toISOString(),
      totalLaborAmount: 0,
      shopPercentage: 0,
      shopAmount: 0,
      mechanicAmount: amount,
      notes: notes || "Daily/Weekly cash payout to mechanic",
      shopId: targetShop,
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("mechanicLedger").insertOne(entry as any);
      return entry;
    }

    memoryStore.mechanicLedger.unshift(entry);
    return entry;
  }

  // --- JOB CARDS ---
  async getJobCards(shopId?: string): Promise<VehicleJobCard[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = getShopFilter(targetShop);
      const cards = await db.collection<VehicleJobCard>("jobCards").find(filter).sort({ createdAt: -1 }).toArray();
      return cards.map(({ _id, ...rest }: any) => rest as VehicleJobCard);
    }
    return memoryStore.jobCards.filter((j) => matchesShop(j.shopId, targetShop));
  }

  async getJobCard(id: string, shopId?: string): Promise<VehicleJobCard | null> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      const card = await db.collection<VehicleJobCard>("jobCards").findOne(filter);
      if (!card) return null;
      const { _id, ...rest } = card as any;
      return rest as VehicleJobCard;
    }
    return memoryStore.jobCards.find((c) => c.id === id && matchesShop(c.shopId, targetShop)) || null;
  }

  async createJobCard(
    cardData: {
      bayNumber: number;
      customerName: string;
      customerPhone?: string;
      bikeRegNumber: string;
      bikeModel: string;
      complaintDescription?: string;
      assignedMechanicId?: string;
      assignedMechanicName?: string;
    },
    shopId?: string
  ): Promise<VehicleJobCard> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const all = await this.getJobCards(targetShop);
    const count = all.length + 101;
    const newCard: VehicleJobCard = {
      ...cardData,
      id: `job-${Date.now()}`,
      jobCardNumber: `JC-${count}`,
      status: "In Progress",
      items: [],
      labourItems: [],
      estimatedSubtotal: 0,
      shopId: targetShop,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("jobCards").insertOne(newCard as any);
      return newCard;
    }

    memoryStore.jobCards.unshift(newCard);
    return newCard;
  }

  async updateJobCard(id: string, updates: Partial<VehicleJobCard>, shopId?: string): Promise<VehicleJobCard> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const card = await this.getJobCard(id, targetShop);
    if (!card) throw new Error("Job card not found");

    const merged = { ...card, ...updates, updatedAt: new Date().toISOString() };
    const partsTotal = (merged.items || []).reduce((acc, i) => acc + i.totalPrice, 0);
    const labourTotal = (merged.labourItems || []).reduce((acc, l) => acc + l.amount, 0);
    merged.estimatedSubtotal = partsTotal + labourTotal;

    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      const res = await db.collection<VehicleJobCard>("jobCards").findOneAndUpdate(
        filter,
        { $set: merged },
        { returnDocument: "after" }
      );
      const { _id, ...rest } = res as any;
      return rest as VehicleJobCard;
    }

    const idx = memoryStore.jobCards.findIndex((c) => c.id === id && matchesShop(c.shopId, targetShop));
    memoryStore.jobCards[idx] = merged;
    return merged;
  }

  async addPartToJobCard(
    jobCardId: string,
    partId: string,
    quantity: number = 1,
    shopId?: string
  ): Promise<VehicleJobCard> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const card = await this.getJobCard(jobCardId, targetShop);
    if (!card) throw new Error("Job card not found");

    const part = await this.getPart(partId, targetShop);
    if (!part) throw new Error("Part not found in inventory");

    const existingIndex = card.items.findIndex((i) => i.partId === partId);
    const currentCardQty = existingIndex > -1 ? card.items[existingIndex].quantity : 0;
    if (currentCardQty + quantity > part.currentStock) {
      throw new Error(`Insufficient stock for "${part.name}". Available: ${part.currentStock}`);
    }

    const items = [...card.items];
    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
      items[existingIndex].totalPrice = items[existingIndex].quantity * items[existingIndex].unitPrice;
    } else {
      items.push({
        partId: part.id,
        partName: part.name,
        category: part.category,
        quantity,
        unitPrice: part.sellingPrice,
        purchasePrice: part.purchasePrice,
        totalPrice: part.sellingPrice * quantity,
      });
    }

    return this.updateJobCard(jobCardId, { items }, targetShop);
  }

  async updateJobCardPartQty(
    jobCardId: string,
    partId: string,
    delta: number,
    shopId?: string
  ): Promise<VehicleJobCard> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const card = await this.getJobCard(jobCardId, targetShop);
    if (!card) throw new Error("Job card not found");

    const part = await this.getPart(partId, targetShop);
    if (!part) throw new Error("Part not found");

    const existingIndex = card.items.findIndex((i) => i.partId === partId);
    if (existingIndex === -1) throw new Error("Part is not in this job card");

    const newQty = card.items[existingIndex].quantity + delta;
    if (newQty <= 0) {
      return this.removePartFromJobCard(jobCardId, partId, targetShop);
    }

    if (newQty > part.currentStock) {
      throw new Error(`Cannot exceed available stock (${part.currentStock})`);
    }

    const items = [...card.items];
    items[existingIndex].quantity = newQty;
    items[existingIndex].totalPrice = newQty * items[existingIndex].unitPrice;

    return this.updateJobCard(jobCardId, { items }, targetShop);
  }

  async removePartFromJobCard(jobCardId: string, partId: string, shopId?: string): Promise<VehicleJobCard> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const card = await this.getJobCard(jobCardId, targetShop);
    if (!card) throw new Error("Job card not found");

    const items = card.items.filter((i) => i.partId !== partId);
    return this.updateJobCard(jobCardId, { items }, targetShop);
  }

  async addLabourToJobCard(
    jobCardId: string,
    labour: {
      description: string;
      amount: number;
      mechanicId?: string;
      mechanicName: string;
      shopCutPercentage: number;
    },
    shopId?: string
  ): Promise<VehicleJobCard> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const card = await this.getJobCard(jobCardId, targetShop);
    if (!card) throw new Error("Job card not found");

    const shopShare = Math.round((labour.amount * (labour.shopCutPercentage || 0)) / 100);
    const mechanicShare = labour.amount - shopShare;

    const newLabour = {
      id: `lbr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: labour.description,
      amount: labour.amount,
      mechanicId: labour.mechanicId,
      mechanicName: labour.mechanicName,
      shopCutPercentage: labour.shopCutPercentage,
      shopShare,
      mechanicShare,
    };

    const labourItems = [...card.labourItems, newLabour];
    return this.updateJobCard(jobCardId, { labourItems }, targetShop);
  }

  async removeLabourFromJobCard(jobCardId: string, labourId: string, shopId?: string): Promise<VehicleJobCard> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const card = await this.getJobCard(jobCardId, targetShop);
    if (!card) throw new Error("Job card not found");

    const labourItems = card.labourItems.filter((l) => l.id !== labourId);
    return this.updateJobCard(jobCardId, { labourItems }, targetShop);
  }

  async completeJobCardAndGenerateBill(
    jobCardId: string,
    paymentMethod: Bill["paymentMethod"],
    discount: number = 0,
    notes?: string,
    shopId?: string
  ): Promise<{ bill: Bill; jobCard: VehicleJobCard }> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const card = await this.getJobCard(jobCardId, targetShop);
    if (!card) throw new Error("Job card not found");

    const partsTotal = card.items.reduce((acc, i) => acc + i.totalPrice, 0);
    const labourTotal = card.labourItems.reduce((acc, l) => acc + l.amount, 0);
    const subtotal = partsTotal + labourTotal;
    const grandTotal = Math.max(0, subtotal - (Number(discount) || 0));

    // 1. Create the finalized bill
    const bill = await this.createBill(
      {
        customerName: card.customerName,
        customerPhone: card.customerPhone,
        bikeRegNumber: card.bikeRegNumber,
        bikeModel: card.bikeModel,
        items: card.items,
        labourItems: card.labourItems,
        labourTotal,
        partsTotal,
        subtotal,
        discount: Number(discount) || 0,
        tax: 0,
        grandTotal,
        paidAmount: grandTotal,
        paymentMethod,
        notes: notes || `Generated from Bay #${card.bayNumber} Job Card (${card.jobCardNumber})`,
      },
      targetShop
    );

    // 2. Mark the job card as Completed
    const updatedCard = await this.updateJobCard(
      jobCardId,
      {
        status: "Completed",
        completedAt: new Date().toISOString(),
        billId: bill.id,
        billNumber: bill.billNumber,
      },
      targetShop
    );

    return { bill, jobCard: updatedCard };
  }

  async deleteJobCard(id: string, shopId?: string): Promise<boolean> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const card = await this.getJobCard(id, targetShop);
    if (!card) throw new Error("Job card not found or does not belong to this shop");

    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      await db.collection("jobCards").deleteOne(filter);
      return true;
    }
    memoryStore.jobCards = memoryStore.jobCards.filter((c) => !(c.id === id && matchesShop(c.shopId, targetShop)));
    return true;
  }

  // --- SUPPLIER CREDITS ---
  async getSupplierCredits(shopId?: string): Promise<SupplierCredit[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = getShopFilter(targetShop);
      const credits = await db.collection<SupplierCredit>("supplierCredits").find(filter).sort({ createdAt: -1 }).toArray();
      return credits.map(({ _id, ...rest }: any) => rest as SupplierCredit);
    }
    return memoryStore.supplierCredits.filter((s) => matchesShop(s.shopId, targetShop));
  }

  async getSupplierCredit(id: string, shopId?: string): Promise<SupplierCredit | null> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      const credit = await db.collection<SupplierCredit>("supplierCredits").findOne(filter);
      if (!credit) return null;
      const { _id, ...rest } = credit as any;
      return rest as SupplierCredit;
    }
    return memoryStore.supplierCredits.find((c) => c.id === id && matchesShop(c.shopId, targetShop)) || null;
  }

  async createSupplierCredit(
    creditData: Omit<
      SupplierCredit,
      "id" | "paidAmount" | "remainingBalance" | "status" | "paymentHistory" | "createdAt" | "updatedAt"
    >,
    shopId?: string
  ): Promise<SupplierCredit> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const newCredit: SupplierCredit = {
      ...creditData,
      id: `credit-${Date.now()}`,
      paidAmount: 0,
      remainingBalance: creditData.totalAmount,
      status: "Pending",
      paymentHistory: [],
      shopId: targetShop,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("supplierCredits").insertOne(newCredit as any);
      return newCredit;
    }

    memoryStore.supplierCredits.unshift(newCredit);
    return newCredit;
  }

  async updateSupplierCredit(id: string, updates: Partial<SupplierCredit>, shopId?: string): Promise<SupplierCredit> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const credit = await this.getSupplierCredit(id, targetShop);
    if (!credit) throw new Error("Supplier credit entry not found");

    const totalAmount = updates.totalAmount !== undefined ? updates.totalAmount : credit.totalAmount;
    const paidAmount = updates.paidAmount !== undefined ? updates.paidAmount : credit.paidAmount;
    const remainingBalance = Math.max(0, totalAmount - paidAmount);
    const status: "Paid" | "Partial" | "Pending" =
      remainingBalance === 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";

    const merged: SupplierCredit = {
      ...credit,
      ...updates,
      totalAmount,
      paidAmount,
      remainingBalance,
      status,
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      const res = await db.collection<SupplierCredit>("supplierCredits").findOneAndUpdate(
        filter,
        { $set: merged },
        { returnDocument: "after" }
      );
      const { _id, ...rest } = res as any;
      return rest as SupplierCredit;
    }

    const idx = memoryStore.supplierCredits.findIndex((c) => c.id === id && matchesShop(c.shopId, targetShop));
    memoryStore.supplierCredits[idx] = merged;
    return merged;
  }

  async recordSupplierPayment(creditId: string, amount: number, notes?: string, shopId?: string): Promise<SupplierCredit> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const credit = await this.getSupplierCredit(creditId, targetShop);
    if (!credit) throw new Error("Supplier credit entry not found");
    if (amount <= 0) throw new Error("Payment amount must be greater than zero");
    if (amount > credit.remainingBalance) {
      throw new Error(`Payment amount (Rs. ${amount}) exceeds remaining balance (Rs. ${credit.remainingBalance})`);
    }

    const paidAmount = credit.paidAmount + amount;
    const remainingBalance = credit.remainingBalance - amount;
    const status = remainingBalance === 0 ? "Paid" : "Partial";
    const paymentHistory = [
      ...credit.paymentHistory,
      {
        id: `pay-${Date.now()}`,
        amount,
        paymentDate: new Date().toISOString(),
        notes: notes || "Payment received/recorded",
      },
    ];

    return this.updateSupplierCredit(creditId, { paidAmount, remainingBalance, status, paymentHistory }, targetShop);
  }

  async deleteSupplierCredit(id: string, shopId?: string): Promise<boolean> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const credit = await this.getSupplierCredit(id, targetShop);
    if (!credit) throw new Error("Supplier credit entry not found or does not belong to this shop");

    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      await db.collection("supplierCredits").deleteOne(filter);
      return true;
    }
    memoryStore.supplierCredits = memoryStore.supplierCredits.filter(
      (s) => !(s.id === id && matchesShop(s.shopId, targetShop))
    );
    return true;
  }

  // --- DASHBOARD STATS ---
  async getDashboardStats(shopId?: string): Promise<DashboardStats> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const [parts, customers, bills, supplierCredits, mechanics, jobCards, ledger] = await Promise.all([
      this.getParts(targetShop),
      this.getCustomers(targetShop),
      this.getBills(targetShop),
      this.getSupplierCredits(targetShop),
      this.getMechanics(targetShop),
      this.getJobCards(targetShop),
      this.getMechanicLedger(undefined, targetShop),
    ]);

    const totalInventoryValue = parts.reduce((sum, p) => sum + p.purchasePrice * p.currentStock, 0);
    const lowStockCount = parts.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockLimit).length;
    const outOfStockCount = parts.filter((p) => p.currentStock === 0).length;

    const todayStr = new Date().toISOString().split("T")[0];
    const todayBills = bills.filter((b) => b.createdAt.startsWith(todayStr) && b.status === "Completed");
    const todaySales = todayBills.reduce((sum, b) => sum + b.grandTotal, 0);

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthlyBills = bills.filter((b) => b.createdAt.startsWith(currentMonthStr) && b.status === "Completed");
    const monthlySales = monthlyBills.reduce((sum, b) => sum + b.grandTotal, 0);

    const totalPendingSupplierCredit = supplierCredits.reduce(
      (sum, sc) => (sc.status !== "Paid" ? sum + sc.remainingBalance : sum),
      0
    );

    const overdue15DaysCreditCount = supplierCredits.filter(
      (sc) => sc.status !== "Paid" && daysSince(sc.purchaseDate) >= 15
    ).length;

    const activeJobsCount = jobCards.filter((j) => j.status === "In Progress" || j.status === "Waiting for Parts").length;

    const totalEarnings = ledger.filter((l) => l.type === "earning").reduce((sum, l) => sum + l.mechanicAmount, 0);
    const totalPayouts = ledger.filter((l) => l.type === "payout").reduce((sum, l) => sum + l.mechanicAmount, 0);
    const totalMechanicPayable = Math.max(0, totalEarnings - totalPayouts);

    return {
      totalInventoryValue,
      totalPartsCount: parts.length,
      lowStockCount,
      outOfStockCount,
      totalCustomersCount: customers.length,
      todaySales,
      todayBillsCount: todayBills.length,
      monthlySales,
      totalPendingSupplierCredit,
      overdue15DaysCreditCount,
      activeJobsCount,
      totalMechanicsCount: mechanics.length,
      totalMechanicPayable,
    };
  }

  // --- SYNC (Merged from offline queue or client) ---
  async syncClientData(client: any, shopId?: string): Promise<{ synced: boolean; counts: Record<string, number> }> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const counts: Record<string, number> = {};

    if (isMongoConfigured()) {
      const db = await getDb();
      if (client.parts && Array.isArray(client.parts)) {
        for (const item of client.parts) {
          const { _id, ...rest } = item;
          rest.shopId = rest.shopId || targetShop;
          await db.collection("parts").updateOne({ id: item.id }, { $set: rest }, { upsert: true });
        }
        counts.parts = client.parts.length;
      }
      if (client.customers && Array.isArray(client.customers)) {
        for (const item of client.customers) {
          const { _id, ...rest } = item;
          rest.shopId = rest.shopId || targetShop;
          await db.collection("customers").updateOne({ id: item.id }, { $set: rest }, { upsert: true });
        }
        counts.customers = client.customers.length;
      }
      if (client.bills && Array.isArray(client.bills)) {
        for (const item of client.bills) {
          const { _id, ...rest } = item;
          rest.shopId = rest.shopId || targetShop;
          await db.collection("bills").updateOne({ id: item.id }, { $set: rest }, { upsert: true });
        }
        counts.bills = client.bills.length;
      }
      if (client.supplierCredits && Array.isArray(client.supplierCredits)) {
        for (const item of client.supplierCredits) {
          const { _id, ...rest } = item;
          rest.shopId = rest.shopId || targetShop;
          await db.collection("supplierCredits").updateOne({ id: item.id }, { $set: rest }, { upsert: true });
        }
        counts.supplierCredits = client.supplierCredits.length;
      }
      if (client.mechanics && Array.isArray(client.mechanics)) {
        for (const item of client.mechanics) {
          const { _id, ...rest } = item;
          rest.shopId = rest.shopId || targetShop;
          await db.collection("mechanics").updateOne({ id: item.id }, { $set: rest }, { upsert: true });
        }
        counts.mechanics = client.mechanics.length;
      }
      if (client.mechanicLedger && Array.isArray(client.mechanicLedger)) {
        for (const item of client.mechanicLedger) {
          const { _id, ...rest } = item;
          rest.shopId = rest.shopId || targetShop;
          await db.collection("mechanicLedger").updateOne({ id: item.id }, { $set: rest }, { upsert: true });
        }
        counts.mechanicLedger = client.mechanicLedger.length;
      }
      if (client.jobCards && Array.isArray(client.jobCards)) {
        for (const item of client.jobCards) {
          const { _id, ...rest } = item;
          rest.shopId = rest.shopId || targetShop;
          await db.collection("jobCards").updateOne({ id: item.id }, { $set: rest }, { upsert: true });
        }
        counts.jobCards = client.jobCards.length;
      }
    }

    return { synced: true, counts };
  }

  // --- USERS & AUTHENTICATION ---
  async getUserByUsernameOrEmail(identifier: string): Promise<DbUser | null> {
    const clean = identifier.toLowerCase().trim();
    assertMongoConfiguredForProduction();

    if (isMongoConfigured()) {
      try {
        const db = await getDb();
        await this.ensureInitialShops();
        await this.ensureInitialUsers();
        const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const user = await db.collection<DbUser>("users").findOne({
          $or: [
            { username: { $regex: new RegExp(`^${escaped}$`, "i") } },
            { email: { $regex: new RegExp(`^${escaped}$`, "i") } },
          ],
        });
        if (user) {
          const { _id, ...rest } = user as any;
          const u = rest as DbUser;
          if (!u.permissions) {
            u.permissions = u.role === "admin" || u.role === "superadmin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS;
          }
          return u;
        }
        // User not found in Mongo — do not fall back to seeded memory accounts in production
        if (process.env.NODE_ENV === "production") {
          return null;
        }
      } catch (err) {
        console.error("MongoDB user lookup error:", err);
        denyMemoryInProduction("getUserByUsernameOrEmail");
      }
    }

    const memUser = memoryStore.users.find(
      (u) =>
        u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
    if (memUser && !memUser.permissions) {
      memUser.permissions = memUser.role === "admin" || memUser.role === "superadmin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS;
    }
    return memUser || null;
  }

  async ensureInitialShops(): Promise<void> {
    if (!isMongoConfigured()) return;
    try {
      const db = await getDb();
      const count = await db.collection("shops").countDocuments();
      if (count === 0) {
        await db.collection("shops").insertMany(INITIAL_SEEDED_SHOPS as any);
      }
    } catch (err) {
      console.error("MongoDB ensureInitialShops error:", err);
    }
  }

  private initialUsersEnsured = false;

  async ensureInitialUsers(): Promise<void> {
    if (!isMongoConfigured() || this.initialUsersEnsured) return;
    try {
      const db = await getDb();
      const count = await db.collection("users").countDocuments();
      const isProd = process.env.NODE_ENV === "production";
      const superPass = process.env.SUPERADMIN_INITIAL_PASSWORD;
      const adminPass = process.env.ADMIN_INITIAL_PASSWORD;

      if (count === 0) {
        // Never seed known demo passwords (admin123 / superadmin123) into a live DB
        if (isProd) {
          if (!superPass || superPass.length < 8) {
            throw new Error(
              "SUPERADMIN_INITIAL_PASSWORD (min 8 chars) is required for first production database seed."
            );
          }
          if (!adminPass || adminPass.length < 8) {
            throw new Error(
              "ADMIN_INITIAL_PASSWORD (min 8 chars) is required for first production database seed."
            );
          }
        }

        const seedSource = isProd
          ? INITIAL_SEEDED_USERS.filter(
              (u) => u.role === "superadmin" || u.username === "admin"
            )
          : INITIAL_SEEDED_USERS;

        const usersToSeed = await Promise.all(
          seedSource.map(async (u) => {
            if (u.role === "superadmin" && superPass && superPass.length >= 8) {
              const hash = await bcrypt.hash(superPass, 10);
              return { ...u, passwordHash: hash };
            }
            if (u.username === "admin" && adminPass && adminPass.length >= 8) {
              const hash = await bcrypt.hash(adminPass, 10);
              return { ...u, passwordHash: hash };
            }
            return u;
          })
        );
        await db.collection("users").insertMany(usersToSeed as any);
      } else {
        // Ensure root superadmin exists if missing
        const superAdminExists = await db.collection("users").findOne({ role: "superadmin" });
        if (!superAdminExists) {
          const superAdminSeed = INITIAL_SEEDED_USERS.find((u) => u.role === "superadmin");
          if (superAdminSeed) {
            if (isProd && (!superPass || superPass.length < 8)) {
              throw new Error(
                "SUPERADMIN_INITIAL_PASSWORD (min 8 chars) is required to create the missing superadmin in production."
              );
            }
            let seedToInsert = { ...superAdminSeed };
            if (superPass && superPass.length >= 8) {
              seedToInsert.passwordHash = await bcrypt.hash(superPass, 10);
            }
            await db.collection("users").insertOne(seedToInsert as any);
          }
        }

        // Ensure primary default shop admin exists if missing
        const primaryAdminExists = await db.collection("users").findOne({
          $or: [{ username: "admin" }, { id: "user-1" }],
        });
        if (!primaryAdminExists) {
          const adminSeed = INITIAL_SEEDED_USERS.find((u) => u.username === "admin");
          if (adminSeed) {
            if (isProd && (!adminPass || adminPass.length < 8)) {
              throw new Error(
                "ADMIN_INITIAL_PASSWORD (min 8 chars) is required to create the missing shop admin in production."
              );
            }
            let seedToInsert = { ...adminSeed };
            if (adminPass && adminPass.length >= 8) {
              seedToInsert.passwordHash = await bcrypt.hash(adminPass, 10);
            }
            await db.collection("users").insertOne(seedToInsert as any);
          }
        }

        // Ensure existing users without shopId are assigned to default shop
        await db.collection("users").updateMany(
          { role: { $ne: "superadmin" }, shopId: { $exists: false } },
          { $set: { shopId: DEFAULT_SHOP_ID } }
        );
        // Ensure existing users without permissions are assigned default permissions
        await db.collection("users").updateMany(
          { role: "staff", permissions: { $exists: false } },
          { $set: { permissions: DEFAULT_STAFF_PERMISSIONS } }
        );
        await db.collection("users").updateMany(
          { role: { $in: ["admin", "superadmin"] }, permissions: { $exists: false } },
          { $set: { permissions: DEFAULT_ADMIN_PERMISSIONS } }
        );
      }
      this.initialUsersEnsured = true;
    } catch (err) {
      console.error("MongoDB ensureInitialUsers error:", err);
    }
  }

  // --- RESET TO SAMPLE DATA ---
  async resetToSampleData(shopId?: string): Promise<void> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = getShopFilter(targetShop);
      await db.collection("parts").deleteMany(filter);
      await db.collection("customers").deleteMany(filter);
      await db.collection("bills").deleteMany(filter);
      await db.collection("supplierCredits").deleteMany(filter);
      await db.collection("mechanics").deleteMany(filter);
      await db.collection("mechanicLedger").deleteMany(filter);
      await db.collection("jobCards").deleteMany(filter);

      const partsToInsert = SEED_PARTS.map((p) => ({ ...p, shopId: targetShop }));
      const custsToInsert = SEED_CUSTOMERS.map((c) => ({ ...c, shopId: targetShop }));
      const billsToInsert = SEED_BILLS.map((b) => ({ ...b, shopId: targetShop }));
      const creditsToInsert = SEED_SUPPLIER_CREDITS.map((s) => ({ ...s, shopId: targetShop }));
      const mechsToInsert = SEED_MECHANICS.map((m) => ({ ...m, shopId: targetShop }));
      const ledgerToInsert = SEED_MECHANIC_LEDGER.map((l) => ({ ...l, shopId: targetShop }));
      const jobCardsToInsert = SEED_JOB_CARDS.map((j) => ({ ...j, shopId: targetShop }));

      if (partsToInsert.length > 0) await db.collection("parts").insertMany(partsToInsert as any);
      if (custsToInsert.length > 0) await db.collection("customers").insertMany(custsToInsert as any);
      if (billsToInsert.length > 0) await db.collection("bills").insertMany(billsToInsert as any);
      if (creditsToInsert.length > 0) await db.collection("supplierCredits").insertMany(creditsToInsert as any);
      if (mechsToInsert.length > 0) await db.collection("mechanics").insertMany(mechsToInsert as any);
      if (ledgerToInsert.length > 0) await db.collection("mechanicLedger").insertMany(ledgerToInsert as any);
      if (jobCardsToInsert.length > 0) await db.collection("jobCards").insertMany(jobCardsToInsert as any);

      await this.ensureInitialShops();
      await this.ensureInitialUsers();
    }
  }
}

export const db = new MongoDBAtlasDatabase();
