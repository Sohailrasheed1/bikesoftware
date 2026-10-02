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
import { IStorageService } from "./types";

export class ApiStorageService implements IStorageService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const data = await res.json();
        if (data.error) errorMsg = data.error;
      } catch {}
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  }

  // --- PARTS & FIFO BATCHES ---
  async getParts(): Promise<Part[]> {
    return this.request<Part[]>("/api/parts");
  }

  async getPart(id: string): Promise<Part | null> {
    return this.request<Part>(`/api/parts/${id}`);
  }

  async createPart(part: Omit<Part, "id" | "createdAt" | "updatedAt">): Promise<Part> {
    return this.request<Part>("/api/parts", {
      method: "POST",
      body: JSON.stringify(part),
    });
  }

  async updatePart(id: string, updates: Partial<Part>): Promise<Part> {
    return this.request<Part>(`/api/parts/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deletePart(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/parts/${id}`, {
      method: "DELETE",
    });
    return res.success;
  }

  async updateStock(id: string, delta: number): Promise<Part> {
    return this.request<Part>(`/api/parts/${id}/stock`, {
      method: "POST",
      body: JSON.stringify({ delta }),
    });
  }

  async getPurchaseBatches(partId?: string): Promise<PurchaseBatch[]> {
    const query = partId ? `?partId=${encodeURIComponent(partId)}` : "";
    return this.request<PurchaseBatch[]>(`/api/parts/batches${query}`);
  }

  async createPurchaseBatch(batch: {
    partId: string;
    partName?: string;
    purchaseDate?: string;
    qtyPurchased: number;
    costPrice: number;
    supplier: string;
    notes?: string;
  }): Promise<PurchaseBatch> {
    return this.request<PurchaseBatch>("/api/parts/batches", {
      method: "POST",
      body: JSON.stringify(batch),
    });
  }

  async getPurchaseRateHistory(partId?: string): Promise<RateHistoryEntry[]> {
    const query = partId ? `?partId=${encodeURIComponent(partId)}` : "";
    return this.request<RateHistoryEntry[]>(`/api/reports/rate-history${query}`);
  }

  async recordPurchaseReturn(data: {
    partId: string;
    batchId?: string;
    quantity: number;
    reason: string;
    supplier?: string;
  }): Promise<StockAdjustment> {
    return this.request<StockAdjustment>("/api/parts/returns", {
      method: "POST",
      body: JSON.stringify({ ...data, type: "purchase_return" }),
    });
  }

  async recordStockAdjustment(data: {
    partId: string;
    batchId?: string;
    quantity: number;
    reason: string;
  }): Promise<StockAdjustment> {
    return this.request<StockAdjustment>("/api/parts/returns", {
      method: "POST",
      body: JSON.stringify({ ...data, type: "adjustment" }),
    });
  }

  async getSaleDetails(billId?: string, partId?: string): Promise<SaleDetail[]> {
    const params = new URLSearchParams();
    if (billId) params.append("billId", billId);
    if (partId) params.append("partId", partId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<SaleDetail[]>(`/api/sales/details${query}`);
  }

  // --- CUSTOMERS ---
  async getCustomers(): Promise<Customer[]> {
    return this.request<Customer[]>("/api/customers");
  }

  async getCustomer(id: string): Promise<Customer | null> {
    return this.request<Customer>(`/api/customers/${id}`);
  }

  async createCustomer(
    customer: Omit<Customer, "id" | "totalSpent" | "totalVisits" | "createdAt" | "updatedAt">
  ): Promise<Customer> {
    return this.request<Customer>("/api/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    });
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return this.request<Customer>(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/customers/${id}`, {
      method: "DELETE",
    });
    return res.success;
  }

  // --- BILLS ---
  async getBills(): Promise<Bill[]> {
    return this.request<Bill[]>("/api/bills");
  }

  async getBill(id: string): Promise<Bill | null> {
    return this.request<Bill>(`/api/bills/${id}`);
  }

  async createBill(bill: Omit<Bill, "id" | "billNumber" | "createdAt" | "status">): Promise<Bill> {
    return this.request<Bill>("/api/bills", {
      method: "POST",
      body: JSON.stringify(bill),
    });
  }

  async cancelBill(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/bills/${id}/cancel`, {
      method: "POST",
    });
    return res.success;
  }

  async deleteBill(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/bills/${id}`, {
      method: "DELETE",
    });
    return res.success;
  }

  // --- MECHANICS ---
  async getMechanics(): Promise<Mechanic[]> {
    return this.request<Mechanic[]>("/api/mechanics");
  }

  async getMechanic(id: string): Promise<Mechanic | null> {
    return this.request<Mechanic>(`/api/mechanics/${id}`);
  }

  async createMechanic(mechanic: Omit<Mechanic, "id" | "createdAt" | "updatedAt">): Promise<Mechanic> {
    return this.request<Mechanic>("/api/mechanics", {
      method: "POST",
      body: JSON.stringify(mechanic),
    });
  }

  async updateMechanic(id: string, updates: Partial<Mechanic>): Promise<Mechanic> {
    return this.request<Mechanic>(`/api/mechanics/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteMechanic(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/mechanics/${id}`, {
      method: "DELETE",
    });
    return res.success;
  }

  async getMechanicLedger(mechanicId?: string): Promise<MechanicLedgerEntry[]> {
    const url = mechanicId ? `/api/mechanics/ledger?mechanicId=${encodeURIComponent(mechanicId)}` : "/api/mechanics/ledger";
    return this.request<MechanicLedgerEntry[]>(url);
  }

  async recordMechanicPayout(mechanicId: string, amount: number, notes?: string): Promise<MechanicLedgerEntry> {
    return this.request<MechanicLedgerEntry>(`/api/mechanics/${mechanicId}/payout`, {
      method: "POST",
      body: JSON.stringify({ amount, notes }),
    });
  }

  // --- JOB CARDS ---
  async getJobCards(): Promise<VehicleJobCard[]> {
    return this.request<VehicleJobCard[]>("/api/workshop");
  }

  async getJobCard(id: string): Promise<VehicleJobCard | null> {
    return this.request<VehicleJobCard>(`/api/workshop/${id}`);
  }

  async createJobCard(card: {
    bayNumber: number;
    customerName: string;
    customerPhone?: string;
    bikeRegNumber: string;
    bikeModel: string;
    complaintDescription?: string;
    assignedMechanicId?: string;
    assignedMechanicName?: string;
  }): Promise<VehicleJobCard> {
    return this.request<VehicleJobCard>("/api/workshop", {
      method: "POST",
      body: JSON.stringify(card),
    });
  }

  async updateJobCard(id: string, updates: Partial<VehicleJobCard>): Promise<VehicleJobCard> {
    return this.request<VehicleJobCard>(`/api/workshop/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async addPartToJobCard(jobCardId: string, partId: string, quantity: number = 1): Promise<VehicleJobCard> {
    return this.request<VehicleJobCard>(`/api/workshop/${jobCardId}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "addPart", partId, quantity }),
    });
  }

  async updateJobCardPartQty(jobCardId: string, partId: string, delta: number): Promise<VehicleJobCard> {
    return this.request<VehicleJobCard>(`/api/workshop/${jobCardId}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "updatePartQty", partId, delta }),
    });
  }

  async removePartFromJobCard(jobCardId: string, partId: string): Promise<VehicleJobCard> {
    return this.request<VehicleJobCard>(`/api/workshop/${jobCardId}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "removePart", partId }),
    });
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
    return this.request<VehicleJobCard>(`/api/workshop/${jobCardId}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "addLabour", labour }),
    });
  }

  async removeLabourFromJobCard(jobCardId: string, labourId: string): Promise<VehicleJobCard> {
    return this.request<VehicleJobCard>(`/api/workshop/${jobCardId}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "removeLabour", labourId }),
    });
  }

  async completeJobCardAndGenerateBill(
    jobCardId: string,
    paymentMethod: Bill["paymentMethod"],
    discount?: number,
    notes?: string
  ): Promise<{ bill: Bill; jobCard: VehicleJobCard }> {
    return this.request<{ bill: Bill; jobCard: VehicleJobCard }>(`/api/workshop/${jobCardId}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "complete", paymentMethod, discount, notes }),
    });
  }

  async deleteJobCard(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/workshop/${id}`, {
      method: "DELETE",
    });
    return res.success;
  }

  // --- SUPPLIER CREDITS ---
  async getSupplierCredits(): Promise<SupplierCredit[]> {
    return this.request<SupplierCredit[]>("/api/suppliers");
  }

  async getSupplierCredit(id: string): Promise<SupplierCredit | null> {
    return this.request<SupplierCredit>(`/api/suppliers/${id}`);
  }

  async createSupplierCredit(
    credit: Omit<
      SupplierCredit,
      "id" | "paidAmount" | "remainingBalance" | "status" | "paymentHistory" | "createdAt" | "updatedAt"
    >
  ): Promise<SupplierCredit> {
    return this.request<SupplierCredit>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify(credit),
    });
  }

  async updateSupplierCredit(id: string, updates: Partial<SupplierCredit>): Promise<SupplierCredit> {
    return this.request<SupplierCredit>(`/api/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async recordSupplierPayment(creditId: string, amount: number, notes?: string): Promise<SupplierCredit> {
    return this.request<SupplierCredit>(`/api/suppliers/${creditId}/payment`, {
      method: "POST",
      body: JSON.stringify({ amount, notes }),
    });
  }

  async deleteSupplierCredit(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/suppliers/${id}`, {
      method: "DELETE",
    });
    return res.success;
  }

  // --- DASHBOARD STATS ---
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>("/api/stats");
  }

  // --- SYNC ---
  async syncClientData(data: any): Promise<any> {
    return this.request<{ synced: boolean; counts: Record<string, number> }>("/api/sync", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- RESET ---
  async resetToSampleData(): Promise<void> {
    await this.request<{ success: boolean }>("/api/reset", {
      method: "POST",
    });
  }
}

export const apiStorageService = new ApiStorageService();
