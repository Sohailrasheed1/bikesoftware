"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  Part,
  Customer,
  Bill,
  SupplierCredit,
  DashboardStats,
  Mechanic,
  MechanicLedgerEntry,
  VehicleJobCard,
  PurchaseBatch,
  SaleDetail,
  StockAdjustment,
  RateHistoryEntry,
} from "@/types";
import { apiStorageService as storageService } from "./api-storage";

interface OfflineQueue {
  parts: Part[];
  customers: Customer[];
  bills: Bill[];
  supplierCredits: SupplierCredit[];
  mechanics: Mechanic[];
  mechanicLedger: MechanicLedgerEntry[];
  jobCards: VehicleJobCard[];
}

const emptyQueue: OfflineQueue = {
  parts: [],
  customers: [],
  bills: [],
  supplierCredits: [],
  mechanics: [],
  mechanicLedger: [],
  jobCards: [],
};

interface StoreContextType {
  parts: Part[];
  customers: Customer[];
  bills: Bill[];
  supplierCredits: SupplierCredit[];
  mechanics: Mechanic[];
  mechanicLedger: MechanicLedgerEntry[];
  jobCards: VehicleJobCard[];
  stats: DashboardStats;
  loading: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  refreshAll: () => Promise<void>;
  triggerManualSync: () => Promise<void>;
  
  // Parts / Inventory & FIFO CRUD
  addPart: (part: Omit<Part, "id" | "createdAt" | "updatedAt">) => Promise<Part>;
  updatePart: (id: string, updates: Partial<Part>) => Promise<Part>;
  deletePart: (id: string) => Promise<boolean>;
  updateStock: (id: string, delta: number) => Promise<Part>;
  getPurchaseBatches: (partId?: string) => Promise<PurchaseBatch[]>;
  createPurchaseBatch: (batch: {
    partId: string;
    partName?: string;
    purchaseDate?: string;
    qtyPurchased: number;
    costPrice: number;
    supplier: string;
    notes?: string;
  }) => Promise<PurchaseBatch>;
  getPurchaseRateHistory: (partId?: string) => Promise<RateHistoryEntry[]>;
  recordPurchaseReturn: (data: {
    partId: string;
    batchId?: string;
    quantity: number;
    reason: string;
    supplier?: string;
  }) => Promise<StockAdjustment>;
  recordStockAdjustment: (data: {
    partId: string;
    batchId?: string;
    quantity: number;
    reason: string;
  }) => Promise<StockAdjustment>;

  // Customer CRUD
  addCustomer: (customer: Omit<Customer, "id" | "totalSpent" | "totalVisits" | "createdAt" | "updatedAt">) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<boolean>;

  // Bills CRUD
  createBill: (bill: Omit<Bill, "id" | "billNumber" | "createdAt" | "status">) => Promise<Bill>;
  cancelBill: (id: string) => Promise<boolean>;
  deleteBill: (id: string) => Promise<boolean>;

  // Supplier Credit (Udhaar / Khata) CRUD
  addSupplierCredit: (credit: Omit<SupplierCredit, "id" | "paidAmount" | "remainingBalance" | "status" | "paymentHistory" | "createdAt" | "updatedAt">) => Promise<SupplierCredit>;
  updateSupplierCredit: (id: string, updates: Partial<SupplierCredit>) => Promise<SupplierCredit>;
  recordSupplierPayment: (creditId: string, amount: number, notes?: string) => Promise<SupplierCredit>;
  deleteSupplierCredit: (id: string) => Promise<boolean>;
  
  // Mechanics & Ledger CRUD
  addMechanic: (mech: Omit<Mechanic, "id" | "createdAt" | "updatedAt">) => Promise<Mechanic>;
  updateMechanic: (id: string, updates: Partial<Mechanic>) => Promise<Mechanic>;
  deleteMechanic: (id: string) => Promise<boolean>;
  recordMechanicPayout: (mechanicId: string, amount: number, notes?: string) => Promise<MechanicLedgerEntry>;
  
