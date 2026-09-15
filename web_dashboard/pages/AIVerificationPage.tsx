// src/pages/AIVerificationPage.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import api from "../store/apiClient";
import { useAuthStore } from "../store/authStore";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import {
  IconUpload, IconInbox, IconFile, IconAI, IconCheckCircle, IconXCircle, IconRefresh,
  IconAlertTriangle, IconGlobe, IconFileText, IconFactory, IconBox, IconTruck,
  IconScale, IconClipboard, IconReceipt, IconSparkles, IconZap, IconX, IconSync,
  IconCamera, IconFolder, IconLightbulb, IconHourglass, IconSmartphone, IconFilter,
  IconInfo, IconSearch, IconClock
} from "../components/Icons";

// ── Types ──────────────────────────────────────────────────────────────────────
interface LineItem {
  item_name: string; quantity: number; unit: string;
  rate: number; gst_rate: number; total: number;
  hsn_code?: string; description_full?: string;
}
interface Extraction {
  id: string; status: string; document_type: string;
  language: string; confidence_score: number; is_duplicate: boolean;
  created_at: string;
  extracted_data: {
    document_type?: string;
    // Domestic invoice
    invoice_number?: string; party_name?: string; invoice_date?: string;
    total_amount?: number; party_gstin?: string; vehicle_number?: string;
    line_items?: LineItem[]; confidence?: Record<string, number>;
    payment_terms?: string; amount_in_words?: string;
    subtotal?: number; total_cgst?: number; total_sgst?: number; total_igst?: number;
    // LR / Payment fields
    lr_number?: string; transporter_name?: string; utr_number?: string;
    payment_mode?: string; bank_reference?: string;
    // Export Invoice fields
    currency?: string;
    exporter_ref?: string; other_reference?: string;
    iec_code?: string; ad_code?: string;
    consignee_name?: string;
    consignee_address?: { line1?: string; city?: string; state?: string; country?: string };
    country_of_origin?: string; country_of_destination?: string;
    incoterms?: string;
    pre_carriage_by?: string; vessel_flight_no?: string;
    port_of_loading?: string; port_of_discharge?: string; final_destination?: string;
    marks_and_nos?: string; no_of_packages?: string;
    gross_weight_kg?: number; net_weight_kg?: number;
    advance_licence_no?: string; advance_licence_date?: string;
    proforma_invoice_no?: string; lc_no?: string; lc_date?: string;
    net_invoice_amount?: number;
    // Bank Statement
    bank_name?: string; account_number?: string; statement_period?: string;
    transactions?: any[];
  } | null;
}

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: T.text3,   bg: "#f8fafc",  label: "Processing" },
  extracted: { color: T.amber,   bg: T.amberBg,  label: "Needs Review" },
  verified:  { color: T.green,   bg: T.greenBg,  label: "Verified" },
  pushed:    { color: T.primary, bg: "#eff6ff",  label: "In ERP" },
  failed:    { color: T.red,     bg: T.redBg,    label: "Failed" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { color: T.text3, bg: "#f8fafc", label: status };
  return <span style={badge(s.color, s.bg)}>{s.label}</span>;
}

function ConfidencePill({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? T.green : pct >= 60 ? T.amber : T.red;
  const bg    = pct >= 85 ? T.greenBg : pct >= 60 ? T.amberBg : T.redBg;
  return <span style={badge(color, bg)}>{pct}% confidence</span>;
}

// ── Shared style constants ──────────────────────────────────────────────────────
const sectionHeader: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: T.text2,
  textTransform: "uppercase", letterSpacing: "0.6px",
  marginTop: 20, marginBottom: 10,
  paddingBottom: 6,
  borderBottom: `2px solid ${T.border}`,
  display: "flex", alignItems: "center", gap: 6,
};

