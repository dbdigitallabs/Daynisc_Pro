// src/pages/AIVerificationPage.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import {
  IconUpload, IconInbox, IconFile, IconAI, IconCheckCircle, IconXCircle, IconRefresh,
  IconAlertTriangle, IconGlobe, IconFileText, IconFactory, IconBox, IconTruck,
  IconScale, IconClipboard, IconReceipt, IconSparkles, IconZap, IconX, IconSync,
  IconCamera, IconFolder, IconLightbulb, IconHourglass
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

      {/* Tally Connection Banner */}
      <div style={{
        marginTop: 20, padding: "12px 16px", background: "#f8fafc",
        border: `1px solid ${T.border}`, borderRadius: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>TallyPrime HTTP Integration:</span>
          <span style={{ fontSize: 12, color: T.text2, fontFamily: "monospace" }}>http://localhost:9000</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.greenBg, padding: "2px 8px", borderRadius: 4 }}>
          READY FOR XML SYNC
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
            {approving ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconHourglass size={13} /> Creating ERP & Tally Entry…</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconZap size={13} color="#f59e0b" /> Approve & Sync directly to Tally</span>}
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
  const [selected, setSelected]     = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("extracted");
  const [showUpload, setShowUpload]  = useState(false);
  const [dragOver, setDragOver]      = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle"|"uploading"|"done"|"error">("idle");
  const [uploadMsg, setUploadMsg]    = useState("");
  const [uploadDocType, setUploadDocType] = useState("purchase");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: extractionsRaw, isLoading } = useQuery<any>({
    queryKey: ["extractions", filterStatus],
    queryFn: () => api.get("/documents", { params: { status: filterStatus, limit: 50 } }).then(r => r.data?.items || r.data),
  });

  const extractions: Extraction[] = Array.isArray(extractionsRaw)
    ? extractionsRaw
    : (extractionsRaw?.items && Array.isArray(extractionsRaw.items))
    ? extractionsRaw.items
    : [];

  const navigate = useNavigate();
  const selectedExtraction = Array.isArray(extractions) ? extractions.find(e => e.id === selected) : undefined;

  const approveMutation = useMutation({
    mutationFn: ({ id, corrections }: { id: string; corrections?: Record<string, unknown> }) =>
      api.post(`/documents/${id}/verify`, { approve: true, corrections }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extractions"] });
      qc.invalidateQueries({ queryKey: ["tally-pending"] });
      setSelected(null);
      toast.success("Document verified! Entry created for Tally Prime.", { duration: 4000 });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/verify`, { approve: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["extractions"] }); setSelected(null); },
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
        });
        // Backend returns 200 but body may indicate extraction failure
        if (res.data?.status === "failed") {
          anyFailed = true;
          lastError = res.data?.error || res.data?.message || "AI extraction failed";
        }
      }
      qc.invalidateQueries({ queryKey: ["extractions"] });
      if (anyFailed) {
        setUploadStatus("error");
        // Friendly messages for common errors
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
        setUploadMsg(`${files.length} bill${files.length > 1 ? "s" : ""} uploaded — check Needs Review tab`);
        setTimeout(() => { setShowUpload(false); setUploadStatus("idle"); setFilterStatus("extracted"); }, 2200);
      }
    } catch (err: any) {
      setUploadStatus("error");
      const detail = err?.response?.data?.detail || "";
      if (detail.includes("Unsupported file type")) {
        setUploadMsg(`${detail} — Please upload JPG, PNG or PDF.`);
      } else if (detail.includes("too large")) {
        setUploadMsg("File too large — maximum size is 15 MB.");
      } else {
        setUploadMsg(detail || "Upload failed — check backend connection.");
      }
    }
  }

  const TABS = [
    { val: "extracted", label: "Needs Review" },
    { val: "pending",   label: "Processing"   },
    { val: "verified",  label: "Verified"      },
    { val: "pushed",    label: "In ERP"        },
    { val: "failed",    label: "Failed"        },
  ];

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column", fontFamily: "'Inter',sans-serif" }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: "20px 28px 0",
        background: "#fff",
        borderBottom: `1px solid ${T.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px", marginBottom: 3, display: "flex", alignItems: "center", gap: 10 }}>
              <IconAI size={22} color={T.primary} /> AI Upload & Verification
            </h1>
            <p style={{ fontSize: 13, color: T.text3 }}>Upload invoices, bills or receipts, verify AI-extracted fields, and push to Tally Prime</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => navigate("/tally-sync")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 16px",
                background: "#f1f5f9", border: `1px solid ${T.border}`,
                borderRadius: 8, color: T.text1,
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              <IconSync size={13} /> View Tally Queue
            </button>
            <button
              onClick={() => { setShowUpload(true); setUploadStatus("idle"); setUploadMsg(""); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 18px",
                background: "linear-gradient(135deg, #4361ee, #7c3aed)",
                border: "none", borderRadius: 8, color: "#fff",
                cursor: "pointer", fontSize: 13, fontWeight: 700,
                boxShadow: "0 4px 14px rgba(67,97,238,0.3)",
              }}
            >
              <IconUpload size={15} color="#fff" />
              Upload Bill / Invoice
            </button>
          </div>
        </div>

        {/* Workflow Info Banner */}
        <div style={{
          padding: "8px 14px", marginBottom: 14,
          background: "#eff6ff", border: "1px solid #bfdbfe",
          borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12, color: "#1e40af"
        }}>
          <div>
            <b>Workflow:</b> 1. Upload bill → 2. AI extracts details → 3. Verify & Approve below → 4. Sync in Tally Prime!
          </div>
          <button
            onClick={() => navigate("/tally-sync")}
            style={{
              background: "none", border: "none", color: "#2563eb",
              fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: 12
            }}
          >
            Open Tally Sync →
          </button>
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(tab => (
            <button key={tab.val} onClick={() => setFilterStatus(tab.val)} style={{
              padding: "8px 18px", background: "transparent", border: "none",
              borderBottom: `2px solid ${filterStatus === tab.val ? T.primary : "transparent"}`,
              color: filterStatus === tab.val ? T.primary : T.text3,
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              transition: "all 0.15s",
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", background: T.pageBg }}>

        {/* Left: Document list */}
        <div style={{
          width: 340, background: "#fff",
          borderRight: `1px solid ${T.border}`,
          overflowY: "auto", flexShrink: 0,
        }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: T.text3, fontSize: 13 }}>Loading…</div>
          ) : extractions.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 13 }}>
              <div style={{ marginBottom: 12, opacity: 0.4 }}><IconInbox size={40} color={T.text3} /></div>
              No documents in this status
            </div>
          ) : (
            extractions.map(ex => {
              const d = ex.extracted_data;
              const isSelected = ex.id === selected;
              return (
                <div key={ex.id} onClick={() => setSelected(ex.id)} style={{
                  padding: "14px 18px",
                  borderBottom: `1px solid ${T.divider}`,
                  background: isSelected ? "#eff6ff" : "#fff",
                  borderLeft: `3px solid ${isSelected ? T.primary : "transparent"}`,
                  cursor: "pointer", transition: "all 0.12s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>
                      {d?.party_name || "Unknown Party"}
                    </span>
                    <StatusBadge status={ex.status} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: T.text3 }}>
                      {d?.invoice_number || ex.document_type} · {d?.invoice_date || "—"}
                    </span>
                    {d?.total_amount && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>
                        {inr(d.total_amount)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <ConfidencePill score={ex.confidence_score || 0} />
                    {ex.is_duplicate && <span style={{ ...badge(T.red, T.redBg), display: "inline-flex", alignItems: "center", gap: 3 }}><IconAlertTriangle size={11} /> Dup</span>}
                    <span style={{ fontSize: 10, color: T.text4, marginLeft: "auto" }}>
                      {new Date(ex.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detail panel */}
        <div style={{ flex: 1, overflow: "auto", background: "#fff", borderLeft: `1px solid ${T.border}` }}>
          {selectedExtraction ? (
            <ExtractionDetail
              extraction={selectedExtraction}
              onApprove={c => approveMutation.mutate({ id: selectedExtraction.id, corrections: c })}
              onReject={() => rejectMutation.mutate(selectedExtraction.id)}
              approving={approveMutation.isPending}
            />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column", gap: 12,
            }}>
              <div style={{ opacity: 0.25 }}><IconAI size={52} color={T.text2} /></div>
              <p style={{ color: T.text3, fontSize: 13, fontWeight: 500 }}>Select a document to review</p>
            </div>
          )}
        </div>
      </div>

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
