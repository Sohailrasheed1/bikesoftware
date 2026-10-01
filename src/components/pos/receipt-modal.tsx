"use client";

import React, { useState } from "react";
import { Bill } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Printer, FileText, CheckCircle2, MessageCircle } from "lucide-react";
import { formatPKR, formatDateTime } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

interface ReceiptModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ bill, isOpen, onClose }: ReceiptModalProps) {
  const [copyType, setCopyType] = useState<"customer" | "shop">("customer");
  const [format, setFormat] = useState<"thermal" | "standard">("thermal");
  const { t, isUrdu } = useLanguage();

  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    let phone = bill.customerPhone ? bill.customerPhone.replace(/[^0-9]/g, "") : "";
    if (phone.startsWith("0")) {
      phone = "92" + phone.slice(1);
    } else if (!phone.startsWith("92") && phone.length === 10) {
      phone = "92" + phone;
    }

    const itemsSummary = bill.items
      .map((it) => `• ${it.partName} x${it.quantity} = Rs. ${it.totalPrice}`)
      .join("\n");
    const labourSummary =
      bill.labourItems && bill.labourItems.length > 0
        ? "\n*Labour/Ujrat:*\n" +
          bill.labourItems.map((l) => `• ${l.description} = Rs. ${l.amount}`).join("\n")
        : "";

