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

export interface IStorageService {
  // Inventory
  getParts(): Promise<Part[]>;
  getPart(id: string): Promise<Part | null>;
  createPart(part: Omit<Part, "id" | "createdAt" | "updatedAt">): Promise<Part>;
  updatePart(id: string, updates: Partial<Part>): Promise<Part>;
  deletePart(id: string): Promise<boolean>;
  updateStock(id: string, delta: number): Promise<Part>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | null>;
  createCustomer(customer: Omit<Customer, "id" | "totalSpent" | "totalVisits" | "createdAt" | "updatedAt">): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<boolean>;

  // Bills
  getBills(): Promise<Bill[]>;
  getBill(id: string): Promise<Bill | null>;
  createBill(bill: Omit<Bill, "id" | "billNumber" | "createdAt" | "status">): Promise<Bill>;
  cancelBill(id: string): Promise<boolean>;

  // Mechanics & Mechanic Ledger (کھاتہ)
  getMechanics(): Promise<Mechanic[]>;
  getMechanic(id: string): Promise<Mechanic | null>;
  createMechanic(mechanic: Omit<Mechanic, "id" | "createdAt" | "updatedAt">): Promise<Mechanic>;
  updateMechanic(id: string, updates: Partial<Mechanic>): Promise<Mechanic>;
  deleteMechanic(id: string): Promise<boolean>;
  getMechanicLedger(mechanicId?: string): Promise<MechanicLedgerEntry[]>;
  recordMechanicPayout(mechanicId: string, amount: number, notes?: string): Promise<MechanicLedgerEntry>;

  // Live Vehicle Job Cards (10 Gariyon Ka Live Kaam)
  getJobCards(): Promise<VehicleJobCard[]>;
  getJobCard(id: string): Promise<VehicleJobCard | null>;
  createJobCard(card: {
    bayNumber: number;
    customerName: string;
    customerPhone?: string;
    bikeRegNumber: string;
    bikeModel: string;
    complaintDescription?: string;
    assignedMechanicId?: string;
    assignedMechanicName?: string;
  }): Promise<VehicleJobCard>;
  updateJobCard(id: string, updates: Partial<VehicleJobCard>): Promise<VehicleJobCard>;
  addPartToJobCard(jobCardId: string, partId: string, quantity?: number): Promise<VehicleJobCard>;
  updateJobCardPartQty(jobCardId: string, partId: string, delta: number): Promise<VehicleJobCard>;
  removePartFromJobCard(jobCardId: string, partId: string): Promise<VehicleJobCard>;
  addLabourToJobCard(
    jobCardId: string,
    labour: {
      description: string;
      amount: number;
      mechanicId?: string;
      mechanicName: string;
      shopCutPercentage: number;
    }
  ): Promise<VehicleJobCard>;
  removeLabourFromJobCard(jobCardId: string, labourId: string): Promise<VehicleJobCard>;
  completeJobCardAndGenerateBill(
    jobCardId: string,
    paymentMethod: Bill["paymentMethod"],
    discount?: number,
    notes?: string
  ): Promise<{ bill: Bill; jobCard: VehicleJobCard }>;
  deleteJobCard(id: string): Promise<boolean>;

  // Supplier Credit (Udhaar / Khata)
  getSupplierCredits(): Promise<SupplierCredit[]>;
  getSupplierCredit(id: string): Promise<SupplierCredit | null>;
  createSupplierCredit(credit: Omit<SupplierCredit, "id" | "paidAmount" | "remainingBalance" | "status" | "paymentHistory" | "createdAt" | "updatedAt">): Promise<SupplierCredit>;
  recordSupplierPayment(creditId: string, amount: number, notes?: string): Promise<SupplierCredit>;
  deleteSupplierCredit(id: string): Promise<boolean>;

  // Dashboard Stats
  getDashboardStats(): Promise<DashboardStats>;

  // Reset / Re-seed
  resetToSampleData(): Promise<void>;
}
