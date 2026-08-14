// src/pages/BankingPage.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge, inr, thStyle, tdStyle } from "../store/theme";
import { IconBank, IconMoney, IconCheckCircle, IconClock, IconUser, IconBuilding } from "../components/Icons";
import toast from "react-hot-toast";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
  BarChart, Bar, Legend, LineChart, Line
} from "recharts";
import {
  Download, Copy, Share2, Mail, FileSpreadsheet,
  Settings, Layers, Sliders, Ruler, Landmark, FileText, CheckCircle2,
  AlertTriangle, Calendar as IconCal, Info, Printer, ShieldAlert,
  Check, X, Eye, HelpCircle, ShieldCheck, ChevronRight, Activity, Clock,
  ArrowRightLeft, AlertCircle, RefreshCw, Send, Plus
} from "lucide-react";

type Tab =
  | "dashboard"
  | "accounts"
  | "transactions"
  | "beneficiaries"
  | "transfer"
  | "approvals"
  | "investments"
  | "recon"
  | "collect"
  | "cheques"
  | "calendar"
  | "analytics"
  | "reports";

// ── Mock Databases ────────────────────────────────────────────────────────────

const BANK_ACCOUNTS_MOCK = [
  {
    id: "acc_1",
    name: "HDFC Corporate Current A/C",
    accNum: "50200089123456",
    balance: 4812000.0,
    availBalance: 4612000.0,
    freezeAmount: 0.0,
    lienAmount: 200000.0,
    branch: "Mumbai Fort",
    type: "Current",
    status: "Connected",
    ifsc: "HDFC0000060",
    holder: "Daynisc Technologies Pvt Ltd",
    currency: "INR (₹)",
    usdEquiv: 57690, // Conversions for multi-currency view
    eurEquiv: 53740,
    lastSync: "30-Jun 00:25"
  },
  {
    id: "acc_2",
    name: "ICICI Cash Credit A/C",
    accNum: "002405001234",
    balance: -750000.0,
    availBalance: 1250000.0,
    freezeAmount: 0.0,
    lienAmount: 0.0,
    branch: "Baroda Alkapuri",
    type: "Cash Credit",
    status: "Connected",
    ifsc: "ICIC0000024",
    holder: "Daynisc Technologies Pvt Ltd",
    currency: "INR (₹)",
    usdEquiv: -9000,
    eurEquiv: -8380,
    lastSync: "30-Jun 00:10"
  },
  {
    id: "acc_3",
    name: "SBI Working Capital Loan",
    accNum: "33012948571",
    balance: -2250000.0,
    availBalance: 2750000.0,
    freezeAmount: 0.0,
    lienAmount: 0.0,
    branch: "Ahmedabad CG Road",
    type: "Term Loan",
    status: "Connected",
    ifsc: "SBIN0002032",
    holder: "Daynisc Technologies Pvt Ltd",
    currency: "INR (₹)",
    usdEquiv: -27010,
    eurEquiv: -25140,
    lastSync: "29-Jun 23:45"
  },
  {
    id: "acc_4",
    name: "Petty Cash Drawer Box",
    accNum: "CUST-BOX-R01",
    balance: 12450.0,
    availBalance: 12450.0,
    freezeAmount: 0.0,
    lienAmount: 0.0,
    branch: "Headquarters Vault",
    type: "Cash Vault",
    status: "Offline",
    ifsc: "N/A",
    holder: "Admin Officer Cashier",
    currency: "INR (₹)",
    usdEquiv: 150,
    eurEquiv: 140,
    lastSync: "Manual Log"
  }
];

const BANK_APIS_MOCK = [
  { bank: "HDFC Bank", status: "Connected", latency: "42ms", type: "Direct API Integration", lastCheck: "1 min ago" },
  { bank: "ICICI Bank", status: "Connected", latency: "58ms", type: "Corporate API Link", lastCheck: "5 mins ago" },
  { bank: "SBI Bank", status: "Connected", latency: "120ms", type: "Corporate netbanking API", lastCheck: "10 mins ago" },
  { bank: "Axis Bank", status: "Disconnected", latency: "N/A", type: "Direct API Integration", lastCheck: "Failed" }
];

const BANK_LIMITS_MOCK = [
  { name: "Cash Credit Limit", limit: 2000000, used: 750000, type: "CC", expiry: "2027-03-31" },
  { name: "Overdraft Limit", limit: 500000, used: 0, type: "OD", expiry: "2026-12-31" },
  { name: "Bank Guarantee Limit", limit: 3000000, used: 1200000, type: "BG", expiry: "2027-06-30" },
  { name: "Letter of Credit Limit", limit: 5000000, used: 2500000, type: "LC", expiry: "2026-09-30" }
];

const MOCK_BENEFICIARIES = [
  { id: "b_1", name: "Supreme Plastics Ltd", bank: "ICICI Bank", accNum: "0024091283", ifsc: "ICIC0000024", upi: "supreme@okicici", type: "Vendor", status: "Approved" },
  { id: "b_2", name: "Sharma Traders", bank: "HDFC Bank", accNum: "502000293812", ifsc: "HDFC0000060", upi: "sharmatraders@okhdfc", type: "Vendor", status: "Approved" },
  { id: "b_3", name: "Ramesh Shah", bank: "Axis Bank", accNum: "912010092831", ifsc: "UTIB0000010", upi: "ramesh@okaxis", type: "Employee", status: "Approved" },
  { id: "b_4", name: "GSTIN Central Tax", bank: "RBI Treasury", accNum: "90001239841", ifsc: "RBIS0000001", upi: "gstin@sbi", type: "Government", status: "Approved" },
  { id: "b_5", name: "Maa Enterprise", bank: "SBI Bank", accNum: "3109283102", ifsc: "SBIN0002032", upi: "maa@oksbi", type: "Customer", status: "Pending Verification" }
];

const MOCK_APPROVALS = [
  { id: "ap_1", payee: "Reliance Polymers Ltd", amt: 120000, date: "2026-06-30", creator: "Accountant (Ramesh)", status: "Pending Finance Manager", remark: "Invoice payment for RAW-901" },
  { id: "ap_2", payee: "Verma Chemicals", amt: 45000, date: "2026-06-30", creator: "Accountant (Ramesh)", status: "Pending Director", remark: "Urgent purchase batch payment" },
  { id: "ap_3", payee: "Capital Office Rentals", amt: 75000, date: "2026-06-29", creator: "Accountant (Ramesh)", status: "Approved", remark: "Rent invoice - June 2026" }
];

const MOCK_INVESTMENTS = [
  { id: "inv_1", name: "ICICI Prudential Liquid Fund", type: "Liquid Fund", principal: 1500000, current: 1584000, roi: "7.2%", maturity: "Open-Ended" },
  { id: "inv_2", name: "SBI Corporate Bond Series IV", type: "Corporate Bond", principal: 1000000, current: 1085000, roi: "8.5%", maturity: "2028-06-15" },
  { id: "inv_3", name: "Government of India Treasury Bills", type: "Govt Bonds", principal: 2500000, current: 2665000, roi: "6.9%", maturity: "2026-12-10" }
];

const MOCK_CALENDAR = [
  { date: "2026-07-01", type: "Interest Credit", title: "Accrued interest yield ICICI", amt: 18500, bank: "ICICI CC" },
  { date: "2026-07-05", type: "EMI Due", title: "HDFC Corporate Vehicle Loan", amt: 28500, bank: "HDFC Current" },
  { date: "2026-07-10", type: "EMI Due", title: "SBI Working Capital Loan Due", amt: 125000, bank: "SBI Loan" },
  { date: "2026-07-15", type: "GST Payment", title: "Central GST Filing Outflow", amt: 425000, bank: "HDFC Current" },
  { date: "2026-07-16", type: "Bank Holiday", title: "National Banking Holiday (Bakri-Id)", amt: 0, bank: "All Banks" }
];

const MOCK_REMINDER_LOGS = [
  { id: "rem_1", time: "2026-06-30 09:15", type: "EMI Due Alert", channel: "WhatsApp", target: "Finance Director", status: "Delivered" },
  { id: "rem_2", time: "2026-06-30 08:00", type: "Low Balance warning HDFC", channel: "SMS", target: "Cashier Officer", status: "Sent" },
  { id: "rem_3", time: "2026-06-29 18:30", type: "Cheque Expiry Alert", channel: "Email", target: "Accounts Team", status: "Opened" }
];

const MOCK_RECON_HISTORY = [
  { month: "June 2026", matched: 521, unmatched: 12, ignored: 5, autoMatched: 480, manualMatched: 41 },
  { month: "May 2026", matched: 495, unmatched: 8, ignored: 3, autoMatched: 440, manualMatched: 55 },
  { month: "April 2026", matched: 612, unmatched: 15, ignored: 6, autoMatched: 580, manualMatched: 32 }
];

const MOCK_AUDIT_TRAIL = [
  { time: "2026-06-30 00:26", user: "Bhavesh Khimsuriya", action: "Approved Payment Batch #PAY-1102", ip: "192.168.1.112", device: "Chrome Win11", before: "Pending Approval", after: "Approved & Queued" },
  { time: "2026-06-29 23:45", user: "Ramesh Shah (Accountant)", action: "Uploaded MT940 Bank Statement", ip: "192.168.1.115", device: "Vivaldi Desktop", before: "Draft", after: "AI Reconciliation Pending" },
  { time: "2026-06-29 22:10", user: "Ramesh Shah (Accountant)", action: "Linked Axis Bank API credentials", ip: "192.168.1.115", device: "Vivaldi Desktop", before: "Inactive", after: "Pending verification" }
];

const MOCK_TRANSACTIONS = [
  { date: "2026-06-29", type: "Credit", desc: "Patel Enterprises Cheque Clearing", bank: "HDFC", voucher: "REC-223", amount: 90000, balance: 4812000, sync: true, category: "Sales", customer: "Patel Enterprises" },
  { date: "2026-06-28", type: "Debit", desc: "Supreme Plastics Vendor Payment", bank: "HDFC", voucher: "PAY-1102", amount: 45000, balance: 4722000, sync: true, category: "Purchase", customer: "Supreme Plastics Ltd" },
  { date: "2026-06-27", type: "Credit", desc: "Cash Deposit Ahmedabad Branch", bank: "HDFC", voucher: "CSH-90123", amount: 15000, balance: 4767000, sync: true, category: "Cash Deposit", customer: "Self" },
  { date: "2026-06-26", type: "Debit", desc: "HDFC SMS & Maintenance Charges", bank: "HDFC", voucher: "CHG-0012", amount: 1200, balance: 4752000, sync: true, category: "Bank Charges", customer: "HDFC Bank" },
  { date: "2026-06-25", type: "Credit", desc: "ABC Industries RTGS Inward", bank: "ICICI", voucher: "SAL-3001", amount: 1250000, balance: -750000, sync: false, category: "Sales", customer: "ABC Industries" },
  { date: "2026-06-24", type: "Debit", desc: "Vehicle Loan EMI auto debit", bank: "SBI", voucher: "EMI-9018", amount: 28500, balance: -2250000, sync: true, category: "Loan EMI", customer: "SBI Bank" }
];

const MOCK_TRANSFER_HISTORY = [
  { id: "tx_1", date: "2026-06-30", src: "HDFC Current", dest: "ICICI CC", amt: 50000, status: "Completed", type: "NEFT" },
  { id: "tx_2", date: "2026-06-29", src: "Petty Cash", dest: "HDFC Current", amt: 10000, status: "Completed", type: "Cash Deposit" },
  { id: "tx_3", date: "2026-06-28", src: "ICICI CC", dest: "SBI Loan", amt: 250000, status: "Scheduled", type: "RTGS" }
];

const MOCK_EMI_SCHEDULE = [
  { emiNo: 1, date: "2026-07-05", principal: 22000, interest: 6500, balance: 658000, status: "Pending" },
  { emiNo: 2, date: "2026-08-05", principal: 22150, interest: 6350, balance: 635850, status: "Pending" },
  { emiNo: 3, date: "2026-09-05", principal: 22300, interest: 6200, balance: 613550, status: "Pending" },
  { emiNo: 4, date: "2026-05-05", principal: 21700, interest: 6800, balance: 680000, status: "Paid" },
  { emiNo: 5, date: "2026-06-05", principal: 21850, interest: 6650, balance: 658150, status: "Paid" }
];

// Charts Mock Data
const ANALYTICS_CASHFLOW_DATA = [
  { month: "Jan", inflow: 1200000, outflow: 850000, net: 350000 },
  { month: "Feb", inflow: 1450000, outflow: 980000, net: 470000 },
  { month: "Mar", inflow: 1900000, outflow: 1400000, net: 500000 },
  { month: "Apr", inflow: 1100000, outflow: 950000, net: 150000 },
  { month: "May", inflow: 1650000, outflow: 1120000, net: 530000 },
  { month: "Jun", inflow: 2200000, outflow: 1350000, net: 850000 },
];