    const text =
      `*${t.appName} — Receipt #${bill.billNumber}*\n` +
      `Date: ${formatDateTime(bill.createdAt)}\n` +
      `Customer: ${bill.customerName || "Walk-in Customer"}\n` +
      (bill.bikeModel ? `Bike: ${bill.bikeModel} (${bill.bikeRegNumber || ""})\n` : "") +
      `------------------------\n` +
      `*Saman (Parts):*\n${itemsSummary}` +
      `${labourSummary}\n` +
      `------------------------\n` +
      (bill.discount > 0 ? `Discount: -Rs. ${bill.discount}\n` : "") +
      `*Grand Total: Rs. ${bill.grandTotal}*\n` +
      `Payment: ${bill.paymentMethod} (Paid: Rs. ${bill.paidAmount})\n\n` +
      `Thank you for visiting Gilani Autos, Karachi!\n` +
      `Ph: 0300-1234567`;

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isUrdu ? "بل و رسید پرنٹ کریں" : "Bill Parchi Print Karein"}
      description={
        isUrdu
          ? "تھرمل 80 ملی میٹر پرنٹر یا عام A4 پرنٹر سے پرچی نکالیں"
          : "Thermal 80mm ya Standard A4 printer se parchi print karein"
      }
      maxWidth={format === "thermal" ? "md" : "2xl"}
    >
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              {isUrdu ? "کاپی:" : "Copy:"}
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setCopyType("customer")}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  copyType === "customer"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.customerCopy}
              </button>
              <button
                type="button"
                onClick={() => setCopyType("shop")}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  copyType === "shop"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.shopCopy}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">
              {isUrdu ? "سائز:" : "Format:"}
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setFormat("thermal")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  format === "thermal"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.thermalSlip}
              </button>
              <button
                type="button"
                onClick={() => setFormat("standard")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  format === "standard"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.a4Invoice}
              </button>
            </div>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div
          id="printable-area"
          className={`printable-receipt mx-auto bg-white p-6 shadow-sm border border-slate-200 text-slate-900 ${
            format === "thermal"
              ? "max-w-[340px] rounded-lg text-xs leading-tight font-mono"
              : "w-full rounded-xl text-sm"
          }`}
        >
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <div className="text-lg font-black tracking-tight text-slate-900">
              {t.appName}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
              {isUrdu
                ? "موٹر سائیکل اسپیئر پارٹس، آئل و مکینک ورکشاپ"
                : "Motorcycle Spare Parts, Oil & Mechanic Workshop"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Main Market, Karachi • Ph: 0300-1234567 / 0321-7654321
            </div>

            <div className="mt-2 inline-block px-2.5 py-0.5 rounded border border-slate-400 text-[10px] font-bold uppercase tracking-wider">
              {copyType === "customer" ? t.customerCopy : t.shopCopy}
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="py-2.5 border-b border-dashed border-slate-300 grid grid-cols-2 gap-1 text-[11px]">
            <div>
              <span className="text-slate-500 font-semibold">{t.billNumber}: </span>
              <span className="font-bold text-slate-900">{bill.billNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">{t.date}: </span>
              <span className="font-semibold text-slate-800">
                {formatDateTime(bill.createdAt)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">{t.customerName}: </span>
              <span className="font-bold text-slate-900">
                {bill.customerName || (isUrdu ? "عام گاہک" : "Cash Customer")}
              </span>
            </div>
            {bill.customerPhone && (
              <div className="text-right">
                <span className="text-slate-500">{t.phone}: </span>
                <span className="font-semibold text-slate-800">
                  {bill.customerPhone}
                </span>
              </div>
            )}
            {bill.bikeModel && (
              <div className="col-span-2 pt-1 border-t border-dotted border-slate-200 flex justify-between">
                <span>
                  <strong className="text-slate-600">{t.bikeModel}: </strong>
                  {bill.bikeModel}
                </span>
                {bill.bikeRegNumber && (
                  <span>
                    <strong className="text-slate-600">{t.bikeRegNumber}: </strong>
                    <span className="font-mono font-bold">{bill.bikeRegNumber}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Parts Itemized Table */}
          <div className="py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {t.partsInBill}
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600">
                  <th className="py-1">{isUrdu ? "سامان" : "Item"}</th>
                  <th className="py-1 text-center">{isUrdu ? "تعداد" : "Qty"}</th>
                  <th className="py-1 text-right">{isUrdu ? "قیمت" : "Rate"}</th>
                  <th className="py-1 text-right">{isUrdu ? "ٹوٹل" : "Total"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {bill.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 pr-1 font-semibold text-slate-800">
                      <div>{item.partName}</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {item.category}
                      </div>
                    </td>
                    <td className="py-1.5 text-center font-bold text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 text-right text-slate-600">
                      {item.unitPrice}
                    </td>
                    <td className="py-1.5 text-right font-bold text-slate-900">
                      {item.totalPrice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Labour / Service Charges Table if any */}
          {bill.labourItems && bill.labourItems.length > 0 && (
            <div className="py-2 border-t border-dashed border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1 flex items-center justify-between">
                <span>{t.labourInBill}</span>
                {copyType === "shop" && (
                  <span className="text-[9px] text-slate-500 font-normal">
                    ({isUrdu ? "دکان کا کمیشن شامل ہے" : "Shop % included"})
                  </span>
                )}
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600">
                    <th className="py-1">{isUrdu ? "کام کی تفصیل" : "Work"}</th>
                    <th className="py-1 text-center">{isUrdu ? "میکینک" : "Mechanic"}</th>
                    <th className="py-1 text-right">{isUrdu ? "اجرت" : "Charges"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {bill.labourItems.map((lbr, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 pr-1">
                        <div className="font-semibold text-slate-800 leading-snug">
                          {lbr.description}
                        </div>
                        {copyType === "shop" && (
                          <div className="text-[9px] text-blue-600 font-medium">
                            Dukan: {lbr.shopCutPercentage}% (Rs. {lbr.shopShare}) • Mech: Rs. {lbr.mechanicShare}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-center font-medium text-slate-700">
                        {lbr.mechanicName || "Workshop"}
                      </td>
                      <td className="py-1.5 text-right font-bold text-slate-900">
                        {lbr.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
            {bill.labourItems && bill.labourItems.length > 0 && (
              <>
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>{isUrdu ? "کل سامان:" : "Parts Total:"}</span>
                  <span>{formatPKR(bill.items.reduce((acc, i) => acc + i.totalPrice, 0))}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>{isUrdu ? "کل مزدوری:" : "Labour Total:"}</span>
                  <span>{formatPKR(bill.labourItems.reduce((acc, l) => acc + l.amount, 0))}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>{t.subtotal}:</span>
              <span>{formatPKR(bill.subtotal)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>{t.discount}:</span>
                <span>-{formatPKR(bill.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>{t.grandTotal}:</span>
              <span>{formatPKR(bill.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 pt-0.5">
              <span>{t.paymentMethod}:</span>
              <span className="font-bold text-slate-800">{bill.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>{t.paid}:</span>
              <span className="font-bold text-emerald-700">{formatPKR(bill.paidAmount)}</span>
            </div>
          </div>

          {/* Urdu / English Shop Policy Footer */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center space-y-1 text-[10px] text-slate-500">
            <p className="font-bold text-slate-800 text-xs">
              {t.shopPolicy}
            </p>
            <p>Goods once sold will not be returned or exchanged without bill.</p>
            <p className="font-bold text-slate-800 pt-1">
              Thank You for Your Business! / شکریہ تشریف آوری
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-200/80 no-print">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            {t.cancel}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleWhatsAppShare}
              className="gap-1.5 font-bold text-xs border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95 transition"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span>{isUrdu ? "واٹس ایپ رسید" : "WhatsApp"}</span>
            </Button>

            <Button
              variant="primary"
              onClick={handlePrint}
              className="gap-2 font-bold shadow-md text-xs active:scale-95 transition"
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
