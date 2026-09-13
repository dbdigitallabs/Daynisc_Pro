// src/pages/AccountingPage.tsx
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import {
  IconClipboard, IconUpload, IconDownload, IconMoney, IconUser, IconBuilding,
  IconTrendUp, IconTrendDown, IconHourglass, IconEdit, IconFolder, IconCheck,
  IconEye, IconTrash, IconTarget, IconPhone, IconMail, IconMessageSquare,
  IconBarChart, IconAlertTriangle, IconCoins, IconBank, IconArrowDown, IconArrowUp,
  IconSearch, IconX, IconPlus, IconAI, IconFileText, IconPrinter, IconLightbulb, IconStatusDot
} from "../components/Icons";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type Tab = "dashboard" | "vouchers" | "outstanding" | "ledger" | "bank-recon";

const VOUCHER_COLORS: Record<string, { color: string; bg: string }> = {
  purchase: { color: T.amber,   bg: T.amberBg  },
  sales:    { color: T.primary, bg: "#eff6ff"  },
  payment:  { color: T.red,     bg: T.redBg    },
  receipt:  { color: T.green,   bg: T.greenBg  },
  journal:  { color: T.text3,   bg: "#f8fafc"  },
};

const MOCK_VOUCHERS = [
  {
    id: "v_1",
    voucher_number: "SAL-3001",
    voucher_type: "sales",
    voucher_date: "2026-06-28",
    party_name: "ABC Industries",
    reference_number: "INV-2901",
    total: 88118,
    tally_synced: true,
    gst_status: "Filed",
    approval_status: "Approved",
    bank_synced: "Bank Synced",
    created_by: "Bhavesh",
    narration: "Being sales of raw polymers dispatch via Ahmedabad branch",
    items: [
      { desc: "Polypropylene Grade A", qty: 1200, rate: 60, amount: 72000 },
      { desc: "CGST @ 9%", qty: 1, rate: 6480, amount: 6480 },
      { desc: "SGST @ 9%", qty: 1, rate: 6480, amount: 6480 },
      { desc: "Freight Charges", qty: 1, rate: 3158, amount: 3158 }
    ],
    ledger_impact: [
      { account: "Trade Receivables (ABC Industries)", debit: 88118, credit: 0 },
      { account: "Sales Revenue (Domestic)", debit: 0, credit: 72000 },
      { account: "CGST Payable Account", debit: 0, credit: 6480 },
      { account: "SGST Payable Account", debit: 0, credit: 6480 },
      { account: "Freight Recovery Account", debit: 0, credit: 3158 }
    ],
    audit_trail: [
      { user: "Bhavesh", action: "Created Draft", time: "2026-06-28 10:22 AM" },
      { user: "Ramesh", action: "Edited Line Quantities", time: "2026-06-28 11:30 AM" },
      { user: "Admin", action: "Approved Voucher", time: "2026-06-28 12:40 PM" },
      { user: "System", action: "Posted Ledger Impact & Synced", time: "2026-06-28 01:05 PM" }
    ],
    documents: ["sales_invoice_sal3001.pdf", "lading_bill_ahm.jpg"]
  },
  {
    id: "v_2",
    voucher_number: "PUR-2005",
    voucher_type: "purchase",
    voucher_date: "2026-06-27",
    party_name: "Reliance Polymers Ltd",
    reference_number: "RELI-9018",
    total: 125000,
    tally_synced: false,
    gst_status: "Pending",
    approval_status: "Manager Approved",
    bank_synced: "Pending",
    created_by: "Ramesh",
    narration: "Purchase invoice for raw plastic granules",
    items: [
      { desc: "Plastic Granules HDPE", qty: 2500, rate: 50, amount: 125000 }
    ],
    ledger_impact: [
      { account: "Purchase Stock Account", debit: 125000, credit: 0 },
      { account: "Trade Payables (Reliance Polymers)", debit: 0, credit: 125000 }
    ],
    audit_trail: [
      { user: "Ramesh", action: "Created & Uploaded PDF", time: "2026-06-27 03:15 PM" },
      { user: "Bhavesh", action: "Approved Verification", time: "2026-06-27 05:40 PM" }
    ],
    documents: ["reliance_purchase_granules.pdf"]
  },
  {
    id: "v_3",
    voucher_number: "REC-223",
    voucher_type: "receipt",
    voucher_date: "2026-06-26",
    party_name: "Patel Enterprises",
    reference_number: "CHQ-8821",
    total: 90000,
    tally_synced: true,
    gst_status: "N/A",
    approval_status: "Approved",
    bank_synced: "Bank Synced",
    created_by: "Bhavesh",
    narration: "Payment received against sales invoice SAL-2989",
    items: [
      { desc: "Receipt via HDFC Bank Cheque", qty: 1, rate: 90000, amount: 90000 }
    ],
    ledger_impact: [
      { account: "HDFC Bank Clearing A/c", debit: 90000, credit: 0 },
      { account: "Trade Receivables (Patel Enterprises)", debit: 0, credit: 90000 }
    ],
    audit_trail: [
      { user: "Bhavesh", action: "Logged Bank Receipt Voucher", time: "2026-06-26 11:02 AM" },
      { user: "Admin", action: "Approved & Reconciled", time: "2026-06-26 12:15 PM" }
    ],
    documents: ["cheque_scan_patel.png", "hdfc_deposit_slip.pdf"]
  },
  {
    id: "v_4",
    voucher_number: "PAY-1102",
    voucher_type: "payment",
    voucher_date: "2026-06-25",
    party_name: "Supreme Plastics Ltd",
    reference_number: "TXN-90218",
    total: 45000,
    tally_synced: true,
    gst_status: "N/A",
    approval_status: "Draft",
    bank_synced: "Pending",
    created_by: "Ramesh",
    narration: "Vendor payment clearing balance bill SUP-1092",
    items: [
      { desc: "Vendor payment from HDFC bank account", qty: 1, rate: 45000, amount: 45000 }
    ],
    ledger_impact: [
      { account: "Trade Payables (Supreme Plastics)", debit: 45000, credit: 0 },
      { account: "HDFC Bank Account", debit: 0, credit: 45000 }
    ],
    audit_trail: [
      { user: "Ramesh", action: "Created Draft Payment voucher", time: "2026-06-25 04:50 PM" }
    ],
    documents: ["payment_advice_print.pdf"]
  },
  {
    id: "v_5",
    voucher_number: "JRN-8012",
    voucher_type: "journal",
    voucher_date: "2026-06-24",
    party_name: "Maa Enterprise",
    reference_number: "ADJ-002",
    total: 15000,
    tally_synced: true,
    gst_status: "N/A",
    approval_status: "Approved",
    bank_synced: "N/A",
    created_by: "System",
    narration: "Year-end interest adjustments booking",
    items: [
      { desc: "Interest Expense allocation adjustment", qty: 1, rate: 15000, amount: 15000 }
    ],
    ledger_impact: [
      { account: "Interest Expense Account", debit: 15000, credit: 0 },
      { account: "Accrued Interest Liabilities", debit: 0, credit: 15000 }
    ],
    audit_trail: [
      { user: "System", action: "Auto adjustment adjustment run", time: "2026-06-24 11:59 PM" }
    ],
    documents: ["accrual_excel_sheet.xlsx"]
  }
];