const BANK_PIE_DATA = [
  { name: "HDFC Current", value: 4812000, color: "#4361ee" },
  { name: "ICICI Cash Credit", value: 750000, color: "#0891b2" },
  { name: "SBI Working Capital", value: 2250000, color: "#dc2626" },
  { name: "Petty Cash Vault", value: 12450, color: "#16a34a" }
];

const WEEKLY_TX_DATA = [
  { name: "Wk 23", collections: 240000, payments: 180000 },
  { name: "Wk 24", collections: 390000, payments: 310000 },
  { name: "Wk 25", collections: 150000, payments: 90000 },
  { name: "Wk 26", collections: 480000, payments: 410000 },
  { name: "Wk 27", collections: 90000, payments: 45000 }
];

const FORECAST_7D = [
  { day: "Day 1", expectedIn: 120000, expectedOut: 85000 },
  { day: "Day 2", expectedIn: 45000, expectedOut: 11000 },
  { day: "Day 3", expectedIn: 210000, expectedOut: 95000 },
  { day: "Day 4", expectedIn: 15000, expectedOut: 125000 },
  { day: "Day 5", expectedIn: 90000, expectedOut: 40000 },
  { day: "Day 6", expectedIn: 65000, expectedOut: 12000 },
  { day: "Day 7", expectedIn: 480000, expectedOut: 310000 }
];

const FORECAST_30D = [
  { day: "Week 1", expectedIn: 950000, expectedOut: 580000 },
  { day: "Week 2", expectedIn: 1200000, expectedOut: 910000 },
  { day: "Week 3", expectedIn: 850000, expectedOut: 450000 },
  { day: "Week 4", expectedIn: 1400000, expectedOut: 1100000 }
];

const FORECAST_90D = [
  { day: "Month 1", expectedIn: 4400000, expectedOut: 3040000 },
  { day: "Month 2", expectedIn: 3900000, expectedOut: 3150000 },
  { day: "Month 3", expectedIn: 5200000, expectedOut: 4200000 }
];

const MOCK_REPORTS_LIST = [
  { id: "rep_bank_book", name: "Bank Book Ledger", desc: "Detailed debit and credit ledger logs for all linked bank accounts.", type: "Bank Ledger" },
  { id: "rep_cash_book", name: "Cash Book Ledger", desc: "Physical cash inflow, outflow, and vault balance verification registers.", type: "Cash Vault" },
  { id: "rep_bank_reg", name: "Bank Transaction Register", desc: "Consolidated transaction registry with check numbers and online UTR refs.", type: "Registry" },
  { id: "rep_recon", name: "Bank Reconciliation Statement", desc: "Difference logging between active book balances and live bank statement feeds.", type: "Reconciliation" },
  { id: "rep_loans", name: "Outstanding Loan Report", desc: "Active liabilities, EMI summaries, paid interests, and limits usage tracking.", type: "Liabilities" },
  { id: "rep_fds", name: "Fixed & Recurring Deposits Register", desc: "Investments breakdown, accrued yields, interest schedules, and maturity timelines.", type: "Investments" },
  { id: "rep_interest", name: "Interest Cost Analysis", desc: "Accrued interest cost analysis for Working Capital and Term loans.", type: "Cost Center" },
  { id: "rep_charges", name: "Bank Charges Ledger", desc: "Bank charge categorization (maintenance fees, SMS fees, bounce penalty fees).", type: "Expenses" },
  { id: "rep_cash_flow", name: "Cash Flow Statement (Direct Method)", desc: "Inflow from customers, outflow to suppliers, net operations treasury movements.", type: "Cash Flow" },
  { id: "rep_deposit", name: "Deposit Slip Logs", desc: "Historical cash deposit slips and cheque clearance drop logs.", type: "Audit Trail" }
];

const MOCK_CHEQUES = [
  { num: "009874", party: "Reliance Polymers Ltd", date: "2026-06-30", amt: 120000, status: "Pending Dispatch" },
  { num: "009873", party: "Verma Chemicals", date: "2026-06-29", amt: 45000, status: "Cleared" },
  { num: "009872", party: "Supreme Plastics Ltd", date: "2026-06-28", amt: 150000, status: "Cleared" }
];

const FORECAST_DATA = [
  { day: "Today", actual: 8502000, projected: 8502000 },
  { day: "Day 5", projected: 8650000 },
  { day: "Day 10", projected: 8420000 },
  { day: "Day 15", projected: 8890000 },
  { day: "Day 20", projected: 9120000 },
  { day: "Day 25", projected: 8990000 },
  { day: "Day 30", projected: 9350000 }
];

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...cardStyle({ padding: 18 }), ...style }}>
      {children}
    </div>
  );
}

const MOCK_LOANS = [
  { id: "loan_1", name: "SBI Working Capital Term Loan", limit: 5000000, outstanding: 2250000, emi: 28500, rate: "9.2% p.a.", dueDate: "05-Jul", status: "Active" },
  { id: "loan_2", name: "HDFC Corporate Vehicle Loan", limit: 1200000, outstanding: 658000, emi: 28500, rate: "8.8% p.a.", dueDate: "10-Jul", status: "Active" }
];

const MOCK_FDS = [
  { id: "fd_1", name: "HDFC Fixed Deposit (180 Days)", principal: 1500000, rate: "7.1%", maturity: "2026-12-25", accruedInterest: 53250, status: "Active" },
  { id: "fd_2", name: "ICICI Accumulation FD", principal: 2000000, rate: "7.35%", maturity: "2027-03-15", accruedInterest: 36750, status: "Active" }
];

const inputFilterStyle: React.CSSProperties = {
  padding: "6px 10px", border: `1px solid ${T.border}`,
  borderRadius: 6, fontSize: 10, background: "#f8fafc", outline: "none",
  color: T.text2, width: "100%", boxSizing: "border-box"
};

