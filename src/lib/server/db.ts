import bcrypt from "bcryptjs";
import {
  Part,
  Customer,
  Bill,
  SupplierCredit,
  DashboardStats,
  Mechanic,
  MechanicLedgerEntry,
  VehicleJobCard,
  DbUser,
  Shop,
  SaaSStats,
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
import { daysSince } from "../utils";
import { getDb, isMongoConfigured } from "./mongodb";

export const DEFAULT_SHOP_ID = "shop-sikandar";

export const INITIAL_SEEDED_SHOPS: Shop[] = [
  {
    id: DEFAULT_SHOP_ID,
    slug: "gilani-autos",
    name: "Gilani Autos",
    urduName: "گیلانی آٹوز",
    ownerName: "Gilani Khan",
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
    passwordHash: "$2b$10$OFJLNjQsRoOVzXG5470vmevVYsx0Mf7c9sXAn7H/cyVPDwB0sR8Me", // "superadmin123"
    role: "superadmin",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-1",
    username: "admin",
    email: "admin@gilaniautos.pk",
    name: "Gilani Autos (Owner / Admin)",
    passwordHash: "$2b$10$/TdBaVILa4hlavuMZ7KszOzQjqOoP6UTWYiFHnIgoZCK73eSePstO", // "admin123"
    role: "admin",
    shopId: DEFAULT_SHOP_ID,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-2",
    username: "staff",
    email: "staff@gilaniautos.pk",
    name: "Shop Assistant",
    passwordHash: "$2b$10$B5DC9cIhM7CFDD9ctNp4heu1I0VI8JJztHHYM.n0yYu8reys9BtcG", // "staff123"
    role: "staff",
    shopId: DEFAULT_SHOP_ID,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-3",
    username: "sohail",
    email: "sohail@gilaniautos.pk",
    name: "Sohail Rasheed (Manager)",
    passwordHash: "$2b$10$5E36laiLZB1TvhjGpqwKKek2Y3kvKBDN0N3Lq1E/VAm0.ZJSgEEem", // "sohail123"
    role: "admin",
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

  async getUsersByShop(shopId: string): Promise<DbUser[]> {
    if (isMongoConfigured()) {
      const db = await getDb();
      const users = await db.collection<DbUser>("users").find({ shopId }).toArray();
      return users.map(({ _id, passwordHash, ...rest }: any) => rest as DbUser);
    }
    return memoryStore.users
      .filter((u) => u.shopId === shopId)
      .map(({ passwordHash, ...u }) => u as any);
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("users").deleteOne({ id: userId });
      return true;
    }
    memoryStore.users = memoryStore.users.filter((u) => u.id !== userId);
    return true;
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

  // --- PARTS / INVENTORY ---
  async getParts(shopId?: string): Promise<Part[]> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    if (isMongoConfigured()) {
      try {
        const db = await getDb();
        const filter = getShopFilter(targetShop);
        const parts = await db.collection<Part>("parts").find(filter).sort({ createdAt: -1 }).toArray();
        return parts.map(({ _id, ...rest }: any) => rest as Part);
      } catch (err) {
        console.error("MongoDB getParts error (falling back to memoryStore):", err);
      }
    }
    return memoryStore.parts.filter((p) => matchesShop(p.shopId, targetShop));
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
          return rest as Part;
        }
      } catch (err) {
        console.error("MongoDB getPart error (falling back to memoryStore):", err);
      }
    }
    return memoryStore.parts.find((p) => p.id === id && matchesShop(p.shopId, targetShop)) || null;
  }

  async createPart(
    partData: Omit<Part, "id" | "createdAt" | "updatedAt">,
    shopId?: string
  ): Promise<Part> {
    const targetShop = shopId || DEFAULT_SHOP_ID;
    const newPart: Part = {
      ...partData,
      id: `part-${Date.now()}`,
      shopId: targetShop,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("parts").insertOne(newPart as any);
      return newPart;
    }

    memoryStore.parts.unshift(newPart);
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
    const newStock = Math.max(0, part.currentStock + delta);
    return this.updatePart(id, { currentStock: newStock }, targetShop);
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
    if (isMongoConfigured()) {
      const db = await getDb();
      const filter = { id, ...getShopFilter(targetShop) };
      await db.collection("customers").deleteOne(filter);
      return true;
    }
    memoryStore.customers = memoryStore.customers.filter((c) => !(c.id === id && matchesShop(c.shopId, targetShop)));
    return true;
  }

  // --- BILLS ---
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
    const parts = await this.getParts(targetShop);

    // 1. Verify Stock for all items
    for (const item of billData.items) {
      const part = parts.find((p) => p.id === item.partId);
      if (!part) throw new Error(`Part "${item.partName}" not found in inventory.`);
      if (part.currentStock < item.quantity) {
        throw new Error(
          `Stock insufficient for "${item.partName}". Available: ${part.currentStock}, Requested: ${item.quantity}`
        );
      }
    }

    // 2. Deduct Stock
    for (const item of billData.items) {
      await this.updateStock(item.partId, -item.quantity, targetShop);
    }

    // 3. Generate Bill Number
    const allBills = await this.getBills(targetShop);
    const count = allBills.length + 1001;
    const billNumber = `SK-${count}`;
    const newBill: Bill = {
      ...billData,
      id: `bill-${Date.now()}`,
      billNumber,
      status: "Completed",
      shopId: targetShop,
      createdAt: new Date().toISOString(),
    };

    if (isMongoConfigured()) {
      const db = await getDb();
      await db.collection("bills").insertOne(newBill as any);
    } else {
      memoryStore.bills.unshift(newBill);
    }

    // 4. Update Mechanic Ledger if labour charges are included
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

    // 5. Update Customer Total Spent & Visits if registered
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

    // Restore stock for all items
    for (const item of bill.items) {
      await this.updateStock(item.partId, item.quantity, targetShop);
    }

    // Mark as cancelled
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
    const mechName = mechanic ? mechanic.name : "Mechanic";

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
          return rest as DbUser;
        }
      } catch (err) {
        console.error("MongoDB user lookup error:", err);
      }
    }

    return (
      memoryStore.users.find(
        (u) =>
          u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
      ) || null
    );
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

  async ensureInitialUsers(): Promise<void> {
    if (!isMongoConfigured()) return;
    try {
      const db = await getDb();
      const count = await db.collection("users").countDocuments();
      if (count === 0) {
        await db.collection("users").insertMany(INITIAL_SEEDED_USERS as any);
      } else {
        // Ensure each initial seed user exists
        for (const u of INITIAL_SEEDED_USERS) {
          const existing = await db.collection("users").findOne({ username: u.username });
          if (!existing) {
            await db.collection("users").insertOne(u as any);
          }
        }
        // Ensure existing users without shopId are assigned to default shop
        await db.collection("users").updateMany(
          { role: { $ne: "superadmin" }, shopId: { $exists: false } },
          { $set: { shopId: DEFAULT_SHOP_ID } }
        );
      }
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
