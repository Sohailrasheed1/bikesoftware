"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
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
    newSellingPrice?: number;
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
  const { status } = useSession();
  const pathname = usePathname();

  const [parts, setParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [supplierCredits, setSupplierCredits] = useState<SupplierCredit[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [mechanicLedger, setMechanicLedger] = useState<MechanicLedgerEntry[]>([]);
  const [jobCards, setJobCards] = useState<VehicleJobCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Instant 0ms cache hydration on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
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
    } catch {}
  }, []);

  // Helper to read offline sync queue
  const getOfflineQueue = (): OfflineQueue => {
    if (typeof window === "undefined") return emptyQueue;
    try {
      const saved =
        localStorage.getItem("jilani_autos_offline_queue") ||
        localStorage.getItem("gilani_autos_offline_queue") ||
        localStorage.getItem("skander_offline_queue");
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

  // Ultra-fast in-memory stats calculator (executes in < 1ms)
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
      const totalInventoryValue = pList.reduce((acc, p) => acc + (p.purchasePrice || 0) * (p.currentStock || 0), 0);
      const lowStockCount = pList.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockLimit).length;
      const outOfStockCount = pList.filter((p) => p.currentStock === 0).length;

      const todayStr = new Date().toISOString().split("T")[0];
      const todayBills = bList.filter(
        (b) => b.status === "Completed" && b.createdAt.startsWith(todayStr)
      );
      const todaySales = todayBills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);

      const currentMonthPrefix = todayStr.substring(0, 7);
      const monthlyBills = bList.filter(
        (b) => b.status === "Completed" && b.createdAt.startsWith(currentMonthPrefix)
      );
      const monthlySales = monthlyBills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);

      const totalPendingSupplierCredit = scList.reduce((acc, c) => acc + (c.remainingBalance || 0), 0);
      const overdue15DaysCreditCount = scList.filter((c) => c.status !== "Paid").length;

      const activeJobsCount = jcList.filter(
        (c) => c.status !== "Completed" && c.status !== "Cancelled"
      ).length;

      const totalEarnings = mlList.filter((l) => l.type === "earning").reduce((acc, l) => acc + (l.mechanicAmount || 0), 0);
      const totalPayouts = mlList.filter((l) => l.type === "payout").reduce((acc, l) => acc + (l.mechanicAmount || 0), 0);
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

  // Synchronous, reactive in-memory calculation of stats whenever data changes (0ms delay!)
  const stats = useMemo(() => {
    return calculateStats(
      parts,
      customers,
      bills,
      supplierCredits,
      mechanics,
      mechanicLedger,
      jobCards
    );
  }, [calculateStats, parts, customers, bills, supplierCredits, mechanics, mechanicLedger, jobCards]);

  // Cache data to localStorage for instant offline access
  const saveToLocalCache = useCallback((
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
  }, []);

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

  // Full refresh (used on initial mount, reconnect, or manual trigger)
  const refreshAll = useCallback(async () => {
    // If on login page, DO NOT fetch backend data
    if (typeof window !== "undefined" && window.location.pathname === "/login") {
      setLoading(false);
      return;
    }

    try {
      // Safe fetch helper: if backend returns 403 or 401 for a module,
      // resolve gracefully with empty array instead of failing entire initial load
      const safeFetch = async <T,>(fetcher: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await fetcher();
        } catch (err: any) {
          const msg = String(err?.message || "");
          if (
            msg.includes("403") ||
            msg.includes("Access denied") ||
            msg.includes("ijazat nahi") ||
            msg.includes("401") ||
            msg.includes("Unauthorized")
          ) {
            return fallback;
          }
          throw err;
        }
      };

      const [p, c, b, sc, m, ml, jc] = await Promise.all([
        safeFetch(() => storageService.getParts(), []),
        safeFetch(() => storageService.getCustomers(), []),
        safeFetch(() => storageService.getBills(), []),
        safeFetch(() => storageService.getSupplierCredits(), []),
        safeFetch(() => storageService.getMechanics(), []),
        safeFetch(() => storageService.getMechanicLedger(), []),
        safeFetch(() => storageService.getJobCards(), []),
      ]);

      setParts(p);
      setCustomers(c);
      setBills(b);
      setSupplierCredits(sc);
      setMechanics(m);
      setMechanicLedger(ml);
      setJobCards(jc);
      setIsOnline(true);
      saveToLocalCache(p, c, b, sc, m, ml, jc);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const isAuthErr = msg.includes("401") || msg.includes("Unauthorized");
      if (!isAuthErr) {
        console.warn("Offline or failed to fetch from backend, loading local cache:", err);
        setIsOnline(false);
      }
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
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, [saveToLocalCache]);

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
      setIsOnline(true);
      if (status === "authenticated" && pathname !== "/login") {
        refreshAll();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial load: Only fetch if authenticated and not on /login
    if (status === "authenticated" && pathname !== "/login") {
      refreshAll();
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshAll, status, pathname]);

  // ==========================================
  // INVENTORY & FIFO CRUD (OPTIMISTIC 0ms LATENCY)
  // ==========================================
  const addPart = async (part: Omit<Part, "id" | "createdAt" | "updatedAt">) => {
    const tempId = `part-${Date.now()}`;
    const optimisticPart: Part = {
      ...part,
      id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately update React state (0ms latency!)
    setParts((prev) => [optimisticPart, ...prev]);

    try {
      const created = await storageService.createPart(part);
      // Reconcile with actual server ID
      setParts((prev) => prev.map((p) => (p.id === tempId ? created : p)));
      return created;
    } catch {
      // Offline fallback: already in state, add to queue
      const q = getOfflineQueue();
      q.parts.push(optimisticPart);
      saveOfflineQueue(q);
      return optimisticPart;
    }
  };

  const updatePart = async (id: string, updates: Partial<Part>) => {
    // 1. Immediately update React state (0ms latency!)
    setParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );

    try {
      const updated = await storageService.updatePart(id, updates);
      setParts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch {
      const part = parts.find((p) => p.id === id);
      if (part) {
        const q = getOfflineQueue();
        q.parts.push({ ...part, ...updates });
        saveOfflineQueue(q);
      }
      return { ...parts.find((p) => p.id === id), ...updates } as Part;
    }
  };

  const deletePart = async (id: string) => {
    // 1. Immediately update React state (0ms latency!)
    setParts((prev) => prev.filter((p) => p.id !== id));

    try {
      return await storageService.deletePart(id);
    } catch {
      return true;
    }
  };

  const updateStock = async (id: string, delta: number) => {
    // 1. Immediately update React state (0ms latency!)
    setParts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              currentStock: Math.max(0, p.currentStock + delta),
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

    try {
      const updated = await storageService.updateStock(id, delta);
      setParts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch {
      const part = parts.find((p) => p.id === id);
      if (part) {
        const q = getOfflineQueue();
        q.parts.push(part);
        saveOfflineQueue(q);
      }
      return parts.find((p) => p.id === id)!;
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
    newSellingPrice?: number;
  }) => {
    // 1. Immediately update part stock, purchase price, and selling price in React state (0ms latency!)
    setParts((prev) =>
      prev.map((p) =>
        p.id === batch.partId
          ? {
              ...p,
              currentStock: p.currentStock + (Number(batch.qtyPurchased) || 0),
              purchasePrice: Number(batch.costPrice) || p.purchasePrice,
              sellingPrice:
                Number(batch.newSellingPrice) > 0
                  ? Number(batch.newSellingPrice)
                  : p.sellingPrice,
              supplierName: batch.supplier || p.supplierName,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

    // 2. Call server in background
    return await storageService.createPurchaseBatch(batch);
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
    // 1. Immediately deduct stock in React state (0ms latency!)
    setParts((prev) =>
      prev.map((p) =>
        p.id === data.partId
          ? {
              ...p,
              currentStock: Math.max(0, p.currentStock - Number(data.quantity || 0)),
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

    return await storageService.recordPurchaseReturn(data);
  };

  const recordStockAdjustment = async (data: {
    partId: string;
    batchId?: string;
    quantity: number;
    reason: string;
  }) => {
    // 1. Immediately adjust stock in React state (0ms latency!)
    setParts((prev) =>
      prev.map((p) =>
        p.id === data.partId
          ? {
              ...p,
              currentStock: Math.max(0, p.currentStock + Number(data.quantity || 0)),
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

    return await storageService.recordStockAdjustment(data);
  };

  // ==========================================
  // CUSTOMER CRUD (OPTIMISTIC 0ms LATENCY)
  // ==========================================
  const addCustomer = async (
    customer: Omit<Customer, "id" | "totalSpent" | "totalVisits" | "createdAt" | "updatedAt">
  ) => {
    const tempId = `cust-${Date.now()}`;
    const optimisticCust: Customer = {
      ...customer,
      id: tempId,
      totalSpent: 0,
      totalVisits: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately update React state (0ms latency!)
    setCustomers((prev) => [optimisticCust, ...prev]);

    try {
      const created = await storageService.createCustomer(customer);
      setCustomers((prev) => prev.map((c) => (c.id === tempId ? created : c)));
      return created;
    } catch {
      const q = getOfflineQueue();
      q.customers.push(optimisticCust);
      saveOfflineQueue(q);
      return optimisticCust;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    // 1. Immediately update React state (0ms latency!)
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c))
    );

    try {
      const updated = await storageService.updateCustomer(id, updates);
      setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch {
      const cust = customers.find((c) => c.id === id);
      if (cust) {
        const q = getOfflineQueue();
        q.customers.push({ ...cust, ...updates });
        saveOfflineQueue(q);
      }
      return { ...customers.find((c) => c.id === id), ...updates } as Customer;
    }
  };

  const deleteCustomer = async (id: string) => {
    // 1. Immediately update React state (0ms latency!)
    setCustomers((prev) => prev.filter((c) => c.id !== id));

    try {
      return await storageService.deleteCustomer(id);
    } catch {
      return true;
    }
  };

  // ==========================================
  // BILLS CRUD (OPTIMISTIC 0ms LATENCY & REALTIME STOCK DEDUCTION)
  // ==========================================
  const createBill = async (bill: Omit<Bill, "id" | "billNumber" | "createdAt" | "status">) => {
    const tempId = `bill-${Date.now()}`;
    const nextBillNumber = `SK-${bills.length + 1001}`;
    const optimisticBill: Bill = {
      ...bill,
      id: tempId,
      billNumber: nextBillNumber,
      status: "Completed",
      createdAt: new Date().toISOString(),
    };

    // 1. Instantly add bill to bills state (0ms!)
    setBills((prev) => [optimisticBill, ...prev]);

    // 2. Instantly deduct sold quantities from parts stock in memory (0ms!)
    setParts((prevParts) =>
      prevParts.map((p) => {
        const soldItem = bill.items.find((i) => i.partId === p.id);
        if (soldItem) {
          return {
            ...p,
            currentStock: Math.max(0, p.currentStock - soldItem.quantity),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    // 3. Instantly update customer spend/visit count in memory (0ms!)
    if (bill.customerId) {
      setCustomers((prevCusts) =>
        prevCusts.map((c) =>
          c.id === bill.customerId
            ? {
                ...c,
                totalSpent: c.totalSpent + bill.grandTotal,
                totalVisits: c.totalVisits + 1,
                lastVisit: new Date().toISOString(),
              }
            : c
        )
      );
    }

    // 4. Save to server asynchronously
    try {
      const created = await storageService.createBill(bill);
      // Reconcile with actual server ID
      setBills((prev) => prev.map((b) => (b.id === tempId ? created : b)));
      return created;
    } catch {
      // Offline fallback: already in state, add to queue
      const q = getOfflineQueue();
      q.bills.push(optimisticBill);
      saveOfflineQueue(q);
      return optimisticBill;
    }
  };

  const cancelBill = async (id: string) => {
    // 1. Immediately update React state (0ms latency!)
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "Cancelled" as const } : b))
    );

    try {
      return await storageService.cancelBill(id);
    } catch {
      return true;
    }
  };

  const deleteBill = async (id: string) => {
    // 1. Immediately update React state (0ms latency!)
    setBills((prev) => prev.filter((b) => b.id !== id));

    try {
      return await storageService.deleteBill(id);
    } catch {
      return true;
    }
  };

  // ==========================================
  // SUPPLIER CREDIT CRUD (OPTIMISTIC 0ms LATENCY)
  // ==========================================
  const addSupplierCredit = async (
    credit: Omit<
      SupplierCredit,
      "id" | "paidAmount" | "remainingBalance" | "status" | "paymentHistory" | "createdAt" | "updatedAt"
    >
  ) => {
    const tempId = `credit-${Date.now()}`;
    const optimisticCredit: SupplierCredit = {
      ...credit,
      id: tempId,
      paidAmount: 0,
      remainingBalance: credit.totalAmount,
      status: "Pending",
      paymentHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately update React state (0ms latency!)
    setSupplierCredits((prev) => [optimisticCredit, ...prev]);

    try {
      const created = await storageService.createSupplierCredit(credit);
      setSupplierCredits((prev) => prev.map((c) => (c.id === tempId ? created : c)));
      return created;
    } catch {
      const q = getOfflineQueue();
      q.supplierCredits.push(optimisticCredit);
      saveOfflineQueue(q);
      return optimisticCredit;
    }
  };

  const updateSupplierCredit = async (id: string, updates: Partial<SupplierCredit>) => {
    // 1. Immediately update React state (0ms latency!)
    setSupplierCredits((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c))
    );

    try {
      const updated = await storageService.updateSupplierCredit(id, updates);
      setSupplierCredits((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch {
      const credit = supplierCredits.find((c) => c.id === id);
      if (credit) {
        const q = getOfflineQueue();
        q.supplierCredits.push({ ...credit, ...updates });
        saveOfflineQueue(q);
      }
      return { ...supplierCredits.find((c) => c.id === id), ...updates } as SupplierCredit;
    }
  };

  const recordSupplierPayment = async (creditId: string, amount: number, notes?: string) => {
    // 1. Immediately update React state in memory (0ms latency!)
    setSupplierCredits((prev) =>
      prev.map((c) => {
        if (c.id === creditId) {
          const paidAmount = c.paidAmount + amount;
          const remainingBalance = Math.max(0, c.remainingBalance - amount);
          return {
            ...c,
            paidAmount,
            remainingBalance,
            status: remainingBalance === 0 ? "Paid" : "Partial",
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
      })
    );

    try {
      const updated = await storageService.recordSupplierPayment(creditId, amount, notes);
      setSupplierCredits((prev) => prev.map((c) => (c.id === creditId ? updated : c)));
      return updated;
    } catch {
      return supplierCredits.find((c) => c.id === creditId)!;
    }
  };

  const deleteSupplierCredit = async (id: string) => {
    // 1. Immediately update React state (0ms latency!)
    setSupplierCredits((prev) => prev.filter((c) => c.id !== id));

    try {
      return await storageService.deleteSupplierCredit(id);
    } catch {
      return true;
    }
  };

  // ==========================================
  // MECHANIC CRUD & PAYOUTS (OPTIMISTIC 0ms LATENCY)
  // ==========================================
  const addMechanic = async (mech: Omit<Mechanic, "id" | "createdAt" | "updatedAt">) => {
    const tempId = `mech-${Date.now()}`;
    const optimisticMech: Mechanic = {
      ...mech,
      id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately update React state (0ms latency!)
    setMechanics((prev) => [...prev, optimisticMech]);

    try {
      const created = await storageService.createMechanic(mech);
      setMechanics((prev) => prev.map((m) => (m.id === tempId ? created : m)));
      return created;
    } catch {
      const q = getOfflineQueue();
      q.mechanics.push(optimisticMech);
      saveOfflineQueue(q);
      return optimisticMech;
    }
  };

  const updateMechanic = async (id: string, updates: Partial<Mechanic>) => {
    // 1. Immediately update React state (0ms latency!)
    setMechanics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m))
    );

    try {
      const updated = await storageService.updateMechanic(id, updates);
      setMechanics((prev) => prev.map((m) => (m.id === id ? updated : m)));
      return updated;
    } catch {
      return { ...mechanics.find((m) => m.id === id), ...updates } as Mechanic;
    }
  };

  const deleteMechanic = async (id: string) => {
    // 1. Immediately update React state (0ms latency!)
    setMechanics((prev) => prev.filter((m) => m.id !== id));

    try {
      return await storageService.deleteMechanic(id);
    } catch {
      return true;
    }
  };

  const recordMechanicPayout = async (mechanicId: string, amount: number, notes?: string) => {
    const mech = mechanics.find((m) => m.id === mechanicId);
    const entry: MechanicLedgerEntry = {
      id: `payout-${Date.now()}`,
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

    // 1. Immediately update React state (0ms latency!)
    setMechanicLedger((prev) => [entry, ...prev]);

    try {
      const created = await storageService.recordMechanicPayout(mechanicId, amount, notes);
      setMechanicLedger((prev) => prev.map((l) => (l.id === entry.id ? created : l)));
      return created;
    } catch {
      const q = getOfflineQueue();
      q.mechanicLedger.push(entry);
      saveOfflineQueue(q);
      return entry;
    }
  };

  // ==========================================
  // JOB CARDS CRUD (OPTIMISTIC 0ms LATENCY)
  // ==========================================
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
    const count = jobCards.length + 101;
    const tempId = `job-${Date.now()}`;
    const optimisticCard: VehicleJobCard = {
      ...card,
      id: tempId,
      jobCardNumber: `JC-${count}`,
      status: "In Progress",
      items: [],
      labourItems: [],
      estimatedSubtotal: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately update React state (0ms latency!)
    setJobCards((prev) => [optimisticCard, ...prev]);

    try {
      const created = await storageService.createJobCard(card);
      setJobCards((prev) => prev.map((j) => (j.id === tempId ? created : j)));
      return created;
    } catch {
      const q = getOfflineQueue();
      q.jobCards.push(optimisticCard);
      saveOfflineQueue(q);
      return optimisticCard;
    }
  };

  const updateJobCard = async (id: string, updates: Partial<VehicleJobCard>) => {
    // 1. Immediately update React state in memory (0ms latency!)
    setJobCards((prev) =>
      prev.map((j) => {
        if (j.id === id) {
          const merged = { ...j, ...updates, updatedAt: new Date().toISOString() };
          const pTot = (merged.items || []).reduce((acc, i) => acc + (i.totalPrice || 0), 0);
          const lTot = (merged.labourItems || []).reduce((acc, l) => acc + (l.amount || 0), 0);
          merged.estimatedSubtotal = pTot + lTot;
          return merged;
        }
        return j;
      })
    );

    try {
      const updated = await storageService.updateJobCard(id, updates);
      setJobCards((prev) => prev.map((j) => (j.id === id ? updated : j)));
      return updated;
    } catch {
      return { ...jobCards.find((c) => c.id === id), ...updates } as VehicleJobCard;
    }
  };

  const addPartToJobCard = async (jobCardId: string, partId: string, quantity?: number) => {
    const part = parts.find((p) => p.id === partId);
    const card = jobCards.find((c) => c.id === jobCardId);
    if (card && part) {
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
      // Optimistic update in 0ms!
      updateJobCard(jobCardId, { items });
    }

    try {
      const updated = await storageService.addPartToJobCard(jobCardId, partId, quantity);
      setJobCards((prev) => prev.map((j) => (j.id === jobCardId ? updated : j)));
      return updated;
    } catch {
      return jobCards.find((c) => c.id === jobCardId)!;
    }
  };

  const updateJobCardPartQty = async (jobCardId: string, partId: string, delta: number) => {
    const card = jobCards.find((c) => c.id === jobCardId);
    if (card) {
      const items = [...card.items];
      const idx = items.findIndex((i) => i.partId === partId);
      if (idx > -1) {
        const newQty = items[idx].quantity + delta;
        if (newQty <= 0) {
          items.splice(idx, 1);
        } else {
          items[idx].quantity = newQty;
          items[idx].totalPrice = newQty * items[idx].unitPrice;
        }
        updateJobCard(jobCardId, { items });
      }
    }

    try {
      const updated = await storageService.updateJobCardPartQty(jobCardId, partId, delta);
      setJobCards((prev) => prev.map((j) => (j.id === jobCardId ? updated : j)));
      return updated;
    } catch {
      return jobCards.find((c) => c.id === jobCardId)!;
    }
  };

  const removePartFromJobCard = async (jobCardId: string, partId: string) => {
    const card = jobCards.find((c) => c.id === jobCardId);
    if (card) {
      const items = card.items.filter((i) => i.partId !== partId);
      updateJobCard(jobCardId, { items });
    }

    try {
      const updated = await storageService.removePartFromJobCard(jobCardId, partId);
      setJobCards((prev) => prev.map((j) => (j.id === jobCardId ? updated : j)));
      return updated;
    } catch {
      return jobCards.find((c) => c.id === jobCardId)!;
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
    const card = jobCards.find((c) => c.id === jobCardId);
    if (card) {
      const shopShare = Math.round((labour.amount * (labour.shopCutPercentage || 0)) / 100);
      const mechanicShare = labour.amount - shopShare;
      const newLabour = {
        id: `lbr-${Date.now()}`,
        description: labour.description,
        amount: labour.amount,
        mechanicId: labour.mechanicId,
        mechanicName: labour.mechanicName,
        shopCutPercentage: labour.shopCutPercentage,
        shopShare,
        mechanicShare,
      };
      updateJobCard(jobCardId, { labourItems: [...card.labourItems, newLabour] });
    }

    try {
      const updated = await storageService.addLabourToJobCard(jobCardId, labour);
      setJobCards((prev) => prev.map((j) => (j.id === jobCardId ? updated : j)));
      return updated;
    } catch {
      return jobCards.find((c) => c.id === jobCardId)!;
    }
  };

  const removeLabourFromJobCard = async (jobCardId: string, labourId: string) => {
    const card = jobCards.find((c) => c.id === jobCardId);
    if (card) {
      const labourItems = card.labourItems.filter((l) => l.id !== labourId);
      updateJobCard(jobCardId, { labourItems });
    }

    try {
      const updated = await storageService.removeLabourFromJobCard(jobCardId, labourId);
      setJobCards((prev) => prev.map((j) => (j.id === jobCardId ? updated : j)));
      return updated;
    } catch {
      return jobCards.find((c) => c.id === jobCardId)!;
    }
  };

  const completeJobCardAndGenerateBill = async (
    jobCardId: string,
    paymentMethod: Bill["paymentMethod"],
    discount?: number,
    notes?: string
  ) => {
    try {
      const result = await storageService.completeJobCardAndGenerateBill(
        jobCardId,
        paymentMethod,
        discount,
        notes
      );
      // Immediately add bill and mark job completed in React state
      setBills((prev) => [result.bill, ...prev]);
      setJobCards((prev) => prev.map((j) => (j.id === jobCardId ? result.jobCard : j)));
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
    // 1. Immediately update React state (0ms latency!)
    setJobCards((prev) => prev.filter((c) => c.id !== id));

    try {
      return await storageService.deleteJobCard(id);
    } catch {
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