// ── Card Component ────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...cardStyle({ padding: 14 }), ...style }}>
      {children}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, subText }: { label: string; value: string; icon: React.ReactNode; color: string; subText?: string }) {
  return (
    <div style={{ ...cardStyle({ padding: "12px 16px", flex: 1, minWidth: 150 }) }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value}</div>
      {subText && <div style={{ fontSize: 9, color: T.text3, marginTop: 4, fontWeight: 600 }}>{subText}</div>}
    </div>
  );
}

// ── Vouchers Tab ──────────────────────────────────────────────────────────────
interface VouchersTabProps {
  onSelectVoucher: (v: any) => void;
  searchQuery: string;
  filterApproval: string;
  filterGst: string;
  filterSync: string;
  onOpenCreate: () => void;
}
function VouchersTab({ onSelectVoucher, searchQuery, filterApproval, filterGst, filterSync, onOpenCreate }: VouchersTabProps) {
  const [voucherType, setVoucherType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const qc = useQueryClient();
  const [syncingVchId, setSyncingVchId] = useState<string | null>(null);

  const handleSyncToTally = async (vch: any) => {
    setSyncingVchId(vch.id);
    try {
      const res = await api.post(`/erp/sync/voucher/${vch.id}`);
      toast.success(res.data?.message || `Voucher ${vch.voucher_number} synced to TallyPrime!`);
      qc.invalidateQueries({ queryKey: ["vouchers-list"] });
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.message || "Tally sync failed";
      toast.error(`Sync error: ${msg}`);
    } finally {
      setSyncingVchId(null);
    }
  };

  const { data: vData } = useQuery({
    queryKey: ["vouchers-list"],
    queryFn: () => api.get("/accounting/vouchers", { params: { limit: 2000 } }).then(r => r.data).catch(() => ({ items: [] }))
  });

  const apiItems = vData?.items || [];
  const allVouchers = apiItems.length > 0 ? apiItems.map((v: any) => ({
    id: v.id,
    voucher_number: v.voucher_number || "VCH",
    voucher_type: v.voucher_type || "payment",
    voucher_date: v.voucher_date || "2026-01-01",
    party_name: v.party_name || "Party",
    reference_number: v.reference_number || "REF",
    total: v.total || 0,
    tally_synced: Boolean(v.tally_synced),
    gst_status: v.gst_status || "N/A",
    approval_status: v.approval_status || "Approved",
    bank_synced: "Bank Synced",
    created_by: v.created_by || "System",
    narration: v.narration || "Voucher entry",
    items: v.items || [],
    ledger_impact: v.ledger_impact || [],
    audit_trail: v.audit_trail || [],
    documents: v.documents || []
  })) : MOCK_VOUCHERS;

  const filteredVouchers = allVouchers.filter((v: any) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (v.voucher_number || "").toLowerCase().includes(q) ||
      (v.party_name || "").toLowerCase().includes(q) ||
      (v.reference_number || "").toLowerCase().includes(q) ||
      (v.created_by || "").toLowerCase().includes(q) ||
      (v.narration || "").toLowerCase().includes(q) ||
      (v.total || "").toString().includes(q);

    const matchType = voucherType ? v.voucher_type === voucherType : true;
    const matchApproval = filterApproval === "all" ? true : (v.approval_status || "").toLowerCase().includes(filterApproval.toLowerCase());
    const matchGst = filterGst === "all" ? true : (v.gst_status || "").toLowerCase() === filterGst.toLowerCase();
    const matchSync = filterSync === "all" ? true : (filterSync === "synced" ? v.tally_synced : !v.tally_synced);

    return matchSearch && matchType && matchApproval && matchGst && matchSync;
  });

  const selectStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`, borderRadius: 8,
    padding: "6px 10px", fontSize: 11, color: T.text2,
    background: "#fff", cursor: "pointer", outline: "none",
  };

  return (
    <div>
      {/* Vouchers Sub-KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <KpiCard label="Today's Sales" value="₹1,88,118" icon={<IconTrendUp size={16} color={T.green} />} color={T.green} subText="+18% vs yesterday" />
        <KpiCard label="Today's Purchases" value="₹42,500" icon={<IconTrendDown size={16} color={T.amber} />} color={T.amber} subText="3 bills pending sync" />
        <KpiCard label="Pending Approval" value="3 Vouchers" icon={<IconHourglass size={16} color={T.red} />} color={T.red} subText="Awaiting admin sign-off" />
        <KpiCard label="Unposted Drafts" value="5 Entries" icon={<IconEdit size={16} color={T.text2} />} color={T.text2} subText="Draft vouchers" />
      </div>

      {/* Local Filter Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase" }}>Quick Filters:</span>
        <select value={voucherType} onChange={e => setVoucherType(e.target.value)} style={selectStyle}>
          <option value="">All Voucher Types</option>
          <option value="sales">Sales</option>
          <option value="purchase">Purchase</option>
          <option value="payment">Payment</option>
          <option value="receipt">Receipt</option>
          <option value="journal">Journal</option>
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={selectStyle} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={selectStyle} />
        <button
          onClick={() => { setVoucherType(""); setFromDate(""); setToDate(""); }}
          style={{ background: "none", border: "none", color: T.primary, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
        >
          Reset Dates
        </button>
        <span style={{ marginLeft: "auto", fontSize: 10, color: T.text3, fontWeight: 600 }}>Showing {filteredVouchers.length} vouchers</span>
      </div>

      {/* Table */}
      <div style={cardStyle({ overflow: "hidden" })}>
        {filteredVouchers.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <IconFolder size={28} color={T.text3} />
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text2, marginTop: 8 }}>No vouchers today</div>
            <div style={{ fontSize: 10, color: T.text3, marginTop: 2, marginBottom: 12 }}>Create your first Sales Voucher or upload bank statements to start.</div>
            <button
              onClick={onOpenCreate}
              style={{
                background: T.primary, color: "#fff", border: "none",
                borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer"
              }}
            >
              Create Voucher
            </button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                {["Voucher", "Party", "Narration", "Amount", "Approval", "Sync", "Attachments", "Actions"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.map((v) => {
                const vc = VOUCHER_COLORS[v.voucher_type] || VOUCHER_COLORS.journal;
                return (
                  <tr
                    key={v.id}
                    onClick={() => onSelectVoucher(v)}
                    onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                    style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", transition: "background 0.15s" }}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: T.primary }}>{v.voucher_number}</div>
                      <span style={badge(vc.color, vc.bg)}>{v.voucher_type?.toUpperCase()}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: T.text1 }}>{v.party_name}</div>
                      <div style={{ fontSize: 8, color: T.text3, marginTop: 2 }}>Ref: {v.reference_number || "—"}</div>
                    </td>
                    <td style={{ ...tdStyle, color: T.text2, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.narration}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: T.text1 }}>{inr(v.total)}</td>
                    <td style={tdStyle}>
                      <span style={badge(v.approval_status === "Approved" ? T.green : T.amber, v.approval_status === "Approved" ? T.greenBg : T.amberBg)}>
                        {v.approval_status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={badge(v.tally_synced ? T.green : T.amber, v.tally_synced ? T.greenBg : T.amberBg)}>
                          {v.tally_synced ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><IconCheck size={11} /> Synced</span> : "Pending"}
                        </span>
                        {!v.tally_synced && (
                          <button
                            title="Push directly to TallyPrime"
                            disabled={syncingVchId === v.id}
                            onClick={(e) => { e.stopPropagation(); handleSyncToTally(v); }}
                            style={{
                              border: "1px solid #0d9488",
                              background: "#f0fdfa",
                              color: "#0f766e",
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: "2px 6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            {syncingVchId === v.id ? "Syncing…" : "Sync Tally"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 10, color: T.primary, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><IconFolder size={11} /> {v.documents.length} files</span>
                    </td>
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button title="Open Details Drawer" onClick={() => onSelectVoucher(v)} style={{ border: "none", background: "none", fontSize: 11, cursor: "pointer", padding: "2px 4px" }}><IconEye size={13} color={T.primary} /></button>
                        <button title="Edit Voucher" onClick={() => toast.success(`Editing ${v.voucher_number}`)} style={{ border: "none", background: "none", fontSize: 11, cursor: "pointer", padding: "2px 4px" }}><IconEdit size={13} color={T.text2} /></button>
                        <button title="Delete Voucher" onClick={() => toast.error(`Delete voucher not permitted`)} style={{ border: "none", background: "none", fontSize: 11, cursor: "pointer", padding: "2px 4px" }}><IconTrash size={13} color={T.red} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Outstanding Tab ───────────────────────────────────────────────────────────
function OutstandingTab() {
  const [partyType, setPartyType] = useState("customer");
  const [remindersCount, setRemindersCount] = useState<Record<string, number>>({
    "Sharma Traders": 3,
    "Patel Enterprises": 1,
    "ABC Industries": 0,
  });

  const overdueList = [
    { name: "Sharma Traders", overdue: 125000, days: 42, phone: "+91 98250 11223", paidAfter: "NO" },
    { name: "Patel Enterprises", overdue: 450000, days: 18, phone: "+91 99099 22334", paidAfter: "YES" },
    { name: "ABC Industries", overdue: 50000, days: 9, phone: "+91 98790 33445", paidAfter: "NO" },
  ];

  const handleSendReminder = (name: string, type: string) => {
    toast.success(`Dispatched automated overdue ${type} reminder to ${name}!`);
    setRemindersCount(prev => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
  };

  return (
    <div>
      {/* Receivables/Payables Toggle */}
      <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "#f8fafc", borderRadius: 8, padding: 4, width: "fit-content", border: `1px solid ${T.border}` }}>
        {["customer", "supplier"].map(pt => (
          <button key={pt} onClick={() => setPartyType(pt)} style={{
            padding: "6px 16px", borderRadius: 6, border: "none",
            background: partyType === pt ? "#fff" : "transparent",
            color: partyType === pt ? T.primary : T.text3,
            fontWeight: partyType === pt ? 700 : 500,
            boxShadow: partyType === pt ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            cursor: "pointer", fontSize: 12, transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {pt === "customer" ? <><IconUser size={12} color={partyType === pt ? T.primary : T.text3} /> Customer Receivables</> : <><IconBuilding size={12} color={partyType === pt ? T.primary : T.text3} /> Supplier Payables</>}
          </button>
        ))}
      </div>

      {/* expected collection dashboard banner */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ ...cardStyle({ padding: 12, borderLeft: `4px solid ${T.green}` }) }}>
          <div style={{ fontSize: 8, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Expected This Week</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.green, marginTop: 4 }}>₹1,80,000</div>
          <div style={{ fontSize: 8, color: T.text3, marginTop: 3 }}>Based on invoice promises</div>
        </div>
        <div style={{ ...cardStyle({ padding: 12, borderLeft: `4px solid ${T.primary}` }) }}>
          <div style={{ fontSize: 8, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Expected Next Week</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.primary, marginTop: 4 }}>₹3,40,000</div>
          <div style={{ fontSize: 8, color: T.text3, marginTop: 3 }}>Active ledger bills</div>
        </div>
        <div style={{ ...cardStyle({ padding: 12, borderLeft: `4px solid ${T.amber}` }) }}>
          <div style={{ fontSize: 8, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Overdue Outstandings</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.amber, marginTop: 4 }}>₹1,20,000</div>
          <div style={{ fontSize: 8, color: T.text3, marginTop: 3 }}>Past due balance</div>
        </div>
        <div style={{ ...cardStyle({ padding: 12, borderLeft: `4px solid ${T.red}` }) }}>
          <div style={{ fontSize: 8, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Bad Debt Risk Pool</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.red, marginTop: 4 }}>₹45,000</div>
          <div style={{ fontSize: 8, color: T.text3, marginTop: 3 }}>High-risk customers pool</div>
        </div>
      </div>

      {/* Collection success stats row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <KpiCard label="Collection Success (Today)" value="68%" icon={<IconTarget size={16} color={T.green} />} color={T.green} subText="Target: 75% collection rate" />
        <KpiCard label="Collection Rate (This Month)" value="82%" icon={<IconTrendUp size={16} color={T.primary} />} color={T.primary} subText="Outstanding cleared in 30 days" />
        <KpiCard label="Avg. Collection Time" value="29 Days" icon={<IconHourglass size={16} color={T.amber} />} color={T.amber} subText="Tally benchmark: 35 days" />
      </div>

      {/* Aging Grid */}
      <Card style={{ padding: 14, marginBottom: 16 }}>
        <h4 style={{ fontSize: 11, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 10, letterSpacing: 0.5 }}>Receivable Aging distribution</h4>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[
            { label: "0-30 Days", val: "₹3,12,000", pct: 58, color: T.green },
            { label: "31-60 Days", val: "₹1,20,000", pct: 22, color: T.primary },
            { label: "61-90 Days", val: "₹50,000", pct: 10, color: T.amber },
            { label: "90+ Days", val: "₹50,000", pct: 10, color: T.red },
          ].map((bucket, idx) => (
            <div key={idx} style={{ flex: 1, background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.text3, fontWeight: 700, marginBottom: 4 }}>
                <span>{bucket.label}</span>
                <span>{bucket.pct}%</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: bucket.color }}>{bucket.val}</div>
              <div style={{ width: "100%", height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
                <div style={{ width: `${bucket.pct}%`, height: "100%", background: bucket.color }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Overdue Actions panel */}
      <Card style={{ padding: 14 }}>
        <h4 style={{ fontSize: 11, fontWeight: 800, color: T.red, textTransform: "uppercase", marginBottom: 10, letterSpacing: 0.5 }}>Top Overdue Accounts needing follow-up</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {overdueList.map((cust, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", border: `1.5px solid ${T.border}`, borderRadius: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: T.text1 }}>{cust.name}</span>
                  <span style={badge(cust.paidAfter === "YES" ? T.green : T.red, cust.paidAfter === "YES" ? T.greenBg : T.redBg)}>
                    Paid After Reminder? {cust.paidAfter}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: T.text3, fontWeight: 600, marginTop: 4 }}>
                  Overdue amount: <strong style={{ color: T.red }}>{inr(cust.overdue)}</strong> · {cust.days} Days Outstanding ·
                  <span style={{ color: T.primary }}> Reminders Sent: {remindersCount[cust.name] || 0} (Last: Yesterday)</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => handleSendReminder(cust.name, "Call")}
                  style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <IconPhone size={11} /> Call
                </button>
                <button
                  onClick={() => handleSendReminder(cust.name, "WhatsApp")}
                  style={{ padding: "4px 8px", background: T.greenBg, color: T.green, border: `1px solid ${T.green}30`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <IconStatusDot color={T.green} size={6} /><IconMessageSquare size={11} /> WhatsApp
                </button>
                <button
                  onClick={() => handleSendReminder(cust.name, "SMS")}
                  style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <IconMessageSquare size={11} /> SMS
                </button>
                <button
                  onClick={() => handleSendReminder(cust.name, "Email")}
                  style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <IconMail size={11} /> Email
                </button>
                <button
                  onClick={() => toast.success(`Payment collection of ${inr(cust.overdue)} recorded successfully.`)}
                  style={{ padding: "4px 8px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <IconMoney size={11} /> Collect Payment
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Ledger Tab ────────────────────────────────────────────────────────────────
interface LedgerTabProps {
  searchQuery: string;
}
type LedgerFilter = "all" | "cash" | "bank" | "party" | "sales" | "purchase" | "gst";
function LedgerTab({ searchQuery }: LedgerTabProps) {
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");

  const ledgerEntries = MOCK_VOUCHERS.flatMap(v => {
    let balance = 0;
    return v.ledger_impact.map((li) => {
      balance += (li.debit - li.credit);
      return {
        date: v.voucher_date,
        voucher: v.voucher_number,
        party: v.party_name,
        narration: v.narration,
        debit: li.debit,
        credit: li.credit,
        running_balance: balance,
        attachments: v.documents.length,
        status: v.approval_status,
        accountName: li.account
      };
    });
  });

  const filteredLedger = ledgerEntries.filter(le => {
    // Global search query
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      le.voucher.toLowerCase().includes(q) ||
      le.party.toLowerCase().includes(q) ||
      le.narration.toLowerCase().includes(q) ||
      le.debit.toString().includes(q) ||
      le.credit.toString().includes(q);

    // Advanced category switcher
    if (!matchesSearch) return false;
    if (ledgerFilter === "all") return true;
    if (ledgerFilter === "cash") return le.accountName.toLowerCase().includes("cash");
    if (ledgerFilter === "bank") return le.accountName.toLowerCase().includes("bank");
    if (ledgerFilter === "party") return le.accountName.toLowerCase().includes("receivables") || le.accountName.toLowerCase().includes("payables");
    if (ledgerFilter === "sales") return le.accountName.toLowerCase().includes("sales");
    if (ledgerFilter === "purchase") return le.accountName.toLowerCase().includes("purchase");
    if (ledgerFilter === "gst") return le.accountName.toLowerCase().includes("gst") || le.accountName.toLowerCase().includes("tax");

    return true;
  });

  return (
    <div>
      {/* Ledger filter pills switcher bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "All Ledgers" },
          { id: "cash", label: "Cash Ledger" },
          { id: "bank", label: "Bank Ledger" },
          { id: "party", label: "Party Ledger" },
          { id: "sales", label: "Sales Ledger" },
          { id: "purchase", label: "Purchase Ledger" },
          { id: "gst", label: "GST Ledger" },
        ].map(pill => (
          <button
            key={pill.id}
            onClick={() => setLedgerFilter(pill.id as LedgerFilter)}
            style={{
              padding: "4px 10px", borderRadius: 12, border: `1px solid ${ledgerFilter === pill.id ? T.primary : T.border}`,
              background: ledgerFilter === pill.id ? T.primary + "12" : "#fff",
              color: ledgerFilter === pill.id ? T.primary : T.text2,
              fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div style={cardStyle({ overflow: "hidden" })}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
              {["Date", "Voucher", "Party", "Account / Narration", "Debit (Dr)", "Credit (Cr)", "Running Balance", "Files", "Status"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLedger.map((le, idx) => (
              <tr
                key={idx}
                onMouseEnter={el => (el.currentTarget.style.background = T.rowHover)}
                onMouseLeave={el => (el.currentTarget.style.background = "#fff")}
                style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.15s" }}
              >
                <td style={tdStyle}>{le.date}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{le.voucher}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{le.party}</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600, color: T.text1 }}>{le.accountName}</div>
                  <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>{le.narration}</div>
                </td>
                <td style={{ ...tdStyle, color: le.debit > 0 ? T.red : T.text3, fontWeight: le.debit > 0 ? 600 : 400 }}>{le.debit > 0 ? inr(le.debit) : "—"}</td>
                <td style={{ ...tdStyle, color: le.credit > 0 ? T.green : T.text3, fontWeight: le.credit > 0 ? 600 : 400 }}>{le.credit > 0 ? inr(le.credit) : "—"}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{inr(le.running_balance)}</td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 10, color: T.primary, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><IconFolder size={11} /> {le.attachments} files</span>
                </td>
                <td style={tdStyle}>
                  <span style={badge(le.status === "Approved" ? T.green : T.amber, le.status === "Approved" ? T.greenBg : T.amberBg)}>
                    {le.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Bank Reconciliation Tab ──────────────────────────────────────────────────
function BankReconTab() {
  const navigate = useNavigate();
  const [statementList, setStatementList] = useState([
    {
      id: "tx_1", date: "09-Jun", description: "NEFT INWARD - MUMBAI PLASTICS LTD", ref: "UTRN880912", amount: 15000, type: "deposit",
      matchedVoucher: "REC-223", confidence: 98, status: "pending",
      reason: "Invoice number matches exactly. Amount matches precisely. Date difference is 1 day. Party verified."
    },
    {
      id: "tx_2", date: "08-Jun", description: "CASH DEPOSIT - AHMEDABAD BR", ref: "CSH90123", amount: 45000, type: "deposit",
      matchedVoucher: null, confidence: null, status: "pending", reason: ""
    },
    {
      id: "tx_3", date: "06-Jun", description: "RTGS INWARD - RELIANCE POLYMERS", ref: "RELI9081", amount: 120000, type: "deposit",
      matchedVoucher: "PUR-2005", confidence: 85, status: "pending",
      reason: "Amount matches exactly. Party name similarity is high. Invoice number RELI-9018 reference matched."
    },
  ]);

  const handleMatchAccept = (id: string, name: string) => {
    toast.success(`AI suggested match verified and reconciled: ${name}!`);
    setStatementList(prev => prev.map(tx => tx.id === id ? { ...tx, status: "matched" } : tx));
  };

  return (
    <div>
      {/* Recon Stats Bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <KpiCard label="Imported Statement" value="120 Entries" icon={<IconBarChart size={16} color={T.primary} />} color={T.primary} />
        <KpiCard label="Auto Matched" value="105 Matched" icon={<IconCheck size={16} color={T.green} />} color={T.green} subText="98% confidence score average" />
        <KpiCard label="Manual match needed" value="10 Entries" icon={<IconEdit size={16} color={T.amber} />} color={T.amber} />
        <KpiCard label="Unmatched warnings" value="5 Entries" icon={<IconAlertTriangle size={16} color={T.red} />} color={T.red} />
      </div>

      <div style={{ ...cardStyle({ padding: 18, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #f0fdfa, #ffffff)", border: "1.5px solid #0d9488" }) }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f766e" }}>AI-Powered Bank Statement Import & Reconciliation Engine</h3>
          <p style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>
            Upload PDF/Excel statements, auto-identify parties with NLP, generate vouchers & certify official BRS reports.
          </p>
        </div>
        <button
          onClick={() => navigate("/bank-recon")}
          style={{
            background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
            color: "#fff",
            border: "none",
            borderRadius: T.radiusSm,
            padding: "10px 16px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(15, 118, 110, 0.3)"
          }}
        >
          Launch Bank Automation Console →
        </button>
      </div>

      {/* Side-by-side reconciliation match console */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Left Side: Imported statement entries */}
        <Card style={{ padding: 14 }}>
          <h4 style={{ fontSize: 11, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 10 }}>Imported Statement Entries</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {statementList.map((tx) => (
              <div
                key={tx.id}
                style={{
                  padding: "10px 12px", border: `1.5px solid ${tx.status === "matched" ? T.green : T.border}`,
                  borderRadius: 8, background: tx.status === "matched" ? T.greenBg : "#fff",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: T.text3, fontWeight: 700 }}>{tx.date}</span>
                    <span style={{ fontWeight: 800, fontSize: 11, color: T.text1 }}>{tx.description}</span>
                  </div>
                  {tx.ref && <div style={{ fontSize: 8, color: T.text3, marginTop: 2 }}>Ref: {tx.ref}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: tx.type === "deposit" ? T.green : T.red }}>
                    {tx.type === "deposit" ? "+" : "-"}{inr(tx.amount)}
                  </div>
                  <span style={{ fontSize: 8, color: tx.status === "matched" ? T.green : T.text3, fontWeight: 700 }}>
                    {tx.status === "matched" ? "Matched" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right Side: Matching options */}
        <Card style={{ padding: 14 }}>
          <h4 style={{ fontSize: 11, fontWeight: 800, color: T.primary, textTransform: "uppercase", marginBottom: 10 }}>AI Suggested matches</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {statementList.filter(tx => tx.status === "pending").map((tx, idx) => (
              <div key={idx} style={{ padding: "10px 12px", border: `1.5px solid ${T.border}`, borderRadius: 8, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, paddingBottom: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.text3 }}>Statement Line: {tx.amount} ({tx.date})</span>
                  {tx.confidence && (
                    <span style={{ fontSize: 9, background: T.greenBg, color: T.green, padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>
                      AI Match {tx.confidence}% Confidence
                    </span>
                  )}
                </div>
                {tx.matchedVoucher ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.primary }}>{tx.matchedVoucher}</div>
                        <div style={{ fontSize: 8, color: T.text3, fontWeight: 700, marginTop: 2 }}>Why Matched: {tx.reason}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => handleMatchAccept(tx.id, tx.matchedVoucher!)}
                          style={{ padding: "4px 8px", background: T.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => toast.error("Match rejected")}
                          style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => toast.success("Split matching complete")}
                          style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                        >
                          Split
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: T.text3, fontWeight: 600 }}>No exact match found in ledger books.</span>
                    <button
                      onClick={() => {
                        toast.success("New receipt voucher logged and reconciled.");
                        setStatementList(prev => prev.map(item => item.id === tx.id ? { ...item, status: "matched" } : item));
                      }}
                      style={{ padding: "4px 8px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                    >
                      Auto Create Voucher
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
interface DashboardTabProps {
  onCollect: () => void;
}
function DashboardTab({ onCollect }: DashboardTabProps) {
  const tasks = [
    { label: "Approve pending vouchers", count: 3, badgeText: "3 Pending", color: T.red },
    { label: "GST filing verification mismatch warnings", count: 2, badgeText: "2 warnings", color: T.amber },
    { label: "Automated outstanding reminders dispatch", count: 12, badgeText: "12 reminders due", color: T.primary },
    { label: "Pending bank statements reconciliation entries", count: 8, badgeText: "8 entries", color: T.green },
    { label: "Invoices pending managerial approval", count: 5, badgeText: "5 items", color: T.text2 },
  ];

  const [alerts, setAlerts] = useState([
    { id: "a_1", text: "Cash Flow Prediction Alert: Working capital may become negative within 6 days if outstanding receivable ledger is not collected.", isFlow: true, active: true },
    { id: "a_2", text: "GST Mismatch: A mismatch was discovered on GSTR-2B filing reconciliation inside Reliance Polymers input credit claims.", isGst: true, active: true }
  ]);

  const recentTimeline = [
    { time: "09:21 AM", desc: "Bhavesh approved Voucher SAL-3001" },
    { time: "09:18 AM", desc: "Invoice created (#INV-2901)" },
    { time: "09:10 AM", desc: "GST Return Generated (GSTR-1)" },
    { time: "09:03 AM", desc: "Payment Received (₹90,000 via Patel Enterprises)" },
    { time: "Yesterday", desc: "Purchase Voucher RELI-9018 logged" },
    { time: "Yesterday", desc: "Bank Reconciliation statement match executed" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Greetings Header banner */}
      <div style={{ background: `linear-gradient(135deg, ${T.primary} 0%, #3a0ca3 100%)`, borderRadius: 12, padding: "16px 20px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Good Morning Bhavesh!</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>You have several accounting updates that need your confirmation today.</p>
        </div>
        <div style={{ display: "flex", gap: 8, fontSize: 10 }}>
          <div style={{ background: "rgba(255,255,255,0.12)", padding: "6px 12px", borderRadius: 8 }}>
            <strong>Pending Approvals:</strong> 3 Vouchers
          </div>
          <div style={{ background: "rgba(255,255,255,0.12)", padding: "6px 12px", borderRadius: 8 }}>
            <strong>GST Filing:</strong> Due Tomorrow
          </div>
          <div style={{ background: "rgba(255,255,255,0.12)", padding: "6px 12px", borderRadius: 8 }}>
            <strong>Outstanding:</strong> ₹2.3L Collection
          </div>
        </div>
      </div>

      {/* Actionable AI alert cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.filter(a => a.active).map(a => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fff1f2", border: `1.5px solid ${T.red}18`, borderRadius: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <IconLightbulb size={16} color={T.amber} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.text1 }}>{a.text}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {a.isFlow ? (
                <>
                  <button onClick={() => toast.success("Loading cash flow forecast...")} style={{ padding: "4px 8px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>View Report</button>
                  <button onClick={onCollect} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Collect Outstanding</button>
                </>
              ) : (
                <>
                  <button onClick={() => toast.success("Loading GSTR-2B mismatches...")} style={{ padding: "4px 8px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>View Mismatch</button>
                  <button onClick={() => { toast.success("Automatically reconciled and matched invoice inputs!"); setAlerts(prev => prev.map(item => item.id === a.id ? { ...item, active: false } : item)); }} style={{ padding: "4px 8px", background: T.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Fix Automatically</button>
                </>
              )}
              <button onClick={() => setAlerts(prev => prev.map(item => item.id === a.id ? { ...item, active: false } : item))} style={{ padding: "4px 8px", background: "none", border: "none", color: T.text3, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14 }}>
        {/* Left side: Daily accountant tasks & checklists */}
        <Card style={{ padding: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, color: T.text1, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
            Daily Accountant taskboard
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tasks.map((task, idx) => (
              <div
                key={idx}
                onClick={() => toast.success(`Loading workflow console for: ${task.label}`)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", background: "#f8fafc", border: `1px solid ${T.border}`,
                  borderRadius: 8, cursor: "pointer", transition: "all 0.15s"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.primary}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={false} onChange={() => {}} style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>{task.label}</span>
                </div>
                <span style={badge(task.color, task.color + "10")}>{task.badgeText}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Right side: Recent Activity timeline widget */}
        <Card style={{ padding: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 800, color: T.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
            Recent Activity Timeline
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 4, borderLeft: `1px solid ${T.border}`, position: "relative", marginLeft: 6 }}>
            {recentTimeline.map((step, idx) => (
              <div key={idx} style={{ position: "relative", paddingLeft: 12 }}>
                <div style={{
                  position: "absolute", left: -15.5, top: 4, width: 6, height: 6,
                  borderRadius: 3, background: idx === 0 ? T.primary : T.text3
                }} />
                <div style={{ fontSize: 9, fontWeight: 700, color: T.text1 }}>{step.time}</div>
                <div style={{ fontSize: 8, color: T.text3, marginTop: 2 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function AccountingPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // Branch switcher context
  const [selectedCompany, setSelectedCompany] = useState("ABC Industries");
  const [selectedBranch, setSelectedBranch] = useState("Ahmedabad Branch");
  const [selectedFY, setSelectedFY] = useState("FY 2026-27");
  const [selectedRole, setSelectedRole] = useState("Admin");

  // Selected voucher details drawer state
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [voucherDrawerTab, setVoucherDrawerTab] = useState("details");

  // Creating Voucher FAB state
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createVoucherType, setCreateVoucherType] = useState("sales");

  // Command Palette Ctrl+K state
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  // Ask AI copilot assistant panel state
  const [showAiCopilot, setShowAiCopilot] = useState(false);
  const [aiChat, setAiChat] = useState<{ sender: "user" | "ai", text: string }[]>([
    { sender: "ai", text: "Hello! I am your AI Accounting Copilot. Ask me anything about outstandings, ledgers, or cash flows." }
  ]);

  // Local state dropdowns
  const [filterApproval, setFilterApproval] = useState("all");
  const [filterGst, setFilterGst] = useState("all");
  const [filterSync, setFilterSync] = useState("all");

  const handleContextChange = (type: string, val: string) => {
    toast.loading(`Switching context to ${val}...`, { id: "context-switch", duration: 800 });
    setTimeout(() => {
      if (type === "company") setSelectedCompany(val);
      if (type === "branch") setSelectedBranch(val);
      if (type === "fy") setSelectedFY(val);
      if (type === "role") setSelectedRole(val);
      toast.success(`Active context: ${val}`, { id: "context-switch" });
    }, 450);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Ctrl+K)
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
        toast.success("Command Palette opened");
      }
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setShowCreateModal(true);
        toast.success("Shortcut: Create Voucher modal opened");
      }
      if (e.ctrlKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        const searchInput = document.getElementById("omni-search-input");
        if (searchInput) searchInput.focus();
        toast.success("Shortcut: Search focused");
      }
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        window.print();
        toast.success("Shortcut: Printing register");
      }
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toast.success("Shortcut: Draft voucher state saved");
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setTab("bank-recon");
        toast.success("Shortcut: Opened Bank Reconciliation");
      }
      if (e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setTab("ledger");
        toast.success("Shortcut: Switched to ledger books");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`New ${createVoucherType.toUpperCase()} voucher logged successfully!`);
    setShowCreateModal(false);
  };

  const handleTriggerCommand = (cmd: string) => {
    setShowCommandPalette(false);
    toast.success(`Command Triggered: ${cmd}`);
    if (cmd === "ledger") setTab("ledger");
    if (cmd === "recon") setTab("bank-recon");
    if (cmd === "outstanding") setTab("outstanding");
    if (cmd === "create-sales") { setCreateVoucherType("sales"); setShowCreateModal(true); }
  };

  const handleTriggerAiPrompt = (prompt: string) => {
    setAiChat(prev => [...prev, { sender: "user", text: prompt }]);
    toast.loading("AI thinking...", { id: "ai-copilot", duration: 1000 });
    setTimeout(() => {
      let reply = "I checked the database. No outstanding actions found.";
      if (prompt.includes("cash flow")) reply = "Current reserves stand at ₹70.57L. Cash flow is predicted to remain stable for 6 days, then outstanding payments must be collected.";
      if (prompt.includes("unpaid")) reply = "Found 3 unpaid invoices: Sharma Traders (₹1.25L), Patel Enterprises (₹4.50L), ABC Industries (₹50k).";
      if (prompt.includes("who owes")) reply = "Sharma Traders (overdue 42 days, ₹1.25L) and Patel Enterprises (overdue 18 days, ₹4.50L).";
      if (prompt.includes("SAL-3001")) reply = "Voucher SAL-3001 is a Sales Voucher for ABC Industries totaling ₹88,118. Fully approved, GST filed, and synced with HDFC Bank statement.";

      setAiChat(prev => [...prev, { sender: "ai", text: reply }]);
      toast.success("AI Copilot replied!", { id: "ai-copilot" });
    }, 1000);
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: "8px 16px", border: "none", background: "none",
        fontSize: 12, fontWeight: 700, cursor: "pointer",
        color: tab === t ? T.primary : T.text3,
        borderBottom: tab === t ? `2.5px solid ${T.primary}` : "2.5px solid transparent",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  const selectHeaderStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`, borderRadius: 6,
    padding: "4px 8px", fontSize: 10, color: T.text2,
    background: "#fff", cursor: "pointer", outline: "none",
    fontWeight: 700, boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
  };

  return (
    <div style={{ padding: "16px 20px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%", position: "relative" }}>
      {/* Top switchers context panel bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: T.text3, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <span>Dashboard</span>
            <span>&gt;</span>
            <span>Accounting</span>
            <span>&gt;</span>
            <span style={{ fontWeight: 600, color: T.primary }}>{tab.toUpperCase()}</span>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: T.text1, letterSpacing: "-0.5px" }}>Accounting Workspace</h1>
        </div>

        {/* Company, Branch, FY, Role switchers context */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select value={selectedCompany} onChange={e => handleContextChange("company", e.target.value)} style={selectHeaderStyle}>
            <option value="ABC Industries">ABC Industries</option>
            <option value="Patel Enterprises">Patel Enterprises</option>
            <option value="Sharma Traders">Sharma Traders</option>
          </select>
          <select value={selectedBranch} onChange={e => handleContextChange("branch", e.target.value)} style={selectHeaderStyle}>
            <option value="Ahmedabad Branch">Ahmedabad Branch</option>
            <option value="Mumbai Branch">Mumbai Branch</option>
            <option value="Delhi Branch">Delhi Branch</option>
          </select>
          <select value={selectedFY} onChange={e => handleContextChange("fy", e.target.value)} style={selectHeaderStyle}>
            <option value="FY 2026-27">FY 2026-27</option>
            <option value="FY 2025-26">FY 2025-26</option>
          </select>
          <select value={selectedRole} onChange={e => handleContextChange("role", e.target.value)} style={selectHeaderStyle}>
            <option value="Admin">Admin</option>
            <option value="Accountant">Accountant</option>
            <option value="Auditor">Auditor</option>
            <option value="Owner">Owner</option>
          </select>
        </div>
      </div>

      {/* Main Stats Cards Row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <KpiCard label="Cash Reserves" value="₹12.45L" icon={<IconCoins size={16} color={T.green} />} color={T.green} />
        <KpiCard label="Bank Balance" value="₹58.12L" icon={<IconBank size={16} color={T.primary} />} color={T.primary} subText="HDFC & SBI Accounts" />
        <KpiCard label="Total Receivables" value="₹5.32L" icon={<IconArrowDown size={16} color={T.primary} />} color={T.primary} subText="3 overdue invoices" />
        <KpiCard label="Total Payables" value="₹3.14L" icon={<IconArrowUp size={16} color={T.amber} />} color={T.amber} subText="Due next week" />
      </div>

      {/* Search, Report Export actions bar, and global filter header */}
      <Card style={{ padding: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Omni Search Box & Ask AI button in header */}
          <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 200 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                id="omni-search-input"
                type="text"
                placeholder="Search anything: Vouchers, Parties, Amounts, reference, narrations (Ctrl+K)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "6px 10px", border: `1px solid ${T.border}`,
                  borderRadius: 8, fontSize: 11, background: "#f8fafc", outline: "none"
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.text3, cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <IconX size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowAiCopilot(!showAiCopilot)}
              style={{
                padding: "6px 12px", borderRadius: 8, background: "#06b6d4",
                color: "#fff", border: "none", fontSize: 11, fontWeight: 700,
                cursor: "pointer", boxShadow: "0 2px 4px rgba(6, 182, 212, 0.2)",
                display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap"
              }}
            >
              <IconAI size={13} color="#fff" /> <span>Ask AI</span>
            </button>
          </div>

          {/* Export Report Actions Toolbar */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button onClick={() => toast.success("Exported registry ledger to PDF")} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}><IconFileText size={11} /> PDF</button>
            <button onClick={() => toast.success("Exported registry data to Excel sheet")} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}><IconBarChart size={11} /> Excel</button>
            <button onClick={() => window.print()} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}><IconPrinter size={11} /> Print</button>
            <button onClick={() => toast.success("Audit statement dispatched to email.")} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}><IconMail size={11} /> Email</button>
          </div>

          {/* Smart filters */}
          <select value={filterApproval} onChange={e => setFilterApproval(e.target.value)} style={selectHeaderStyle}>
            <option value="all">All Approval States</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="manager approved">Manager Approved</option>
          </select>
          <select value={filterGst} onChange={e => setFilterGst(e.target.value)} style={selectHeaderStyle}>
            <option value="all">All GST States</option>
            <option value="filed">Filed</option>
            <option value="pending">Pending</option>
            <option value="n/a">N/A</option>
          </select>
          <select value={filterSync} onChange={e => setFilterSync(e.target.value)} style={selectHeaderStyle}>
            <option value="all">All Sync Statuses</option>
            <option value="synced">Synced</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
        {tabBtn("dashboard",   "Dashboard")}
        {tabBtn("vouchers",    "Vouchers")}
        {tabBtn("outstanding", "Outstanding")}
        {tabBtn("ledger",      "Ledger")}
        {tabBtn("bank-recon",  "Bank Reconciliation")}
      </div>

      {/* Tab Renderers */}
      {tab === "dashboard"   && <DashboardTab onCollect={() => setTab("outstanding")} />}
      {tab === "vouchers"    && (
        <VouchersTab
          onSelectVoucher={setSelectedVoucher}
          searchQuery={searchQuery}
          filterApproval={filterApproval}
          filterGst={filterGst}
          filterSync={filterSync}
          onOpenCreate={() => { setCreateVoucherType("sales"); setShowCreateModal(true); }}
        />
      )}
      {tab === "outstanding" && <OutstandingTab />}
      {tab === "ledger"      && <LedgerTab searchQuery={searchQuery} />}
      {tab === "bank-recon"  && <BankReconTab />}

      {/* Voucher detail drawer (Dynamics 365 style) */}
      {selectedVoucher && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 440,
          background: "#fff", borderLeft: `1px solid ${T.border}`, zIndex: 9999,
          boxShadow: "-10px 0 30px rgba(15, 23, 42, 0.15)", display: "flex",
          flexDirection: "column", animation: "slideIn 200ms ease-out"
        }}>
          {/* Drawer Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 18px", borderBottom: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                {selectedVoucher.voucher_type.toUpperCase()} VOUCHER DETAILS
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text1 }}>{selectedVoucher.voucher_number}</h3>
            </div>
            <button
              onClick={() => setSelectedVoucher(null)}
              style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Drawer Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: "#f8fafc" }}>
            {[
              { id: "details", label: "Details" },
              { id: "impact", label: "Ledger Impact" },
              { id: "audit", label: "Audit Log" },
              { id: "files", label: "Files (Drag)" }
            ].map(dt => (
              <button
                key={dt.id}
                onClick={() => setVoucherDrawerTab(dt.id)}
                style={{
                  flex: 1, padding: "8px 10px", background: "none", border: "none",
                  fontSize: 10, fontWeight: 700, color: voucherDrawerTab === dt.id ? T.primary : T.text3,
                  borderBottom: voucherDrawerTab === dt.id ? `2px solid ${T.primary}` : "2px solid transparent",
                  cursor: "pointer"
                }}
              >
                {dt.label}
              </button>
            ))}
          </div>

          {/* Drawer Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 18, fontSize: 11 }}>
            {voucherDrawerTab === "details" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.text3 }}>Party Name:</span>
                  <span style={{ fontWeight: 700, color: T.text1 }}>{selectedVoucher.party_name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.text3 }}>Voucher Date:</span>
                  <span style={{ fontWeight: 600 }}>{selectedVoucher.voucher_date}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.text3 }}>Reference Invoice:</span>
                  <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{selectedVoucher.reference_number || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.text3 }}>Narration:</span>
                  <span style={{ fontWeight: 600, color: T.text2, maxWidth: 200, textAlign: "right" }}>{selectedVoucher.narration}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${T.border}`, paddingTop: 6 }}>
                  <span style={{ color: T.text3 }}>GST State:</span>
                  <span style={badge(selectedVoucher.gst_status === "Filed" ? T.green : T.amber, selectedVoucher.gst_status === "Filed" ? T.greenBg : T.amberBg)}>
                    {selectedVoucher.gst_status}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.text3 }}>Total Amount:</span>
                  <span style={{ fontWeight: 800, color: T.text1, fontSize: 13 }}>{inr(selectedVoucher.total)}</span>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />

                <div style={{ fontWeight: 700, color: T.text1, marginBottom: 4 }}>Voucher Items List</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {selectedVoucher.items.map((item: any, idx: number) => (
                    <div key={idx} style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.desc}</div>
                        <div style={{ fontSize: 9, color: T.text3 }}>Qty: {item.qty} · Rate: {inr(item.rate)}</div>
                      </div>
                      <span style={{ fontWeight: 700 }}>{inr(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {voucherDrawerTab === "impact" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 700, color: T.text1, marginBottom: 4 }}>Double-Entry Journal Postings</div>
                {selectedVoucher.ledger_impact.map((li: any, idx: number) => (
                  <div key={idx} style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: T.text2 }}>{li.account}</div>
                      <span style={{ fontSize: 8, color: li.debit > 0 ? T.red : T.green, fontWeight: 700 }}>
                        {li.debit > 0 ? "Debit (Dr)" : "Credit (Cr)"}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 800, color: li.debit > 0 ? T.red : T.green }}>
                        {li.debit > 0 ? `+${inr(li.debit)}` : `-${inr(li.credit)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {voucherDrawerTab === "audit" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 4, borderLeft: `1px solid ${T.border}`, marginLeft: 6 }}>
                {selectedVoucher.audit_trail.map((trail: any, idx: number) => (
                  <div key={idx} style={{ position: "relative", paddingLeft: 12 }}>
                    <div style={{ position: "absolute", left: -7.5, top: 4, width: 6, height: 6, borderRadius: 3, background: T.primary }} />
                    <div style={{ fontWeight: 700, color: T.text1 }}>{trail.user}</div>
                    <div style={{ fontSize: 9, color: T.text2 }}>{trail.action}</div>
                    <div style={{ fontSize: 8, color: T.text3, marginTop: 2 }}>{trail.time}</div>
                  </div>
                ))}
              </div>
            )}

            {voucherDrawerTab === "files" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Drag and drop zone */}
                <div
                  onClick={() => toast.success("Drag & Drop File upload triggered")}
                  style={{
                    border: `2px dashed ${T.border}`, borderRadius: 8, padding: 20,
                    textAlign: "center", background: "#f8fafc", cursor: "pointer",
                    transition: "border-color 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.primary}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                >
                  <IconUpload size={24} color={T.primary} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, marginTop: 6 }}>Drag & Drop bill photo, GST slips or invoice scans</div>
                  <div style={{ fontSize: 8, color: T.text3, marginTop: 2 }}>Supports PDF, PNG, JPG up to 10MB</div>
                </div>

                <div style={{ fontWeight: 700, color: T.text1, marginTop: 10 }}>Uploaded Voucher Attachments</div>
                {selectedVoucher.documents.map((doc: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => toast.success(`Downloading file: ${doc}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 8px",
                      background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 6,
                      fontSize: 9, color: T.text2, cursor: "pointer", fontWeight: 600
                    }}
                  >
                    <IconFolder size={12} color={T.text3} />
                    <span>{doc}</span>
                    <span style={{ fontSize: 8, color: T.primary, marginLeft: "auto" }}>Download</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) Menu & Repositioned Ask AI Panel */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        {showAiCopilot && (
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12,
            width: 320, height: 380, display: "flex", flexDirection: "column",
            boxShadow: "0 15px 40px rgba(0,0,0,0.15)", marginBottom: 8, overflow: "hidden"
          }}>
            <div style={{ background: T.primary, color: "#fff", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}><IconAI size={14} color="#fff" /> Accounting AI Assistant</span>
              <button onClick={() => setShowAiCopilot(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 12 }}><IconX size={14} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {aiChat.map((msg, idx) => (
                <div key={idx} style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  background: msg.sender === "user" ? T.primary : "#f1f5f9",
                  color: msg.sender === "user" ? "#fff" : T.text1,
                  padding: "6px 10px", borderRadius: 8, fontSize: 10, maxWidth: "80%",
                  fontWeight: 600, lineHeight: 1.4
                }}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div style={{ padding: 10, background: "#f8fafc", borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: T.text3, textTransform: "uppercase", marginBottom: 6 }}>Quick AI Commands</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {[
                  "Show today's cash flow",
                  "Find unpaid invoices",
                  "Who owes us money?",
                  "Explain voucher SAL-3001"
                ].map(p => (
                  <button
                    key={p}
                    onClick={() => handleTriggerAiPrompt(p)}
                    style={{
                      padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`,
                      borderRadius: 6, fontSize: 8, fontWeight: 700, color: T.text2, cursor: "pointer"
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showFabMenu && (
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10,
            padding: 6, display: "flex", flexDirection: "column", gap: 4,
            boxShadow: T.shadow, animation: "slideUp 150ms ease-out"
          }}>
            {[
              { type: "sales", label: "Create Sales Voucher" },
              { type: "purchase", label: "Create Purchase Voucher" },
              { type: "receipt", label: "Create Receipt" },
              { type: "payment", label: "Create Payment" },
              { type: "journal", label: "Create Journal" },
              { type: "customer", label: "Create Customer" },
              { type: "vendor", label: "Create Vendor" },
              { type: "more", label: "More Options..." }
            ].map(opt => (
              <button
                key={opt.type}
                onClick={() => {
                  if (opt.type === "customer" || opt.type === "vendor") {
                    navigate("/masters");
                    toast.success(`Redirected to Masters page to create ${opt.type}`);
                  } else if (opt.type === "more") {
                    toast.success("Additional accounting workflows available in command palette (Ctrl+K)");
                  } else {
                    setCreateVoucherType(opt.type);
                    setShowCreateModal(true);
                  }
                  setShowFabMenu(false);
                }}
                style={{
                  display: "block", width: "100%", padding: "6px 12px", border: "none",
                  background: "none", fontSize: 10, fontWeight: 700, color: T.text2,
                  textAlign: "left", cursor: "pointer", borderRadius: 4, transition: "background 0.1s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          style={{
            width: 44, height: 44, borderRadius: 22, background: T.primary,
            color: "#fff", border: "none", fontSize: 20, fontWeight: 800,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 10px 25px rgba(67, 97, 238, 0.3)"
          }}
        >
          {showFabMenu ? <IconX size={20} /> : <IconPlus size={20} />}
        </button>
      </div>

      {/* Creation Voucher Modal Overlay */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16,
            width: "100%", maxWidth: 420, padding: 22, boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>New {createVoucherType.toUpperCase()} Voucher Entry</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", fontSize: 16, color: T.text3, cursor: "pointer" }}><IconX size={14} /></button>
            </div>

            <form onSubmit={handleCreateVoucher} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: T.text3, fontWeight: 700 }}>Party Name</label>
                <input
                  type="text"
                  placeholder="e.g. Reliance Polymers Ltd"
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: T.text3, fontWeight: 700 }}>Voucher Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: T.text3, fontWeight: 700 }}>Narration / Description</label>
                <textarea
                  placeholder="Reference bills or adjust journals"
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, height: 60 }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
                  padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 6
                }}
              >
                Post Voucher Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Command Palette Overlay Modal (Ctrl + K) */}
      {showCommandPalette && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(2px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 999999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12,
            width: "100%", maxWidth: 450, padding: 14, boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column", gap: 10
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase" }}>ERP Command Palette</span>
              <button onClick={() => setShowCommandPalette(false)} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 12 }}><IconX size={14} /></button>
            </div>
            <input
              type="text"
              placeholder="Type a command (e.g. Ledger, Outstanding, Create Sales)..."
              value={commandQuery}
              onChange={e => setCommandQuery(e.target.value)}
              style={{
                padding: "8px 12px", border: `1.5px solid ${T.primary}`, borderRadius: 8,
                fontSize: 12, outline: "none", background: "#f8fafc"
              }}
              autoFocus
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
              {[
                { id: "create-sales", label: "Create Sales Voucher", category: "Action" },
                { id: "ledger", label: "Open General Ledger Tab", category: "Navigation" },
                { id: "outstanding", label: "Open Outstanding Reports Tab", category: "Navigation" },
                { id: "recon", label: "Open Bank Reconciliation Console", category: "Navigation" },
                { id: "gst", label: "Open GST Returns Page", category: "Navigation" },
              ].filter(c => c.label.toLowerCase().includes(commandQuery.toLowerCase())).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleTriggerCommand(c.id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", padding: "8px 12px", border: "none", background: "none",
                    fontSize: 11, color: T.text1, fontWeight: 700, cursor: "pointer",
                    borderRadius: 6, textAlign: "left", transition: "all 0.1s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <span>{c.label}</span>
                  <span style={{ fontSize: 8, background: T.border, color: T.text3, padding: "2px 6px", borderRadius: 4 }}>{c.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