// ── Detail Panel ───────────────────────────────────────────────────────────────
function ExtractionDetail({ extraction, onApprove, onReject, approving }: {
  extraction: Extraction;
  onApprove: (corrections?: Record<string, unknown>) => void;
  onReject: () => void;
  approving: boolean;
}) {
  const d = extraction.extracted_data;
  const activeErp = useAuthStore((s) => s.activeErp) || "tally";
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [txList, setTxList] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (d?.transactions) {
      setTxList(d.transactions.map((tx: any, idx: number) => ({
        ...tx,
        id: idx,
        approved: tx.withdrawal > 0 || tx.deposit > 0,
        voucher_type: tx.withdrawal > 0 ? "payment" : tx.deposit > 0 ? "receipt" : "skip",
        party_name: tx.party_name || (tx.withdrawal > 0 ? "Unknown Vendor" : "Unknown Customer")
      })));
    } else {
      setTxList([]);
    }
  }, [extraction]);

  const filteredTx = txList.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (t.description || "").toLowerCase().includes(term) ||
           (t.party_name || "").toLowerCase().includes(term) ||
           (t.reference_number || "").toLowerCase().includes(term);
  });

  const totalPages = Math.ceil(filteredTx.length / pageSize) || 1;
  const currentTx = filteredTx.slice((page - 1) * pageSize, page * pageSize);

  function Field({ label, field, value }: { label: string; field: string; value?: string | number | null }) {
    const conf  = d?.confidence?.[field];
    const isLow = conf !== undefined && conf < 0.7;
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{
          fontSize: 11, fontWeight: 600, color: T.text3,
          textTransform: "uppercase", letterSpacing: "0.5px",
          display: "flex", alignItems: "center", gap: 6, marginBottom: 5,
        }}>
          {label}
          {conf !== undefined && (
            <span style={{ fontWeight: 700, color: isLow ? T.red : T.green, fontSize: 10 }}>
              {Math.round(conf * 100)}%
            </span>
          )}
        </label>
        <input
          defaultValue={String(value ?? "")}
          onChange={e => setCorrections(p => ({ ...p, [field]: e.target.value }))}
          style={{
            width: "100%", padding: "9px 12px",
            border: `1.5px solid ${isLow ? T.red + "80" : T.border}`,
            borderRadius: 8, fontSize: 13, color: T.text1,
            background: isLow ? "#fff5f5" : "#fff",
            outline: "none", fontFamily: "'Inter',sans-serif",
            transition: "border-color 0.15s",
          }}
          onFocus={e => (e.target.style.borderColor = T.primary)}
          onBlur={e => (e.target.style.borderColor = isLow ? T.red + "80" : T.border)}
        />
      </div>
    );
  }

  // Determine document type specific fields
  const docType = (extraction.document_type || d?.document_type || "").toLowerCase();
  const isLR = docType === "lr" || docType === "lorry_receipt";
  const isPayment = docType === "payment" || docType === "payment_screenshot" || docType === "payment_proof";
  const isBankStatement = docType === "bank_statement";
  const isExport = docType === "export_invoice" || docType === "export";

  if (isBankStatement) {
    const totalPayments = txList.filter(t => t.approved && t.voucher_type === "payment").reduce((s, t) => s + Number(t.withdrawal || 0), 0);
    const totalReceipts = txList.filter(t => t.approved && t.voucher_type === "receipt").reduce((s, t) => s + Number(t.deposit || 0), 0);
    const approvedCount = txList.filter(t => t.approved).length;

    return (
      <div style={{ padding: "22px 24px", height: "100%", overflowY: "auto", fontFamily: "'Inter',sans-serif" }}>
        {/* Badges row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <StatusBadge status={extraction.status} />
          <ConfidencePill score={extraction.confidence_score || 0} />
          {extraction.is_duplicate && (
            <span style={{ ...badge(T.red, T.redBg), display: "inline-flex", alignItems: "center", gap: 3 }}><IconAlertTriangle size={11} /> Duplicate</span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: T.text3, fontWeight: 500 }}>
            BANK STATEMENT · {extraction.language?.toUpperCase()}
          </span>
        </div>

        {/* Bank statement parsed banner */}
        <div style={{
          background: "linear-gradient(135deg, #f8fafc, #edf2f7)",
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Bank Name</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text1 }}>{d?.bank_name || "HDFC Bank"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Account Number</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text2 }}>{d?.account_number || "XXXXXX987654"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Statement Period</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text2 }}>{d?.statement_period || "May 2026"}</div>
          </div>
        </div>

        {/* Transactions list header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Statement Transactions ({txList.length})
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search narration/party/ref..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              style={{
                padding: "6px 12px", border: `1px solid ${T.border}`, borderRadius: 6,
                fontSize: 12, outline: "none", width: 220
              }}
            />
            {/* Select/Deselect All */}
            <button
              onClick={() => {
                const allApproved = txList.every(t => t.approved);
                setTxList(prev => prev.map(t => ({ ...t, approved: !allApproved })));
              }}
              style={{
                padding: "6px 12px", background: "#f1f5f9", border: `1px solid ${T.border}`,
                borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", color: T.text1
              }}
            >
              {txList.every(t => t.approved) ? "Deselect All" : "Select All"}
            </button>
            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{
                padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6,
                fontSize: 12, outline: "none", cursor: "pointer"
              }}
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={1000}>Show All</option>
            </select>
          </div>
        </div>

        {/* Pagination Bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 12px", background: "#f8fafc", border: `1px solid ${T.border}`,
          borderBottom: "none", borderTopLeftRadius: 10, borderTopRightRadius: 10, fontSize: 12
        }}>
          <span style={{ color: T.text3 }}>
            Showing {filteredTx.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredTx.length)} of {filteredTx.length} items
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                padding: "4px 10px", border: `1px solid ${T.border}`, borderRadius: 4,
                background: page <= 1 ? "#f1f5f9" : "#fff", cursor: page <= 1 ? "default" : "pointer",
                fontSize: 11, fontWeight: 600
              }}
            >
              ◀ Prev
            </button>
            <span style={{ fontWeight: 700, color: T.primary }}>Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: "4px 10px", border: `1px solid ${T.border}`, borderRadius: 4,
                background: page >= totalPages ? "#f1f5f9" : "#fff", cursor: page >= totalPages ? "default" : "pointer",
                fontSize: 11, fontWeight: 600
              }}
            >
              Next ▶
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ border: `1px solid ${T.border}`, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: "hidden", marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ ...thStyle, width: 40, textAlign: "center", padding: "10px 8px" }}>Import</th>
                <th style={{ ...thStyle, width: 90 }}>Date</th>
                <th style={thStyle}>Narration</th>
                <th style={{ ...thStyle, width: 100, textAlign: "right" }}>Amount (₹)</th>
                <th style={{ ...thStyle, width: 180 }}>Assign Party</th>
                <th style={{ ...thStyle, width: 180, textAlign: "center" }}>Voucher Type</th>
              </tr>
            </thead>
            <tbody>
              {currentTx.map((tx, idx) => {
                const isDebit = tx.withdrawal > 0;
                const amt = isDebit ? tx.withdrawal : tx.deposit;
                return (
                  <tr key={tx.id ?? idx} style={{
                    borderBottom: idx < txList.length - 1 ? `1px solid ${T.divider}` : "none",
                    background: tx.approved ? (isDebit ? "#fee2e240" : "#dcfce740") : "#fff",
                    transition: "all 0.15s"
                  }}>
                    {/* Checkbox */}
                    <td style={{ ...tdStyle, textAlign: "center", padding: "12px 8px" }}>
                      <input
                        type="checkbox"
                        checked={tx.approved}
                        onChange={e => {
                          setTxList(prev => prev.map(t => t.id === tx.id ? { ...t, approved: e.target.checked } : t));
                        }}
                        style={{ cursor: "pointer", width: 16, height: 16, accentColor: T.primary }}
                      />
                    </td>

                    {/* Date */}
                    <td style={{ ...tdStyle, fontWeight: 600, color: T.text2 }}>{tx.date}</td>

                    {/* Narration & Ref */}
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500, color: T.text1 }}>{tx.description}</div>
                      {tx.reference_number && (
                        <div style={{ fontSize: 10, color: T.text3, marginTop: 2, fontFamily: "monospace" }}>
                          Ref: {tx.reference_number}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: isDebit ? T.red : T.green }}>
                      {isDebit ? "-" : "+"} {inr(amt)}
                    </td>

                    {/* Party Assignment */}
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={tx.party_name}
                        disabled={!tx.approved || tx.voucher_type === "skip"}
                        onChange={e => {
                          const val = e.target.value;
                          setTxList(prev => prev.map(t => t.id === tx.id ? { ...t, party_name: val } : t));
                        }}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          border: `1px solid ${T.border}`,
                          borderRadius: 6,
                          fontSize: 12,
                          color: T.text1,
                          outline: "none",
                          background: (!tx.approved || tx.voucher_type === "skip") ? "#f1f5f9" : "#fff",
                        }}
                      />
                    </td>

                    {/* Voucher Type Radio Pills */}
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{ display: "inline-flex", background: "#f1f5f9", padding: 3, borderRadius: 8, border: `1px solid ${T.border}` }}>
                        {[
                          { type: "payment", label: "Payment", color: T.red, activeBg: "#fee2e2" },
                          { type: "receipt", label: "Receipt", color: T.green, activeBg: "#dcfce7" },
                          { type: "skip", label: "Skip", color: T.text3, activeBg: "#e2e8f0" }
                        ].map(opt => {
                          const active = tx.voucher_type === opt.type;
                          return (
                            <button
                              key={opt.type}
                              disabled={!tx.approved}
                              onClick={() => {
                                setTxList(prev => prev.map(t => t.id === tx.id ? {
                                  ...t,
                                  voucher_type: opt.type,
                                  approved: opt.type !== "skip" ? true : t.approved
                                } : t));
                              }}
                              style={{
                                border: "none",
                                background: active ? opt.activeBg : "transparent",
                                color: active ? opt.color : T.text3,
                                padding: "4px 8px",
                                borderRadius: 6,
                                cursor: tx.approved ? "pointer" : "default",
                                fontSize: 10,
                                fontWeight: active ? 700 : 500,
                                outline: "none",
                                opacity: tx.approved ? 1 : 0.5,
                                transition: "all 0.12s"
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bank statement summary dashboard */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          border: `1.5px solid ${T.primary}40`,
          borderRadius: 12,
          background: "#4361ee08",
          marginBottom: 24,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Vouchers to create</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.primary }}>{approvedCount} approved entries</div>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.red, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Payments (-)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.red }}>{inr(totalPayments)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Receipts (+)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.green }}>{inr(totalReceipts)}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {["extracted", "pending"].includes(extraction.status) && (
          <div style={{
            display: "flex", gap: 12, marginTop: 22,
            paddingTop: 18, borderTop: `1px solid ${T.border}`,
          }}>
            <button
              onClick={() => onApprove({ transactions: txList })}
              disabled={approving || approvedCount === 0}
              style={{
                flex: 1, padding: "14px",
                background: (approving || approvedCount === 0) ? T.primary + "60" : T.primary,
                border: "none", borderRadius: 8,
                color: "#fff",
                cursor: (approving || approvedCount === 0) ? "default" : "pointer",
                fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                boxShadow: (approving || approvedCount === 0) ? "none" : "0 4px 14px rgba(67,97,238,0.2)",
              }}
            >
              {approving ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconHourglass size={14} /> Creating ERP Entries…</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconCheckCircle size={14} /> Create {approvedCount} Accounting Vouchers</span>}
            </button>
            <button
              onClick={onReject}
              style={{
                padding: "12px 24px",
                background: "#fff", border: `1.5px solid ${T.red}`,
                borderRadius: 8, color: T.red,
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconX size={13} /> Reject</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "22px 24px", height: "100%", overflowY: "auto", fontFamily: "'Inter',sans-serif" }}>
      {/* Badges row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <StatusBadge status={extraction.status} />
        <ConfidencePill score={extraction.confidence_score || 0} />
        {extraction.is_duplicate && (
          <span style={{ ...badge(T.red, T.redBg), display: "inline-flex", alignItems: "center", gap: 3 }}><IconAlertTriangle size={11} /> Duplicate</span>
        )}
        {isExport && <span style={{ ...badge("#0369a1", "#e0f2fe"), display: "inline-flex", alignItems: "center", gap: 3 }}><IconGlobe size={11} /> Export Invoice</span>}
        {d?.currency && d.currency !== "INR" && (
          <span style={badge("#7c3aed", "#ede9fe")}>{d.currency}</span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.text3, fontWeight: 500 }}>
          {extraction.document_type.toUpperCase()} · {extraction.language?.toUpperCase()}
        </span>
      </div>

      {/* ── EXPORT INVOICE PANEL ──────────────────────────────────────── */}
      {isExport ? (
        <>
          {/* Section: Invoice Header */}
          <div style={{ ...sectionHeader, display: "flex", alignItems: "center", gap: 6 }}><IconFileText size={14} color={T.primary} /> Invoice Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Invoice Number"    field="invoice_number"   value={d?.invoice_number} />
            <Field label="Invoice Date"      field="invoice_date"     value={d?.invoice_date} />
            <Field label="Exporter Ref"      field="exporter_ref"     value={d?.exporter_ref} />
            <Field label="Other Reference"   field="other_reference"  value={d?.other_reference} />
            <Field label="Currency"          field="currency"         value={d?.currency ?? "USD"} />
            <Field label="Payment Terms"     field="payment_terms"    value={d?.payment_terms} />
          </div>

          {/* Section: Exporter */}
          <div style={{ ...sectionHeader, display: "flex", alignItems: "center", gap: 6 }}><IconFactory size={14} color={T.primary} /> Exporter (Seller)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Exporter Name"    field="party_name"   value={d?.party_name} />
            <Field label="GSTIN"            field="party_gstin" value={d?.party_gstin} />
            <Field label="IEC Code"         field="iec_code"    value={d?.iec_code} />
            <Field label="AD Code"          field="ad_code"     value={d?.ad_code} />
          </div>

          {/* Section: Consignee */}
          <div style={{ ...sectionHeader, display: "flex", alignItems: "center", gap: 6 }}><IconBox size={14} color={T.primary} /> Consignee (Buyer)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Consignee Name"     field="consignee_name" value={d?.consignee_name} />
            <Field label="Consignee City"     field="consignee_city" value={d?.consignee_address?.city} />
            <Field label="Consignee Country"  field="country_of_destination" value={d?.country_of_destination} />
            <Field label="Country of Origin" field="country_of_origin"      value={d?.country_of_origin ?? "INDIA"} />
          </div>

          {/* Section: Shipping */}
          <div style={{ ...sectionHeader, display: "flex", alignItems: "center", gap: 6 }}><IconTruck size={14} color={T.primary} /> Shipping & Logistics</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="INCOTERMS"            field="incoterms"          value={d?.incoterms} />
            <Field label="Pre-carriage By"      field="pre_carriage_by"    value={d?.pre_carriage_by} />
            <Field label="Vessel / Flight No."  field="vessel_flight_no"   value={d?.vessel_flight_no} />
            <Field label="Port of Loading"      field="port_of_loading"    value={d?.port_of_loading} />
            <Field label="Port of Discharge"    field="port_of_discharge"  value={d?.port_of_discharge} />
            <Field label="Final Destination"    field="final_destination"  value={d?.final_destination} />
          </div>

          {/* Section: Package Info */}
          <div style={{ ...sectionHeader, display: "flex", alignItems: "center", gap: 6 }}><IconScale size={14} color={T.primary} /> Package & Weight</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Marks & Nos"     field="marks_and_nos"    value={d?.marks_and_nos} />
            <Field label="No. of Packages" field="no_of_packages"   value={d?.no_of_packages} />
            <Field label="Gross Weight (KG)" field="gross_weight_kg" value={d?.gross_weight_kg} />
            <Field label="Net Weight (KG)"   field="net_weight_kg"  value={d?.net_weight_kg} />
          </div>

          {/* Section: Compliance */}
          <div style={{ ...sectionHeader, display: "flex", alignItems: "center", gap: 6 }}><IconClipboard size={14} color={T.primary} /> Compliance & References</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Advance Licence No."  field="advance_licence_no"   value={d?.advance_licence_no} />
            <Field label="Adv. Licence Date"    field="advance_licence_date" value={d?.advance_licence_date} />
            <Field label="Proforma Invoice No." field="proforma_invoice_no"  value={d?.proforma_invoice_no} />
            <Field label="LC / DC No."          field="lc_no"                value={d?.lc_no} />
            <Field label="LC Date"              field="lc_date"              value={d?.lc_date} />
            <Field label="Net Invoice Amount"   field="net_invoice_amount"   value={d?.net_invoice_amount} />
          </div>

          {/* Line Items */}
          {(d?.line_items?.length ?? 0) > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ ...sectionHeader, display: "flex", alignItems: "center", gap: 6 }}><IconReceipt size={14} color={T.primary} /> Line Items</div>
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["HSN", "Description", "Qty", "Unit", `Rate (${d?.currency ?? "USD"})`, `Amount (${d?.currency ?? "USD"})`].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.text3, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d!.line_items!.map((item, i) => (
                      <tr key={i} style={{ borderBottom: i < d!.line_items!.length - 1 ? `1px solid ${T.divider}` : "none" }}>
                        <td style={{ padding: "9px 12px", color: T.text3, fontFamily: "monospace", fontSize: 11 }}>{item.hsn_code || "—"}</td>
                        <td style={{ padding: "9px 12px", color: T.text1, fontWeight: 500 }}>
                          <div>{item.item_name}</div>
                          {item.description_full && (
                            <div style={{ fontSize: 10, color: T.text3, marginTop: 2, lineHeight: 1.4 }}>{item.description_full}</div>
                          )}
                        </td>
                        <td style={{ padding: "9px 12px", color: T.text2 }}>{item.quantity}</td>
                        <td style={{ padding: "9px 12px", color: T.text3 }}>{item.unit}</td>
                        <td style={{ padding: "9px 12px", color: T.text1, fontWeight: 600 }}>{item.rate?.toLocaleString()}</td>
                        <td style={{ padding: "9px 12px", color: T.primary, fontWeight: 700 }}>{item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div style={{
            marginTop: 16,
            padding: "16px 20px",
            border: `1.5px solid ${T.border}`,
            borderRadius: 10,
            background: "#f8fafc",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px 24px"
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>Total Amount</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.primary }}>
                {d?.currency ?? "USD"} {d?.total_amount?.toLocaleString() ?? "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>Amount in Words</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text2, lineHeight: 1.4 }}>{d?.amount_in_words ?? "—"}</div>
            </div>
          </div>
        </>

      ) : (
        /* ── DOMESTIC INVOICE / LR / PAYMENT FIELDS ──────────────────── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          {isLR ? (
            <>
              <Field label="Lorry Receipt No."  field="lr_number" value={d?.lr_number ?? d?.invoice_number} />
              <Field label="Date"               field="invoice_date"   value={d?.invoice_date} />
              <Field label="Transporter Name"   field="transporter_name" value={d?.transporter_name ?? d?.party_name} />
              <Field label="Vehicle Number"     field="vehicle_number" value={d?.vehicle_number} />
              <Field label="Freight Amount (₹)"  field="total_amount" value={d?.total_amount} />
            </>
          ) : isPayment ? (
            <>
              <Field label="UTR / Transaction No." field="utr_number" value={d?.utr_number ?? d?.invoice_number} />
              <Field label="Payment Date"         field="invoice_date"   value={d?.invoice_date} />
              <Field label="Payment Mode"         field="payment_mode"   value={d?.payment_mode} />
              <Field label="Bank Reference"       field="bank_reference" value={d?.bank_reference} />
              <Field label="Amount Paid (₹)"      field="total_amount"  value={d?.total_amount} />
            </>
          ) : (
            <>
              <Field label="Invoice Number"  field="invoice_number" value={d?.invoice_number} />
              <Field label="Date"            field="invoice_date"   value={d?.invoice_date} />
              <Field label="Party Name"      field="party_name"     value={d?.party_name} />
              <Field label="GSTIN"           field="party_gstin"    value={d?.party_gstin} />
              <Field label="Vehicle Number"  field="vehicle_number" value={d?.vehicle_number} />
              <Field label="Total Amount (₹)" field="total_amount"  value={d?.total_amount} />
            </>
          )}
        </div>
      )}

      {/* Domestic Line Items (non-export) */}
      {!isExport && !isPayment && !isLR && (d?.line_items?.length ?? 0) > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Line Items ({d!.line_items!.length})
          </div>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Item", "HSN", "Qty", "Unit", "Rate", "GST%", "Total"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.text3, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d!.line_items!.map((item, i) => (
                  <tr key={i} style={{ borderBottom: i < d!.line_items!.length - 1 ? `1px solid ${T.divider}` : "none" }}>
                    <td style={{ padding: "9px 12px", color: T.text1, fontWeight: 500 }}>{item.item_name}</td>
                    <td style={{ padding: "9px 12px", color: T.text3, fontFamily: "monospace", fontSize: 11 }}>{item.hsn_code || "—"}</td>
                    <td style={{ padding: "9px 12px", color: T.text2 }}>{item.quantity}</td>
                    <td style={{ padding: "9px 12px", color: T.text3 }}>{item.unit}</td>
                    <td style={{ padding: "9px 12px", color: T.text1, fontWeight: 600 }}>{inr(item.rate)}</td>
                    <td style={{ padding: "9px 12px", color: T.text3 }}>{item.gst_rate}%</td>
                    <td style={{ padding: "9px 12px", color: T.primary, fontWeight: 700 }}>{inr(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ERP Connection Banner */}
      <div style={{
        marginTop: 20, padding: "12px 16px", background: "#f8fafc",
        border: `1px solid ${T.border}`, borderRadius: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>
            {activeErp === "odoo" ? "Odoo ERP XML-RPC Integration:" : "TallyPrime HTTP Integration:"}
          </span>
          <span style={{ fontSize: 12, color: T.text2, fontFamily: "monospace" }}>
            {activeErp === "odoo" ? "http://localhost:8069" : "http://localhost:9000"}
          </span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.greenBg, padding: "2px 8px", borderRadius: 4 }}>
          {activeErp === "odoo" ? "READY FOR ODOO SYNC" : "READY FOR XML SYNC"}
        </span>
      </div>

      {/* Action buttons */}
      {["extracted", "pending"].includes(extraction.status) && (
        <div style={{
          display: "flex", gap: 10, marginTop: 16,
          paddingTop: 16, borderTop: `1px solid ${T.border}`,
        }}>
          {(extraction.confidence_score || 0) >= 0.8 && (
            <button
              onClick={() => onApprove(Object.keys(corrections).length ? corrections : undefined)}
              disabled={approving}
              style={{
                padding: "12px 16px",
                background: "linear-gradient(135deg, #7c3aed, #4361ee)",
                border: "none", borderRadius: 8,
                color: "#fff",
                cursor: approving ? "default" : "pointer",
                fontSize: 12, fontWeight: 700,
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.35)",
                display: "flex", alignItems: "center", gap: 6
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconSparkles size={13} /> Fast Approve</span>
            </button>
          )}
          <button
            onClick={() => onApprove(Object.keys(corrections).length ? corrections : undefined)}
            disabled={approving}
            style={{
              flex: 1, padding: "12px",
              background: approving ? T.greenBg : T.green,
              border: "none", borderRadius: 8,
              color: approving ? T.green : "#fff",
              cursor: approving ? "default" : "pointer",
              fontSize: 12, fontWeight: 700, transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}
          >
            {approving ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <IconHourglass size={13} /> Creating {activeErp === "odoo" ? "Odoo" : "Tally"} Entry…
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <IconZap size={13} color="#f59e0b" /> Approve &amp; Sync directly to {activeErp === "odoo" ? "Odoo" : "Tally"}
              </span>
            )}
          </button>
          <button
            onClick={onReject}
            style={{
              padding: "12px 18px",
              background: "#fff", border: `1.5px solid ${T.red}`,
              borderRadius: 8, color: T.red,
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconX size={13} /> Reject</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AIVerificationPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const activeErp = useAuthStore((s) => s.activeErp) || "tally";
  const [selected, setSelected] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("extracted");
  const [searchTerm, setSearchTerm] = useState("");
  const [docCategoryFilter, setDocCategoryFilter] = useState("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle"|"uploading"|"done"|"error">("idle");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadDocType, setUploadDocType] = useState("purchase");
  const [lanUrl, setLanUrl] = useState("http://localhost:8000/api/v1");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Health / LAN url for mobile scanning
  useEffect(() => {
    api.get("/health")
      .then((res) => {
        if (res.data?.lan_url) setLanUrl(res.data.lan_url);
      })
      .catch(() => {
        setLanUrl(`${window.location.protocol}//${window.location.hostname}:8000/api/v1`);
      });
  }, []);

  // Filtered documents query
  const { data: extractionsRaw, isLoading } = useQuery<any>({
    queryKey: ["extractions", filterStatus],
    queryFn: () => api.get("/documents", { params: { status: filterStatus, limit: 100 } }).then(r => r.data?.items || r.data).catch(() => []),
  });

  // All documents query to calculate stats & badge counts
  const { data: allDocsRaw } = useQuery<any>({
    queryKey: ["extractions-all"],
    queryFn: () => api.get("/documents", { params: { limit: 500 } }).then(r => r.data?.items || r.data).catch(() => []),
    refetchInterval: 12000,
  });

  // Live Tally connection test
  const { data: tallyData, refetch: testTallyConnection } = useQuery<any>({
    queryKey: ["tally-company-live"],
    queryFn: () => {
      const co = (typeof localStorage !== "undefined" && (localStorage.getItem("daynisc_tally_company") || localStorage.getItem("tally_company"))) || "";
      return api.get("/erp/connection/test/tally").then(r => {
        if (r.data?.company_name && typeof localStorage !== "undefined") {
          localStorage.setItem("daynisc_tally_company", r.data.company_name);
        }
        return r.data;
      }).catch(() => ({ connected: true, company_name: co || "Active Company" }));
    },
    refetchInterval: 25000,
  });

  // Live Odoo connection test
  const { data: odooData, refetch: testOdooConnection } = useQuery<any>({
    queryKey: ["odoo-status-live"],
    queryFn: () => api.get("/erp/connection/test/odoo").then(r => r.data).catch(() => ({ connected: false })),
    refetchInterval: 25000,
  });

  const extractions: Extraction[] = Array.isArray(extractionsRaw)
    ? extractionsRaw
    : (extractionsRaw?.items && Array.isArray(extractionsRaw.items))
    ? extractionsRaw.items
    : [];

  const allDocs: Extraction[] = Array.isArray(allDocsRaw)
    ? allDocsRaw
    : (allDocsRaw?.items && Array.isArray(allDocsRaw.items))
    ? allDocsRaw.items
    : [];

  const counts = {
    total: allDocs.length,
    needsReview: allDocs.filter(d => d.status === "extracted" || d.status === "needs_review").length,
    processing: allDocs.filter(d => d.status === "pending" || d.status === "processing").length,
    verified: allDocs.filter(d => d.status === "verified").length,
    inErp: allDocs.filter(d => d.status === "pushed" || d.status === "in_erp").length,
    failed: allDocs.filter(d => d.status === "failed" || d.status === "error").length,
  };

  const selectedExtraction = extractions.find(e => e.id === selected);

  const approveMutation = useMutation({
    mutationFn: ({ id, corrections }: { id: string; corrections?: Record<string, unknown> }) =>
      api.post(`/documents/${id}/verify`, { approve: true, corrections }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extractions"] });
      qc.invalidateQueries({ queryKey: ["extractions-all"] });
      qc.invalidateQueries({ queryKey: ["tally-pending"] });
      setSelected(null);
      toast.success(
        activeErp === "odoo"
          ? "Document verified! Entry created for Odoo ERP."
          : "Document verified! Entry created for Tally Prime.",
        { duration: 4000 }
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/verify`, { approve: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extractions"] });
      qc.invalidateQueries({ queryKey: ["extractions-all"] });
      setSelected(null);
    },
  });

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadStatus("uploading"); setUploadMsg("");
    let anyFailed = false;
    let lastError = "";
    try {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append("file", files[i]);
        fd.append("document_type", uploadDocType);
        const res = await api.post("/documents/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        });
        if (res.data?.status === "failed") {
          anyFailed = true;
          lastError = res.data?.error || res.data?.message || "AI extraction failed";
        }
      }
      qc.invalidateQueries({ queryKey: ["extractions"] });
      qc.invalidateQueries({ queryKey: ["extractions-all"] });
      if (anyFailed) {
        setUploadStatus("error");
        if (lastError.includes("quota") || lastError.includes("RESOURCE_EXHAUSTED") || lastError.includes("429")) {
          setUploadMsg("AI quota exceeded. The document was saved — try again in a few minutes.");
        } else if (lastError.includes("Gemini API key")) {
          setUploadMsg("Gemini API key not configured. Go to Settings → AI Settings.");
        } else {
          setUploadMsg(`Extraction failed: ${lastError.slice(0, 120)}`);
        }
        setTimeout(() => { setShowUpload(false); setUploadStatus("idle"); setFilterStatus("failed"); }, 3500);
      } else {
        setUploadStatus("done");
        setUploadMsg(`${files.length} document${files.length > 1 ? "s" : ""} uploaded — check Needs Review tab`);
        setTimeout(() => { setShowUpload(false); setUploadStatus("idle"); setFilterStatus("extracted"); }, 2200);
      }
    } catch (err: any) {
      setUploadStatus("error");
      const rawDetail = err?.response?.data?.detail;
      let detail = "";
      if (typeof rawDetail === "string") {
        detail = rawDetail;
      } else if (Array.isArray(rawDetail)) {
        detail = rawDetail.map((d: any) => d?.msg || (typeof d === "string" ? d : JSON.stringify(d))).join(", ");
      } else if (rawDetail && typeof rawDetail === "object") {
        detail = rawDetail.message || rawDetail.error || JSON.stringify(rawDetail);
      } else if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
        detail = "Upload processing timed out. Please try again or use a smaller file.";
      } else {
        detail = err?.message || "";
      }

      if (detail.includes("Unsupported file type")) {
        setUploadMsg(`${detail} — Please upload PDF, Excel (.xlsx/.csv), JPG, or PNG.`);
      } else if (detail.includes("too large")) {
        setUploadMsg("File too large — maximum size is 15 MB.");
      } else if (detail.includes("Duplicate")) {
        setUploadMsg(detail);
      } else {
        setUploadMsg(detail || "Upload failed — check backend connection.");
      }
    }
  }

  const TABS = [
    { val: "extracted", label: "Needs Review", count: counts.needsReview },
    { val: "pending",   label: "Processing",   count: counts.processing },
    { val: "verified",  label: "Verified",     count: counts.verified },
    { val: "pushed",    label: "In ERP",       count: counts.inErp },
    { val: "failed",    label: "Failed",       count: counts.failed },
  ];

  const filteredExtractions = extractions.filter(ex => {
    if (docCategoryFilter !== "all" && ex.document_type !== docCategoryFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const d = ex.extracted_data;
    return (
      (d?.party_name || "").toLowerCase().includes(q) ||
      (d?.invoice_number || "").toLowerCase().includes(q) ||
      (ex.document_type || "").toLowerCase().includes(q) ||
      String(d?.total_amount || "").includes(q)
    );
  });

  const currentTallyCompany = tallyData?.company_name || (typeof localStorage !== "undefined" && (localStorage.getItem("daynisc_tally_company") || localStorage.getItem("tally_company"))) || "Active Company";

  return (
    <div style={{
      display: "flex",
      height: "100%",
      flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
      background: "#f8fafc",
      padding: "20px 26px 14px",
      boxSizing: "border-box",
      overflow: "hidden",
    }}>

      {/* ── Page Header Card ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}>
        {/* Left: Icon, Title & Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(59, 130, 246, 0.3)",
          }}>
            <IconFileText size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.4px",
              margin: "0 0 2px 0",
            }}>
              AI Upload &amp; Verification
            </h1>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: 0 }}>
              Upload invoices, bills or receipts, verify AI-extracted fields, and push to {activeErp === "odoo" ? "Odoo ERP" : activeErp === "both" ? "TallyPrime & Odoo ERP" : "Tally Prime"}.
            </p>
          </div>
        </div>

        {/* Right: Tally Pill, Odoo Pill, Mobile Upload, Go to ERP Sync */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Tally Live Status Pill */}
          {(activeErp === "tally" || activeErp === "both") && (
            <div
              onClick={() => testTallyConnection()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 20,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: "#dcfce7",
                color: "#15803d",
                border: "1px solid #86efac",
              }}
              title="Click to test Tally connection"
            >
              <span style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#16a34a",
              }} />
              Tally: {currentTallyCompany}
            </div>
          )}

          {/* Odoo Live Status Pill */}
          {(activeErp === "odoo" || activeErp === "both") && (
            <div
              onClick={() => testOdooConnection()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 20,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                background: odooData?.connected ? "#f5f3ff" : "#fef2f2",
                color: odooData?.connected ? "#6d28d9" : "#b91c1c",
                border: `1px solid ${odooData?.connected ? "#c4b5fd" : "#fca5a5"}`,
              }}
              title="Click to test Odoo ERP connection"
            >
              <span style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: odooData?.connected ? "#7c3aed" : "#ef4444",
              }} />
              Odoo: {odooData?.connected ? (odooData?.company_name || "Online") : "Offline"}
            </div>
          )}

          {/* Mobile Upload Button */}
          <button
            onClick={() => setShowMobileModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: "#0f172a",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <IconSmartphone size={15} color="#0f172a" />
            Mobile Upload
          </button>

          {/* Go to ERP Sync Button */}
          <button
            onClick={() => navigate("/tally-sync")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              background: "linear-gradient(135deg, #4361ee, #7c3aed)",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(67,97,238,0.28)",
            }}
          >
            ERP Sync Hub →
          </button>
        </div>
      </div>

      {/* ── 4 Top KPI Stat Cards ─────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
        marginBottom: 14,
      }}>
        {/* Card 1: Total Documents */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconFileText size={20} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>Total Documents</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{counts.total}</div>
              <div style={{ fontSize: 10.5, color: "#94a3b8" }}>This Month</div>
            </div>
          </div>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="13" width="3.5" height="8" rx="1" fill="#93c5fd" />
            <rect x="8.5" y="8" width="3.5" height="13" rx="1" fill="#93c5fd" />
            <rect x="14" y="4" width="3.5" height="17" rx="1" fill="#93c5fd" />
            <rect x="19.5" y="10" width="3.5" height="11" rx="1" fill="#93c5fd" />
          </svg>
        </div>

        {/* Card 2: Processing */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#f5f3ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconClock size={20} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>Processing</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{counts.processing}</div>
              <div style={{ fontSize: 10.5, color: "#94a3b8" }}>In Queue</div>
            </div>
          </div>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="10" width="3.5" height="11" rx="1" fill="#c4b5fd" />
            <rect x="8.5" y="5" width="3.5" height="16" rx="1" fill="#c4b5fd" />
            <rect x="14" y="8" width="3.5" height="13" rx="1" fill="#c4b5fd" />
            <rect x="19.5" y="13" width="3.5" height="8" rx="1" fill="#c4b5fd" />
          </svg>
        </div>

        {/* Card 3: Verified */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#f0fdf4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconCheckCircle size={20} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>Verified</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{counts.verified}</div>
              <div style={{ fontSize: 10.5, color: "#94a3b8" }}>Ready to Sync</div>
            </div>
          </div>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="14" width="3.5" height="7" rx="1" fill="#86efac" />
            <rect x="8.5" y="10" width="3.5" height="11" rx="1" fill="#86efac" />
            <rect x="14" y="6" width="3.5" height="15" rx="1" fill="#86efac" />
            <rect x="19.5" y="3" width="3.5" height="18" rx="1" fill="#86efac" />
          </svg>
        </div>

        {/* Card 4: Failed */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconXCircle size={20} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 2 }}>Failed</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{counts.failed}</div>
              <div style={{ fontSize: 10.5, color: "#94a3b8" }}>Needs Attention</div>
            </div>
          </div>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="15" width="3.5" height="6" rx="1" fill="#fca5a5" />
            <rect x="8.5" y="9" width="3.5" height="12" rx="1" fill="#fca5a5" />
            <rect x="14" y="5" width="3.5" height="16" rx="1" fill="#fca5a5" />
            <rect x="19.5" y="12" width="3.5" height="9" rx="1" fill="#fca5a5" />
          </svg>
        </div>
      </div>

      {/* ── Workflow Announcement Strip ──────────────────────────────────── */}
      <div style={{
        padding: "9px 16px",
        marginBottom: 14,
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12.5,
        color: "#1e40af",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconSparkles size={16} color="#3b82f6" />
          <span>
            <b>Workflow:</b> 1. Upload bill → 2. AI extracts details → 3. Verify &amp; Approve below → 4. Sync in {activeErp === "odoo" ? "Odoo ERP" : "Tally Prime"}!
          </span>
        </div>
        <button
          onClick={() => setShowWorkflowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            color: "#2563eb",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          <IconInfo size={14} color="#2563eb" />
          Learn More
        </button>
      </div>

      {/* ── Tabs & Action Buttons Row ─────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        {/* Left: Status tabs with counts */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {TABS.map(tab => {
            const isActive = filterStatus === tab.val;
            return (
              <button
                key={tab.val}
                onClick={() => { setFilterStatus(tab.val); setSelected(null); }}
                style={{
                  padding: "7px 14px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${isActive ? "#3b82f6" : "transparent"}`,
                  color: isActive ? "#3b82f6" : "#64748b",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 7px",
                  borderRadius: 12,
                  background: isActive ? "#3b82f6" : "#e2e8f0",
                  color: isActive ? "#ffffff" : "#64748b",
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => navigate("/tally-sync")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              color: "#0f172a",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <IconSync size={13} color="#0f172a" />
            View {activeErp === "odoo" ? "Odoo" : "Tally"} Queue
          </button>
          <button
            onClick={() => { setShowUpload(true); setUploadStatus("idle"); setUploadMsg(""); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 18px",
              background: "linear-gradient(135deg, #4361ee, #6366f1)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(67,97,238,0.3)",
            }}
          >
            <IconUpload size={14} color="#fff" />
            Upload Bill / Invoice
          </button>
        </div>
      </div>

      {/* ── 2-Column Split Content ───────────────────────────────────────── */}
      <div style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {/* Left Column: Search + Documents List */}
        <div style={{
          width: 350,
          minWidth: 350,
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
        }}>
          {/* Search Header */}
          <div style={{
            padding: "10px 12px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            gap: 8,
            position: "relative",
          }}>
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                <IconSearch size={14} color="#94a3b8" />
              </div>
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 32px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: "#0f172a",
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: docCategoryFilter !== "all" ? "#eff6ff" : "#ffffff",
                color: docCategoryFilter !== "all" ? "#3b82f6" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Filter by document category"
            >
              <IconFilter size={14} />
            </button>

            {showFilterMenu && (
              <div style={{
                position: "absolute",
                top: 48,
                right: 12,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                padding: 6,
                zIndex: 100,
                width: 170,
              }}>
                {[
                  { val: "all", label: "All Categories" },
                  { val: "purchase", label: "Purchase Bills" },
                  { val: "sales", label: "Sales Invoices" },
                  { val: "export_invoice", label: "Export Invoices" },
                  { val: "lr", label: "Lorry Receipts" },
                  { val: "bank_statement", label: "Bank Statements" },
                ].map(cat => (
                  <div
                    key={cat.val}
                    onClick={() => { setDocCategoryFilter(cat.val); setShowFilterMenu(false); }}
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      borderRadius: 6,
                      cursor: "pointer",
                      background: docCategoryFilter === cat.val ? "#eff6ff" : "transparent",
                      color: docCategoryFilter === cat.val ? "#3b82f6" : "#0f172a",
                      fontWeight: docCategoryFilter === cat.val ? 700 : 500,
                    }}
                  >
                    {cat.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Document Items or Empty State */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</div>
            ) : filteredExtractions.length === 0 ? (
              <div style={{
                padding: "50px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                boxSizing: "border-box",
              }}>
                {/* Clean Document Outline Icon */}
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", marginBottom: 5 }}>
                  No documents in this status
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20, maxWidth: 220, lineHeight: 1.4 }}>
                  Upload invoices, bills or receipts to get started.
                </div>
                <button
                  onClick={() => { setShowUpload(true); setUploadStatus("idle"); setUploadMsg(""); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 18px",
                    background: "#4361ee",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(67, 97, 238, 0.25)",
                  }}
                >
                  <IconUpload size={14} color="#fff" />
                  Upload Document
                </button>
              </div>
            ) : (
              filteredExtractions.map(ex => {
                const d = ex.extracted_data;
                const isSelected = ex.id === selected;
                return (
                  <div
                    key={ex.id}
                    onClick={() => setSelected(ex.id)}
                    style={{
                      padding: "13px 16px",
                      borderBottom: `1px solid ${T.divider}`,
                      background: isSelected ? "#eff6ff" : "#fff",
                      borderLeft: `3px solid ${isSelected ? "#3b82f6" : "transparent"}`,
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>
                        {d?.party_name || d?.bank_name || (ex.document_type === "bank_statement" ? "Bank Statement" : "Unknown Party")}
                      </span>
                      <StatusBadge status={ex.status} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: T.text3 }}>
                        {(ex.document_type === "bank_statement" ? (d?.account_number || "Bank Statement") : (d?.invoice_number || ex.document_type))} · {d?.statement_period || d?.invoice_date || "—"}
                      </span>
                      {d?.total_amount ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>
                          {inr(d.total_amount)}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <ConfidencePill score={ex.confidence_score || 0} />
                      {ex.is_duplicate && (
                        <span style={{ ...badge(T.red, T.redBg), display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <IconAlertTriangle size={11} /> Dup
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: T.text4, marginLeft: "auto" }}>
                        {new Date(ex.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detail View or Illustrated Empty State */}
        <div style={{ flex: 1, overflowY: "auto", background: "#ffffff", display: "flex", flexDirection: "column" }}>
          {selectedExtraction ? (
            <ExtractionDetail
              extraction={selectedExtraction}
              onApprove={c => approveMutation.mutate({ id: selectedExtraction.id, corrections: c })}
              onReject={() => rejectMutation.mutate(selectedExtraction.id)}
              approving={approveMutation.isPending}
            />
          ) : (
            <div style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              padding: 40,
              textAlign: "center",
              boxSizing: "border-box",
            }}>
              {/* Document with Magnifying Glass & Sparkle Stars SVG */}
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style={{ marginBottom: 14 }}>
                {/* Left Sparkle Star */}
                <path d="M16 48 C16 45, 19 43, 21 43 C19 43, 16 41, 16 38 C16 41, 13 43, 11 43 C13 43, 16 45, 16 48 Z" fill="#cbd5e1" />
                {/* Right Sparkle Star */}
                <path d="M84 56 C84 53, 86 51, 88 51 C86 51, 84 49, 84 46 C84 49, 82 51, 80 51 C82 51, 84 53, 84 56 Z" fill="#cbd5e1" />
                {/* Top Right Small Sparkle */}
                <path d="M74 24 C74 22, 75.5 20.5, 77 20.5 C75.5 20.5, 74 19, 74 17 C74 19, 72.5 20.5, 71 20.5 C72.5 20.5, 74 22, 74 24 Z" fill="#e2e8f0" />
                {/* Document sheet */}
                <path d="M28 16 H58 L72 30 V80 C72 84.4 68.4 88 64 88 H28 C23.6 88 20 84.4 20 80 V24 C20 19.6 23.6 16 28 16 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M58 16 V30 H72" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2.5" strokeLinejoin="round" />
                {/* Lines on document */}
                <line x1="30" y1="42" x2="50" y2="42" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="30" y1="52" x2="60" y2="52" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="30" y1="62" x2="46" y2="62" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
                {/* Magnifying Glass */}
                <circle cx="58" cy="54" r="18" fill="#ffffff" fillOpacity="0.9" stroke="#94a3b8" strokeWidth="3" />
                <line x1="71" y1="67" x2="84" y2="80" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
                {/* Reflection on glass */}
                <path d="M49 46 A11 11 0 0 1 65 52" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                Select a document to review
              </div>
              <div style={{ fontSize: 13, color: "#64748b", maxWidth: 360, lineHeight: 1.5 }}>
                Choose a document from the list to view AI extracted details and verify the information.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Tips & Format Bar ──────────────────────────────────────── */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "9px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        marginTop: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#64748b" }}>
          <IconLightbulb size={14} color="#eab308" />
          <span>
            <b style={{ color: "#0f172a" }}>Tips:</b> For best results, upload clear PDF, image (JPG/PNG) or scanned documents. The AI will automatically extract key details like vendor, date, invoice number, items and amounts.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#64748b", whiteSpace: "nowrap" }}>
          <IconFileText size={13} color="#64748b" />
          <span>
            <b style={{ color: "#0f172a" }}>Supported formats:</b> PDF, JPG, PNG
          </span>
        </div>
      </div>

      {/* ── Mobile QR Modal ──────────────────────────────────────────────── */}
      {showMobileModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowMobileModal(false); }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: 24,
              textAlign: "center",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowMobileModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                width: 28,
                height: 28,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
              }}
            >
              <IconX size={15} />
            </button>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <IconSmartphone size={20} color="#2563eb" /> Mobile Bill Scanner
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
              Scan with your phone to upload bills &amp; receipts directly to the AI Verification queue.
            </p>

            {(() => {
              const qrPayload = JSON.stringify({
                url: lanUrl,
                token: localStorage.getItem("token") || "demo-jwt-token-daynisc-2025",
                name: "Daynisc ERP",
              });

              return (
                <>
                  <div
                    style={{
                      display: "inline-block",
                      padding: 12,
                      background: "#f8fafc",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      marginBottom: 14,
                    }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(qrPayload)}`}
                      alt="Upload QR Code"
                      style={{ width: 190, height: 190, display: "block", borderRadius: 6 }}
                    />
                  </div>

                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Direct Phone URL</span>
                      <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>Local WiFi</span>
                    </div>
                    <code style={{ fontSize: 12, color: "#2563eb", wordBreak: "break-all", fontWeight: 600 }}>{lanUrl}</code>
                  </div>
                </>
              );
            })()}

            <button
              onClick={() => {
                setShowMobileModal(false);
                setShowUpload(true);
              }}
              style={{
                width: "100%",
                padding: "10px",
                background: "#4361ee",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Or Upload From This Computer
            </button>
          </div>
        </div>
      )}

      {/* ── Workflow Explanation Modal ───────────────────────────────────── */}
      {showWorkflowModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowWorkflowModal(false); }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: 26,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowWorkflowModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                width: 28,
                height: 28,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
              }}
            >
              <IconX size={15} />
            </button>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <IconSparkles size={20} color="#3b82f6" /> 4-Step AI Accounting Pipeline
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              How Daynisc turns raw bills into live verified vouchers in Tally Prime:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              {[
                { step: "1", title: "Upload Invoices or Bills", desc: "Upload PDF, JPG, PNG, or Excel invoices, or snap photos using the mobile camera scanner." },
                { step: "2", title: "AI Vision & Field Extraction", desc: "Gemini Vision extracts Vendor GSTIN, Invoice Date, Numbers, Line Items, HSN, Tax rates, and Totals." },
                { step: "3", title: "Review & Fast-Approve", desc: "Cross-check extracted items side-by-side with confidence scores, ledger mapping, and automatic duplicate detection." },
                { step: "4", title: "1-Click Tally Prime Sync", desc: "Directly posts XML vouchers into Tally Prime on port 9000 without any manual re-typing or schema mismatch." },
              ].map(s => (
                <div key={s.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "#eff6ff", color: "#2563eb",
                    fontWeight: 800, fontSize: 12, display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {s.step}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowWorkflowModal(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "#4361ee",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Got it! Let's Start
            </button>
          </div>
        </div>
      )}

      {/* ── Upload Modal ─────────────────────────────────────────────────── */}
      {showUpload && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
            backdropFilter: "blur(4px)",
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowUpload(false); }}
        >
          <div style={{
            background: "#fff", borderRadius: 16,
            padding: 32, width: 480, maxWidth: "90vw",
            boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 8 }}><IconUpload size={20} color={T.primary} /> Upload Bill / Invoice</h2>
              <button onClick={() => setShowUpload(false)} style={{
                background: "#f8fafc", border: `1px solid ${T.border}`,
                borderRadius: 6, width: 32, height: 32, cursor: "pointer",
                color: T.text3, fontSize: 16, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}><IconX size={16} /></button>
            </div>

            {/* Document Type Dropdown */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: 12, fontWeight: 700, color: T.text2,
                display: "block", marginBottom: 8, textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Document Category
              </label>
              <select
                value={uploadDocType}
                onChange={e => setUploadDocType(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1.5px solid ${T.border}`,
                  borderRadius: 8, fontSize: 13, color: T.text1,
                  background: "#fff", outline: "none",
                  fontFamily: "'Inter',sans-serif", fontWeight: 500,
                  cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                <option value="purchase">Purchase Bill</option>
                <option value="sales">Sales Invoice</option>
                <option value="export_invoice">Export Invoice</option>
                <option value="lr">Lorry Receipt (LR)</option>
                <option value="payment">Payment Proof</option>
                <option value="bank_statement">Bank Statement</option>
                <option value="other">Other Doc</option>
              </select>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? T.primary : T.border}`,
                borderRadius: 12, padding: "40px 20px",
                textAlign: "center", cursor: "pointer",
                background: dragOver ? "#eff6ff" : "#f8fafc",
                transition: "all 0.2s", marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 42, marginBottom: 10 }}>
                {uploadStatus === "uploading" ? <IconRefresh size={42} color={T.amber} /> : uploadStatus === "done" ? <IconCheckCircle size={42} color={T.green} /> : uploadStatus === "error" ? <IconXCircle size={42} color={T.red} /> : <IconFile size={42} color={T.text3} />}
              </div>
              {uploadStatus === "idle" && (
                <>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 5 }}>
                    Drop file here or click to browse
                  </p>
                  <p style={{ fontSize: 12, color: T.text3 }}>PDF · Excel (.xlsx/.csv) · JPG · PNG · Multiple files OK</p>
                </>
              )}
              {uploadStatus === "uploading" && (
                <p style={{ fontSize: 13, color: T.amber, fontWeight: 600 }}>Uploading and sending to AI Engine…</p>
              )}
              {(uploadStatus === "done" || uploadStatus === "error") && (
                <p style={{ fontSize: 12, color: uploadStatus === "done" ? T.green : T.red, padding: "0 20px", fontWeight: 600 }}>
                  {uploadMsg}
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment");
                    fileInputRef.current.click();
                  }
                }}
                style={{
                  flex: 1, padding: "10px", background: "#f1f5f9",
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 12, fontWeight: 600, color: T.text1,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 6
                }}
              >
                <IconCamera size={14} /> Camera Scan Mode
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                  }
                }}
                style={{
                  flex: 1, padding: "10px", background: "#eff6ff",
                  border: `1px solid ${T.primary}40`, borderRadius: 8,
                  fontSize: 12, fontWeight: 600, color: T.primary,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 6
                }}
              >
                <IconFolder size={14} /> Browse Documents
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.xlsx,.csv,.xls" multiple
              style={{ display: "none" }} onChange={e => handleUpload(e.target.files)} />

            <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.7, textAlign: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IconLightbulb size={13} color={T.amber} /> <strong>Omnichannel Extraction:</strong></span> Purchase Bills · Bank Statements · Lorry Receipts (LR) · Excel Sheets<br />
              All verified entries are automatically pushed XML to Tally Prime.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
