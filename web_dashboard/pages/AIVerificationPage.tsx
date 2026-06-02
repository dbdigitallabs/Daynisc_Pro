// src/pages/AIVerificationPage.tsx
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge } from "../store/theme";
import { IconUpload, IconInbox, IconFile, IconAI, IconCheckCircle, IconXCircle, IconRefresh } from "../components/Icons";

// ── Types ──────────────────────────────────────────────────────────────────────
interface LineItem {
  item_name: string; quantity: number; unit: string;
  rate: number; gst_rate: number; total: number;
}
interface Extraction {
  id: string; status: string; document_type: string;
  language: string; confidence_score: number; is_duplicate: boolean;
  created_at: string;
  extracted_data: {
    invoice_number?: string; party_name?: string; invoice_date?: string;
    total_amount?: number; party_gstin?: string; vehicle_number?: string;
    line_items?: LineItem[]; confidence?: Record<string, number>;
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
  const docType = (extraction.document_type || "").toLowerCase();
  const isLR = docType === "lr" || docType === "lorry_receipt";
  const isPayment = docType === "payment" || docType === "payment_screenshot" || docType === "payment_proof";
  const isBankStatement = docType === "bank_statement";

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
            <span style={badge(T.red, T.redBg)}>⚠ Duplicate</span>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Statement Transactions ({txList.length})
          </h3>
          <span style={{ fontSize: 12, color: T.text3, fontWeight: 500 }}>
            Configure and select entries to import
          </span>
        </div>

        {/* Transactions Table */}
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
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
              {txList.map((tx, idx) => {
                const isDebit = tx.withdrawal > 0;
                const amt = isDebit ? tx.withdrawal : tx.deposit;
                return (
                  <tr key={idx} style={{
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
              {approving ? "⏳ Creating ERP Entries…" : `✅ Create ${approvedCount} Accounting Vouchers`}
            </button>
            <button
              onClick={onReject}
              style={{
                padding: "14px 24px",
                background: "#fff", border: `1.5px solid ${T.red}`,
                borderRadius: 8, color: T.red,
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              ✗ Reject
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
          <span style={badge(T.red, T.redBg)}>⚠ Duplicate</span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.text3, fontWeight: 500 }}>
          {extraction.document_type.toUpperCase()} · {extraction.language?.toUpperCase()}
        </span>
      </div>

      {/* Fields grid */}
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

      {/* Line Items */}
      {!isPayment && !isLR && (d?.line_items?.length ?? 0) > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text2, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Line Items ({d!.line_items!.length})
          </div>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Item", "Qty", "Unit", "Rate", "GST%", "Total"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.text3, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d!.line_items!.map((item, i) => (
                  <tr key={i} style={{ borderBottom: i < d!.line_items!.length - 1 ? `1px solid ${T.divider}` : "none" }}>
                    <td style={{ padding: "9px 12px", color: T.text1, fontWeight: 500 }}>{item.item_name}</td>
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

      {/* Action buttons */}
      {["extracted", "pending"].includes(extraction.status) && (
        <div style={{
          display: "flex", gap: 12, marginTop: 22,
          paddingTop: 18, borderTop: `1px solid ${T.border}`,
        }}>
          <button
            onClick={() => onApprove(Object.keys(corrections).length ? corrections : undefined)}
            disabled={approving}
            style={{
              flex: 1, padding: "12px",
              background: approving ? T.greenBg : T.green,
              border: "none", borderRadius: 8,
              color: approving ? T.green : "#fff",
              cursor: approving ? "default" : "pointer",
              fontSize: 13, fontWeight: 700, transition: "all 0.15s",
            }}
          >
            {approving ? "⏳ Creating ERP Entry…" : "✅ Approve & Push to ERP"}
          </button>
          <button
            onClick={onReject}
            style={{
              padding: "12px 20px",
              background: "#fff", border: `1.5px solid ${T.red}`,
              borderRadius: 8, color: T.red,
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            ✗ Reject
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

  const { data: extractions = [], isLoading } = useQuery<Extraction[]>({
    queryKey: ["extractions", filterStatus],
    queryFn: () => api.get("/documents", { params: { status: filterStatus, limit: 50 } }).then(r => r.data.items || r.data),
  });

  const selectedExtraction = extractions.find(e => e.id === selected);

  const approveMutation = useMutation({
    mutationFn: ({ id, corrections }: { id: string; corrections?: Record<string, unknown> }) =>
      api.post(`/documents/${id}/verify`, { approve: true, corrections }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["extractions"] }); setSelected(null); },
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
          setUploadMsg("⚠ AI quota exceeded. The document was saved — try again in a few minutes.");
        } else if (lastError.includes("Gemini API key")) {
          setUploadMsg("⚠ Gemini API key not configured. Go to Settings → AI Settings.");
        } else {
          setUploadMsg(`⚠ Extraction failed: ${lastError.slice(0, 120)}`);
        }
        setTimeout(() => { setShowUpload(false); setUploadStatus("idle"); setFilterStatus("failed"); }, 3500);
      } else {
        setUploadStatus("done");
        setUploadMsg(`✅ ${files.length} bill${files.length > 1 ? "s" : ""} uploaded — check Needs Review tab`);
        setTimeout(() => { setShowUpload(false); setUploadStatus("idle"); setFilterStatus("extracted"); }, 2200);
      }
    } catch (err: any) {
      setUploadStatus("error");
      const detail = err?.response?.data?.detail || "";
      if (detail.includes("Unsupported file type")) {
        setUploadMsg(`⚠ ${detail} — Please upload JPG, PNG or PDF.`);
      } else if (detail.includes("too large")) {
        setUploadMsg("⚠ File too large — maximum size is 15 MB.");
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px", marginBottom: 3, display: "flex", alignItems: "center", gap: 10 }}>
              <IconAI size={22} color={T.primary} /> AI Verification Queue
            </h1>
            <p style={{ fontSize: 13, color: T.text3 }}>Review AI-extracted documents before they enter accounting</p>
          </div>
          <button
            onClick={() => { setShowUpload(true); setUploadStatus("idle"); setUploadMsg(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", marginTop: 4,
              background: "linear-gradient(135deg, #4361ee, #7c3aed)",
              border: "none", borderRadius: 8, color: "#fff",
              cursor: "pointer", fontSize: 13, fontWeight: 700,
              boxShadow: "0 4px 14px rgba(67,97,238,0.3)",
            }}
          >
            <IconUpload size={15} color="#fff" />
            Upload Bill
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
                    {ex.is_duplicate && <span style={badge(T.red, T.redBg)}>⚠ Dup</span>}
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
              <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text1 }}>📤 Upload Bill / Invoice</h2>
              <button onClick={() => setShowUpload(false)} style={{
                background: "#f8fafc", border: `1px solid ${T.border}`,
                borderRadius: 6, width: 32, height: 32, cursor: "pointer",
                color: T.text3, fontSize: 16, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>✕</button>
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
                    Drop bill here or click to browse
                  </p>
                  <p style={{ fontSize: 12, color: T.text3 }}>JPG · PNG · PDF · Max 10MB · Multiple files OK</p>
                </>
              )}
              {uploadStatus === "uploading" && (
                <p style={{ fontSize: 13, color: T.amber, fontWeight: 600 }}>Uploading and sending to AI…</p>
              )}
              {(uploadStatus === "done" || uploadStatus === "error") && (
                <p style={{ fontSize: 12, color: uploadStatus === "done" ? T.green : T.red, padding: "0 20px", fontWeight: 600 }}>
                  {uploadMsg}
                </p>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple
              style={{ display: "none" }} onChange={e => handleUpload(e.target.files)} />

            <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.7, textAlign: "center" }}>
              💡 AI extracts: Party name · Invoice no. · Date · Items · GST amounts<br />
              You review &amp; approve before it enters accounting.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