  // Job Cards (Live Workshop Bay) CRUD
  createJobCard: (card: {
    bayNumber: number;
    customerName: string;
    customerPhone?: string;
    bikeRegNumber: string;
    bikeModel: string;
    complaintDescription?: string;
    assignedMechanicId?: string;
    assignedMechanicName?: string;
  }) => Promise<VehicleJobCard>;
  updateJobCard: (id: string, updates: Partial<VehicleJobCard>) => Promise<VehicleJobCard>;
  addPartToJobCard: (jobCardId: string, partId: string, quantity?: number) => Promise<VehicleJobCard>;
  updateJobCardPartQty: (jobCardId: string, partId: string, delta: number) => Promise<VehicleJobCard>;
  removePartFromJobCard: (jobCardId: string, partId: string) => Promise<VehicleJobCard>;
  addLabourToJobCard: (
    jobCardId: string,
    labour: {
      description: string;
      amount: number;
      mechanicId?: string;
      mechanicName: string;
      shopCutPercentage: number;
    }
  ) => Promise<VehicleJobCard>;
  removeLabourFromJobCard: (jobCardId: string, labourId: string) => Promise<VehicleJobCard>;
  completeJobCardAndGenerateBill: (
    jobCardId: string,
    paymentMethod: Bill["paymentMethod"],
    discount?: number,
    notes?: string
  ) => Promise<{ bill: Bill; jobCard: VehicleJobCard }>;
  deleteJobCard: (id: string) => Promise<boolean>;

  resetToSampleData: () => Promise<void>;
}

