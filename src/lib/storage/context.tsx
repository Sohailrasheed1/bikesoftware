"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
} from "@/types";
import { storageService } from "./local-storage";

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
  refreshAll: () => Promise<void>;
  addPart: (part: Omit<Part, "id" | "createdAt" | "updatedAt">) => Promise<Part>;
  updatePart: (id: string, updates: Partial<Part>) => Promise<Part>;
  deletePart: (id: string) => Promise<boolean>;
  updateStock: (id: string, delta: number) => Promise<Part>;
  addCustomer: (customer: Omit<Customer, "id" | "totalSpent" | "totalVisits" | "createdAt" | "updatedAt">) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<boolean>;
  createBill: (bill: Omit<Bill, "id" | "billNumber" | "createdAt" | "status">) => Promise<Bill>;
  cancelBill: (id: string) => Promise<boolean>;
  addSupplierCredit: (credit: Omit<SupplierCredit, "id" | "paidAmount" | "remainingBalance" | "status" | "paymentHistory" | "createdAt" | "updatedAt">) => Promise<SupplierCredit>;
  recordSupplierPayment: (creditId: string, amount: number, notes?: string) => Promise<SupplierCredit>;
  deleteSupplierCredit: (id: string) => Promise<boolean>;
  
  // Mechanics & Ledger
  addMechanic: (mech: Omit<Mechanic, "id" | "createdAt" | "updatedAt">) => Promise<Mechanic>;
  updateMechanic: (id: string, updates: Partial<Mechanic>) => Promise<Mechanic>;
  deleteMechanic: (id: string) => Promise<boolean>;
  recordMechanicPayout: (mechanicId: string, amount: number, notes?: string) => Promise<MechanicLedgerEntry>;
  
  // Job Cards (10 Gariyon Ka Live Kaam)
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

  const refreshAll = useCallback(async () => {
    try {
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
    } catch (err) {
      console.error("Failed to load store data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const addPart = async (part: Omit<Part, "id" | "createdAt" | "updatedAt">) => {
    const created = await storageService.createPart(part);
    await refreshAll();
    return created;
  };

  const updatePart = async (id: string, updates: Partial<Part>) => {
    const updated = await storageService.updatePart(id, updates);
    await refreshAll();
    return updated;
  };

  const deletePart = async (id: string) => {
    const res = await storageService.deletePart(id);
    await refreshAll();
    return res;
  };

  const updateStock = async (id: string, delta: number) => {
    const updated = await storageService.updateStock(id, delta);
    await refreshAll();
    return updated;
  };

  const addCustomer = async (
    customer: Omit<Customer, "id" | "totalSpent" | "totalVisits" | "createdAt" | "updatedAt">
  ) => {
    const created = await storageService.createCustomer(customer);
    await refreshAll();
    return created;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const updated = await storageService.updateCustomer(id, updates);
    await refreshAll();
    return updated;
  };

  const deleteCustomer = async (id: string) => {
    const res = await storageService.deleteCustomer(id);
    await refreshAll();
    return res;
  };

  const createBill = async (bill: Omit<Bill, "id" | "billNumber" | "createdAt" | "status">) => {
    const created = await storageService.createBill(bill);
    await refreshAll();
    return created;
  };

  const cancelBill = async (id: string) => {
    const res = await storageService.cancelBill(id);
    await refreshAll();
    return res;
  };

  const addSupplierCredit = async (
    credit: Omit<
      SupplierCredit,
      "id" | "paidAmount" | "remainingBalance" | "status" | "paymentHistory" | "createdAt" | "updatedAt"
    >
  ) => {
    const created = await storageService.createSupplierCredit(credit);
    await refreshAll();
    return created;
  };

  const recordSupplierPayment = async (creditId: string, amount: number, notes?: string) => {
    const updated = await storageService.recordSupplierPayment(creditId, amount, notes);
    await refreshAll();
    return updated;
  };

  const deleteSupplierCredit = async (id: string) => {
    const res = await storageService.deleteSupplierCredit(id);
    await refreshAll();
    return res;
  };

  // Mechanic functions
  const addMechanic = async (mech: Omit<Mechanic, "id" | "createdAt" | "updatedAt">) => {
    const created = await storageService.createMechanic(mech);
    await refreshAll();
    return created;
  };

  const updateMechanic = async (id: string, updates: Partial<Mechanic>) => {
    const updated = await storageService.updateMechanic(id, updates);
    await refreshAll();
    return updated;
  };

  const deleteMechanic = async (id: string) => {
    const res = await storageService.deleteMechanic(id);
    await refreshAll();
    return res;
  };

  const recordMechanicPayout = async (mechanicId: string, amount: number, notes?: string) => {
    const entry = await storageService.recordMechanicPayout(mechanicId, amount, notes);
    await refreshAll();
    return entry;
  };

  // Job Cards functions
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
    const created = await storageService.createJobCard(card);
    await refreshAll();
    return created;
  };

  const updateJobCard = async (id: string, updates: Partial<VehicleJobCard>) => {
    const updated = await storageService.updateJobCard(id, updates);
    await refreshAll();
    return updated;
  };

  const addPartToJobCard = async (jobCardId: string, partId: string, quantity?: number) => {
    const updated = await storageService.addPartToJobCard(jobCardId, partId, quantity);
    await refreshAll();
    return updated;
  };

  const updateJobCardPartQty = async (jobCardId: string, partId: string, delta: number) => {
    const updated = await storageService.updateJobCardPartQty(jobCardId, partId, delta);
    await refreshAll();
    return updated;
  };

  const removePartFromJobCard = async (jobCardId: string, partId: string) => {
    const updated = await storageService.removePartFromJobCard(jobCardId, partId);
    await refreshAll();
    return updated;
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
    const updated = await storageService.addLabourToJobCard(jobCardId, labour);
    await refreshAll();
    return updated;
  };

  const removeLabourFromJobCard = async (jobCardId: string, labourId: string) => {
    const updated = await storageService.removeLabourFromJobCard(jobCardId, labourId);
    await refreshAll();
    return updated;
  };

  const completeJobCardAndGenerateBill = async (
    jobCardId: string,
    paymentMethod: Bill["paymentMethod"],
    discount?: number,
    notes?: string
  ) => {
    const result = await storageService.completeJobCardAndGenerateBill(jobCardId, paymentMethod, discount, notes);
    await refreshAll();
    return result;
  };

  const deleteJobCard = async (id: string) => {
    const res = await storageService.deleteJobCard(id);
    await refreshAll();
    return res;
  };

  const resetToSampleData = async () => {
    await storageService.resetToSampleData();
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
        refreshAll,
        addPart,
        updatePart,
        deletePart,
        updateStock,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        createBill,
        cancelBill,
        addSupplierCredit,
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
