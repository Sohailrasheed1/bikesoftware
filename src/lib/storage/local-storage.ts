import {
  Part,
  Customer,
  Bill,
  SupplierCredit,
  DashboardStats,
  Mechanic,
  MechanicLedgerEntry,
  VehicleJobCard,
  BillLabourItem,
  PurchaseBatch,
  SaleDetail,
  StockAdjustment,
  RateHistoryEntry,
} from "@/types";
import { IStorageService } from "./types";
import {
  SEED_PARTS,
  SEED_CUSTOMERS,
  SEED_BILLS,
  SEED_SUPPLIER_CREDITS,
  SEED_MECHANICS,
  SEED_MECHANIC_LEDGER,
  SEED_JOB_CARDS,
} from "./seed-data";
import { daysSince } from "../utils";

const STORAGE_KEYS = {
  PARTS: "jilani_autos_parts_v1",
  CUSTOMERS: "jilani_autos_customers_v1",
  BILLS: "jilani_autos_bills_v1",
  SUPPLIER_CREDITS: "jilani_autos_supplier_credits_v1",
  MECHANICS: "jilani_autos_mechanics_v1",
  MECHANIC_LEDGER: "jilani_autos_mechanic_ledger_v1",
  JOB_CARDS: "jilani_autos_job_cards_v1",
  PURCHASE_BATCHES: "jilani_autos_purchase_batches_v1",
  SALE_DETAILS: "jilani_autos_sale_details_v1",
  STOCK_ADJUSTMENTS: "jilani_autos_stock_adjustments_v1",
};

