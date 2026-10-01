"use client";

import React, { useState } from "react";
import {
  Users,
  Plus,
  Search,
  DollarSign,
  Wallet,
  TrendingUp,
  Percent,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  FileText,
  Phone,
  Wrench,
  CheckCircle2,
  Trash2,
  Edit,
  Clock,
  Bike,
} from "lucide-react";
import { useStore } from "@/lib/storage/context";
import { useLanguage } from "@/lib/i18n/context";
import { Mechanic, MechanicLedgerEntry } from "@/types";
import { formatPKR, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

export default function MechanicsPage() {
  const {
    mechanics,
    mechanicLedger,
    addMechanic,
    updateMechanic,
    deleteMechanic,
    recordMechanicPayout,
  } = useStore();
  const { t, isUrdu } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMechanicForLedger, setSelectedMechanicForLedger] = useState<Mechanic | null>(null);
  const [selectedMechanicForPayout, setSelectedMechanicForPayout] = useState<Mechanic | null>(null);

  // New Mechanic Modal
  const [isAddMechanicModalOpen, setIsAddMechanicModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("General Tuning & Engine");
  const [defaultShopCutPercentage, setDefaultShopCutPercentage] = useState<number>(30);
  const [addError, setAddError] = useState("");

  // Edit Mechanic Modal State
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editShopCut, setEditShopCut] = useState<number>(30);
  const [editError, setEditError] = useState("");

  const handleOpenEditMechanic = (mech: Mechanic) => {
    setEditingMechanic(mech);
    setEditName(mech.name);
    setEditPhone(mech.phone);
    setEditSpecialty(mech.specialty || "");
    setEditShopCut(mech.defaultShopCutPercentage || 30);
    setEditError("");
  };

  const handleEditMechanicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMechanic) return;
    if (!editName.trim()) {
      setEditError("Mechanic ka naam likhna zaroori hai.");
      return;
    }
    try {
      await updateMechanic(editingMechanic.id, {
        name: editName.trim(),
        phone: editPhone.trim() || "0300-0000000",
        specialty: editSpecialty.trim() || undefined,
        defaultShopCutPercentage: Number(editShopCut) || 30,
      });
      setEditingMechanic(null);
    } catch (err: any) {
      setEditError(err.message || "Mechanic update karne mein masla aaya.");
    }
  };

  const handleDeleteMechanic = async (id: string, mechName: string) => {
    if (confirm(`Kya aap waqai mechanic "${mechName}" ko delete karna chahte hain?`)) {
      try {
        await deleteMechanic(id);
      } catch (err: any) {
        alert(err.message || "Delete karne mein masla aaya.");
      }
    }
  };

  // Payout Modal
  const [payoutAmount, setPayoutAmount] = useState<number | "">("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutError, setPayoutError] = useState("");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  // Submit New Mechanic
  const handleAddMechanicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!name.trim()) {
      setAddError("Mechanic ka naam likhna zaroori hai.");
      return;
    }

    try {
      await addMechanic({
        name: name.trim(),
        phone: phone.trim() || "0300-0000000",
        specialty: specialty.trim() || undefined,
        defaultShopCutPercentage: Number(defaultShopCutPercentage) || 30,
      });
      setIsAddMechanicModalOpen(false);
      setName("");
      setPhone("");
      setSpecialty("General Tuning & Engine");
      setDefaultShopCutPercentage(30);
    } catch (err: any) {
      setAddError(err.message || "Mechanic add karne mein masla aaya.");
    }
  };

  // Submit Payout
  const handleRecordPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMechanicForPayout) return;
    setPayoutError("");

    const amt = Number(payoutAmount);
    if (!amt || amt <= 0) {
      setPayoutError("Ada ki jane wali raqam darj karein.");
      return;
    }

    setPayoutSubmitting(true);
    try {
      await recordMechanicPayout(
        selectedMechanicForPayout.id,
        amt,
        payoutNotes.trim() || undefined
      );
      setSelectedMechanicForPayout(null);
      setPayoutAmount("");
      setPayoutNotes("");
    } catch (err: any) {
      setPayoutError(err.message || "Payout record karne mein masla aaya.");
    } finally {
      setPayoutSubmitting(false);
    }
  };

  // Calculate stats for a single mechanic
  const getMechanicFinancials = (mech: Mechanic) => {
    const entries = mechanicLedger.filter(
      (e) =>
        e.mechanicId === mech.id ||
        e.mechanicName.toLowerCase() === mech.name.toLowerCase()
    );
    const totalLaborBilled = entries
      .filter((e) => e.type === "earning")
      .reduce((acc, e) => acc + (e.totalLaborAmount || 0), 0);
    const totalShopCut = entries
      .filter((e) => e.type === "earning")
      .reduce((acc, e) => acc + (e.shopAmount || 0), 0);
    const totalMechEarned = entries
      .filter((e) => e.type === "earning")
      .reduce((acc, e) => acc + (e.mechanicAmount || 0), 0);
    const totalPayouts = entries
      .filter((e) => e.type === "payout")
      .reduce((acc, e) => acc + (e.mechanicAmount || 0), 0);
    const currentBalance = totalMechEarned - totalPayouts;

    return {
      entries,
      totalLaborBilled,
      totalShopCut,
      totalMechEarned,
      totalPayouts,
      currentBalance,
    };
  };

  // Overall Global Stats
  const globalTotalLabor = mechanicLedger
    .filter((e) => e.type === "earning")
    .reduce((acc, e) => acc + (e.totalLaborAmount || 0), 0);
  const globalShopProfit = mechanicLedger
    .filter((e) => e.type === "earning")
    .reduce((acc, e) => acc + (e.shopAmount || 0), 0);
  const globalPaidOut = mechanicLedger
    .filter((e) => e.type === "payout")
    .reduce((acc, e) => acc + (e.mechanicAmount || 0), 0);
  const globalPayableBalance = mechanics.reduce((acc, m) => {
    const { currentBalance } = getMechanicFinancials(m);
    return acc + Math.max(0, currentBalance);
  }, 0);

  // Filtered Mechanics List
  const filteredMechanics = mechanics.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q) ||
      (m.specialty && m.specialty.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
                <Users className="h-6 w-6" />
              </span>
              {t.mechanicsTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
              {isUrdu ? "میکینک کھاتہ و کمیشن" : "Labour & Commission"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.mechanicsSubtitle}
          </p>
        </div>

        <Button
          onClick={() => setIsAddMechanicModalOpen(true)}
          size="lg"
          className="gap-2 font-black shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="h-5 w-5" />
          + {t.addNewMechanic}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Kul Labour Billed
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {formatPKR(globalTotalLabor)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <Wrench className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Shop Malik Hissa (%)
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">
              {formatPKR(globalShopProfit)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Percent className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Ada Shuda (Payouts)
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
              {formatPKR(globalPaidOut)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white border border-amber-600 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-amber-100 uppercase tracking-wider">
              Wajib-ul-Ada Baqaya (Payable)
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {formatPKR(globalPayableBalance)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Mechanic ka naam, phone ya hunar search karein..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <span className="text-xs font-bold text-slate-500 hidden sm:inline">
          Kul Mechanics: <strong className="text-slate-800">{mechanics.length}</strong>
        </span>
      </div>

      {/* Mechanics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMechanics.map((mech) => {
          const { totalLaborBilled, totalShopCut, totalMechEarned, totalPayouts, currentBalance, entries } =
            getMechanicFinancials(mech);

          return (
            <div
              key={mech.id}
              className="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg">
                    {mech.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                      {mech.name}
                    </h3>
                    <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                      {mech.specialty || "Mechanic"}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {mech.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                    Shop: {mech.defaultShopCutPercentage}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditMechanic(mech)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                    title="Mechanic Edit Karein"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMechanic(mech.id, mech.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Mechanic Delete Karein"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Financial Stats */}
              <div className="p-5 space-y-3 bg-slate-50/50 flex-1">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Mechanic Earning
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      {formatPKR(totalMechEarned)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Shop Malik Cut
                    </span>
                    <span className="font-black text-blue-600 text-sm">
                      {formatPKR(totalShopCut)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white border border-slate-200/60">
                  <span className="text-slate-500 font-medium">Ada Shuda (Payouts):</span>
                  <span className="font-bold text-emerald-700">{formatPKR(totalPayouts)}</span>
                </div>

                <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100">
                  <span className="text-indigo-900 font-bold uppercase tracking-wider text-[11px]">
                    Wajib-ul-Ada Baqaya:
                  </span>
                  <span
                    className={`font-black text-sm ${
                      currentBalance > 0
                        ? "text-rose-600"
                        : currentBalance < 0
                        ? "text-amber-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {formatPKR(currentBalance)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setSelectedMechanicForLedger(mech)}
                  variant="secondary"
                  size="sm"
                  className="text-xs font-bold gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  Khata / Ledger ({entries.length})
                </Button>

                <Button
                  onClick={() => {
                    setSelectedMechanicForPayout(mech);
                    setPayoutAmount(currentBalance > 0 ? currentBalance : "");
                    setPayoutNotes("");
                    setPayoutError("");
                  }}
                  variant="primary"
                  size="sm"
                  className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Ujrat Ada Karein
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL 1: Naya Mechanic Add Karein --- */}
      <Modal
        isOpen={isAddMechanicModalOpen}
        onClose={() => setIsAddMechanicModalOpen(false)}
        title="Naya Mechanic / Ustad Shamil Karein"
        description="Shop ke mechanic ka naam aur shop malik ka default commission percentage set karein"
        maxWidth="md"
      >
        <form onSubmit={handleAddMechanicSubmit} className="space-y-4">
          {addError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {addError}
            </div>
          )}

          <Input
            label="Mechanic Ka Naam (Ustad) *"
            placeholder="e.g. Ustad Rashid ya Tariq Auto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="text-xs"
          />

          <Input
            label="Phone Number (رابطہ نمبر)"
            placeholder="0300-1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="text-xs font-mono"
          />

          <Input
            label="Specialty / Hunar (e.g. Engine Overhaul, Wiring, Brakes)"
            placeholder="e.g. Engine Master & Tuning"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="text-xs"
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Shop Malik Ka Default Commission (%) *
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={defaultShopCutPercentage}
                onChange={(e) => setDefaultShopCutPercentage(Number(e.target.value))}
                required
                className="w-full h-10 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Misaal ke tor par: 30% likhne par har 1,000 rupay labour mein se 300 dukan malik ka aur 700 mechanic ka hoga.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setIsAddMechanicModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="font-bold gap-2 bg-indigo-600 hover:bg-indigo-700">
              <CheckCircle2 className="h-4 w-4" />
              Mechanic Save Karein
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 1B: Mechanic Record Edit Karein --- */}
      <Modal
        isOpen={Boolean(editingMechanic)}
        onClose={() => setEditingMechanic(null)}
        title={`Mechanic Update Karein — ${editingMechanic?.name}`}
        description="Mechanic ki details aur shop cut percentage tabdeel karein"
        maxWidth="md"
      >
        <form onSubmit={handleEditMechanicSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {editError}
            </div>
          )}

          <Input
            label="Mechanic Ka Naam (Ustad) *"
            placeholder="e.g. Ustad Rashid"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            className="text-xs"
          />

          <Input
            label="Phone Number (رابطہ نمبر)"
            placeholder="0300-1234567"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            className="text-xs font-mono"
          />

          <Input
            label="Specialty / Hunar"
            placeholder="e.g. Engine Master & Tuning"
            value={editSpecialty}
            onChange={(e) => setEditSpecialty(e.target.value)}
            className="text-xs"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Shop Malik Commission Cut (% فی صد) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={editShopCut}
                onChange={(e) => setEditShopCut(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                %
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setEditingMechanic(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="font-bold gap-2 bg-indigo-600 hover:bg-indigo-700">
              <CheckCircle2 className="h-4 w-4" />
              Tabdeeli Mahfooz Karein
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: Ujrat Ada Karein (Record Payout) --- */}
      <Modal
        isOpen={Boolean(selectedMechanicForPayout)}
        onClose={() => setSelectedMechanicForPayout(null)}
        title={`Ujrat / Advance Ada Karein — ${selectedMechanicForPayout?.name}`}
        description="Mechanic ko cash payment ya rozana advance record karein taake baqaya update ho saky"
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayoutSubmit} className="space-y-4">
          {payoutError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {payoutError}
            </div>
          )}

          {selectedMechanicForPayout && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs">
              <span className="font-bold text-amber-900">Filhal Kul Baqaya:</span>
              <span className="font-black text-amber-950 text-sm">
                {formatPKR(getMechanicFinancials(selectedMechanicForPayout).currentBalance)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ada Ki Gayi Raqam (Cash Rs.) *
            </label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 1500"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value === "" ? "" : Number(e.target.value))}
              required
              className="w-full h-11 px-3 text-sm bg-white border border-slate-200 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Adaigi Ki Waja / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Daily cash payment, Saturday weekly hisab, Advance..."
              value={payoutNotes}
              onChange={(e) => setPayoutNotes(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setSelectedMechanicForPayout(null)}
              disabled={payoutSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={payoutSubmitting}
              className="font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Raqam Ada Karein & Khata Update
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: Mechanic Full Ledger Modal & Printable Statement --- */}
      <Modal
        isOpen={Boolean(selectedMechanicForLedger)}
        onClose={() => setSelectedMechanicForLedger(null)}
        title={`Mukammal Khata (Ledger Statement) — ${selectedMechanicForLedger?.name}`}
        description="Tamam bills, labour hissa, shop commission aur ada shuda raqam ki tafseel"
        maxWidth="3xl"
      >
        {selectedMechanicForLedger && (() => {
          const { entries, totalLaborBilled, totalShopCut, totalMechEarned, totalPayouts, currentBalance } =
            getMechanicFinancials(selectedMechanicForLedger);

          return (
            <div className="space-y-4">
              {/* Printable Area */}
              <div id="mechanic-ledger-slip" className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 space-y-4">
                {/* Header for Print */}
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900">
                    GILANI AUTOS — MECHANIC KHATA
                  </h2>
                  <p className="text-xs font-bold text-indigo-700">
                    Mechanic: {selectedMechanicForLedger.name} ({selectedMechanicForLedger.phone})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Hunar: {selectedMechanicForLedger.specialty || "Auto Mechanic"} • Default Shop Commission: {selectedMechanicForLedger.defaultShopCutPercentage}%
                  </p>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Kul Labour Billed</span>
                    <span className="font-black text-slate-800">{formatPKR(totalLaborBilled)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Shop Malik Hissa</span>
                    <span className="font-black text-blue-700">{formatPKR(totalShopCut)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Mechanic Hissa</span>
                    <span className="font-black text-emerald-700">{formatPKR(totalMechEarned)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Wajib Baqaya</span>
                    <span className="font-black text-rose-600">{formatPKR(currentBalance)}</span>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600 bg-slate-100/70">
                        <th className="p-2">Date / Waqt</th>
                        <th className="p-2">Bill / Gari</th>
                        <th className="p-2">Kaam (Description)</th>
                        <th className="p-2 text-right">Total Labour</th>
                        <th className="p-2 text-right">Shop Cut</th>
                        <th className="p-2 text-right">Mechanic Credit</th>
                        <th className="p-2 text-right">Payout Debit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                            Filhal is mechanic ka koi transaction record nahi hai.
                          </td>
                        </tr>
                      ) : (
                        entries.map((entry) => {
                          const isEarning = entry.type === "earning";
                          return (
                            <tr key={entry.id} className={isEarning ? "hover:bg-slate-50" : "bg-emerald-50/40"}>
                              <td className="p-2 text-[11px] text-slate-500 whitespace-nowrap">
                                {formatDateTime(entry.date)}
                              </td>
                              <td className="p-2 font-bold text-slate-800">
                                <div>{entry.billNumber || "Direct"}</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {entry.vehicleDetails || entry.customerName || "-"}
                                </div>
                              </td>
                              <td className="p-2 text-slate-700">
                                <div>{entry.laborDescription || entry.notes}</div>
                                {entry.notes && entry.laborDescription && (
                                  <div className="text-[10px] text-slate-400">{entry.notes}</div>
                                )}
                              </td>
                              <td className="p-2 text-right font-medium text-slate-700">
                                {isEarning ? `Rs. ${entry.totalLaborAmount}` : "-"}
                              </td>
                              <td className="p-2 text-right text-blue-700 font-semibold">
                                {isEarning ? `Rs. ${entry.shopAmount} (${entry.shopPercentage}%)` : "-"}
                              </td>
                              <td className="p-2 text-right font-black text-indigo-900">
                                {isEarning ? `+Rs. ${entry.mechanicAmount}` : "-"}
                              </td>
                              <td className="p-2 text-right font-black text-rose-600">
                                {!isEarning ? `-Rs. ${entry.mechanicAmount}` : "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 no-print">
                <Button variant="secondary" onClick={() => setSelectedMechanicForLedger(null)}>
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const m = selectedMechanicForLedger;
                      setSelectedMechanicForLedger(null);
                      setSelectedMechanicForPayout(m);
                      setPayoutAmount(currentBalance > 0 ? currentBalance : "");
                    }}
                    className="font-bold text-xs"
                  >
                    <Wallet className="h-4 w-4 mr-1 text-emerald-600" />
                    Ujrat Ada Karein
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => window.print()}
                    className="font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Printer className="h-4 w-4" />
                    Print Khata Slip
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