const defaultStats: DashboardStats = {
  totalInventoryValue: 0,
  totalPartsCount: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  totalCustomersCount: 0,
  todaySales: 0,
  todayBillsCount: 0,
  monthlySales: 0,
  totalPendingSupplierCredit: 0,
  overdue15DaysCreditCount: 0,
  activeJobsCount: 0,
  totalMechanicsCount: 0,
  totalMechanicPayable: 0,
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [parts, setParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [supplierCredits, setSupplierCredits] = useState<SupplierCredit[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [mechanicLedger, setMechanicLedger] = useState<MechanicLedgerEntry[]>([]);
  const [jobCards, setJobCards] = useState<VehicleJobCard[]>([]);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Helper to read offline sync queue
  const getOfflineQueue = (): OfflineQueue => {
    if (typeof window === "undefined") return emptyQueue;
    try {
      const saved = localStorage.getItem("jilani_autos_offline_queue") || localStorage.getItem("gilani_autos_offline_queue") || localStorage.getItem("skander_offline_queue");
      return saved ? JSON.parse(saved) : emptyQueue;
    } catch {
      return emptyQueue;
    }
  };

  const saveOfflineQueue = (q: OfflineQueue) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("jilani_autos_offline_queue", JSON.stringify(q));
      const total =
        q.parts.length +
        q.customers.length +
        q.bills.length +
        q.supplierCredits.length +
        q.mechanics.length +
        q.mechanicLedger.length +
        q.jobCards.length;
      setPendingSyncCount(total);
    } catch (e) {
      console.error("Failed to save offline queue", e);
    }
  };

  const calculateStats = useCallback(
    (
      pList: Part[],
      cList: Customer[],
      bList: Bill[],
      scList: SupplierCredit[],
      mList: Mechanic[],
      mlList: MechanicLedgerEntry[],
      jcList: VehicleJobCard[]
    ): DashboardStats => {
      const totalInventoryValue = pList.reduce((acc, p) => acc + p.purchasePrice * p.currentStock, 0);
      const lowStockCount = pList.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockLimit).length;
      const outOfStockCount = pList.filter((p) => p.currentStock === 0).length;

      const todayStr = new Date().toISOString().split("T")[0];
      const todayBills = bList.filter(
        (b) => b.status === "Completed" && b.createdAt.startsWith(todayStr)
      );
      const todaySales = todayBills.reduce((acc, b) => acc + b.grandTotal, 0);

      const currentMonthPrefix = todayStr.substring(0, 7);
      const monthlyBills = bList.filter(
        (b) => b.status === "Completed" && b.createdAt.startsWith(currentMonthPrefix)
      );
      const monthlySales = monthlyBills.reduce((acc, b) => acc + b.grandTotal, 0);

      const totalPendingSupplierCredit = scList.reduce((acc, c) => acc + c.remainingBalance, 0);
      const overdue15DaysCreditCount = scList.filter((c) => c.status !== "Paid").length;

      const activeJobsCount = jcList.filter(
        (c) => c.status !== "Completed" && c.status !== "Cancelled"
      ).length;

      const totalEarnings = mlList.filter((l) => l.type === "earning").reduce((acc, l) => acc + l.mechanicAmount, 0);
      const totalPayouts = mlList.filter((l) => l.type === "payout").reduce((acc, l) => acc + l.mechanicAmount, 0);
      const totalMechanicPayable = Math.max(0, totalEarnings - totalPayouts);

      return {
        totalInventoryValue,
        totalPartsCount: pList.length,
        lowStockCount,
        outOfStockCount,
        totalCustomersCount: cList.length,
        todaySales,
        todayBillsCount: todayBills.length,
        monthlySales,
        totalPendingSupplierCredit,
        overdue15DaysCreditCount,
        activeJobsCount,
        totalMechanicsCount: mList.length,
        totalMechanicPayable,
      };
    },
    []
  );

  // Cache data to localStorage for instant offline access
  const saveToLocalCache = (
    p: Part[],
    c: Customer[],
    b: Bill[],
    sc: SupplierCredit[],
    m: Mechanic[],
    ml: MechanicLedgerEntry[],
    jc: VehicleJobCard[]
  ) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("jilani_autos_cache_parts", JSON.stringify(p));
      localStorage.setItem("jilani_autos_cache_customers", JSON.stringify(c));
      localStorage.setItem("jilani_autos_cache_bills", JSON.stringify(b));
      localStorage.setItem("jilani_autos_cache_credits", JSON.stringify(sc));
      localStorage.setItem("jilani_autos_cache_mechanics", JSON.stringify(m));
      localStorage.setItem("jilani_autos_cache_ledger", JSON.stringify(ml));
      localStorage.setItem("jilani_autos_cache_jobCards", JSON.stringify(jc));
    } catch {}
  };

  // Sync offline queue to MongoDB Atlas
  const syncOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    const hasItems =
      queue.parts.length > 0 ||
      queue.customers.length > 0 ||
      queue.bills.length > 0 ||
      queue.supplierCredits.length > 0 ||
      queue.mechanics.length > 0 ||
      queue.mechanicLedger.length > 0 ||
      queue.jobCards.length > 0;

    if (!hasItems) return;

    try {
      console.log("Syncing offline queue to MongoDB Atlas...");
      await storageService.syncClientData(queue);
      saveOfflineQueue(emptyQueue);
      console.log("Offline queue synced successfully!");
    } catch (e) {
      console.warn("Could not sync offline queue right now:", e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      // First attempt to sync any pending queue
      await syncOfflineQueue();

      const [p, c, b, sc, st, m, ml, jc] = await Promise.all([
        storageService.getParts(),
        storageService.getCustomers(),
        storageService.getBills(),
        storageService.getSupplierCredits(),
        storageService.getDashboardStats(),
        storageService.getMechanics(),
        storageService.getMechanicLedger(),
        storageService.getJobCards(),
      ]);

      setParts(p);
      setCustomers(c);
      setBills(b);
      setSupplierCredits(sc);
      setStats(st);
      setMechanics(m);
      setMechanicLedger(ml);
      setJobCards(jc);
      setIsOnline(true);
      saveToLocalCache(p, c, b, sc, m, ml, jc);
    } catch (err) {
      console.warn("Offline or failed to fetch from backend, loading local cache:", err);
      setIsOnline(false);
      // Fallback to local cache
      if (typeof window !== "undefined") {
        try {
          const cp = JSON.parse(localStorage.getItem("jilani_autos_cache_parts") || localStorage.getItem("gilani_autos_cache_parts") || localStorage.getItem("skander_cache_parts") || "[]");
          const cc = JSON.parse(localStorage.getItem("jilani_autos_cache_customers") || localStorage.getItem("gilani_autos_cache_customers") || localStorage.getItem("skander_cache_customers") || "[]");
          const cb = JSON.parse(localStorage.getItem("jilani_autos_cache_bills") || localStorage.getItem("gilani_autos_cache_bills") || localStorage.getItem("skander_cache_bills") || "[]");
          const csc = JSON.parse(localStorage.getItem("jilani_autos_cache_credits") || localStorage.getItem("gilani_autos_cache_credits") || localStorage.getItem("skander_cache_credits") || "[]");
          const cm = JSON.parse(localStorage.getItem("jilani_autos_cache_mechanics") || localStorage.getItem("gilani_autos_cache_mechanics") || localStorage.getItem("skander_cache_mechanics") || "[]");
          const cml = JSON.parse(localStorage.getItem("jilani_autos_cache_ledger") || localStorage.getItem("gilani_autos_cache_ledger") || localStorage.getItem("skander_cache_ledger") || "[]");
          const cjc = JSON.parse(localStorage.getItem("jilani_autos_cache_jobCards") || localStorage.getItem("gilani_autos_cache_jobCards") || localStorage.getItem("skander_cache_jobCards") || "[]");

          if (cp.length > 0) setParts(cp);
          if (cc.length > 0) setCustomers(cc);
          if (cb.length > 0) setBills(cb);
          if (csc.length > 0) setSupplierCredits(csc);
          if (cm.length > 0) setMechanics(cm);
          if (cml.length > 0) setMechanicLedger(cml);
          if (cjc.length > 0) setJobCards(cjc);

          setStats(calculateStats(cp, cc, cb, csc, cm, cml, cjc));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, [syncOfflineQueue, calculateStats]);

  // Online / Offline network listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    const q = getOfflineQueue();
    const count =
      q.parts.length +
      q.customers.length +
      q.bills.length +
      q.supplierCredits.length +
      q.mechanics.length +
      q.mechanicLedger.length +
      q.jobCards.length;
    setPendingSyncCount(count);

    const handleOnline = () => {
      console.log("Device is online! Auto-syncing...");
      setIsOnline(true);
      refreshAll();
    };

    const handleOffline = () => {
      console.log("Device is offline! Activating offline mode.");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial load
    refreshAll();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshAll]);

  // Inventory CRUD
  const addPart = async (part: Omit<Part, "id" | "createdAt" | "updatedAt">) => {
    try {
      const created = await storageService.createPart(part);
      await refreshAll();
      return created;
    } catch {
      // Offline fallback
      const newPart: Part = {
        ...part,
        id: `part-off-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [newPart, ...parts];
      setParts(updated);
      const q = getOfflineQueue();
      q.parts.push(newPart);
      saveOfflineQueue(q);
      saveToLocalCache(updated, customers, bills, supplierCredits, mechanics, mechanicLedger, jobCards);
      return newPart;
    }
  };

  const updatePart = async (id: string, updates: Partial<Part>) => {
    try {
      const updated = await storageService.updatePart(id, updates);
      await refreshAll();
      return updated;
    } catch {
      const updatedParts = parts.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      );
      setParts(updatedParts);
      const part = updatedParts.find((p) => p.id === id);
      if (part) {
        const q = getOfflineQueue();
        q.parts.push(part);
        saveOfflineQueue(q);
      }
      return part || (updates as Part);
    }
  };

  const deletePart = async (id: string) => {
    try {
      const res = await storageService.deletePart(id);
      await refreshAll();
      return res;
    } catch {
      setParts(parts.filter((p) => p.id !== id));
      return true;
    }
  };

  const updateStock = async (id: string, delta: number) => {
    try {
      const updated = await storageService.updateStock(id, delta);
      await refreshAll();
      return updated;
    } catch {
      const updatedParts = parts.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            currentStock: Math.max(0, p.currentStock + delta),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      setParts(updatedParts);
      const part = updatedParts.find((p) => p.id === id);
      if (part) {
        const q = getOfflineQueue();
        q.parts.push(part);
        saveOfflineQueue(q);
      }
      return part!;
    }
  };

  const getPurchaseBatches = async (partId?: string) => {
    return storageService.getPurchaseBatches(partId);
  };

  const createPurchaseBatch = async (batch: {
    partId: string;
    partName?: string;
    purchaseDate?: string;
    qtyPurchased: number;
    costPrice: number;
    supplier: string;
    notes?: string;
  }) => {
    const res = await storageService.createPurchaseBatch(batch);
    await refreshAll();
    return res;
  };

  const getPurchaseRateHistory = async (partId?: string) => {
    return storageService.getPurchaseRateHistory(partId);
  };

  const recordPurchaseReturn = async (data: {
    partId: string;
    batchId?: string;
    quantity: number;
    reason: string;
    supplier?: string;
  }) => {
    const res = await storageService.recordPurchaseReturn(data);
    await refreshAll();
    return res;
  };

  const recordStockAdjustment = async (data: {
    partId: string;
    batchId?: string;
    quantity: number;
    reason: string;
  }) => {
    const res = await storageService.recordStockAdjustment(data);
    await refreshAll();
    return res;
  };

  // Customer CRUD
  const addCustomer = async (
    customer: Omit<Customer, "id" | "totalSpent" | "totalVisits" | "createdAt" | "updatedAt">
  ) => {
    try {
      const created = await storageService.createCustomer(customer);
      await refreshAll();
      return created;
    } catch {
      const newCust: Customer = {
        ...customer,
        id: `cust-off-${Date.now()}`,
        totalSpent: 0,
        totalVisits: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [newCust, ...customers];
      setCustomers(updated);
      const q = getOfflineQueue();
      q.customers.push(newCust);
      saveOfflineQueue(q);
      return newCust;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const updated = await storageService.updateCustomer(id, updates);
      await refreshAll();
      return updated;
    } catch {
      const updatedCusts = customers.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      );
      setCustomers(updatedCusts);
      const cust = updatedCusts.find((c) => c.id === id);
      if (cust) {
        const q = getOfflineQueue();
        q.customers.push(cust);
        saveOfflineQueue(q);
      }
      return cust || (updates as Customer);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const res = await storageService.deleteCustomer(id);
      await refreshAll();
      return res;
    } catch {
      setCustomers(customers.filter((c) => c.id !== id));
      return true;
    }
  };

  // Bills CRUD
  const createBill = async (bill: Omit<Bill, "id" | "billNumber" | "createdAt" | "status">) => {
    try {
      const created = await storageService.createBill(bill);
      await refreshAll();
      return created;
    } catch {
      const count = bills.length + 1001;
      const newBill: Bill = {
        ...bill,
        id: `bill-off-${Date.now()}`,
        billNumber: `SK-${count}`,
        status: "Completed",
        createdAt: new Date().toISOString(),
      };
      const updatedBills = [newBill, ...bills];
      setBills(updatedBills);

      // Deduct stock locally
      const updatedParts = [...parts];
      for (const item of bill.items) {
        const p = updatedParts.find((x) => x.id === item.partId);
        if (p) p.currentStock = Math.max(0, p.currentStock - item.quantity);
      }
      setParts(updatedParts);

      const q = getOfflineQueue();
      q.bills.push(newBill);
      saveOfflineQueue(q);
      return newBill;
    }
  };

  const cancelBill = async (id: string) => {
    try {
      const res = await storageService.cancelBill(id);
      await refreshAll();
      return res;
    } catch {
      const updatedBills = bills.map((b) =>
        b.id === id ? { ...b, status: "Cancelled" as const } : b
      );
      setBills(updatedBills);
      return true;
    }
  };

  const deleteBill = async (id: string) => {
    try {
      const res = await storageService.deleteBill(id);
      await refreshAll();
      return res;
    } catch {
      setBills(bills.filter((b) => b.id !== id));
      return true;
    }
  };

  // Supplier Credit CRUD
  const addSupplierCredit = async (
    credit: Omit<
      SupplierCredit,
      "id" | "paidAmount" | "remainingBalance" | "status" | "paymentHistory" | "createdAt" | "updatedAt"
    >
  ) => {
    try {
      const created = await storageService.createSupplierCredit(credit);
      await refreshAll();
      return created;
    } catch {
      const newCredit: SupplierCredit = {
        ...credit,
        id: `credit-off-${Date.now()}`,
        paidAmount: 0,
        remainingBalance: credit.totalAmount,
        status: "Pending",
        paymentHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSupplierCredits([newCredit, ...supplierCredits]);
      const q = getOfflineQueue();
      q.supplierCredits.push(newCredit);
      saveOfflineQueue(q);
      return newCredit;
    }
  };

  const updateSupplierCredit = async (id: string, updates: Partial<SupplierCredit>) => {
    try {
      const updated = await storageService.updateSupplierCredit(id, updates);
      await refreshAll();
      return updated;
    } catch {
      const updatedCredits = supplierCredits.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      );
      setSupplierCredits(updatedCredits);
      const credit = updatedCredits.find((c) => c.id === id);
      if (credit) {
        const q = getOfflineQueue();
        q.supplierCredits.push(credit);
        saveOfflineQueue(q);
      }
      return credit || (updates as SupplierCredit);
    }
  };

  const recordSupplierPayment = async (creditId: string, amount: number, notes?: string) => {
    try {
      const updated = await storageService.recordSupplierPayment(creditId, amount, notes);
      await refreshAll();
      return updated;
    } catch {
      const updatedCredits = supplierCredits.map((c) => {
        if (c.id === creditId) {
          const paidAmount = c.paidAmount + amount;
          const remainingBalance = Math.max(0, c.remainingBalance - amount);
          return {
            ...c,
            paidAmount,
            remainingBalance,
            status: remainingBalance === 0 ? ("Paid" as const) : ("Partial" as const),
            paymentHistory: [
              ...c.paymentHistory,
              {
                id: `pay-${Date.now()}`,
                amount,
                paymentDate: new Date().toISOString(),
                notes: notes || "Payment received",
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      setSupplierCredits(updatedCredits);
      const credit = updatedCredits.find((c) => c.id === creditId);
      if (credit) {
        const q = getOfflineQueue();
        q.supplierCredits.push(credit);
        saveOfflineQueue(q);
      }
      return credit!;
    }
  };

  const deleteSupplierCredit = async (id: string) => {
    try {
      const res = await storageService.deleteSupplierCredit(id);
      await refreshAll();
      return res;
    } catch {
      setSupplierCredits(supplierCredits.filter((c) => c.id !== id));
      return true;
    }
  };

  // Mechanic CRUD
  const addMechanic = async (mech: Omit<Mechanic, "id" | "createdAt" | "updatedAt">) => {
    try {
      const created = await storageService.createMechanic(mech);
      await refreshAll();
      return created;
    } catch {
      const newMech: Mechanic = {
        ...mech,
        id: `mech-off-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setMechanics([...mechanics, newMech]);
      const q = getOfflineQueue();
      q.mechanics.push(newMech);
      saveOfflineQueue(q);
      return newMech;
    }
  };

  const updateMechanic = async (id: string, updates: Partial<Mechanic>) => {
    try {
      const updated = await storageService.updateMechanic(id, updates);
      await refreshAll();
      return updated;
    } catch {
      const updatedMechs = mechanics.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      );
      setMechanics(updatedMechs);
      const mech = updatedMechs.find((m) => m.id === id);
      if (mech) {
        const q = getOfflineQueue();
        q.mechanics.push(mech);
        saveOfflineQueue(q);
      }
      return mech || (updates as Mechanic);
    }
  };

  const deleteMechanic = async (id: string) => {
    try {
      const res = await storageService.deleteMechanic(id);
      await refreshAll();
      return res;
    } catch {
      setMechanics(mechanics.filter((m) => m.id !== id));
      return true;
    }
  };

  const recordMechanicPayout = async (mechanicId: string, amount: number, notes?: string) => {
    try {
      const entry = await storageService.recordMechanicPayout(mechanicId, amount, notes);
      await refreshAll();
      return entry;
    } catch {
      const mech = mechanics.find((m) => m.id === mechanicId);
      const entry: MechanicLedgerEntry = {
        id: `payout-off-${Date.now()}`,
        mechanicId,
        mechanicName: mech ? mech.name : mechanicId,
        type: "payout",
        date: new Date().toISOString(),
        totalLaborAmount: 0,
        shopPercentage: 0,
        shopAmount: 0,
        mechanicAmount: amount,
        notes: notes || "Cash Payout / Advance",
      };
      setMechanicLedger([entry, ...mechanicLedger]);
      const q = getOfflineQueue();
      q.mechanicLedger.push(entry);
      saveOfflineQueue(q);
      return entry;
    }
  };

  // Job Cards CRUD
  const createJobCard = async (card: {
    bayNumber: number;
    customerName: string;
    customerPhone?: string;
    bikeRegNumber: string;
    bikeModel: string;
    complaintDescription?: string;
    assignedMechanicId?: string;
    assignedMechanicName?: string;
  }) => {
    try {
      const created = await storageService.createJobCard(card);
      await refreshAll();
      return created;
    } catch {
      const count = jobCards.length + 101;
      const newCard: VehicleJobCard = {
        ...card,
        id: `job-off-${Date.now()}`,
        jobCardNumber: `JC-${count}`,
        status: "In Progress",
        items: [],
        labourItems: [],
        estimatedSubtotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setJobCards([newCard, ...jobCards]);
      const q = getOfflineQueue();
      q.jobCards.push(newCard);
      saveOfflineQueue(q);
      return newCard;
    }
  };

  const updateJobCard = async (id: string, updates: Partial<VehicleJobCard>) => {
    try {
      const updated = await storageService.updateJobCard(id, updates);
      await refreshAll();
      return updated;
    } catch {
      const updatedCards = jobCards.map((j) => {
        if (j.id === id) {
          const merged = { ...j, ...updates, updatedAt: new Date().toISOString() };
          const pTot = (merged.items || []).reduce((acc, i) => acc + i.totalPrice, 0);
          const lTot = (merged.labourItems || []).reduce((acc, l) => acc + l.amount, 0);
          merged.estimatedSubtotal = pTot + lTot;
          return merged;
        }
        return j;
      });
      setJobCards(updatedCards);
      const card = updatedCards.find((c) => c.id === id);
      if (card) {
        const q = getOfflineQueue();
        q.jobCards.push(card);
        saveOfflineQueue(q);
      }
      return card || (updates as VehicleJobCard);
    }
  };

  const addPartToJobCard = async (jobCardId: string, partId: string, quantity?: number) => {
    try {
      const updated = await storageService.addPartToJobCard(jobCardId, partId, quantity);
      await refreshAll();
      return updated;
    } catch {
      const part = parts.find((p) => p.id === partId);
      const card = jobCards.find((c) => c.id === jobCardId);
      if (!card || !part) return card!;
      const items = [...card.items];
      const idx = items.findIndex((i) => i.partId === partId);
      const qty = quantity || 1;
      if (idx > -1) {
        items[idx].quantity += qty;
        items[idx].totalPrice = items[idx].quantity * items[idx].unitPrice;
      } else {
        items.push({
          partId: part.id,
          partName: part.name,
          category: part.category,
          quantity: qty,
          unitPrice: part.sellingPrice,
          purchasePrice: part.purchasePrice,
          totalPrice: qty * part.sellingPrice,
        });
      }
      return updateJobCard(jobCardId, { items });
    }
  };

  const updateJobCardPartQty = async (jobCardId: string, partId: string, delta: number) => {
    try {
      const updated = await storageService.updateJobCardPartQty(jobCardId, partId, delta);
      await refreshAll();
      return updated;
    } catch {
      const card = jobCards.find((c) => c.id === jobCardId);
      if (!card) return card!;
      const items = [...card.items];
      const idx = items.findIndex((i) => i.partId === partId);
      if (idx === -1) return card;
      const newQty = items[idx].quantity + delta;
      if (newQty <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx].quantity = newQty;
        items[idx].totalPrice = newQty * items[idx].unitPrice;
      }
      return updateJobCard(jobCardId, { items });
    }
  };

  const removePartFromJobCard = async (jobCardId: string, partId: string) => {
    try {
      const updated = await storageService.removePartFromJobCard(jobCardId, partId);
      await refreshAll();
      return updated;
    } catch {
      const card = jobCards.find((c) => c.id === jobCardId);
      if (!card) return card!;
      const items = card.items.filter((i) => i.partId !== partId);
      return updateJobCard(jobCardId, { items });
    }
  };

  const addLabourToJobCard = async (
    jobCardId: string,
    labour: {
      description: string;
      amount: number;
      mechanicId?: string;
      mechanicName: string;
      shopCutPercentage: number;
    }
  ) => {
    try {
      const updated = await storageService.addLabourToJobCard(jobCardId, labour);
      await refreshAll();
      return updated;
    } catch {
      const card = jobCards.find((c) => c.id === jobCardId);
      if (!card) return card!;
      const shopShare = Math.round((labour.amount * (labour.shopCutPercentage || 0)) / 100);
      const mechanicShare = labour.amount - shopShare;
      const newLabour = {
        id: `lbr-off-${Date.now()}`,
        description: labour.description,
        amount: labour.amount,
        mechanicId: labour.mechanicId,
        mechanicName: labour.mechanicName,
        shopCutPercentage: labour.shopCutPercentage,
        shopShare,
        mechanicShare,
      };
      return updateJobCard(jobCardId, { labourItems: [...card.labourItems, newLabour] });
    }
  };

  const removeLabourFromJobCard = async (jobCardId: string, labourId: string) => {
    try {
      const updated = await storageService.removeLabourFromJobCard(jobCardId, labourId);
      await refreshAll();
      return updated;
    } catch {
      const card = jobCards.find((c) => c.id === jobCardId);
      if (!card) return card!;
      const labourItems = card.labourItems.filter((l) => l.id !== labourId);
      return updateJobCard(jobCardId, { labourItems });
    }
  };

  const completeJobCardAndGenerateBill = async (
    jobCardId: string,
    paymentMethod: Bill["paymentMethod"],
    discount?: number,
    notes?: string
  ) => {
    try {
      const result = await storageService.completeJobCardAndGenerateBill(jobCardId, paymentMethod, discount, notes);
      await refreshAll();
      return result;
    } catch {
      const card = jobCards.find((c) => c.id === jobCardId);
      if (!card) throw new Error("Job card not found");
      const partsTotal = card.items.reduce((acc, i) => acc + i.totalPrice, 0);
      const labourTotal = card.labourItems.reduce((acc, l) => acc + l.amount, 0);
      const subtotal = partsTotal + labourTotal;
      const grandTotal = Math.max(0, subtotal - (Number(discount) || 0));

      const bill = await createBill({
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

      const updatedJob = await updateJobCard(jobCardId, {
        status: "Completed",
        completedAt: new Date().toISOString(),
        billId: bill.id,
        billNumber: bill.billNumber,
      });

      return { bill, jobCard: updatedJob };
    }
  };

  const deleteJobCard = async (id: string) => {
    try {
      const res = await storageService.deleteJobCard(id);
      await refreshAll();
      return res;
    } catch {
      setJobCards(jobCards.filter((c) => c.id !== id));
      return true;
    }
  };

  const resetToSampleData = async () => {
    await storageService.resetToSampleData();
    await refreshAll();
  };

  const triggerManualSync = async () => {
    await refreshAll();
  };

  return (
    <StoreContext.Provider
      value={{
        parts,
        customers,
        bills,
        supplierCredits,
        mechanics,
        mechanicLedger,
        jobCards,
        stats,
        loading,
        isOnline,
        pendingSyncCount,
        refreshAll,
        triggerManualSync,
        addPart,
        updatePart,
        deletePart,
        updateStock,
        getPurchaseBatches,
        createPurchaseBatch,
        getPurchaseRateHistory,
        recordPurchaseReturn,
        recordStockAdjustment,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        createBill,
        cancelBill,
        deleteBill,
        addSupplierCredit,
        updateSupplierCredit,
        recordSupplierPayment,
        deleteSupplierCredit,
        addMechanic,
        updateMechanic,
        deleteMechanic,
        recordMechanicPayout,
        createJobCard,
        updateJobCard,
        addPartToJobCard,
        updateJobCardPartQty,
        removePartFromJobCard,
        addLabourToJobCard,
        removeLabourFromJobCard,
        completeJobCardAndGenerateBill,
        deleteJobCard,
        resetToSampleData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