export class LocalStorageService implements IStorageService {
  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser()) return defaultValue;
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
      }
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to write to localStorage for key: ${key}`, e);
    }
  }

  // --- PARTS / INVENTORY ---
  async getParts(): Promise<Part[]> {
    return this.getItem<Part[]>(STORAGE_KEYS.PARTS, SEED_PARTS);
  }

  async getPart(id: string): Promise<Part | null> {
    const parts = await this.getParts();
    return parts.find((p) => p.id === id) || null;
  }

  async createPart(partData: Omit<Part, "id" | "createdAt" | "updatedAt">): Promise<Part> {
    const parts = await this.getParts();
    const newPart: Part = {
      ...partData,
      id: `part-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    parts.unshift(newPart);
    this.setItem(STORAGE_KEYS.PARTS, parts);
    return newPart;
  }

  async updatePart(id: string, updates: Partial<Part>): Promise<Part> {
    const parts = await this.getParts();
    const index = parts.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Part not found");

    const updated: Part = {
      ...parts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    parts[index] = updated;
    this.setItem(STORAGE_KEYS.PARTS, parts);
    return updated;
  }

  async deletePart(id: string): Promise<boolean> {
    const parts = await this.getParts();
    const filtered = parts.filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.PARTS, filtered);
    return true;
  }

  async updateStock(id: string, delta: number): Promise<Part> {
    const parts = await this.getParts();
    const part = parts.find((p) => p.id === id);
    if (!part) throw new Error("Part not found");

    if (delta > 0) {
      await this.createPurchaseBatch({
        partId: id,
        partName: part.name,
        qtyPurchased: delta,
        costPrice: part.purchasePrice,
        supplier: part.supplierName || "Direct Stock Add",
        notes: "Stock addition batch",
      });
    } else if (delta < 0) {
      await this.recordPurchaseReturn({
        partId: id,
        quantity: Math.abs(delta),
        reason: "Direct stock reduction",
      });
    }

    const updated = await this.getPart(id);
    return updated || part;
  }

  // --- FIFO BATCHES & COSTING ---
  async getPurchaseBatches(partId?: string): Promise<PurchaseBatch[]> {
    const batches = this.getItem<PurchaseBatch[]>(STORAGE_KEYS.PURCHASE_BATCHES, []);
    let list = partId ? batches.filter((b) => b.partId === partId) : batches;
    return list.sort((a, b) => (a.purchaseDate > b.purchaseDate ? 1 : -1));
  }

  async createPurchaseBatch(batchData: {
    partId: string;
    partName?: string;
    purchaseDate?: string;
    qtyPurchased: number;
    costPrice: number;
    supplier: string;
    notes?: string;
  }): Promise<PurchaseBatch> {
    const batches = await this.getPurchaseBatches();
    const part = await this.getPart(batchData.partId);
    const partName = batchData.partName || part?.name || "Spare Part";

    const newBatch: PurchaseBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      partId: batchData.partId,
      partName,
      purchaseDate: batchData.purchaseDate || new Date().toISOString(),
      qtyPurchased: Number(batchData.qtyPurchased) || 0,
      qtyRemaining: Number(batchData.qtyPurchased) || 0,
      costPrice: Number(batchData.costPrice) || 0,
      supplier: batchData.supplier || "General Supplier",
      notes: batchData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    batches.push(newBatch);
    this.setItem(STORAGE_KEYS.PURCHASE_BATCHES, batches);

    // Update Part stock = sum of all batch remaining stock for this part
    const partBatches = batches.filter((b) => b.partId === batchData.partId);
    const totalRemaining = partBatches.reduce((sum, b) => sum + b.qtyRemaining, 0);
    if (part) {
      await this.updatePart(batchData.partId, {
        currentStock: totalRemaining,
        purchasePrice: batchData.costPrice > 0 ? batchData.costPrice : part.purchasePrice,
      });
    }

    return newBatch;
  }

  async getPurchaseRateHistory(partId?: string): Promise<RateHistoryEntry[]> {
    const batches = await this.getPurchaseBatches(partId);
    const grouped: Record<string, PurchaseBatch[]> = {};
    for (const b of batches) {
      if (!grouped[b.partId]) grouped[b.partId] = [];
      grouped[b.partId].push(b);
    }

    const history: RateHistoryEntry[] = [];
    for (const pId of Object.keys(grouped)) {
      const pBatches = grouped[pId].sort(
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

  async recordPurchaseReturn(data: {
    partId: string;
    batchId?: string;
    quantity: number;
    reason: string;
    supplier?: string;
  }): Promise<StockAdjustment> {
    const batches = await this.getPurchaseBatches();
    const part = await this.getPart(data.partId);
    if (!part) throw new Error("Part not found");
    if (data.quantity <= 0) throw new Error("Return quantity must be greater than 0");

    let qtyToDeduct = data.quantity;
    if (data.batchId) {
      const b = batches.find((x) => x.id === data.batchId);
      if (!b) throw new Error("Specified batch not found");
      if (b.qtyRemaining < qtyToDeduct) throw new Error("Insufficient batch quantity for return");
      b.qtyRemaining -= qtyToDeduct;
      b.updatedAt = new Date().toISOString();
    } else {
      const activeBatches = batches.filter((b) => b.partId === data.partId && b.qtyRemaining > 0);
      const totalAvail = activeBatches.reduce((s, b) => s + b.qtyRemaining, 0);
      if (totalAvail < qtyToDeduct) throw new Error("Insufficient stock for purchase return");

      for (const b of activeBatches) {
        if (qtyToDeduct <= 0) break;
        const take = Math.min(b.qtyRemaining, qtyToDeduct);
        b.qtyRemaining -= take;
        b.updatedAt = new Date().toISOString();
        qtyToDeduct -= take;
      }
    }

    this.setItem(STORAGE_KEYS.PURCHASE_BATCHES, batches);

    const adjustments = this.getItem<StockAdjustment[]>(STORAGE_KEYS.STOCK_ADJUSTMENTS, []);
    const adj: StockAdjustment = {
      id: `adj-${Date.now()}`,
      type: "purchase_return",
      partId: data.partId,
      partName: part.name,
      batchId: data.batchId,
      quantity: data.quantity,
      reason: data.reason || "Purchase Return",
      supplier: data.supplier || part.supplierName,
      costPrice: part.purchasePrice,
      createdAt: new Date().toISOString(),
    };
    adjustments.unshift(adj);
    this.setItem(STORAGE_KEYS.STOCK_ADJUSTMENTS, adjustments);

    // Update part currentStock
    const partBatches = batches.filter((b) => b.partId === data.partId);
    const newStock = partBatches.reduce((s, b) => s + b.qtyRemaining, 0);
    await this.updatePart(data.partId, { currentStock: newStock });

    return adj;
  }

  async recordStockAdjustment(data: {
    partId: string;
    batchId?: string;
    quantity: number;
    reason: string;
  }): Promise<StockAdjustment> {
    const part = await this.getPart(data.partId);
    if (!part) throw new Error("Part not found");

    if (data.quantity < 0) {
      await this.recordPurchaseReturn({
        partId: data.partId,
        batchId: data.batchId,
        quantity: Math.abs(data.quantity),
        reason: data.reason,
      });
    } else if (data.quantity > 0) {
      await this.createPurchaseBatch({
        partId: data.partId,
        partName: part.name,
        qtyPurchased: data.quantity,
        costPrice: part.purchasePrice,
        supplier: "Stock Adjustment",
        notes: data.reason,
      });
    }

    const adjustments = this.getItem<StockAdjustment[]>(STORAGE_KEYS.STOCK_ADJUSTMENTS, []);
    const adj: StockAdjustment = {
      id: `adj-${Date.now()}`,
      type: "adjustment",
      partId: data.partId,
      partName: part.name,
      batchId: data.batchId,
      quantity: data.quantity,
      reason: data.reason || "Stock Adjustment",
      costPrice: part.purchasePrice,
      createdAt: new Date().toISOString(),
    };
    adjustments.unshift(adj);
    this.setItem(STORAGE_KEYS.STOCK_ADJUSTMENTS, adjustments);
    return adj;
  }

  async getSaleDetails(billId?: string, partId?: string): Promise<SaleDetail[]> {
    const details = this.getItem<SaleDetail[]>(STORAGE_KEYS.SALE_DETAILS, []);
    let list = details;
    if (billId) list = list.filter((d) => d.billId === billId);
    if (partId) list = list.filter((d) => d.partId === partId);
    return list;
  }

  // --- CUSTOMERS ---
  async getCustomers(): Promise<Customer[]> {
    return this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
  }

  async getCustomer(id: string): Promise<Customer | null> {
    const customers = await this.getCustomers();
    return customers.find((c) => c.id === id) || null;
  }

  async createCustomer(
    customerData: Omit<Customer, "id" | "totalSpent" | "totalVisits" | "createdAt" | "updatedAt">
  ): Promise<Customer> {
    const customers = await this.getCustomers();
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      totalSpent: 0,
      totalVisits: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    customers.unshift(newCustomer);
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const customers = await this.getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Customer not found");

    const updated: Customer = {
      ...customers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    customers[index] = updated;
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const customers = await this.getCustomers();
    const filtered = customers.filter((c) => c.id !== id);
    this.setItem(STORAGE_KEYS.CUSTOMERS, filtered);
    return true;
  }

  // --- BILLS & INVOICING ---
  async getBills(): Promise<Bill[]> {
    return this.getItem<Bill[]>(STORAGE_KEYS.BILLS, SEED_BILLS);
  }

  async getBill(id: string): Promise<Bill | null> {
    const bills = await this.getBills();
    return bills.find((b) => b.id === id) || null;
  }

  async createBill(
    billData: Omit<Bill, "id" | "billNumber" | "createdAt" | "status">
  ): Promise<Bill> {
    const parts = await this.getParts();
    const customers = await this.getCustomers();
    const bills = await this.getBills();

    // 1. Verify Stock for all items (Prevent Over-selling)
    for (const item of billData.items) {
      const part = parts.find((p) => p.id === item.partId);
      if (!part) {
        throw new Error(`Part "${item.partName}" not found in inventory.`);
      }
      if (part.currentStock < item.quantity) {
        throw new Error(
          `Stock insufficient for "${item.partName}". Available: ${part.currentStock}, Requested: ${item.quantity}`
        );
      }
    }

    // 2. Deduct Stock automatically
    for (const item of billData.items) {
      const part = parts.find((p) => p.id === item.partId);
      if (part) {
        part.currentStock -= item.quantity;
        part.updatedAt = new Date().toISOString();
      }
    }
    this.setItem(STORAGE_KEYS.PARTS, parts);

    // 3. Generate Bill Number
    const count = bills.length + 1001;
    const billNumber = `SK-${count}`;
    const newBill: Bill = {
      ...billData,
      id: `bill-${Date.now()}`,
      billNumber,
      status: "Completed",
      createdAt: new Date().toISOString(),
    };
    bills.unshift(newBill);
    this.setItem(STORAGE_KEYS.BILLS, bills);

    // 4. Update Mechanic Ledger if labour charges are entered
    if (billData.labourItems && billData.labourItems.length > 0) {
      const ledger = await this.getMechanicLedger();
      for (const item of billData.labourItems) {
        if (item.amount > 0 && item.mechanicName) {
          const shopAmount = item.shopShare ?? Math.round((item.amount * (item.shopCutPercentage || 0)) / 100);
          const mechAmount = item.mechanicShare ?? (item.amount - shopAmount);
          const entry: MechanicLedgerEntry = {
            id: `mled-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            mechanicId: item.mechanicId || `mech-${encodeURIComponent(item.mechanicName.trim().toLowerCase())}`,
            mechanicName: item.mechanicName,
            type: "earning",
            date: newBill.createdAt,
            billId: newBill.id,
            billNumber: newBill.billNumber,
            vehicleDetails: [billData.bikeModel, billData.bikeRegNumber].filter(Boolean).join(" - ") || undefined,
            customerName: billData.customerName || "Walk-in Customer",
            laborDescription: item.description || "Mechanic Labour Work",
            totalLaborAmount: item.amount,
            shopPercentage: item.shopCutPercentage,
            shopAmount: shopAmount,
            mechanicAmount: mechAmount,
            notes: `Labour from Bill #${newBill.billNumber}`,
          };
          ledger.unshift(entry);
        }
      }
      this.setItem(STORAGE_KEYS.MECHANIC_LEDGER, ledger);
    }

    // 5. Update Customer Lifetime Spend and Visits if customer exists or was selected
    if (billData.customerId) {
      const cust = customers.find((c) => c.id === billData.customerId);
      if (cust) {
        cust.totalSpent += billData.grandTotal;
        cust.totalVisits += 1;
        cust.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    return newBill;
  }

  async cancelBill(id: string): Promise<boolean> {
    const bills = await this.getBills();
    const bill = bills.find((b) => b.id === id);
    if (!bill) throw new Error("Bill not found");
    if (bill.status === "Cancelled") {
      throw new Error("Bill is already cancelled.");
    }

    // 1. Restore Stock automatically
    const parts = await this.getParts();
    for (const item of bill.items) {
      const part = parts.find((p) => p.id === item.partId);
      if (part) {
        part.currentStock += item.quantity;
        part.updatedAt = new Date().toISOString();
      }
    }
    this.setItem(STORAGE_KEYS.PARTS, parts);

    // 2. Reverse Customer Lifetime Spend
    if (bill.customerId) {
      const customers = await this.getCustomers();
      const cust = customers.find((c) => c.id === bill.customerId);
      if (cust) {
        cust.totalSpent = Math.max(0, cust.totalSpent - bill.grandTotal);
        cust.totalVisits = Math.max(0, cust.totalVisits - 1);
        cust.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    // 3. Reverse Mechanic Ledger entries for this bill
    const ledger = await this.getMechanicLedger();
    const filteredLedger = ledger.filter((l) => l.billId !== bill.id && l.billNumber !== bill.billNumber);
    this.setItem(STORAGE_KEYS.MECHANIC_LEDGER, filteredLedger);

    // 4. Mark Bill as Cancelled
    bill.status = "Cancelled";
    this.setItem(STORAGE_KEYS.BILLS, bills);
    return true;
  }

  async deleteBill(id: string): Promise<boolean> {
    const bills = await this.getBills();
    const filtered = bills.filter((b) => b.id !== id);
    this.setItem(STORAGE_KEYS.BILLS, filtered);
    const ledger = await this.getMechanicLedger();
    const filteredLedger = ledger.filter((l) => l.billId !== id);
    this.setItem(STORAGE_KEYS.MECHANIC_LEDGER, filteredLedger);
    return true;
  }

  // --- MECHANICS (میکینک) ---
  async getMechanics(): Promise<Mechanic[]> {
    return this.getItem<Mechanic[]>(STORAGE_KEYS.MECHANICS, SEED_MECHANICS);
  }

  async getMechanic(id: string): Promise<Mechanic | null> {
    const mechs = await this.getMechanics();
    return mechs.find((m) => m.id === id) || null;
  }

  async createMechanic(data: Omit<Mechanic, "id" | "createdAt" | "updatedAt">): Promise<Mechanic> {
    const mechs = await this.getMechanics();
    const newMech: Mechanic = {
      ...data,
      id: `mech-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mechs.push(newMech);
    this.setItem(STORAGE_KEYS.MECHANICS, mechs);
    return newMech;
  }

  async updateMechanic(id: string, updates: Partial<Mechanic>): Promise<Mechanic> {
    const mechs = await this.getMechanics();
    const idx = mechs.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Mechanic not found");
    const updated: Mechanic = {
      ...mechs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    mechs[idx] = updated;
    this.setItem(STORAGE_KEYS.MECHANICS, mechs);
    return updated;
  }

  async deleteMechanic(id: string): Promise<boolean> {
    const mechs = await this.getMechanics();
    this.setItem(STORAGE_KEYS.MECHANICS, mechs.filter((m) => m.id !== id));
    return true;
  }

  // --- MECHANIC LEDGER (کھاتہ) ---
  async getMechanicLedger(mechanicId?: string): Promise<MechanicLedgerEntry[]> {
    const all = this.getItem<MechanicLedgerEntry[]>(STORAGE_KEYS.MECHANIC_LEDGER, SEED_MECHANIC_LEDGER);
    if (mechanicId) {
      return all.filter((entry) => entry.mechanicId === mechanicId || entry.mechanicName.toLowerCase() === mechanicId.toLowerCase());
    }
    return all;
  }

  async recordMechanicPayout(mechanicId: string, amount: number, notes?: string): Promise<MechanicLedgerEntry> {
    if (amount <= 0) throw new Error("Payout amount must be greater than zero");
    const mechs = await this.getMechanics();
    const mech = mechs.find((m) => m.id === mechanicId);
    const mechName = mech ? mech.name : mechanicId;

    const ledger = await this.getMechanicLedger();
    const entry: MechanicLedgerEntry = {
      id: `payout-${Date.now()}`,
      mechanicId,
      mechanicName: mechName,
      type: "payout",
      date: new Date().toISOString(),
      totalLaborAmount: 0,
      shopPercentage: 0,
      shopAmount: 0,
      mechanicAmount: amount,
      notes: notes || "Cash Payout / Advance Ada Kiya Gya",
    };
    ledger.unshift(entry);
    this.setItem(STORAGE_KEYS.MECHANIC_LEDGER, ledger);
    return entry;
  }

  // --- LIVE VEHICLE JOB CARDS (10 Gariyon Ka Live Kaam) ---
  async getJobCards(): Promise<VehicleJobCard[]> {
    return this.getItem<VehicleJobCard[]>(STORAGE_KEYS.JOB_CARDS, SEED_JOB_CARDS);
  }

  async getJobCard(id: string): Promise<VehicleJobCard | null> {
    const cards = await this.getJobCards();
    return cards.find((c) => c.id === id) || null;
  }

  async createJobCard(cardData: {
    bayNumber: number;
    customerName: string;
    customerPhone?: string;
    bikeRegNumber: string;
    bikeModel: string;
    complaintDescription?: string;
    assignedMechanicId?: string;
    assignedMechanicName?: string;
  }): Promise<VehicleJobCard> {
    const cards = await this.getJobCards();
    const count = cards.length + 101;
    const newCard: VehicleJobCard = {
      ...cardData,
      id: `job-${Date.now()}`,
      jobCardNumber: `JC-${count}`,
      status: "In Progress",
      items: [],
      labourItems: [],
      estimatedSubtotal: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cards.unshift(newCard);
    this.setItem(STORAGE_KEYS.JOB_CARDS, cards);
    return newCard;
  }

  async updateJobCard(id: string, updates: Partial<VehicleJobCard>): Promise<VehicleJobCard> {
    const cards = await this.getJobCards();
    const idx = cards.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Job card not found");

    const updated = {
      ...cards[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // recalculate estimatedSubtotal
    const partsTotal = (updated.items || []).reduce((acc, i) => acc + i.totalPrice, 0);
    const labourTotal = (updated.labourItems || []).reduce((acc, l) => acc + l.amount, 0);
    updated.estimatedSubtotal = partsTotal + labourTotal;

    cards[idx] = updated;
    this.setItem(STORAGE_KEYS.JOB_CARDS, cards);
    return updated;
  }

  async addPartToJobCard(jobCardId: string, partId: string, quantity: number = 1): Promise<VehicleJobCard> {
    const cards = await this.getJobCards();
    const card = cards.find((c) => c.id === jobCardId);
    if (!card) throw new Error("Job card not found");

    const parts = await this.getParts();
    const part = parts.find((p) => p.id === partId);
    if (!part) throw new Error("Part not found in inventory");

    // Check available stock
    const existingIndex = card.items.findIndex((i) => i.partId === partId);
    const currentCardQty = existingIndex > -1 ? card.items[existingIndex].quantity : 0;
    if (currentCardQty + quantity > part.currentStock) {
      throw new Error(`Insufficient stock for "${part.name}". Available: ${part.currentStock}`);
    }

    if (existingIndex > -1) {
      card.items[existingIndex].quantity += quantity;
      card.items[existingIndex].totalPrice = card.items[existingIndex].quantity * card.items[existingIndex].unitPrice;
    } else {
      card.items.push({
        partId: part.id,
        partName: part.name,
        category: part.category,
        quantity,
        unitPrice: part.sellingPrice,
        purchasePrice: part.purchasePrice,
        totalPrice: quantity * part.sellingPrice,
      });
    }

    return this.updateJobCard(jobCardId, { items: card.items });
  }

  async updateJobCardPartQty(jobCardId: string, partId: string, delta: number): Promise<VehicleJobCard> {
    const cards = await this.getJobCards();
    const card = cards.find((c) => c.id === jobCardId);
    if (!card) throw new Error("Job card not found");

    const existingIndex = card.items.findIndex((i) => i.partId === partId);
    if (existingIndex === -1) return card;

    const parts = await this.getParts();
    const part = parts.find((p) => p.id === partId);

    const newQty = card.items[existingIndex].quantity + delta;
    if (newQty <= 0) {
      card.items.splice(existingIndex, 1);
    } else {
      if (part && newQty > part.currentStock) {
        throw new Error(`Only ${part.currentStock} units available in stock.`);
      }
      card.items[existingIndex].quantity = newQty;
      card.items[existingIndex].totalPrice = newQty * card.items[existingIndex].unitPrice;
    }

    return this.updateJobCard(jobCardId, { items: card.items });
  }

  async removePartFromJobCard(jobCardId: string, partId: string): Promise<VehicleJobCard> {
    const cards = await this.getJobCards();
    const card = cards.find((c) => c.id === jobCardId);
    if (!card) throw new Error("Job card not found");

    card.items = card.items.filter((i) => i.partId !== partId);
    return this.updateJobCard(jobCardId, { items: card.items });
  }

  async addLabourToJobCard(
    jobCardId: string,
    labour: {
      description: string;
      amount: number;
      mechanicId?: string;
      mechanicName: string;
      shopCutPercentage: number;
    }
  ): Promise<VehicleJobCard> {
    const cards = await this.getJobCards();
    const card = cards.find((c) => c.id === jobCardId);
    if (!card) throw new Error("Job card not found");

    const shopShare = Math.round((labour.amount * (labour.shopCutPercentage || 0)) / 100);
    const mechanicShare = labour.amount - shopShare;

    const newLabour: BillLabourItem = {
      id: `lbr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: labour.description,
      amount: labour.amount,
      mechanicId: labour.mechanicId,
      mechanicName: labour.mechanicName,
      shopCutPercentage: labour.shopCutPercentage,
      shopShare,
      mechanicShare,
    };

    card.labourItems.push(newLabour);
    return this.updateJobCard(jobCardId, { labourItems: card.labourItems });
  }

  async removeLabourFromJobCard(jobCardId: string, labourId: string): Promise<VehicleJobCard> {
    const cards = await this.getJobCards();
    const card = cards.find((c) => c.id === jobCardId);
    if (!card) throw new Error("Job card not found");

    card.labourItems = card.labourItems.filter((l) => l.id !== labourId);
    return this.updateJobCard(jobCardId, { labourItems: card.labourItems });
  }

  async completeJobCardAndGenerateBill(
    jobCardId: string,
    paymentMethod: Bill["paymentMethod"],
    discount: number = 0,
    notes?: string
  ): Promise<{ bill: Bill; jobCard: VehicleJobCard }> {
    const cards = await this.getJobCards();
    const card = cards.find((c) => c.id === jobCardId);
    if (!card) throw new Error("Job card not found");

    const partsTotal = card.items.reduce((acc, i) => acc + i.totalPrice, 0);
    const labourTotal = card.labourItems.reduce((acc, l) => acc + l.amount, 0);
    const subtotal = partsTotal + labourTotal;
    const grandTotal = Math.max(0, subtotal - (Number(discount) || 0));

    // Try finding customer by phone or reg number
    const customers = await this.getCustomers();
    const existingCust = customers.find(
      (c) =>
        (card.customerPhone && c.phone === card.customerPhone) ||
        (card.bikeRegNumber && c.bikeRegNumber.toLowerCase() === card.bikeRegNumber.toLowerCase())
    );

    // Create the real bill (validates stock, deducts stock, credits mechanic ledger, updates customer)
    const bill = await this.createBill({
      customerId: existingCust ? existingCust.id : undefined,
      customerName: card.customerName || "Walk-in Customer",
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
      notes: notes || `Generated from Job Card #${card.jobCardNumber}`,
    });

    // Mark job card as completed
    card.status = "Completed";
    card.completedAt = new Date().toISOString();
    card.billId = bill.id;
    card.billNumber = bill.billNumber;
    card.updatedAt = new Date().toISOString();

    this.setItem(STORAGE_KEYS.JOB_CARDS, cards);

    return { bill, jobCard: card };
  }

  async deleteJobCard(id: string): Promise<boolean> {
    const cards = await this.getJobCards();
    this.setItem(STORAGE_KEYS.JOB_CARDS, cards.filter((c) => c.id !== id));
    return true;
  }

  // --- SUPPLIER CREDIT (UDHAAR / KHATA) ---
  async getSupplierCredits(): Promise<SupplierCredit[]> {
    return this.getItem<SupplierCredit[]>(STORAGE_KEYS.SUPPLIER_CREDITS, SEED_SUPPLIER_CREDITS);
  }

  async getSupplierCredit(id: string): Promise<SupplierCredit | null> {
    const credits = await this.getSupplierCredits();
    return credits.find((c) => c.id === id) || null;
  }

  async createSupplierCredit(
    creditData: Omit<
      SupplierCredit,
      "id" | "paidAmount" | "remainingBalance" | "status" | "paymentHistory" | "createdAt" | "updatedAt"
    >
  ): Promise<SupplierCredit> {
    const credits = await this.getSupplierCredits();
    const newCredit: SupplierCredit = {
      ...creditData,
      id: `credit-${Date.now()}`,
      paidAmount: 0,
      remainingBalance: creditData.totalAmount,
      status: "Pending",
      paymentHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    credits.unshift(newCredit);
    this.setItem(STORAGE_KEYS.SUPPLIER_CREDITS, credits);
    return newCredit;
  }

  async recordSupplierPayment(creditId: string, amount: number, notes?: string): Promise<SupplierCredit> {
    const credits = await this.getSupplierCredits();
    const credit = credits.find((c) => c.id === creditId);
    if (!credit) throw new Error("Supplier credit entry not found");

    if (amount <= 0) throw new Error("Payment amount must be greater than zero");
    if (amount > credit.remainingBalance) {
      throw new Error(`Payment amount (Rs. ${amount}) exceeds remaining balance (Rs. ${credit.remainingBalance})`);
    }

    credit.paidAmount += amount;
    credit.remainingBalance -= amount;
    credit.status = credit.remainingBalance === 0 ? "Paid" : "Partial";
    credit.paymentHistory.push({
      id: `pay-${Date.now()}`,
      amount,
      paymentDate: new Date().toISOString(),
      notes: notes || "Payment received/recorded",
    });
    credit.updatedAt = new Date().toISOString();

    this.setItem(STORAGE_KEYS.SUPPLIER_CREDITS, credits);
    return credit;
  }

  async updateSupplierCredit(id: string, updates: Partial<SupplierCredit>): Promise<SupplierCredit> {
    const credits = await this.getSupplierCredits();
    const idx = credits.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Supplier credit entry not found");

    const current = credits[idx];
    const totalAmount = updates.totalAmount !== undefined ? updates.totalAmount : current.totalAmount;
    const paidAmount = updates.paidAmount !== undefined ? updates.paidAmount : current.paidAmount;
    const remainingBalance = Math.max(0, totalAmount - paidAmount);
    const status = remainingBalance === 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";

    const updated: SupplierCredit = {
      ...current,
      ...updates,
      totalAmount,
      paidAmount,
      remainingBalance,
      status,
      updatedAt: new Date().toISOString(),
    };
    credits[idx] = updated;
    this.setItem(STORAGE_KEYS.SUPPLIER_CREDITS, credits);
    return updated;
  }

  async deleteSupplierCredit(id: string): Promise<boolean> {
    const credits = await this.getSupplierCredits();
    const filtered = credits.filter((c) => c.id !== id);
    this.setItem(STORAGE_KEYS.SUPPLIER_CREDITS, filtered);
    return true;
  }

  // --- DASHBOARD STATS ---
  async getDashboardStats(): Promise<DashboardStats> {
    const parts = await this.getParts();
    const customers = await this.getCustomers();
    const bills = await this.getBills();
    const credits = await this.getSupplierCredits();
    const jobCards = await this.getJobCards();
    const mechanics = await this.getMechanics();
    const ledger = await this.getMechanicLedger();

    const totalInventoryValue = parts.reduce((acc, p) => acc + p.purchasePrice * p.currentStock, 0);
    const lowStockCount = parts.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockLimit).length;
    const outOfStockCount = parts.filter((p) => p.currentStock === 0).length;

    // Today's Sales
    const todayStr = new Date().toISOString().split("T")[0];
    const todayBills = bills.filter(
      (b) => b.status === "Completed" && b.createdAt.startsWith(todayStr)
    );
    const todaySales = todayBills.reduce((acc, b) => acc + b.grandTotal, 0);

    // Current Month's Sales
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
    const monthlyBills = bills.filter(
      (b) => b.status === "Completed" && b.createdAt.startsWith(currentMonthPrefix)
    );
    const monthlySales = monthlyBills.reduce((acc, b) => acc + b.grandTotal, 0);

    // Supplier Credit
    const totalPendingSupplierCredit = credits.reduce((acc, c) => acc + c.remainingBalance, 0);
    const overdue15DaysCreditCount = credits.filter(
      (c) => c.status !== "Paid" && daysSince(c.purchaseDate) >= 15
    ).length;

    // Active Jobs
    const activeJobsCount = jobCards.filter(
      (c) => c.status !== "Completed" && c.status !== "Cancelled"
    ).length;

    // Total Mechanic Payable
    const totalEarnings = ledger.filter((l) => l.type === "earning").reduce((acc, l) => acc + l.mechanicAmount, 0);
    const totalPayouts = ledger.filter((l) => l.type === "payout").reduce((acc, l) => acc + l.mechanicAmount, 0);
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

  async resetToSampleData(): Promise<void> {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(SEED_PARTS));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(SEED_BILLS));
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_CREDITS, JSON.stringify(SEED_SUPPLIER_CREDITS));
    localStorage.setItem(STORAGE_KEYS.MECHANICS, JSON.stringify(SEED_MECHANICS));
    localStorage.setItem(STORAGE_KEYS.MECHANIC_LEDGER, JSON.stringify(SEED_MECHANIC_LEDGER));
    localStorage.setItem(STORAGE_KEYS.JOB_CARDS, JSON.stringify(SEED_JOB_CARDS));
  }
}

export const storageService = new LocalStorageService();
