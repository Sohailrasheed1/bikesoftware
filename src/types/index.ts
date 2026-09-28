export type MotorcycleModel =
  | "Honda CD 70"
  | "Honda CG 125"
  | "Honda Pridor 100"
  | "Honda CB 150F"
  | "Yamaha YBR 125"
  | "Yamaha YB 125Z"
  | "Suzuki GS 150"
  | "Suzuki GR 150"
  | "Road Prince 70"
  | "United 70"
  | "Super Power 70"
  | "Crown Lifan"
  | "Universal / Other";

export type PartCategory =
  | "Engine & Transmission"
  | "Brakes & Clutch"
  | "Electrical & Battery"
  | "Body, Lights & Mirrors"
  | "Suspension & Fork"
  | "Tyres & Tubes"
  | "Cables & Levers"
  | "Oils & Lubricants"
  | "Chains & Sprockets"
  | "Accessories & General";

export interface Part {
  id: string;
  name: string;
  category: PartCategory;
  compatibleModels: string[]; // e.g. ["Honda CD 70", "United 70"]
  sku?: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockLimit: number; // Alerts when currentStock <= minStockLimit
  supplierName: string;
  supplierPhone?: string;
  location?: string; // Shelf / Bin e.g. "Rack A-2"
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  bikeRegNumber: string; // e.g. "KHI-8291"
  bikeModel: string;     // e.g. "Honda CD 70"
  address?: string;
  notes?: string;
  totalSpent: number;
  totalVisits: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillLabourItem {
  id: string;
  description: string;
  amount: number;
  mechanicId?: string;
  mechanicName: string;
  shopCutPercentage: number; // e.g. 30 (30% shop owner, 70% mechanic)
  shopShare: number;         // e.g. 300
  mechanicShare: number;     // e.g. 700
}

export interface BillItem {
  partId: string;
  partName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number; // For profit calculation in reports
  totalPrice: number;
}

export interface Bill {
  id: string; // e.g. "SK-1001"
  billNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  bikeRegNumber?: string;
  bikeModel?: string;
  customerAddress?: string;
  items: BillItem[];
  labourItems?: BillLabourItem[];
  labourTotal?: number;
  partsTotal?: number;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  paymentMethod: "Cash" | "EasyPaisa / JazzCash" | "Bank Transfer" | "Udhaar / Credit";
  notes?: string;
  status: "Completed" | "Cancelled";
  createdAt: string; // ISO date string
}

export interface Mechanic {
  id: string;
  name: string;
  phone: string;
  specialty?: string;
  defaultShopCutPercentage: number; // e.g. 30% for shop owner
  createdAt: string;
  updatedAt: string;
}

export interface MechanicLedgerEntry {
  id: string;
  mechanicId: string;
  mechanicName: string;
  type: "earning" | "payout";
  date: string;
  billId?: string;
  billNumber?: string;
  jobCardId?: string;
  jobCardNumber?: string;
  vehicleDetails?: string;
  customerName?: string;
  laborDescription?: string;
  totalLaborAmount: number;
  shopPercentage: number;
  shopAmount: number;
  mechanicAmount: number;
  notes?: string;
}

export interface VehicleJobCard {
  id: string;
  jobCardNumber: string; // e.g. "JC-101"
  bayNumber: number;     // Bay 1 to 10
  customerName: string;
  customerPhone?: string;
  bikeRegNumber: string; // e.g. "KHI-8291"
  bikeModel: string;     // e.g. "Honda CD 70"
  complaintDescription?: string;
  assignedMechanicId?: string;
  assignedMechanicName?: string;
  status: "In Progress" | "Waiting for Parts" | "Ready for Bill" | "Completed" | "Cancelled";
  items: BillItem[];     // Live parts installed so far
  labourItems: BillLabourItem[]; // Live labor charges
  estimatedSubtotal: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  billId?: string;
  billNumber?: string;
}

export interface SupplierPayment {
  id: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}

export interface SupplierCredit {
  id: string;
  supplierName: string;
  supplierPhone: string;
  purchasedParts: string; // Details e.g. "20x CD70 Piston, 15x CG125 Clutch Plates"
  quantity: number;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  purchaseDate: string;   // ISO date string
  dueDate: string;        // Payment due date
  status: "Pending" | "Partial" | "Paid";
  paymentHistory: SupplierPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: "admin" | "staff";
}

export interface DashboardStats {
  totalInventoryValue: number;
  totalPartsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCustomersCount: number;
  todaySales: number;
  todayBillsCount: number;
  monthlySales: number;
  totalPendingSupplierCredit: number;
  overdue15DaysCreditCount: number;
  activeJobsCount: number;
  totalMechanicsCount: number;
  totalMechanicPayable: number;
}