const selectStyle: React.CSSProperties = {
  padding: "6px 10px", border: `1px solid ${T.border}`,
  borderRadius: 6, fontSize: 11, background: "#fff", outline: "none",
  color: T.text2, cursor: "pointer"
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon,
  color,
  trend,
  subText,
  onClick
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: { val: string; up: boolean };
  subText?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        ...cardStyle({ padding: "16px 20px", flex: 1, minWidth: 200 }),
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        position: "relative"
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = T.shadowMd;
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = T.shadow;
        }
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text1 }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        {trend && (
          <span style={{ fontSize: 9, fontWeight: 700, color: trend.up ? T.green : T.red }}>
            {trend.val}
          </span>
        )}
        {subText && <span style={{ fontSize: 9, color: T.text3 }}>{subText}</span>}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
      <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill || "#fff", fontSize: 13, fontWeight: 600, margin: "2px 0" }}>
          {p.name ? `${p.name}: ` : ""}{inr(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function BankingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Draggable/Configurable widgets status
  const [visibleWidgets, setVisibleWidgets] = useState({
    cashPosition: true,
    weeklyCollections: true,
    liabilities: true,
    alerts: true
  });
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);

  // AI Prompt Assistant Responses state
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Multi-Currency selected currency view
  const [currencyMode, setCurrencyMode] = useState<"INR" | "USD" | "EUR">("INR");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBank, setFilterBank] = useState("all");
  const [filterTxType, setFilterTxType] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterAmtMin, setFilterAmtMin] = useState("");
  const [filterAmtMax, setFilterAmtMax] = useState("");
  const [filterVoucher, setFilterVoucher] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [filterSyncedOnly, setFilterSyncedOnly] = useState(false);

  // Context dropdown states
  const [selectedCompany, setSelectedCompany] = useState("ABC Industries");
  const [selectedBranch, setSelectedBranch] = useState("Ahmedabad Branch");
  const [selectedFY, setSelectedFY] = useState("FY 2026-27");

  // Speed Dial FAB State
  const [showSpeedDial, setShowSpeedDial] = useState(false);

  // Modals state
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<"payment" | "receipt">("payment");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reconDetailItem, setReconDetailItem] = useState<any | null>(null);
  const [showDigitalTokenModal, setShowDigitalTokenModal] = useState(false);
  const [approvingItem, setApprovingItem] = useState<any | null>(null);
  const [tokenCode, setTokenCode] = useState("");

  // Denominations calculator state
  const [notes2000, setNotes2000] = useState(0);
  const [notes500, setNotes500] = useState(0);
  const [notes200, setNotes200] = useState(0);
  const [notes100, setNotes100] = useState(0);
  const [notes50, setNotes50] = useState(0);
  const [notes20, setNotes20] = useState(0);

  // Single Fund Transfer State
  const [transferSrc, setTransferSrc] = useState("acc_1");
  const [transferDest, setTransferDest] = useState("acc_2");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRule, setTransferRule] = useState("immediate");
  const [transferHistory, setTransferHistory] = useState(MOCK_TRANSFER_HISTORY);

  // Bulk Payment Uploader state
  const [bulkStep, setBulkStep] = useState(1); // Steps: 1: Upload, 2: Validate, 3: Maker Approvals, 4: OTP/UTR, 5: Finished
  const [bulkFile, setBulkFile] = useState<string | null>(null);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkData, setBulkData] = useState<any[]>([]);

  // Import Statement Wizard state
  const [wizardStep, setWizardStep] = useState(1); // 1: Select Format, 2: Preview, 3: Column Mapping, 4: Error Check, 5: Done
  const [importBank, setImportBank] = useState("hdfc");
  const [importFormat, setImportFormat] = useState("pdf");
  const [wizardFile, setWizardFile] = useState<string | null>(null);

  // Beneficiary form
  const [beneficiaries, setBeneficiaries] = useState(MOCK_BENEFICIARIES);
  const [showNewBeneficiaryModal, setShowNewBeneficiaryModal] = useState(false);
  const [newBenName, setNewBenName] = useState("");
  const [newBenBank, setNewBenBank] = useState("HDFC Bank");
  const [newBenAcc, setNewBenAcc] = useState("");
  const [newBenIfsc, setNewBenIfsc] = useState("");
  const [newBenUpi, setNewBenUpi] = useState("");
  const [newBenType, setNewBenType] = useState("Vendor");

  // Approval queue
  const [approvalsQueue, setApprovalsQueue] = useState(MOCK_APPROVALS);

  // Cash forecast filter
  const [forecastInterval, setForecastInterval] = useState<"7d" | "30d" | "90d">("7d");

  // UPI Link generator state
  const [upiCustomer, setUpiCustomer] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [generatedQR, setGeneratedQR] = useState(false);

  // Cheque Designer state
  const [chequeTemplate, setChequeTemplate] = useState("hdfc");
  const [paperSize, setPaperSize] = useState("standard");
  const [showRulers, setShowRulers] = useState(true);
  const [offsetPayee, setOffsetPayee] = useState(0);
  const [offsetAmount, setOffsetAmount] = useState(0);
  const [offsetDate, setOffsetDate] = useState(0);
  const [offsetSign, setOffsetSign] = useState(0);

  // Statement Import matching list
  const [statementMatches, setStatementMatches] = useState([
    { id: "st_1", date: "29-Jun", desc: "RTGS INWARD - SUPREME PLASTICS", ref: "TXN90218", amount: 90000, type: "Credit", matchVoucher: "REC-223", confidence: 98, status: "pending", reason: "Invoice number and value match precisely. 1 day date difference.", party: "Supreme Plastics Ltd" },
    { id: "st_2", date: "28-Jun", desc: "NEFT INWARD - RELIANCE POLYMERS", ref: "UTRN880912", amount: 120000, type: "Credit", matchVoucher: "PUR-2005", confidence: 85, status: "pending", reason: "Amount matched. Party name overlap verified.", party: "Reliance Polymers Ltd" },
    { id: "st_3", date: "27-Jun", desc: "INTEREST CHARGES CHARGED", ref: "INT9018", amount: 1200, type: "Debit", matchVoucher: null, confidence: null, status: "pending", reason: "Bank interest charge. No direct matching ledger voucher found.", party: "SBI Bank" }
  ]);

  const { data: bankTxData } = useQuery({
    queryKey: ["banking-tx-list"],
    queryFn: () => api.get("/banking/transactions", { params: { limit: 2000 } }).then(r => r.data).catch(() => ({ items: [] }))
  });

  useEffect(() => {
    if (bankTxData?.items && bankTxData.items.length > 0) {
      const liveMatches = bankTxData.items.map((tx: any, idx: number) => ({
        id: tx.id || `st_${idx}`,
        date: tx.date || "Today",
        desc: tx.description || "Bank Transaction",
        ref: tx.reference_number || `REF-${idx}`,
        amount: tx.withdrawal > 0 ? tx.withdrawal : tx.deposit,
        type: tx.withdrawal > 0 ? "Debit" : "Credit",
        matchVoucher: tx.voucher_type ? `${tx.voucher_type.toUpperCase()}-${idx+100}` : "VCH",
        confidence: 98,
        status: "pending",
        reason: "Matched from statement upload",
        party: tx.party_name || "Vendor/Customer"
      }));
      setStatementMatches(liveMatches);
    }
  }, [bankTxData]);

  const handleMatchAccept = (id: string) => {
    toast.success("AI suggested bank match accepted and reconciled!");
    setStatementMatches(prev => prev.map(m => m.id === id ? { ...m, status: "reconciled" } : m));
  };

  const handleContextChange = (type: string, val: string) => {
    toast.loading(`Loading context: ${val}...`, { id: "ctx", duration: 650 });
    setTimeout(() => {
      if (type === "company") setSelectedCompany(val);
      if (type === "branch") setSelectedBranch(val);
      if (type === "fy") setSelectedFY(val);
      toast.success(`Active context: ${val}`, { id: "ctx" });
    }, 400);
  };

  // Denominations grand total
  const denomTotal = (notes2000 * 2000) + (notes500 * 500) + (notes200 * 200) + (notes100 * 100) + (notes50 * 50) + (notes20 * 20);

  // AI Prompt Assistant Trigger
  const runAIPrompt = (promptText: string) => {
    setAiQuery(promptText);
    setAiLoading(true);
    setAiResponse(null);
    setTimeout(() => {
      setAiLoading(false);
      if (promptText.includes("Why is cash flow low")) {
        setAiResponse("Cash reserves decreased by 12% this week due to an outflow of ₹4.25L central GST payments and raw materials purchases of ₹1.20L from Reliance Polymers. Direct collections from Patel Enterprises (₹90,000) was delayed by 4 days, resulting in temporary net outflow.");
      } else if (promptText.includes("duplicate payments")) {
        setAiResponse("AI detected 1 Potential Duplicate Voucher: Voucher Ref PAY-1102 (₹45,000) matches an transaction recorded on 2026-06-25 to Supreme Plastics. Please audit the matching vendor invoice attachments.");
      } else if (promptText.includes("suggest FD")) {
        setAiResponse("Daynisc AI suggests transferring ₹15,00,000 from HDFC Current Account (earning 0% interest) to a 180-day short-term Fixed Deposit yielding 7.1%. This will generate an estimated yield of ₹53,250 with zero liquidity risks.");
      } else {
        setAiResponse("Based on the transaction ledgers, HDFC Current Account shows high stability. Bank charges are auto-detected at 0.05% of transaction size. We forecast a recovery of cash pool to ₹93.5L by Day 30.");
      }
    }, 850);
  };

  // CSV Exporter for Transactions Ledger
  const handleCSVExport = () => {
    const headers = "Date,Type,Description,Bank,Voucher,Debit,Credit,Running Balance,Sync,Category,Customer\n";
    const rows = filteredTx
      .map(t => {
        const drVal = t.type === "Debit" ? t.amount : 0;
        const crVal = t.type === "Credit" ? t.amount : 0;
        return `${t.date},${t.type},"${t.desc.replace(/"/g, '""')}",${t.bank},${t.voucher},${drVal},${crVal},${t.balance},${t.sync ? "Synced" : "Pending"},${t.category},"${t.customer}"`;
      })
      .join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Daynisc_BankBook_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Bank Book CSV downloaded successfully");
  };

  // Single Fund Transfer submission
  const handlePostTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const srcName = BANK_ACCOUNTS_MOCK.find(b => b.id === transferSrc)?.name || "Unknown";
    const destName = BANK_ACCOUNTS_MOCK.find(b => b.id === transferDest)?.name || "Unknown";
    const amt = parseFloat(transferAmount) || 0;

    if (transferSrc === transferDest) {
      toast.error("Source and destination accounts must be different");
      return;
    }

    const newTx = {
      id: "tx_" + (transferHistory.length + 1),
      date: new Date().toISOString().split("T")[0],
      src: srcName.replace(" Account", "").replace(" A/C", ""),
      dest: destName.replace(" Account", "").replace(" A/C", ""),
      amt,
      status: transferRule === "immediate" ? "Completed" : "Scheduled",
      type: transferRule === "immediate" ? "Instant Net" : "Scheduled Sweep"
    };

    setTransferHistory([newTx, ...transferHistory]);
    toast.success(`Fund transfer order posted: ${inr(amt)}`);
    setTransferAmount("");
  };

  // Add Beneficiary
  const handleAddBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    const newB = {
      id: "b_" + (beneficiaries.length + 1),
      name: newBenName,
      bank: newBenBank,
      accNum: newBenAcc,
      ifsc: newBenIfsc,
      upi: newBenUpi,
      type: newBenType,
      status: "Approved"
    };
    setBeneficiaries([...beneficiaries, newB]);
    setShowNewBeneficiaryModal(false);
    toast.success(`Beneficiary ${newBenName} added successfully`);
    setNewBenName("");
    setNewBenAcc("");
    setNewBenIfsc("");
    setNewBenUpi("");
  };

  // Trigger Approval Modal (Digital Token)
  const triggerApproveItem = (item: any) => {
    setApprovingItem(item);
    setShowDigitalTokenModal(true);
  };

  const handleApproveWithToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenCode === "989898" || tokenCode === "1234" || tokenCode.length >= 4) {
      toast.success(`Transaction approved & queued for bank release!`);
      setApprovalsQueue(prev => prev.map(a => a.id === approvingItem.id ? { ...a, status: "Approved" } : a));
      setShowDigitalTokenModal(false);
      setTokenCode("");
    } else {
      toast.error("Invalid OTP / Digital authorization code");
    }
  };

  // Statement Wizard Step Handlers
  const handleWizardNext = () => {
    if (wizardStep === 1) {
      if (!wizardFile) {
        toast.error("Please drag or select a bank statement document");
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardStep(3);
    } else if (wizardStep === 3) {
      setWizardStep(4);
    } else if (wizardStep === 4) {
      setWizardStep(5);
      toast.success("Statement imported and AI Auto-Matches updated");
    }
  };

  // Bulk Payment steps
  const handleBulkNext = () => {
    if (bulkStep === 1) {
      if (!bulkFile) {
        toast.error("Please select the bulk upload sheet");
        return;
      }
      setBulkErrors([
        "Row 3: Potential wrong IFSC checksum warning.",
        "Row 5: Account blacklisted alert (Verification check warning flag)."
      ]);
      setBulkData([
        { row: 1, name: "Supreme Plastics Ltd", bank: "ICICI Bank", acc: "0024091283", ifsc: "ICIC0000024", amt: 120000, valid: true },
        { row: 2, name: "Sharma Traders", bank: "HDFC Bank", acc: "502000293812", ifsc: "HDFC0000060", amt: 45000, valid: true },
        { row: 3, name: "Maa Enterprise", bank: "SBI Bank", acc: "3109283102", ifsc: "SBIN99999", amt: 15000, valid: false },
        { row: 4, name: "Tax Reserve Bureau", bank: "RBI Bank", acc: "9120100912", ifsc: "RBIS0000001", amt: 350000, valid: true },
        { row: 5, name: "Suspicious Payout Profile", bank: "Axis Bank", acc: "8812030129", ifsc: "UTIB0000010", amt: 1250000, valid: false }
      ]);
      setBulkStep(2);
    } else if (bulkStep === 2) {
      setBulkStep(3);
    } else if (bulkStep === 3) {
      setBulkStep(4);
    } else if (bulkStep === 4) {
      setBulkStep(5);
      toast.success("Bulk payout transfer order triggered");
    }
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setActiveTab(t)}
      style={{
        padding: "10px 16px", border: "none", background: "none",
        fontSize: 11, fontWeight: 700, cursor: "pointer",
        color: activeTab === t ? T.primary : T.text3,
        borderBottom: activeTab === t ? `2.5px solid ${T.primary}` : "2.5px solid transparent",
        transition: "all 0.15s",
        whiteSpace: "nowrap"
      }}
    >
      {label}
    </button>
  );

  // Filter Transaction Logic
  const filteredTx = MOCK_TRANSACTIONS.filter(t => {
    const matchSearch = searchQuery ? (
      t.desc.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.voucher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true;

    const matchBank = filterBank === "all" ? true : t.bank.toLowerCase() === filterBank.toLowerCase();
    const matchType = filterTxType === "all" ? true : (filterTxType === "credit" ? t.type === "Credit" : t.type === "Debit");
    
    // Date Range
    if (filterDateFrom && t.date < filterDateFrom) return false;
    if (filterDateTo && t.date > filterDateTo) return false;

    // Amount Range
    const amt = t.amount;
    if (filterAmtMin && amt < parseFloat(filterAmtMin)) return false;
    if (filterAmtMax && amt > parseFloat(filterAmtMax)) return false;

    // Voucher & Customer Fields
    if (filterVoucher && !t.voucher.toLowerCase().includes(filterVoucher.toLowerCase())) return false;
    if (filterCustomer && !t.customer.toLowerCase().includes(filterCustomer.toLowerCase())) return false;

    // Category
    if (filterCategory !== "all" && t.category !== filterCategory) return false;

    // Pending vs Synced
    if (filterPendingOnly && t.sync) return false;
    if (filterSyncedOnly && !t.sync) return false;

    return matchSearch && matchBank && matchType;
  });

  return (
    <div style={{ padding: "20px 24px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%", position: "relative" }}>
      
      {/* Top Selector Panel Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: T.text3, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <span>Dashboard</span>
            <span>&gt;</span>
            <span>Banking</span>
            <span>&gt;</span>
            <span style={{ fontWeight: 600, color: T.primary }}>{activeTab.toUpperCase()}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text1, letterSpacing: "-0.5px" }}>Banking & Treasury Hub</h1>
        </div>

        {/* Context switchers */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {activeTab === "accounts" && (
            <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", background: "#fff" }}>
              {(["INR", "USD", "EUR"] as const).map(curr => (
                <button
                  key={curr}
                  onClick={() => setCurrencyMode(curr)}
                  style={{
                    padding: "4px 8px", border: "none", fontSize: 9, fontWeight: 700, cursor: "pointer",
                    background: currencyMode === curr ? T.primary : "#fff",
                    color: currencyMode === curr ? "#fff" : T.text2
                  }}
                >
                  {curr}
                </button>
              ))}
            </div>
          )}
          <select value={selectedCompany} onChange={e => handleContextChange("company", e.target.value)} style={selectStyle}>
            <option value="ABC Industries">ABC Industries</option>
            <option value="Patel Enterprises">Patel Enterprises</option>
            <option value="Sharma Traders">Sharma Traders</option>
          </select>
          <select value={selectedBranch} onChange={e => handleContextChange("branch", e.target.value)} style={selectStyle}>
            <option value="Ahmedabad Branch">Ahmedabad Branch</option>
            <option value="Mumbai Branch">Mumbai Branch</option>
            <option value="Delhi Branch">Delhi Branch</option>
          </select>
          <select value={selectedFY} onChange={e => handleContextChange("fy", e.target.value)} style={selectStyle}>
            <option value="FY 2026-27">FY 2026-27</option>
            <option value="FY 2025-26">FY 2025-26</option>
          </select>
        </div>
      </div>

      {/* Main KPI Ribbon */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KpiCard
          label="Total Bank Reserves"
          value="₹72.57L"
          icon={<Landmark size={15} />}
          color={T.primary}
          trend={{ val: "▲ +12%", up: true }}
          onClick={() => setActiveTab("accounts")}
        />
        <KpiCard
          label="Cash in Hand"
          value="₹12.45L"
          icon={<IconMoney size={15} />}
          color={T.green}
          trend={{ val: "▲ +5%", up: true }}
          onClick={() => setActiveTab("accounts")}
        />
        <KpiCard
          label="Today's Receipts"
          value="₹90,000"
          icon={<CheckCircle2 size={15} />}
          color={T.green}
          trend={{ val: "▲ +18%", up: true }}
          subText="REC-223 Clearing"
          onClick={() => {
            setFilterTxType("credit");
            setActiveTab("transactions");
          }}
        />
        <KpiCard
          label="Pending Cheques"
          value="₹75,000"
          icon={<IconClock size={15} />}
          color={T.amber}
          trend={{ val: "▼ -4%", up: false }}
          subText="Supreme Plastics Ltd"
          onClick={() => setActiveTab("cheques")}
        />
      </div>

      {/* Navigation tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 20, overflowX: "auto", gap: 2 }}>
        {tabBtn("dashboard",      "Dashboard")}
        {tabBtn("accounts",       "Bank Accounts")}
        {tabBtn("transactions",   "Transactions")}
        {tabBtn("beneficiaries",  "Beneficiaries")}
        {tabBtn("transfer",       "Fund Transfer & Bulk")}
        {tabBtn("approvals",      "Approvals Queue")}
        {tabBtn("investments",    "Loans & Investments")}
        {tabBtn("recon",          "AI Reconciler Wizard")}
        {tabBtn("collect",        "UPI & Gateway")}
        {tabBtn("cheques",        "Cheque Designer")}
        {tabBtn("calendar",       "Banking Calendar")}
        {tabBtn("analytics",      "Forecast & Analytics")}
        {tabBtn("reports",        "Reports & Audit")}
      </div>

      {/* ── Tab: Dashboard ── */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Draggable/Toggleable widgets configuration bar */}
          <div style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}>
            <button
              onClick={() => setShowWidgetConfig(!showWidgetConfig)}
              style={{
                background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6,
                padding: "6px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4
              }}
            >
              <Settings size={12} /> Configure Dashboard Layout
            </button>
            {showWidgetConfig && (
              <div style={{
                position: "absolute", right: 0, top: 32, background: "#fff",
                border: `1px solid ${T.border}`, borderRadius: 8, padding: 10,
                boxShadow: T.shadowMd, zIndex: 100, display: "flex", flexDirection: "column", gap: 6
              }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.text3, borderBottom: `1px solid ${T.border}`, paddingBottom: 4 }}>Toggle Widgets</div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={visibleWidgets.cashPosition} onChange={e => setVisibleWidgets({...visibleWidgets, cashPosition: e.target.checked})} />
                  Monthly Cash Flow Chart
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={visibleWidgets.weeklyCollections} onChange={e => setVisibleWidgets({...visibleWidgets, weeklyCollections: e.target.checked})} />
                  Weekly Collections Chart
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={visibleWidgets.liabilities} onChange={e => setVisibleWidgets({...visibleWidgets, liabilities: e.target.checked})} />
                  Upcoming Liabilities
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={visibleWidgets.alerts} onChange={e => setVisibleWidgets({...visibleWidgets, alerts: e.target.checked})} />
                  Reconciliation Warnings
                </label>
              </div>
            )}
          </div>

          {/* Main Visual Row: charts side-by-side */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
            {visibleWidgets.cashPosition && (
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase" }}>Monthly Cash Flow Trend</h3>
                  <span style={{ fontSize: 9, color: T.text3, fontWeight: 600 }}>Inflows vs Outflows (H1 2026)</span>
                </div>
                <div style={{ width: "100%", height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ANALYTICS_CASHFLOW_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="flowIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.primary} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={T.primary} stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="flowOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.amber} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={T.amber} stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.divider} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                      <YAxis tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                      <ChartTooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 9, marginTop: 4 }} />
                      <Area name="Inflow (Revenue)" type="monotone" dataKey="inflow" stroke={T.primary} fillOpacity={1} fill="url(#flowIn)" strokeWidth={2} />
                      <Area name="Outflow (Expenses)" type="monotone" dataKey="outflow" stroke={T.amber} fillOpacity={1} fill="url(#flowOut)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* AI Finance Assistant Panel embedded directly on the dashboard */}
            <Card style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 10 }}>
                <span style={{ color: T.primary }}><ShieldCheck size={16} /></span>
                <h3 style={{ fontSize: 11, fontWeight: 800, color: T.text1, textTransform: "uppercase" }}>AI Finance Assistant</h3>
              </div>
              
              <div style={{ flex: 1, minHeight: 100, background: "#f8fafc", borderRadius: 8, padding: 10, border: `1px solid ${T.border}`, fontSize: 10, color: T.text2, overflowY: "auto", marginBottom: 8 }}>
                {aiLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.text3 }}>
                    <RefreshCw size={12} className="animate-spin" /> Daynisc AI is executing prompt ledger audits...
                  </div>
                ) : aiResponse ? (
                  <div>
                    <div style={{ fontWeight: 800, color: T.primary, marginBottom: 4 }}>Query: &quot;{aiQuery}&quot;</div>
                    <div style={{ lineHeight: 1.4 }}>{aiResponse}</div>
                  </div>
                ) : (
                  <div style={{ color: T.text3, fontStyle: "italic" }}>
                    Select one of the pre-built financial prompts below to ask Daynisc AI:
                  </div>
                )}
              </div>

              {/* Pre-configured AI prompt chips */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button onClick={() => runAIPrompt("Why is cash flow low this week?")} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 4, padding: 4, fontSize: 9, textAlign: "left", cursor: "pointer", fontWeight: 600 }} onMouseEnter={e => e.currentTarget.style.borderColor = T.primary} onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                  ❓ Why is cash flow low this week?
                </button>
                <button onClick={() => runAIPrompt("Find potential duplicate payments")} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 4, padding: 4, fontSize: 9, textAlign: "left", cursor: "pointer", fontWeight: 600 }} onMouseEnter={e => e.currentTarget.style.borderColor = T.primary} onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                  🔍 Find potential duplicate payments
                </button>
                <button onClick={() => runAIPrompt("Suggest FD reserve investments")} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 4, padding: 4, fontSize: 9, textAlign: "left", cursor: "pointer", fontWeight: 600 }} onMouseEnter={e => e.currentTarget.style.borderColor = T.primary} onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                  📈 Suggest FD reserve investments
                </button>
              </div>
            </Card>
          </div>

          {/* Sub Row: Details & Liabilities */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card style={{ borderLeft: `4px solid ${T.primary}` }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Treasury & Liquid Balances</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.text3 }}>Cash available in Hand:</span>
                  <span style={{ fontWeight: 700, color: T.green }}>{inr(1245000)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.text3 }}>Bank Charges Paid Today:</span>
                  <span style={{ fontWeight: 700, color: T.red }}>{inr(1200)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.text3 }}>Interest Earned:</span>
                  <span style={{ fontWeight: 700, color: T.green }}>{inr(15000)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${T.border}`, paddingTop: 6, marginTop: 4 }}>
                  <span style={{ color: T.text3 }}>Net Liquidity Pool:</span>
                  <span style={{ fontWeight: 800, color: T.primary }}>₹85,02,000</span>
                </div>
              </div>
            </Card>

            {visibleWidgets.liabilities && (
              <Card style={{ borderLeft: `4px solid ${T.red}` }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: T.red, textTransform: "uppercase", marginBottom: 12 }}>Upcoming EMI & Debt Liabilities</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {MOCK_LOANS.map((loan, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "8px 12px", borderRadius: 6, border: `1px solid ${T.border}` }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.text1 }}>{loan.name}</div>
                        <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>Rate: {loan.rate} · Due: {loan.dueDate}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: T.red }}>{inr(loan.emi)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Bottom Row: Weekly Collections & Payments */}
          {visibleWidgets.weeklyCollections && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase" }}>Weekly Collections vs Payments</h3>
                <span style={{ fontSize: 9, color: T.text3, fontWeight: 600 }}>Last 5 Weeks</span>
              </div>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={WEEKLY_TX_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.divider} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                    <YAxis tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                    <ChartTooltip content={<ChartTip />} />
                    <Legend wrapperStyle={{ fontSize: 9, marginTop: 4 }} />
                    <Bar name="Weekly Collections" dataKey="collections" fill={T.green} radius={[4, 4, 0, 0]} />
                    <Bar name="Weekly Payments" dataKey="payments" fill={T.red} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Critical alerts bar */}
          {visibleWidgets.alerts && (
            <Card style={{ background: "#fffbeb", border: `1.5px solid ${T.amber}20` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: T.amber }}><ShieldAlert size={20} /></span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.text1 }}>Pending Action Flags & Reconciliation Warnings</div>
                  <p style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>
                    3 statement transactions need matching reconciliations. Low balance warning on SBI Current Account (Outstanding balance limit exceeded). Last synced with netbanking servers today 00:25 AM.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Bank Accounts ── */}
      {activeTab === "accounts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Main accounts registry */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Active registered banking channels & Netbanking status</span>
            <button
              onClick={() => setShowAddAccountModal(true)}
              style={{
                background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                padding: "6px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer"
              }}
            >
              ➕ Add Bank Account
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {BANK_ACCOUNTS_MOCK.map((acc) => (
              <Card key={acc.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>{acc.name}</h3>
                    <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>Holder: <strong>{acc.holder}</strong> · Type: {acc.type}</div>
                  </div>
                  <span style={badge(acc.status === "Connected" ? T.green : T.text3, acc.status === "Connected" ? T.greenBg : T.divider)}>
                    {acc.status}
                  </span>
                </div>

                {/* Extended Details Table */}
                <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 10 }}>
                    <div><span style={{ color: T.text3 }}>A/C Number:</span> <strong style={{ fontFamily: "monospace" }}>{acc.accNum}</strong></div>
                    <div><span style={{ color: T.text3 }}>IFSC Code:</span> <strong>{acc.ifsc}</strong></div>
                    <div><span style={{ color: T.text3 }}>Branch:</span> <span>{acc.branch}</span></div>
                    <div><span style={{ color: T.text3 }}>Base Currency:</span> <span>{acc.currency}</span></div>
                    <div><span style={{ color: T.text3 }}>Freeze Amount:</span> <span style={{ color: T.red }}>{inr(acc.freezeAmount)}</span></div>
                    <div><span style={{ color: T.text3 }}>Lien Amount:</span> <span style={{ color: T.amber }}>{inr(acc.lienAmount)}</span></div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `1px solid ${T.border}`, paddingTop: 10, marginTop: 4 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => toast.success(`Live statement fetched for ${acc.name}`)} style={{ padding: "5px 10px", background: "#f1f5f9", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Statement</button>
                    <button onClick={() => toast.success(`Live synchronized for ${acc.name}`)} style={{ padding: "5px 10px", background: "#f1f5f9", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Sync Feed</button>
                    <span style={{ fontSize: 8, color: T.text3, fontFamily: "monospace" }}>Last: {acc.lastSync}</span>
                  </div>
                  
                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: acc.balance >= 0 ? T.green : T.red }}>
                        {currencyMode === "INR" ? inr(acc.balance) : currencyMode === "USD" ? `$${acc.usdEquiv.toLocaleString()}` : `€${acc.eurEquiv.toLocaleString()}`}
                      </span>
                      <span style={{ fontSize: 8, color: T.text3 }}>
                        Available: <strong style={{ color: acc.availBalance >= 0 ? T.green : T.red }}>{currencyMode === "INR" ? inr(acc.availBalance) : currencyMode === "USD" ? `$${(acc.availBalance/83).toFixed(0)}` : `€${(acc.availBalance/90).toFixed(0)}`}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Sub Row: Bank API Integrations & Corporate Limit Monitors */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
            {/* Limit Monitoring */}
            <Card>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Corporate Limit Monitoring (CC, OD, BG, LC)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {BANK_LIMITS_MOCK.map((limit, idx) => (
                  <div key={idx} style={{ fontSize: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{limit.name} ({limit.type})</span>
                      <span style={{ color: T.text3 }}>Used: <strong>{inr(limit.used)}</strong> / {inr(limit.limit)}</span>
                    </div>
                    <div style={{ width: "100%", height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginBottom: 2 }}>
                      <div style={{ width: `${(limit.used / limit.limit) * 100}%`, height: "100%", background: limit.type === "CC" || limit.type === "LC" ? T.primary : T.cyan }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: T.text3 }}>
                      <span>Remaining: {inr(limit.limit - limit.used)}</span>
                      <span>Expiry: {limit.expiry}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Bank API Integration */}
            <Card>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Bank Direct API Integrations</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {BANK_APIS_MOCK.map((api, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#f8fafc", borderRadius: 6, border: `1px solid ${T.border}` }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700 }}>{api.bank}</div>
                      <div style={{ fontSize: 8, color: T.text3, marginTop: 2 }}>{api.type} · Latency: {api.latency}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={badge(api.status === "Connected" ? T.green : T.red, api.status === "Connected" ? T.greenBg : T.redBg)}>{api.status}</span>
                      <div style={{ fontSize: 8, color: T.text3, marginTop: 2 }}>Checked: {api.lastCheck}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>
      )}

      {/* ── Tab: Transactions ── */}
      {activeTab === "transactions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Filters Panel */}
          <Card>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
              <span>🔍 Advanced Bank Book Filters</span>
              <button onClick={() => {
                setSearchQuery("");
                setFilterBank("all");
                setFilterTxType("all");
                setFilterDateFrom("");
                setFilterDateTo("");
                setFilterAmtMin("");
                setFilterAmtMax("");
                setFilterVoucher("");
                setFilterCustomer("");
                setFilterCategory("all");
                setFilterPendingOnly(false);
                setFilterSyncedOnly(false);
                toast.success("Filters reset");
              }} style={{ background: "none", border: "none", color: T.primary, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Clear All Filters</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Date From</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={inputFilterStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Date To</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={inputFilterStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Amount Min (₹)</label>
                <input type="number" placeholder="Min" value={filterAmtMin} onChange={e => setFilterAmtMin(e.target.value)} style={inputFilterStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Amount Max (₹)</label>
                <input type="number" placeholder="Max" value={filterAmtMax} onChange={e => setFilterAmtMax(e.target.value)} style={inputFilterStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Voucher Search</label>
                <input type="text" placeholder="e.g. REC-223" value={filterVoucher} onChange={e => setFilterVoucher(e.target.value)} style={inputFilterStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Customer / Party</label>
                <input type="text" placeholder="e.g. Patel" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} style={inputFilterStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Bank Channel</label>
                <select value={filterBank} onChange={e => setFilterBank(e.target.value)} style={selectStyle}>
                  <option value="all">All Banks</option>
                  <option value="hdfc">HDFC Account</option>
                  <option value="icici">ICICI CC</option>
                  <option value="sbi">SBI Loan</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Category</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={selectStyle}>
                  <option value="all">All Categories</option>
                  <option value="Sales">Sales Credits</option>
                  <option value="Purchase">Purchase Payments</option>
                  <option value="Cash Deposit">Cash Deposit</option>
                  <option value="Bank Charges">Bank Charges</option>
                  <option value="Loan EMI">Loan EMIs</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 10, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: T.text2, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input type="checkbox" checked={filterPendingOnly} onChange={e => { setFilterPendingOnly(e.target.checked); if (e.target.checked) setFilterSyncedOnly(false); }} />
                  Pending Sync Only
                </label>
                <label style={{ fontSize: 10, fontWeight: 700, color: T.text2, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input type="checkbox" checked={filterSyncedOnly} onChange={e => { setFilterSyncedOnly(e.target.checked); if (e.target.checked) setFilterPendingOnly(false); }} />
                  Synced Feeds Only
                </label>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleCSVExport} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: T.greenBg, color: T.green, border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                  <FileSpreadsheet size={12} /> CSV Export
                </button>
                <button onClick={() => toast.success("Bank Book PDF exported")} style={{ padding: "5px 10px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>PDF</button>
                <button onClick={() => window.print()} style={{ padding: "5px 10px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Print</button>
              </div>
            </div>
          </Card>

          {/* Charges rules & Exchange gain-loss */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: T.primary, textTransform: "uppercase", marginBottom: 10 }}>Auto-Detected Bank Charges Rules</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.divider}`, paddingBottom: 4 }}>
                  <span>NEFT / RTGS Fees:</span>
                  <strong>0.1% transaction size + 18% GST (Auto-Voucher queued)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.divider}`, paddingBottom: 4 }}>
                  <span>SMS Alerts Maintenance:</span>
                  <strong>₹15/Quarter flat (TDS Exemption auto-flagged)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.divider}`, paddingBottom: 4 }}>
                  <span>Bounce Penalty Fee:</span>
                  <strong>₹350 + GST (Auto-linked to customer voucher)</strong>
                </div>
              </div>
            </Card>
            <Card>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: T.green, textTransform: "uppercase", marginBottom: 10 }}>Multi-Currency Forex Gains & Losses</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.divider}`, paddingBottom: 4 }}>
                  <span>HDFC Foreign Bills Outward:</span>
                  <span>Gain/Loss: <strong style={{ color: T.green }}>+₹45,200</strong> (Exchange Difference)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.divider}`, paddingBottom: 4 }}>
                  <span>USD Forex Valuation Rate:</span>
                  <strong>1 USD = ₹83.45 (Updated 2 mins ago)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.divider}`, paddingBottom: 4 }}>
                  <span>EUR Forex Valuation Rate:</span>
                  <strong>1 EUR = ₹89.50 (Updated 2 mins ago)</strong>
                </div>
              </div>
            </Card>
          </div>

          {/* Ledger Table */}
          <div style={cardStyle({ overflowX: "auto" })}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                  {["Date", "Type", "Description", "Party / Customer", "Category", "Bank", "Voucher", "Debit", "Credit", "Running Bal", "Sync"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTx.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={tdStyle}>{t.date}</td>
                    <td style={tdStyle}>
                      <span style={badge(t.type === "Credit" ? T.green : T.red, t.type === "Credit" ? T.greenBg : T.redBg)}>{t.type}</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{t.desc}</td>
                    <td style={tdStyle}>{t.customer}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 9, background: "#f1f5f9", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                        {t.category}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{t.bank}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace" }}>{t.voucher}</td>
                    <td style={{ ...tdStyle, color: T.red }}>{t.type === "Debit" ? inr(t.amount) : "—"}</td>
                    <td style={{ ...tdStyle, color: T.green }}>{t.type === "Credit" ? inr(t.amount) : "—"}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{inr(t.balance)}</td>
                    <td style={tdStyle}>
                      <span style={{ color: t.sync ? T.green : T.amber, fontWeight: 700 }}>
                        {t.sync ? "✓ Synced" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Beneficiaries ── */}
      {activeTab === "beneficiaries" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Registered Vendor, Customer & Employee Payout bank details</span>
            <button
              onClick={() => setShowNewBeneficiaryModal(true)}
              style={{
                background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                padding: "6px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer"
              }}
            >
              ➕ Add Beneficiary
            </button>
          </div>

          <div style={cardStyle({ overflowX: "auto" })}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                  {["Name", "Type", "Settlement Bank", "Account Number", "IFSC Code", "UPI Handle", "Verification"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map(b => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{b.name}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 9, background: "#f1f5f9", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>{b.type}</span>
                    </td>
                    <td style={tdStyle}>{b.bank}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace" }}>{b.accNum}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace" }}>{b.ifsc}</td>
                    <td style={tdStyle}>{b.upi}</td>
                    <td style={tdStyle}>
                      <span style={badge(b.status === "Approved" ? T.green : T.amber, b.status === "Approved" ? T.greenBg : T.amberBg)}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Fund Transfer & Bulk Payments ── */}
      {activeTab === "transfer" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16 }}>
          
          {/* Transfer & History */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Corporate Fund Transfer Console</h3>
              <form onSubmit={handlePostTransfer} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Source Account</label>
                    <select value={transferSrc} onChange={e => setTransferSrc(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }}>
                      <option value="acc_1">HDFC Current</option>
                      <option value="acc_4">Petty Cash Box</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Destination Account</label>
                    <select value={transferDest} onChange={e => setTransferDest(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }}>
                      <option value="acc_2">ICICI CC A/C</option>
                      <option value="acc_1">HDFC Current</option>
                      <option value="acc_3">SBI Loan</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Transfer Amount (₹)</label>
                  <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="e.g. 50000" style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }} required />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Execution Schedule Rule</label>
                  <select value={transferRule} onChange={e => setTransferRule(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }}>
                    <option value="immediate">Immediate Transfer</option>
                    <option value="weekly">Recurring Weekly Sweep</option>
                    <option value="monthly">Recurring Monthly Transfer</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                    padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 10
                  }}
                >
                  Post Transfer Order
                </button>
              </form>
            </Card>

            <Card>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Transfer History Logs</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Date", "Route", "Amount", "Method", "Status"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transferHistory.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: `1px solid ${T.divider}` }}>
                        <td style={tdStyle}>{tx.date}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{tx.src} → {tx.dest}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{inr(tx.amt)}</td>
                        <td style={tdStyle}>{tx.type}</td>
                        <td style={tdStyle}>
                          <span style={badge(tx.status === "Completed" ? T.green : T.amber, tx.status === "Completed" ? T.greenBg : T.amberBg)}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Bulk Payout Upload Wizard */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.primary, textTransform: "uppercase", marginBottom: 12 }}>Bulk Payouts Excel Upload Wizard</h3>
            
            {/* Step Wizard header bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, paddingBottom: 8, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map(step => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700,
                    background: bulkStep === step ? T.primary : bulkStep > step ? T.green : T.divider,
                    color: bulkStep >= step ? "#fff" : T.text3
                  }}>{step}</span>
                  <span style={{ fontSize: 8, color: bulkStep === step ? T.text1 : T.text3 }}>
                    {step === 1 ? "Upload" : step === 2 ? "Validate" : step === 3 ? "Maker Check" : step === 4 ? "Authorize" : "Clear"}
                  </span>
                  {step < 5 && <ChevronRight size={10} color={T.text4} />}
                </div>
              ))}
            </div>

            {/* Steps execution content */}
            {bulkStep === 1 && (
              <div style={{ textAlign: "center", padding: 18 }}>
                <div
                  onClick={() => { setBulkFile("Daynisc_BulkPayout_2026.xlsx"); toast.success("Payout template selected"); }}
                  style={{ border: `2px dashed ${T.border}`, padding: 24, borderRadius: 8, background: "#f8fafc", cursor: "pointer" }}
                >
                  <span style={{ fontSize: 28 }}>📁</span>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, marginTop: 6 }}>Select Payout Excel Template</div>
                  {bulkFile && <div style={{ fontSize: 9, color: T.primary, fontWeight: 800, marginTop: 4 }}>{bulkFile}</div>}
                </div>
                <button onClick={handleBulkNext} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 10, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>
                  Verify Batch
                </button>
              </div>
            )}

            {bulkStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: T.redBg, padding: 8, borderRadius: 6, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: T.red, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={12} /> Validation Alert (2 Errors Detected)
                  </div>
                  <div style={{ fontSize: 8, color: T.text1, marginTop: 4 }}>
                    {bulkErrors.map((err, i) => <div key={i}>· {err}</div>)}
                  </div>
                </div>

                <div style={{ maxHeight: 150, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 6 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={{ ...thStyle, padding: 4 }}>Row</th>
                        <th style={{ ...thStyle, padding: 4 }}>Payee</th>
                        <th style={{ ...thStyle, padding: 4 }}>Amount</th>
                        <th style={{ ...thStyle, padding: 4 }}>Validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkData.map((d, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${T.divider}` }}>
                          <td style={{ ...tdStyle, padding: 4 }}>#{d.row}</td>
                          <td style={{ ...tdStyle, padding: 4, fontWeight: 700 }}>{d.name}</td>
                          <td style={{ ...tdStyle, padding: 4 }}>{inr(d.amt)}</td>
                          <td style={{ ...tdStyle, padding: 4 }}>
                            <span style={badge(d.valid ? T.green : T.red, d.valid ? T.greenBg : T.redBg)}>
                              {d.valid ? "Pass" : "Failed"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => setBulkStep(1)} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Back</button>
                  <button onClick={() => { setBulkErrors([]); setBulkData(prev => prev.map(d => ({ ...d, valid: true }))); toast.success("IFSC override verified. Proceeding..."); setBulkStep(3); }} style={{ padding: "6px 12px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Override & Proceed</button>
                </div>
              </div>
            )}

            {bulkStep === 3 && (
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 10, color: T.text2, marginBottom: 12 }}>
                  Bulk batch verified: <strong>5 items</strong>, value <strong>₹17,70,000</strong>. Creator Maker: Accountant Ramesh. Pending Checker authorization.
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  <button onClick={() => { toast.success("Maker approved."); setBulkStep(4); }} style={{ padding: "8px 14px", background: T.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Approve (Finance Manager)</button>
                  <button onClick={() => setBulkStep(1)} style={{ padding: "8px 14px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Reject & Return</button>
                </div>
              </div>
            )}

            {bulkStep === 4 && (
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 10, color: T.text2, marginBottom: 8 }}>OTP/Token sent to Director profile (Bhavesh). Enter 6-digit verification code:</div>
                <input type="text" placeholder="OTP 989898" style={{ width: 120, padding: "6px 8px", textAlign: "center", fontSize: 12, borderRadius: 6, border: `1px solid ${T.border}`, marginBottom: 12 }} />
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  <button onClick={handleBulkNext} style={{ padding: "8px 14px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Verify & Execute</button>
                  <button onClick={() => setBulkStep(3)} style={{ padding: "8px 14px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            {bulkStep === 5 && (
              <div style={{ textAlign: "center", padding: 16 }}>
                <span style={{ fontSize: 32, color: T.green }}>✓</span>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.text1, marginTop: 8 }}>Bulk payout batch processed successfully!</div>
                <div style={{ fontSize: 9, color: T.text3, marginTop: 4 }}>UTR reference logs generated. Bank ledger entries synced.</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
                  <button onClick={() => toast.success("UTR list downloaded")} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Download UTR Logs</button>
                  <button onClick={() => { setBulkFile(null); setBulkStep(1); }} style={{ padding: "6px 12px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Upload New Batch</button>
                </div>
              </div>
            )}

          </Card>

        </div>
      )}

      {/* ── Tab: Approvals Queue ── */}
      {activeTab === "approvals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Payment Approval Workflow (Maker-Checker Authorization Log)</div>
          
          <div style={cardStyle({ overflowX: "auto" })}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                  {["Payee Profile", "Voucher Amount", "Submission Date", "Created By", "Approval Status", "Remarks", "Actions"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvalsQueue.map(a => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{a.payee}</td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: T.red }}>{inr(a.amt)}</td>
                    <td style={tdStyle}>{a.date}</td>
                    <td style={tdStyle}>{a.creator}</td>
                    <td style={tdStyle}>
                      <span style={badge(
                        a.status === "Approved" ? T.green : a.status.includes("Director") ? T.purple : T.amber,
                        a.status === "Approved" ? T.greenBg : a.status.includes("Director") ? T.purpleBg : T.amberBg
                      )}>
                        {a.status}
                      </span>
                    </td>
                    <td style={tdStyle}>{a.remark}</td>
                    <td style={tdStyle}>
                      {a.status !== "Approved" ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => triggerApproveItem(a)} style={{ padding: "4px 8px", background: T.green, color: "#fff", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                          <button onClick={() => { toast.error("Voucher rejected & returned to maker."); setApprovalsQueue(prev => prev.map(item => item.id === a.id ? { ...item, status: "Returned to Maker" } : item)); }} style={{ padding: "4px 8px", background: T.red, color: "#fff", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                          <button onClick={() => toast.success("Payment hold configured")} style={{ padding: "4px 8px", background: "#f1f5f9", border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Hold</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 9, color: T.text3, fontWeight: 600 }}>✓ Released to Bank API</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Loans & Investments ── */}
      {activeTab === "investments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Investment Registry Dashboard */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.primary, textTransform: "uppercase", marginBottom: 12 }}>Corporate Investments Dashboard</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Investment Fund", "Type", "Principal", "Valuation Value", "ROI Yield", "Maturity", "ROI Trend"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_INVESTMENTS.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${T.divider}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{inv.name}</td>
                      <td style={tdStyle}>{inv.type}</td>
                      <td style={tdStyle}>{inr(inv.principal)}</td>
                      <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>{inr(inv.current)}</td>
                      <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>{inv.roi}</td>
                      <td style={tdStyle}>{inv.maturity}</td>
                      <td style={tdStyle}>
                        <span style={{ color: T.green, fontWeight: 800 }}>▲ +7.5%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Active Loans */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Corporate Loans & Active Limits</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {MOCK_LOANS.map((loan, idx) => (
                <div key={idx} style={{ padding: "12px 14px", background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: T.text1 }}>{loan.name}</span>
                    <span style={{ fontSize: 10, color: T.red, fontWeight: 700 }}>EMI: {inr(loan.emi)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.text3, marginTop: 8 }}>
                    <span>Rate: {loan.rate}</span>
                    <span>Outstanding: <strong>{inr(loan.outstanding)}</strong> / {inr(loan.limit)}</span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
                    <div style={{ width: `${(loan.outstanding / loan.limit) * 100}%`, height: "100%", background: T.red }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* EMI Schedule */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.red, textTransform: "uppercase", marginBottom: 12 }}>EMI Amortization Schedule</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["EMI No", "Due Date", "Principal Component", "Interest Component", "Remaining Balance", "Payment Status"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_EMI_SCHEDULE.map(emi => (
                    <tr key={emi.emiNo} style={{ borderBottom: `1px solid ${T.divider}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>#{emi.emiNo}</td>
                      <td style={tdStyle}>{emi.date}</td>
                      <td style={tdStyle}>{inr(emi.principal)}</td>
                      <td style={{ ...tdStyle, color: T.amber }}>{inr(emi.interest)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{inr(emi.balance)}</td>
                      <td style={tdStyle}>
                        <span style={badge(emi.status === "Paid" ? T.green : T.red, emi.status === "Paid" ? T.greenBg : T.redBg)}>
                          {emi.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Fixed & Recurring Deposits */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.primary, textTransform: "uppercase", marginBottom: 12 }}>Fixed Deposits & Accrued Yield</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Fixed Deposit", "Principal Amount", "Yield Rate", "Maturity Date", "Accrued Yield"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_FDS.map((fd) => (
                  <tr key={fd.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{fd.name}</td>
                    <td style={tdStyle}>{inr(fd.principal)}</td>
                    <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>{fd.rate}</td>
                    <td style={tdStyle}>{fd.maturity}</td>
                    <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>{inr(fd.accruedInterest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Tab: AI Reconciler Wizard ── */}
      {activeTab === "recon" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
          
          {/* Statement Import 5-step Wizard */}
          <Card>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>
              Bank Statement Import Wizard
            </div>

            {/* Step Wizard Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, paddingBottom: 8, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map(step => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700,
                    background: wizardStep === step ? T.primary : wizardStep > step ? T.green : T.divider,
                    color: wizardStep >= step ? "#fff" : T.text3
                  }}>{step}</span>
                  <span style={{ fontSize: 8, color: wizardStep === step ? T.text1 : T.text3 }}>
                    {step === 1 ? "Format" : step === 2 ? "Preview" : step === 3 ? "Map" : step === 4 ? "Warnings" : "Done"}
                  </span>
                  {step < 5 && <ChevronRight size={10} color={T.text4} />}
                </div>
              ))}
            </div>

            {/* Step content */}
            {wizardStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Select Bank Channel</label>
                    <select value={importBank} onChange={e => setImportBank(e.target.value)} style={selectStyle}>
                      <option value="hdfc">HDFC Statement Format</option>
                      <option value="icici">ICICI Corporate Feed</option>
                      <option value="sbi">SBI Corporate Ledger</option>
                      <option value="axis">Axis Statement Format</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Import File Format</label>
                    <select value={importFormat} onChange={e => setImportFormat(e.target.value)} style={selectStyle}>
                      <option value="pdf">PDF E-Statement</option>
                      <option value="excel">Excel Sheet (.xlsx)</option>
                      <option value="csv">Standard CSV File</option>
                      <option value="mt940">SWIFT MT940</option>
                      <option value="camt">ISO 20022 CAMT.053</option>
                    </select>
                  </div>
                </div>

                <div
                  onClick={() => { setWizardFile("HDFC_STATEMENT_JUNE.pdf"); toast.success("HDFC statement file uploaded."); }}
                  style={{ border: `2px dashed ${T.border}`, padding: 20, borderRadius: 8, background: "#f8fafc", cursor: "pointer", textAlign: "center" }}
                >
                  <span style={{ fontSize: 24 }}>📤</span>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, marginTop: 4 }}>Drag & Drop Bank Statement here</div>
                  {wizardFile && <div style={{ fontSize: 9, color: T.primary, fontWeight: 800, marginTop: 4 }}>{wizardFile}</div>}
                </div>

                <button onClick={handleWizardNext} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 10, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end" }}>
                  Load Statement
                </button>
              </div>
            )}

            {wizardStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 9, color: T.text3 }}>Raw records preview extracted from <strong>{wizardFile}</strong>:</div>
                <div style={{ maxHeight: 110, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 6 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8 }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={{ padding: 4 }}>Date</th>
                        <th style={{ padding: 4 }}>Narration / Reference</th>
                        <th style={{ padding: 4 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: 4 }}>29-06-2026</td>
                        <td style={{ padding: 4 }}>RTGS-INW-PATEL-90123</td>
                        <td style={{ padding: 4, color: T.green }}>+90,000</td>
                      </tr>
                      <tr>
                        <td style={{ padding: 4 }}>28-06-2026</td>
                        <td style={{ padding: 4 }}>CHQ-DEB-SUPREME-1102</td>
                        <td style={{ padding: 4, color: T.red }}>-45,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => setWizardStep(1)} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Back</button>
                  <button onClick={handleWizardNext} style={{ padding: "6px 12px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Verify Mapping</button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 9, color: T.text3 }}>Map extracted document columns to ERP transaction fields:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Transaction Date Column:</span>
                    <select style={selectStyle} defaultValue="col_1"><option value="col_1">Column 1 (Date)</option></select>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Narration / Reference Column:</span>
                    <select style={selectStyle} defaultValue="col_2"><option value="col_2">Column 2 (Description)</option></select>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Withdrawal / Deposit Value:</span>
                    <select style={selectStyle} defaultValue="col_3"><option value="col_3">Column 3 (Net Value)</option></select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                  <button onClick={() => setWizardStep(2)} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Back</button>
                  <button onClick={handleWizardNext} style={{ padding: "6px 12px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Inspect AI Errors</button>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ background: T.amberBg, border: `1.5px solid ${T.amber}20`, padding: 8, borderRadius: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: T.amber, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={12} /> AI Fraud & Duplicate Warnings (1 Warning)
                  </div>
                  <p style={{ fontSize: 8, color: T.text2, marginTop: 4 }}>
                    · Potential Duplicate Entry detected: Narration matches Voucher REC-223 recorded on same date.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                  <button onClick={() => setWizardStep(3)} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Back</button>
                  <button onClick={handleWizardNext} style={{ padding: "6px 12px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Import Statement</button>
                </div>
              </div>
            )}

            {wizardStep === 5 && (
              <div style={{ textAlign: "center", padding: 18 }}>
                <span style={{ fontSize: 32, color: T.green }}>✓</span>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.text1, marginTop: 8 }}>Bank statement import finished!</div>
                <div style={{ fontSize: 9, color: T.text3, marginTop: 4 }}>Daynisc AI reconciler auto-matched 2 statement entries.</div>
                <button onClick={() => { setWizardFile(null); setWizardStep(1); }} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 10, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>
                  Upload Another Statement
                </button>
              </div>
            )}
          </Card>

          {/* AI matches & Reconciliation History */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Monthly stats */}
            <Card>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Bank Reconciliation History Logs</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Month", "Matched", "Auto Matched", "Manual", "Unmatched", "Ignored"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_RECON_HISTORY.map((rh, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.divider}` }}>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{rh.month}</td>
                        <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>{rh.matched}</td>
                        <td style={tdStyle}>{rh.autoMatched}</td>
                        <td style={tdStyle}>{rh.manualMatched}</td>
                        <td style={{ ...tdStyle, color: T.red, fontWeight: 700 }}>{rh.unmatched}</td>
                        <td style={tdStyle}>{rh.ignored}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* AI Suggested Matches */}
            <Card>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: T.primary, textTransform: "uppercase", marginBottom: 12 }}>AI suggested Matches</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {statementMatches.filter(m => m.status === "pending").map((st) => (
                  <div key={st.id} style={{ padding: "12px 14px", border: `1.5px solid ${T.border}`, borderRadius: 8, background: "#f8fafc" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, paddingBottom: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text2 }}>Statement Txn: {inr(st.amount)} ({st.date})</span>
                      {st.confidence ? (
                        <span style={{ fontSize: 9, background: T.greenBg, color: T.green, padding: "2px 6px", borderRadius: 4, fontWeight: 800 }}>
                          {st.confidence}% AI Confidence
                        </span>
                      ) : (
                        <span style={{ fontSize: 9, background: T.redBg, color: T.red, padding: "2px 6px", borderRadius: 4, fontWeight: 800 }}>
                          Warning Flag
                        </span>
                      )}
                    </div>

                    {st.matchVoucher ? (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: T.primary }}>Matched Voucher: {st.matchVoucher}</div>
                            <div style={{ fontSize: 9, color: T.text3, marginTop: 4, lineHeight: 1.3 }}>
                              Party: <strong>{st.party}</strong> <br/>
                              Reason: {st.reason}
                            </div>
                          </div>
                        </div>

                        {/* AI Reconciliation Action Bar */}
                        <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
                          <button onClick={() => { setReconDetailItem(st); }} style={{ padding: "4px 8px", background: "#f1f5f9", border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>View Details</button>
                          <button onClick={() => handleMatchAccept(st.id)} style={{ padding: "4px 8px", background: T.green, color: "#fff", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Auto Match</button>
                          <button onClick={() => toast.error("Transaction ignored from active matching")} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Ignore</button>
                          <button onClick={() => toast.success("Draft Voucher created")} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Create Voucher</button>
                          <button onClick={() => { setActiveTab("transactions"); setSearchQuery(st.party); }} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Open Ledger</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 10, color: T.text3, fontWeight: 700 }}>Unidentified interest payment/debit log.</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button onClick={() => { setReconDetailItem(st); }} style={{ padding: "4px 8px", background: "#f1f5f9", border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>View Details</button>
                          <button onClick={() => { toast.success("Auto Voucher generated!"); handleMatchAccept(st.id); }} style={{ padding: "4px 8px", background: T.primary, color: "#fff", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Create Voucher</button>
                          <button onClick={() => toast.error("Match Ignored")} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Ignore</button>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>
      )}

      {/* ── Tab: UPI & Gateways ── */}
      {activeTab === "collect" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* dynamic QR generator */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Dynamic UPI QR Code Generator</h3>
            <form onSubmit={e => { e.preventDefault(); setGeneratedQR(true); toast.success("Dynamic invoice QR link created!"); }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Customer Profile / Party</label>
                <input type="text" value={upiCustomer} onChange={e => setUpiCustomer(e.target.value)} placeholder="e.g. Sharma Traders" style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }} required />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Collect Amount (₹)</label>
                <input type="number" value={upiAmount} onChange={e => setUpiAmount(e.target.value)} placeholder="e.g. 125000" style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }} required />
              </div>
              <button
                type="submit"
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                  padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 10
                }}
              >
                Generate dynamic QR Code
              </button>
            </form>
          </Card>

          {/* Generated QR Output & Options */}
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220 }}>
            {generatedQR ? (
              <div style={{ textAlign: "center", width: "100%" }}>
                <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: `1.5px solid ${T.border}`, display: "inline-block" }}>
                  {/* Mock QR SVG representation */}
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#fff" />
                    <rect x="10" y="10" width="30" height="30" fill="#000" />
                    <rect x="15" y="15" width="20" height="20" fill="#fff" />
                    <rect x="18" y="18" width="14" height="14" fill="#000" />
                    <rect x="60" y="10" width="30" height="30" fill="#000" />
                    <rect x="65" y="15" width="20" height="20" fill="#fff" />
                    <rect x="68" y="18" width="14" height="14" fill="#000" />
                    <rect x="10" y="60" width="30" height="30" fill="#000" />
                    <rect x="15" y="65" width="20" height="20" fill="#fff" />
                    <rect x="60" y="60" width="10" height="10" fill="#000" />
                    <rect x="80" y="80" width="10" height="10" fill="#000" />
                    <rect x="70" y="70" width="10" height="10" fill="#000" />
                  </svg>
                </div>
                
                <div style={{ fontSize: 11, fontWeight: 800, color: T.text1, marginTop: 8 }}>Dynamic collect link for {upiCustomer}</div>
                <div style={{ fontSize: 10, color: T.green, fontWeight: 700, marginTop: 2 }}>Amount: {inr(parseFloat(upiAmount) || 0)}</div>
                
                {/* Advanced Share/Download buttons */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 12 }}>
                  <button onClick={() => { navigator.clipboard.writeText(`upi://pay?pa=daynisc@hdfc&pn=Daynisc&am=${upiAmount}`); toast.success("UPI payment link copied to clipboard"); }} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 8px", background: "#f1f5f9", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                    <Copy size={11} /> Copy Link
                  </button>
                  <button onClick={() => toast.success("Downloading QR Image (PNG)...")} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 8px", background: "#f1f5f9", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                    <Download size={11} /> PNG
                  </button>
                  <button onClick={() => toast.success("Generating Payment invoice PDF...")} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 8px", background: "#f1f5f9", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                    <Download size={11} /> PDF Invoice
                  </button>
                  <button onClick={() => toast.success("WhatsApp collect link shared")} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 8px", background: T.greenBg, color: T.green, border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                    <Share2 size={11} /> WhatsApp
                  </button>
                  <button onClick={() => toast.success(`Payment link emailed to customer: ${upiCustomer}`)} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 8px", background: T.cyanBg, color: T.cyan, border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                    <Mail size={11} /> Email Invoice
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: T.text3, fontSize: 11, textAlign: "center" }}>Fill form to generate dynamic collection links</div>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Cheque Designer ── */}
      {activeTab === "cheques" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
          
          {/* Alignment & controls panel */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase" }}>Cheque Template Designer</h3>
              <span style={{ fontSize: 9, color: T.primary, fontWeight: 700 }}>CTS-2010 Standard compliant</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Bank Template Format</label>
                  <select value={chequeTemplate} onChange={e => setChequeTemplate(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10 }}>
                    <option value="hdfc">HDFC Bank Format</option>
                    <option value="icici">ICICI Bank Format</option>
                    <option value="sbi">SBI Bank Format</option>
                    <option value="custom">Generic Corporate Format</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Paper Dimension</label>
                  <select value={paperSize} onChange={e => setPaperSize(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10 }}>
                    <option value="standard">Standard CTS (8.0 x 3.6 inch)</option>
                    <option value="large">Large Corporate (9.5 x 4.0 inch)</option>
                    <option value="custom">Custom Dimensions</option>
                  </select>
                </div>
              </div>

              {/* Offset adjustment sliders */}
              <div style={{ background: "#f8fafc", padding: 10, borderRadius: 6, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, fontWeight: 700, color: T.text1, borderBottom: `1px solid ${T.border}`, paddingBottom: 4, marginBottom: 4 }}>
                  <span>🎚 Alignment Offset Config (mm)</span>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                    <input type="checkbox" checked={showRulers} onChange={e => setShowRulers(e.target.checked)} />
                    Show Alignment Rulers
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between" }}>
                  <span style={{ fontSize: 9, width: 85, color: T.text3 }}>Payee Line Y-Offset:</span>
                  <input type="range" min="-15" max="15" value={offsetPayee} onChange={e => setOffsetPayee(parseInt(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontSize: 9, width: 25, textAlign: "right", fontWeight: 700 }}>{offsetPayee}mm</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between" }}>
                  <span style={{ fontSize: 9, width: 85, color: T.text3 }}>Amount Box X-Offset:</span>
                  <input type="range" min="-20" max="20" value={offsetAmount} onChange={e => setOffsetAmount(parseInt(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontSize: 9, width: 25, textAlign: "right", fontWeight: 700 }}>{offsetAmount}mm</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between" }}>
                  <span style={{ fontSize: 9, width: 85, color: T.text3 }}>Date Fields Y-Offset:</span>
                  <input type="range" min="-10" max="10" value={offsetDate} onChange={e => setOffsetDate(parseInt(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontSize: 9, width: 25, textAlign: "right", fontWeight: 700 }}>{offsetDate}mm</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between" }}>
                  <span style={{ fontSize: 9, width: 85, color: T.text3 }}>Sign Block Y-Offset:</span>
                  <input type="range" min="-15" max="15" value={offsetSign} onChange={e => setOffsetSign(parseInt(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontSize: 9, width: 25, textAlign: "right", fontWeight: 700 }}>{offsetSign}mm</span>
                </div>
              </div>

            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => toast.success("Printed CTS alignment test page...")} style={{ padding: "6px 12px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Print Alignment Test</button>
              <button onClick={() => toast.success("Custom cheque template saved successfully.")} style={{ padding: "6px 12px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Save Template</button>
            </div>
          </Card>

          {/* Designer Preview & Log */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Visual Canvas Cheque Preview */}
            <div style={{
              border: `1.5px solid ${T.border}`, borderRadius: 8, padding: 18,
              background: chequeTemplate === "hdfc" ? "#eff6ff" : chequeTemplate === "icici" ? "#fff7ed" : chequeTemplate === "sbi" ? "#f0fdf4" : "#ffffff",
              boxShadow: T.shadow,
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s ease"
            }}>
              
              {/* Optional Rulers overlay */}
              {showRulers && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", border: "1px dashed rgba(67, 97, 238, 0.2)" }}>
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: "1px dashed rgba(67, 97, 238, 0.15)" }} />
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, borderLeft: "1px dashed rgba(67, 97, 238, 0.15)" }} />
                  {/* Grid divisions */}
                  <div style={{ position: "absolute", top: "25%", left: 0, right: 0, borderTop: "1px dotted rgba(67, 97, 238, 0.1)" }} />
                  <div style={{ position: "absolute", top: "75%", left: 0, right: 0, borderTop: "1px dotted rgba(67, 97, 238, 0.1)" }} />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, paddingBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: chequeTemplate === "hdfc" ? "#1e3a8a" : chequeTemplate === "icici" ? "#c2410c" : chequeTemplate === "sbi" ? "#15803d" : T.text1 }}>
                  {chequeTemplate.toUpperCase()} BANK
                </span>
                <span style={{ fontSize: 9, fontFamily: "monospace", transform: `translateY(${offsetDate}px)` }}>
                  DATE: D D M M Y Y Y Y
                </span>
              </div>
              
              <div style={{ marginTop: 14, fontSize: 11, transform: `translateY(${offsetPayee}px)` }}>
                <span>PAY: _____________________________________________ OR BEARER</span>
              </div>
              
              <div style={{ marginTop: 12, fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>RUPEES: __________________________________________</span>
                <div style={{
                  border: `1.5px solid ${T.border}`, padding: "3px 12px", fontWeight: 800, background: "#fff",
                  transform: `translateX(${offsetAmount}px)`
                }}>
                  ₹ 1,20,000/-
                </div>
              </div>
              
              <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ fontSize: 8, fontFamily: "monospace", color: T.text3 }}>&quot;009874&quot; 400240002&quot; 000234&quot; 10</span>
                <div style={{ textAlign: "right", transform: `translateY(${offsetSign}px)` }}>
                  <div style={{ fontSize: 7, color: T.text3 }}>For Daynisc Technologies Pvt Ltd</div>
                  <div style={{ fontSize: 8, fontWeight: 800, marginTop: 12 }}>Authorized Signatory</div>
                </div>
              </div>
            </div>

            {/* cheque log ledger */}
            <Card>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Cheque Ledger Log</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MOCK_CHEQUES.map((ch, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 6 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: T.primary }}>Cheque No. {ch.num}</div>
                      <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>Party: {ch.party} · {ch.date}</div>
                    </div>
                    <div style={{ textTransform: "uppercase", textAlign: "right" }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{inr(ch.amt)}</div>
                      <span style={{ fontSize: 8, color: ch.status === "Cleared" ? T.green : T.red, fontWeight: 700 }}>{ch.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Banking Calendar ── */}
      {activeTab === "calendar" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
          
          {/* Calendar Agenda */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Banking Agenda Calendar</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MOCK_CALENDAR.map((cal, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <div style={{ textAlign: "center", minWidth: 45 }}>
                    <div style={{ fontSize: 8, textTransform: "uppercase", color: T.text3 }}>{new Date(cal.date).toLocaleDateString("en-IN", { month: "short" })}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.primary }}>{new Date(cal.date).toLocaleDateString("en-IN", { day: "2-digit" })}</div>
                  </div>
                  
                  <div style={{ flex: 1, borderLeft: `2.5px solid ${cal.type === "EMI Due" || cal.type === "GST Payment" ? T.red : cal.type === "Bank Holiday" ? T.text3 : T.green}`, paddingLeft: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text1 }}>{cal.title}</span>
                      <span style={{ fontSize: 8, color: T.text3 }}>{cal.bank}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 8, color: T.text3 }}>Type: {cal.type}</span>
                      {cal.amt > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: cal.type === "EMI Due" || cal.type === "GST Payment" ? T.red : T.green }}>{inr(cal.amt)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Auto Reminder notification Logs */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.primary, textTransform: "uppercase", marginBottom: 12 }}>Auto-Reminder dispatch Logs</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MOCK_REMINDER_LOGS.map(log => (
                <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800 }}>{log.type}</div>
                    <div style={{ fontSize: 8, color: T.text3, marginTop: 2 }}>Sent via {log.channel} to {log.target}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={badge(T.green, T.greenBg)}>{log.status}</span>
                    <div style={{ fontSize: 8, color: T.text3, marginTop: 2 }}>{log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      )}

      {/* ── Tab: Forecast & Analytics ── */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Interval Switcher */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Expected corporate liquid resource inflows vs outflows</span>
            <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", background: "#fff" }}>
              {(["7d", "30d", "90d"] as const).map(inv => (
                <button
                  key={inv}
                  onClick={() => setForecastInterval(inv)}
                  style={{
                    padding: "6px 12px", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer",
                    background: forecastInterval === inv ? T.primary : "#fff",
                    color: forecastInterval === inv ? "#fff" : T.text2
                  }}
                >
                  {inv === "7d" ? "Next 7 Days" : inv === "30d" ? "Next 30 Days" : "Next 90 Days"}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Forecast Visual Chart */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.primary, textTransform: "uppercase", marginBottom: 12 }}>
              Expected Inflow vs Outflow Cash Forecast ({forecastInterval === "7d" ? "7 Days Projection" : forecastInterval === "30d" ? "30 Days Projection" : "90 Days Projection"})
            </h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={forecastInterval === "7d" ? FORECAST_7D : forecastInterval === "30d" ? FORECAST_30D : FORECAST_90D}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.divider} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                  <YAxis tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                  <ChartTooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar name="Expected Inflows (Receipts)" dataKey="expectedIn" fill={T.green} radius={[3, 3, 0, 0]} />
                  <Bar name="Expected Outflows (Payments)" dataKey="expectedOut" fill={T.red} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Income vs Expenses Bar Chart */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
            <Card>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: T.text1, textTransform: "uppercase", marginBottom: 12 }}>Corporate Inflow & Outflow Analysis</h3>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ANALYTICS_CASHFLOW_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.divider} />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                    <YAxis tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                    <ChartTooltip content={<ChartTip />} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar name="Corporate Revenue" dataKey="inflow" fill={T.green} radius={[3, 3, 0, 0]} />
                    <Bar name="Corporate Expenses" dataKey="outflow" fill={T.red} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Treasury 30-Day projection Forecast */}
            <Card>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: T.primary, textTransform: "uppercase", marginBottom: 12 }}>30-Day Liquidity Trend Forecast</h3>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={FORECAST_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.divider} />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                    <YAxis tick={{ fontSize: 9, fill: T.text3 }} stroke={T.border} />
                    <ChartTooltip content={<ChartTip />} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Line name="Actual Liquidity" type="monotone" dataKey="actual" stroke={T.primary} strokeWidth={3} activeDot={{ r: 6 }} />
                    <Line name="Projected Cash Trend" type="monotone" dataKey="projected" stroke={T.amber} strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Reports & Audit Trail ── */}
      {activeTab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Reports grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {MOCK_REPORTS_LIST.map(rep => (
              <div
                key={rep.id}
                onClick={() => { setSelectedReportId(rep.id); setReportModalOpen(true); }}
                style={{
                  ...cardStyle({ padding: 14, display: "flex", alignItems: "flex-start", gap: 12 }),
                  cursor: "pointer",
                  transition: "transform 0.1s ease, border-color 0.15s ease"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6, background: `${T.primary}10`, color: T.primary }}>
                  <FileText size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: T.text1 }}>{rep.name}</span>
                    <span style={{ fontSize: 8, background: T.cyanBg, color: T.cyan, padding: "1px 4px", borderRadius: 4, fontWeight: 700 }}>{rep.type}</span>
                  </div>
                  <p style={{ fontSize: 10, color: T.text3, marginTop: 4, lineHeight: 1.3 }}>{rep.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* System Audit Trail Logs */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: T.red, textTransform: "uppercase", marginBottom: 12 }}>Treasury & Banking System Audit Trails</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Timestamp", "User profile", "Action Logged", "IP Address", "Device / Agent", "Before State", "After State"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_AUDIT_TRAIL.map((trail, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.divider}` }}>
                      <td style={tdStyle}>{trail.time}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{trail.user}</td>
                      <td style={tdStyle}>{trail.action}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace" }}>{trail.ip}</td>
                      <td style={tdStyle}>{trail.device}</td>
                      <td style={{ ...tdStyle, color: T.text3 }}>{trail.before}</td>
                      <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>{trail.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

      {/* Consolidated Bottom-Right Speed Dial FAB */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        {showSpeedDial && (
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10,
            padding: 8, display: "flex", flexDirection: "column", gap: 4,
            boxShadow: T.shadowMd, width: 170
          }}>
            {[
              { type: "add-bank", label: "➕ Add Bank Account" },
              { type: "payment", label: "💸 Bank Payment" },
              { type: "receipt", label: "💰 Bank Receipt" },
              { type: "transfer", label: "🔁 Fund Transfer" },
              { type: "deposit", label: "🏦 Cash Deposit" },
              { type: "upload", label: "📄 Upload Statement" },
              { type: "qr", label: "📱 Generate UPI QR" },
              { type: "cheque", label: "📝 Create Cheque" }
            ].map(opt => (
              <button
                key={opt.type}
                onClick={() => {
                  setShowSpeedDial(false);
                  if (opt.type === "add-bank") setShowAddAccountModal(true);
                  if (opt.type === "payment") { setPaymentType("payment"); setShowPaymentModal(true); }
                  if (opt.type === "receipt") { setPaymentType("receipt"); setShowPaymentModal(true); }
                  if (opt.type === "transfer") setActiveTab("transfer");
                  if (opt.type === "deposit") setActiveTab("transfer");
                  if (opt.type === "upload") setActiveTab("recon");
                  if (opt.type === "qr") setActiveTab("collect");
                  if (opt.type === "cheque") setActiveTab("cheques");
                }}
                style={{
                  display: "block", width: "100%", padding: "6px 10px", border: "none",
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
          onClick={() => setShowSpeedDial(!showSpeedDial)}
          style={{
            width: 46, height: 46, borderRadius: 23, background: T.primary,
            color: "#fff", border: "none", fontSize: 22, fontWeight: 800,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 10px 25px rgba(67, 97, 238, 0.35)",
            transition: "transform 0.1s ease"
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {showSpeedDial ? "✕" : "＋"}
        </button>
      </div>

      {/* Modal: Add Bank Account */}
      {showAddAccountModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16,
            width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>Register New Bank Account</h3>
              <button onClick={() => setShowAddAccountModal(false)} style={{ background: "none", border: "none", fontSize: 16, color: T.text3, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); toast.success("Bank account successfully linked and configured!"); setShowAddAccountModal(false); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Bank Name</label>
                <input type="text" placeholder="e.g. HDFC Current Account" style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }} required />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Account Number</label>
                <input type="text" placeholder="XXXX0912" style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }} required />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Initial Book Balance</label>
                <input type="number" placeholder="50000" style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }} required />
              </div>
              <button
                type="submit"
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                  padding: "10px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 6
                }}
              >
                Register & Link Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bank Payment / Receipt */}
      {showPaymentModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16,
            width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>New Bank {paymentType === "payment" ? "Payment" : "Receipt"} Entry</h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: "none", border: "none", fontSize: 16, color: T.text3, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); toast.success(`Bank ${paymentType} logged and posted successfully!`); setShowPaymentModal(false); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Favouring Party / Payer</label>
                <input type="text" placeholder="e.g. Patel Enterprises" style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }} required />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Transaction Amount (₹)</label>
                <input type="number" placeholder="50000" style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }} required />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Select Bank channel</label>
                <select style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }}>
                  <option value="hdfc">HDFC Current Account</option>
                  <option value="icici">ICICI Cash Credit</option>
                </select>
              </div>
              <button
                type="submit"
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                  padding: "10px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 6
                }}
              >
                Post Ledger Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Interactive Reports Viewer */}
      {reportModalOpen && selectedReportId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16,
            width: "100%", maxWidth: 680, padding: 24, boxShadow: "0 25px 55px rgba(0,0,0,0.22)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>
                  {MOCK_REPORTS_LIST.find(r => r.id === selectedReportId)?.name}
                </h3>
                <span style={{ fontSize: 9, color: T.text3 }}>Category: {MOCK_REPORTS_LIST.find(r => r.id === selectedReportId)?.type}</span>
              </div>
              <button onClick={() => setReportModalOpen(false)} style={{ background: "none", border: "none", fontSize: 18, color: T.text3, cursor: "pointer" }}>✕</button>
            </div>

            {/* Quick Report parameters */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#f8fafc", padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                <span style={{ color: T.text3 }}>From:</span>
                <input type="date" defaultValue="2026-06-01" style={{ padding: "4px 8px", border: `1px solid ${T.border}`, borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                <span style={{ color: T.text3 }}>To:</span>
                <input type="date" defaultValue="2026-06-30" style={{ padding: "4px 8px", border: `1px solid ${T.border}`, borderRadius: 4 }} />
              </div>
              <button onClick={() => toast.success("Report filtered successfully")} style={{ padding: "4px 10px", background: T.primary, color: "#fff", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Filter Feed</button>
            </div>

            {/* Dummy Tabular Report Output */}
            <div style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ ...thStyle, padding: 8 }}>Record ID</th>
                    <th style={{ ...thStyle, padding: 8 }}>Reference Party</th>
                    <th style={{ ...thStyle, padding: 8 }}>Voucher Ref</th>
                    <th style={{ ...thStyle, padding: 8 }}>Dr/Cr Amount</th>
                    <th style={{ ...thStyle, padding: 8 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "LOG-01", party: "Reliance Polymers Ltd", ref: "REC-1092", amt: 120000, dr: false, status: "Cleared" },
                    { id: "LOG-02", party: "Patel Enterprises", ref: "SAL-3001", amt: 45000, dr: true, status: "Cleared" },
                    { id: "LOG-03", party: "HDFC Charges Log", ref: "CHG-9023", amt: 1200, dr: true, status: "Settled" },
                    { id: "LOG-04", party: "Supreme Plastics Ltd", ref: "REC-223", amt: 90000, dr: false, status: "Cleared" },
                    { id: "LOG-05", party: "SBI Corporate Loan", ref: "EMI-9018", amt: 125000, dr: true, status: "Processed" }
                  ].map(row => (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${T.divider}` }}>
                      <td style={{ ...tdStyle, padding: 8 }}>{row.id}</td>
                      <td style={{ ...tdStyle, padding: 8, fontWeight: 600 }}>{row.party}</td>
                      <td style={{ ...tdStyle, padding: 8, fontFamily: "monospace" }}>{row.ref}</td>
                      <td style={{ ...tdStyle, padding: 8, color: row.dr ? T.red : T.green, fontWeight: 700 }}>
                        {row.dr ? "-" : "+"}{inr(row.amt)}
                      </td>
                      <td style={{ ...tdStyle, padding: 8 }}>
                        <span style={badge(row.dr ? T.red : T.green, row.dr ? T.redBg : T.greenBg)}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => toast.success("PDF spreadsheet compilation generated...")} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Export PDF</button>
              <button onClick={() => toast.success("Excel report exported...")} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Export Excel</button>
              <button onClick={() => toast.success("Document queue sent to print spooler")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                <Printer size={13} /> Print Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Reconciliation Match Details */}
      {reconDetailItem && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16,
            width: "100%", maxWidth: 450, padding: 24, boxShadow: "0 25px 55px rgba(0,0,0,0.22)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>AI Suggested Match Parameters</h3>
              <button onClick={() => setReconDetailItem(null)} style={{ background: "none", border: "none", fontSize: 18, color: T.text3, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8, fontSize: 11, marginBottom: 14 }}>
              <div><span style={{ color: T.text3 }}>Statement Reference:</span> <strong style={{ color: T.primary }}>{reconDetailItem.ref}</strong></div>
              <div><span style={{ color: T.text3 }}>Statement Date:</span> <span>{reconDetailItem.date}</span></div>
              <div><span style={{ color: T.text3 }}>Transaction Party:</span> <strong>{reconDetailItem.party}</strong></div>
              <div><span style={{ color: T.text3 }}>Transaction Amount:</span> <strong style={{ color: reconDetailItem.type === "Credit" ? T.green : T.red }}>{inr(reconDetailItem.amount)}</strong></div>
              <div><span style={{ color: T.text3 }}>Confidence Rating:</span> <strong style={{ color: T.green }}>{reconDetailItem.confidence ? `${reconDetailItem.confidence}%` : "No Match"}</strong></div>
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 6, marginTop: 4 }}><span style={{ color: T.text3 }}>AI Match Explanation:</span> <br/><span style={{ color: T.text2, fontStyle: "italic", fontSize: 10 }}>&quot;{reconDetailItem.reason || "Automatic warning due to missing reference ID. Bank interest charges standard debit ledger auto-rule applies."}&quot;</span></div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button onClick={() => setReconDetailItem(null)} style={{ padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Close Window</button>
              <button onClick={() => { handleMatchAccept(reconDetailItem.id); setReconDetailItem(null); }} style={{ padding: "6px 12px", background: T.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Confirm Match</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Digital Token Approval Maker-Checker verification */}
      {showDigitalTokenModal && approvingItem && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16,
            width: "100%", maxWidth: 380, padding: 24, boxShadow: "0 25px 55px rgba(0,0,0,0.22)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>Digital Approval Verification</h3>
              <button onClick={() => setShowDigitalTokenModal(false)} style={{ background: "none", border: "none", fontSize: 18, color: T.text3, cursor: "pointer" }}>✕</button>
            </div>
            
            <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, marginBottom: 12, fontSize: 10 }}>
              <div>Approve payment to: <strong>{approvingItem.payee}</strong></div>
              <div>Amount: <strong style={{ color: T.red }}>{inr(approvingItem.amt)}</strong></div>
              <div>Workflow level: <strong>Director approval release</strong></div>
            </div>

            <form onSubmit={handleApproveWithToken} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>Enter OTP / Security Token Code (Demo Code: 989898)</label>
                <input
                  type="text"
                  placeholder="989898"
                  value={tokenCode}
                  onChange={e => setTokenCode(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 14, textAlign: "center", letterSpacing: "2px", fontWeight: 800 }}
                  required
                />
              </div>
              <button
                type="submit"
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                  padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4
                }}
              >
                Sign & Authorize Payout
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Beneficiary Form */}
      {showNewBeneficiaryModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16,
            width: "100%", maxWidth: 420, padding: 24, boxShadow: "0 25px 55px rgba(0,0,0,0.22)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>Add New Beneficiary Profile</h3>
              <button onClick={() => setShowNewBeneficiaryModal(false)} style={{ background: "none", border: "none", fontSize: 18, color: T.text3, cursor: "pointer" }}>✕</button>
            </div>
            
            <form onSubmit={handleAddBeneficiary} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Beneficiary Name</label>
                <input type="text" value={newBenName} onChange={e => setNewBenName(e.target.value)} placeholder="e.g. Reliance Polymers Ltd" style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }} required />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Settlement Bank</label>
                  <select value={newBenBank} onChange={e => setNewBenBank(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }}>
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="SBI Bank">SBI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Profile Type</label>
                  <select value={newBenType} onChange={e => setNewBenType(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }}>
                    <option value="Vendor">Vendor Payee</option>
                    <option value="Customer">Customer Refund</option>
                    <option value="Employee">Employee Payout</option>
                    <option value="Government">Government / Tax</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>Account Number</label>
                <input type="text" value={newBenAcc} onChange={e => setNewBenAcc(e.target.value)} placeholder="e.g. 5020008912" style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }} required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>IFSC Code</label>
                  <input type="text" value={newBenIfsc} onChange={e => setNewBenIfsc(e.target.value)} placeholder="e.g. HDFC0000060" style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }} required />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 9, color: T.text3, fontWeight: 700 }}>UPI ID (Optional)</label>
                  <input type="text" value={newBenUpi} onChange={e => setNewBenUpi(e.target.value)} placeholder="e.g. name@okaxis" style={{ padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }} />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                  padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 6
                }}
              >
                Register Beneficiary Profile
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
