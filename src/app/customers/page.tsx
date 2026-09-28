"use client";

import React, { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Bike,
  Phone,
  MapPin,
  Calendar,
  Receipt,
  Edit,
  Trash2,
  Eye,
  History,
  TrendingUp,
  X,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ReceiptModal } from "@/components/pos/receipt-modal";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { Customer, Bill } from "@/types";
import { formatPKR, formatDate, formatDateTime } from "@/lib/utils";

export default function CustomersPage() {
  const { customers, bills, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const { t, isUrdu } = useLanguage();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Customer History Modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bikeRegNumber: "",
    bikeModel: "Honda CD 70",
    address: "",
    notes: "",
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      bikeRegNumber: "",
      bikeModel: "Honda CD 70",
      address: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      bikeRegNumber: c.bikeRegNumber || "",
      bikeModel: c.bikeModel || "Honda CD 70",
      address: c.address || "",
      notes: c.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, formData);
    } else {
      await addCustomer(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Kya aap waqai "${name}" ka record delete karna chahte hain?`)) {
      await deleteCustomer(id);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.bikeRegNumber && c.bikeRegNumber.toLowerCase().includes(search.toLowerCase())) ||
      (c.bikeModel && c.bikeModel.toLowerCase().includes(search.toLowerCase()))
  );

  // Customer bills for history modal
  const customerBills: Bill[] = historyCustomer
    ? bills.filter(
        (b) =>
          b.customerId === historyCustomer.id ||
          (b.customerPhone && b.customerPhone === historyCustomer.phone)
      )
    : [];

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            {t.customersTitle}
          </h1>
          <p className="text-xs text-slate-500">
            {t.customersSubtitle}
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 text-xs sm:text-sm h-11"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          + {t.addNewCustomer}
        </Button>
      </div>

      {/* Search Input */}
      <Card className="glass-card border-slate-200/90 shadow-xs">
        <CardContent className="p-3.5 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Gahak ka naam, mobile number ya motorcycle number plate (e.g. KHI-8291) likhein..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Responsive View: Mobile Cards & Desktop Clean Table */}
      {/* 1. Mobile Cards View */}
      <div className="lg:hidden space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs">
            Koi gahak nahi mila.
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {customer.name}
                  </h3>
                  {customer.phone ? (
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-xs text-blue-700 font-bold font-mono mt-0.5 flex items-center gap-1.5 hover:underline"
                    >
                      <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                        <Phone className="h-3 w-3" />
                      </span>
                      <span>{customer.phone}</span>
                      <span className="text-[10px] font-normal text-slate-400">(Call)</span>
                    </a>
                  ) : (
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      No phone
                    </div>
                  )}
                </div>

                {customer.bikeRegNumber && (
                  <Badge variant="outline" className="font-mono text-xs font-bold py-0.5">
                    {customer.bikeRegNumber}
                  </Badge>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                    Motorcycle
                  </div>
                  <div className="font-bold text-slate-800">{customer.bikeModel}</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                    Kul Kharidari
                  </div>
                  <div className="font-black text-slate-900">
                    {formatPKR(customer.totalSpent)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-bold text-blue-700 border-blue-200 bg-blue-50/50"
                  onClick={() => setHistoryCustomer(customer)}
                >
                  <History className="h-3.5 w-3.5 mr-1" />
                  <span>Bills ({customer.totalVisits})</span>
                </Button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(customer)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(customer.id, customer.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 2. Desktop Clean Airy Table */}
      <Card className="glass-card hidden lg:block overflow-hidden border-slate-200/90 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Gahak Ka Naam</th>
                <th className="py-3 px-3">Mobile Number</th>
                <th className="py-3 px-3">Motorcycle Model</th>
                <th className="py-3 px-3">Number Plate</th>
                <th className="py-3 px-3 text-center">Visits</th>
                <th className="py-3 px-3 text-right">Kul Kharidari (Spent)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Koi gahak nahi mila.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-50/80 transition"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {customer.name}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      {customer.phone || "-"}
                    </td>

                    <td className="py-3.5 px-3 font-medium text-slate-800">
                      {customer.bikeModel}
                    </td>

                    <td className="py-3.5 px-3">
                      {customer.bikeRegNumber ? (
                        <Badge variant="outline" className="font-mono text-xs font-bold py-0.5">
                          {customer.bikeRegNumber}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                      {customer.totalVisits}
                    </td>

                    <td className="py-3.5 px-3 text-right font-black text-slate-900">
                      {formatPKR(customer.totalSpent)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-bold text-blue-700 border-blue-200 bg-blue-50/50"
                          onClick={() => setHistoryCustomer(customer)}
                        >
                          <History className="h-3 w-3 mr-1" />
                          <span>Bills</span>
                        </Button>

                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id, customer.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? "Gahak Record Tabdeel Karein" : "Naya Gahak Shamil Karein"}
        description="Gahak ka naam, phone number aur motorcycle ki details darj karein"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Gahak Ka Naam *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Tariq Mehmood"
          />

          <Input
            label="Mobile Phone Number *"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0300-1234567"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motorcycle Model *
              </label>
              <select
                value={formData.bikeModel}
                onChange={(e) => setFormData({ ...formData, bikeModel: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="Honda CD 70">Honda CD 70</option>
                <option value="Honda CG 125">Honda CG 125</option>
                <option value="Honda Pridor 100">Honda Pridor 100</option>
                <option value="Yamaha YBR 125">Yamaha YBR 125</option>
                <option value="Suzuki GS 150">Suzuki GS 150</option>
                <option value="Road Prince 70">Road Prince 70</option>
                <option value="United 70">United 70</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Input
              label="Bike Reg # (Number Plate)"
              value={formData.bikeRegNumber}
              onChange={(e) => setFormData({ ...formData, bikeRegNumber: e.target.value })}
              placeholder="e.g. KHI-8291"
            />
          </div>

          <Input
            label="Address / Area (Optional)"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g. Saddar, Karachi"
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              {editingCustomer ? "Update Karein" : "Save Karein"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Past Bills History Modal */}
      <Modal
        isOpen={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
        title={`Gahak Ka Hisab: ${historyCustomer?.name || ""}`}
        description={`Motorcycle: ${historyCustomer?.bikeModel || ""} (${historyCustomer?.bikeRegNumber || "No Reg #"})`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Phone:</span>{" "}
              <span className="font-bold text-slate-800">{historyCustomer?.phone}</span>
            </div>
            <div>
              <span className="text-slate-500">Kul Kharidari:</span>{" "}
              <span className="font-black text-emerald-600">
                {formatPKR(historyCustomer?.totalSpent || 0)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
            {customerBills.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Is gahak ka abhi tak koi bill record mein nahi hai.
              </div>
            ) : (
              customerBills.map((bill) => (
                <div
                  key={bill.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700">
                        {bill.billNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{formatDateTime(bill.createdAt)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {bill.items.map((i) => `${i.partName} (${i.quantity})`).join(", ")}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-black text-slate-900">
                        {formatPKR(bill.grandTotal)}
                      </div>
                      <Badge
                        variant={bill.status === "Completed" ? "success" : "danger"}
                        className="text-[9px] py-0"
                      >
                        {bill.status === "Completed" ? "Ada Shuda" : "Mansookh"}
                      </Badge>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSelectedBillForPrint(bill)}
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        bill={selectedBillForPrint}
        isOpen={!!selectedBillForPrint}
        onClose={() => setSelectedBillForPrint(null)}
      />
    </div>
  );
}
