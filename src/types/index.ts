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
  shopId?: string;
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
  shopId?: string;
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

export interface PurchaseBatch {
  id: string;            // batch_id
  partId: string;        // item_id
  partName: string;      // item_name
  purchaseDate: string;  // ISO date string
  qtyPurchased: number;  // Initial purchase quantity
  qtyRemaining: number;  // Available stock in this batch
  costPrice: number;     // Purchase cost price per unit
  supplier: string;      // Supplier name
  notes?: string;
  shopId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleDetail {
  id: string;
  billId: string;
  billNumber: string;
  partId: string;
  partName: string;
  batchId: string;
  quantity: number;
  costPrice: number;     // Batch cost price
  salePrice: number;     // Selling price to customer
  profit: number;        // (salePrice - costPrice) * quantity
  shopId?: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  type: "purchase_return" | "adjustment";
  partId: string;
  partName: string;
  batchId?: string;
  quantity: number;
  reason: string;
  supplier?: string;
  costPrice?: number;
  shopId?: string;
  createdAt: string;
}

export interface RateHistoryEntry {
  batchId: string;
  partId: string;
  partName: string;
  purchaseDate: string;
  supplier: string;
  costPrice: number;
  previousCostPrice?: number;
  priceChange?: number;          // e.g. +10 or -5
  priceChangePercentage?: number; // e.g. +20%
  qtyPurchased: number;
  qtyRemaining: number;
}

export interface BillItem {
  partId: string;
  partName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number; // Weighted / latest batch cost for display
  totalPrice: number;
  batchDeductions?: SaleDetail[]; // FIFO batch breakdown records
  itemProfit?: number; // Total profit for this item computed from FIFO batch costs
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
  shopId?: string;
  createdAt: string; // ISO date string
}

export interface Mechanic {
  id: string;
  name: string;
  phone: string;
  specialty?: string;
  defaultShopCutPercentage: number; // e.g. 30% for shop owner
  shopId?: string;
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
  shopId?: string;
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
  shopId?: string;
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
  shopId?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "superadmin" | "admin" | "staff";

export interface Shop {
  id: string; // e.g. "shop-sikandar", "shop-1712345678"
  slug: string;
  name: string; // e.g. "Sikander Spare Parts"
  urduName?: string; // e.g. "سکندر اسپیئر پارٹس"
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  status: "active" | "suspended" | "expired";
  monthlyRent: number; // in PKR
  billingCycle: "monthly" | "quarterly" | "yearly";
  subscriptionStart: string; // ISO date
  subscriptionEnd: string; // ISO date
  adminUserId?: string;
  adminUsername?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  shopId?: string;
  shopName?: string;
}

export interface DbUser {
  id: string;
  username: string;
  email: string;
  name: string;
  passwordHash: string; // Cryptographically hashed with bcrypt
  role: UserRole;
  shopId?: string; // undefined for superadmin, shop ID for clients
  createdAt: string;
  updatedAt: string;
}

export interface SaaSStats {
  totalShops: number;
  activeShops: number;
  suspendedShops: number;
  expiringIn7Days: number;
  monthlyRecurringRevenue: number;
  totalSystemBills: number;
  totalSystemSales: number;
  totalSystemParts: number;
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
