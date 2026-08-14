// src/pages/SalesPage.tsx
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import { IconBox, IconMoney, IconBank, IconFile, IconUpload, IconUser } from "../components/Icons";
import toast from "react-hot-toast";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
  BarChart, Bar, Legend, LineChart, Line
} from "recharts";
import {
  Download, Copy, Share2, Mail, FileSpreadsheet,
  Settings, Landmark, FileText, CheckCircle2,
  AlertTriangle, Calendar as IconCal, Info, Printer, ShieldAlert,
  Check, X, Eye, HelpCircle, ShieldCheck, ChevronRight, Activity, Clock,
  ArrowRightLeft, AlertCircle, RefreshCw, Send, Plus, Award, Star,
  TrendingUp, Users, ShoppingBag, AlertOctagon, FileCheck, Clipboard, Play, Moon, Sun, MapPin, Truck
} from "lucide-react";

type PrimaryTab = "dashboard" | "orders" | "warehouse" | "customers" | "finance" | "analytics";
type OrdersSubTab = "sales_orders" | "quotations" | "approvals";
type WarehouseSubTab = "challans" | "packing" | "returns" | "route_planning";
type CustomersSubTab = "profiles" | "credit" | "portal";
type FinanceSubTab = "price_matrices" | "discount_rules" | "targets";

// ── Mock Databases ────────────────────────────────────────────────────────────

const MOCK_QUOTATIONS = [
  { id: "QT-2026-001", customer: "Patel Enterprises", date: "2026-06-30", validUntil: "2026-07-15", amount: 185000, revisions: 3, discount: 5, tax: 18, status: "Under Review", currency: "INR", eSignature: "Signed - Sanjay Patel", items: [{ desc: "HDPE Granules Grade A", qty: 2500, rate: 70 }] },
  { id: "QT-2026-002", customer: "Supreme Plastics Ltd", date: "2026-06-28", validUntil: "2026-07-10", amount: 480000, revisions: 1, discount: 7.5, tax: 18, status: "Accepted by Client", currency: "INR", eSignature: "Signed - K. Shah", items: [{ desc: "Polypropylene Resin PP-40", qty: 5000, rate: 88 }] },
  { id: "QT-2026-003", customer: "Verma Chemicals", date: "2026-06-25", validUntil: "2026-07-05", amount: 120000, revisions: 2, discount: 0, tax: 18, status: "Expired", currency: "USD", eSignature: "", items: [{ desc: "PVC Compound PVC-E2", qty: 1200, rate: 100 }] }
];

const MOCK_ORDERS = [
  { id: "SO-1102", customer: "Supreme Plastics Ltd", date: "2026-06-30", delDate: "2026-07-05", amount: 450000, outstanding: 150000, poNum: "PO-9018", status: "confirmed", stage: "Confirmed", timeline: { draft: "10:05", approved: "10:15", confirmed: "10:20", packing: "", dispatch: "", delivered: "", paid: "" }, currency: "INR", taxSplit: { cgst: 40500, sgst: 40500 }, items: [{ desc: "Polypropylene Resin PP-40", qty: 4500, rate: 88, amount: 396000 }], auditLogs: ["Maker Ramesh created SO Draft on 2026-06-30 10:05", "Manager Sanjay signed off on 2026-06-30 10:15", "Finance verified credit limits and confirmed order on 2026-06-30 10:20"], comments: [{ author: "Ramesh", text: "Client requested urgent dispatch by Tuesday morning." }] },
  { id: "SO-1101", customer: "Patel Enterprises", date: "2026-06-29", delDate: "2026-07-02", amount: 180000, outstanding: 0, poNum: "PO-8810", status: "delivered", stage: "Delivered", timeline: { draft: "09:00", approved: "09:30", confirmed: "09:40", packing: "10:30", dispatch: "11:00", delivered: "15:30", paid: "16:00" }, currency: "INR", taxSplit: { cgst: 16200, sgst: 16200 }, items: [{ desc: "HDPE Granules Grade A", qty: 2500, rate: 70, amount: 175000 }], auditLogs: ["Maker Sanjay created draft on 2026-06-29 09:00", "Manager signed on 2026-06-29 09:30", "Confirmed on 2026-06-29 09:40", "Dispatched from Mumbai Hub on 2026-06-29 11:00", "Delivered confirmation receipt uploaded on 2026-06-29 15:30"], comments: [] },
  { id: "SO-1100", customer: "Sharma Traders", date: "2026-06-28", delDate: "2026-07-01", amount: 350000, outstanding: 350000, poNum: "PO-7712", status: "dispatched", stage: "Dispatch", timeline: { draft: "08:15", approved: "08:30", confirmed: "09:00", packing: "10:00", dispatch: "11:30", delivered: "", paid: "" }, currency: "INR", taxSplit: { cgst: 31500, sgst: 31500 }, items: [{ desc: "PVC Compound PVC-E2", qty: 3500, rate: 100, amount: 350000 }], auditLogs: ["Maker Ramesh created SO Draft on 2026-06-28 08:15", "Approved on 2026-06-28 08:30", "Confirmed on 2026-06-28 09:00", "Lorry loaded MH-02-AA-4567 on 2026-06-28 11:30"], comments: [{ author: "Sanjay", text: "LR tracking shared with driver Satnam." }] },
  { id: "SO-1099", customer: "ABC Industries", date: "2026-06-25", delDate: "2026-06-28", amount: 88000, outstanding: 88000, poNum: "PO-6523", status: "draft", stage: "Draft", timeline: { draft: "11:45", approved: "", confirmed: "", packing: "", dispatch: "", delivered: "", paid: "" }, currency: "INR", taxSplit: { cgst: 7920, sgst: 7920 }, items: [{ desc: "HDPE Granules Grade A", qty: 1000, rate: 88, amount: 88000 }], auditLogs: ["Maker Sanjay created draft on 2026-06-25 11:45"], comments: [] }
];

const MOCK_CHALLANS = [
  { id: "DC-2026-501", orderId: "SO-1101", customer: "Patel Enterprises", date: "2026-06-29", status: "Fully Delivered", vehicle: "GJ-01-XX-9821", driver: "Rajesh Kumar", eway: "331209845761", lrNum: "LR-908123" },
  { id: "DC-2026-502", orderId: "SO-1100", customer: "Sharma Traders", date: "2026-06-29", status: "In Transit", vehicle: "MH-02-AA-4567", driver: "Satnam Singh", eway: "450912384756", lrNum: "LR-887102" }
];

const MOCK_PACKING = [
  { id: "PL-1101", orderId: "SO-1101", boxes: 5, weight: 120, dimensions: "120x80x100 cm", items: "HDPE Granules", hsn: "3901", serials: "SN-9081 to SN-9085" },
  { id: "PL-1100", orderId: "SO-1100", boxes: 10, weight: 240, dimensions: "150x100x120 cm", items: "Plastic Resins", hsn: "3902", serials: "SN-8812 to SN-8821" }
];

const MOCK_CREDIT_CONTROL = [
  { customer: "Supreme Plastics Ltd", limit: 1000000, used: 450000, available: 550000, overdue: 150000, blocked: false },
  { customer: "Patel Enterprises", limit: 500000, used: 180000, available: 320000, overdue: 0, blocked: false },
  { customer: "Sharma Traders", limit: 300000, used: 350000, available: -50000, overdue: 350000, blocked: true },
  { customer: "ABC Industries", limit: 1500000, used: 88000, available: 1412000, overdue: 88000, blocked: false }
];

const MOCK_CUSTOMERS = [
  { name: "Supreme Plastics Ltd", email: "info@supremeplastics.com", phone: "+91 98210 12345", gstin: "27AAACS1209D1Z4", currency: "INR", territory: "West Zone (MH)", address: "Plot 42, GIDC Andheri, Mumbai", timeline: ["30-Jun: Quotation accepted by client", "29-Jun: Collection follow-up regarding aging receivables", "28-Jun: Invoiced SO-1102"], rating: 5, lastPurchase: 450000, recoveryRate: 94 },
  { name: "Patel Enterprises", email: "contact@patelent.com", phone: "+91 99012 88710", gstin: "24AAACP4510B1Z9", currency: "INR", territory: "West Zone (GJ)", address: "102, GIDC Makarpura, Baroda", timeline: ["29-Jun: Delivery DC-2026-501 fully completed", "29-Jun: E-way bill registered"], rating: 4, lastPurchase: 180000, recoveryRate: 100 },
  { name: "Sharma Traders", email: "sharmaplastics@gmail.com", phone: "+91 91220 44521", gstin: "19AAACS7712E1Z2", currency: "INR", territory: "North Zone", address: "G-10, GIDC Central, New Delhi", timeline: ["28-Jun: Ordered PVC compounds (Credit Blocked)", "25-Jun: Dynamic discount scheme dispatched via WhatsApp"], rating: 3, lastPurchase: 350000, recoveryRate: 64 }
];

const MOCK_PRICING = [
  { product: "HDPE Granules Grade A", retail: 85, wholesale: 70, distributor: 65, dealer: 68, export: 62, margin: 24, profitAfterGst: 18.2 },
  { product: "Polypropylene Resin PP-40", retail: 105, wholesale: 88, distributor: 82, dealer: 85, export: 78, margin: 26, profitAfterGst: 21.0 },
  { product: "PVC Compound PVC-E2", retail: 95, wholesale: 78, distributor: 72, dealer: 75, export: 69, margin: 22, profitAfterGst: 15.5 }
];

const MOCK_DISCOUNTS = [
  { name: "Festival Monsoon Deal", type: "Festival", rate: "5%", rule: "Flat 5% on orders > ₹1L" },
  { name: "Slab Bulk Discount", type: "Quantity", rate: "7.5%", rule: "7.5% off on qty > 5000 kg" },
  { name: "Exclusive Dealer Scheme", type: "Scheme", rate: "2% Extra", rule: "Extra 2% for registered distributors" }
];

const MOCK_APPROVALS = [
  { id: "AP-SO-1102", type: "Sales Order", amount: 450000, party: "Supreme Plastics Ltd", creator: "Executive Ramesh", status: "Pending Manager Sign-off", date: "2026-06-30" },
  { id: "AP-QT-2026-001", type: "Quotation", amount: 185000, party: "Patel Enterprises", creator: "Executive Sanjay", status: "Pending Finance Clearance", date: "2026-06-30" }
];

const MOCK_TARGETS = [
  { employee: "Sanjay Patel", branch: "Gujarat Branch", target: 1500000, achieved: 1250000, rate: 83.3, commission: 25000 },
  { employee: "Ramesh Kumar", branch: "Maharashtra Branch", target: 1200000, achieved: 1080000, rate: 90.0, commission: 21600 },
  { employee: "Anil Sharma", branch: "Delhi Branch", target: 800000, achieved: 450000, rate: 56.25, commission: 9000 }
];

const MOCK_RETURNS = [
  { id: "RMA-2026-01", orderId: "SO-1085", customer: "Supreme Plastics Ltd", date: "2026-06-28", reason: "Defective batch (PVC)", status: "Inspected - Passed", replacement: "Sent SO-1103", creditNote: "CN-9081" },
  { id: "RMA-2026-02", orderId: "SO-1090", customer: "Sharma Traders", date: "2026-06-25", reason: "Wrong dimensions", status: "Pending Inspection", replacement: "Awaiting", creditNote: "" }
];

const MOCK_ROUTE_PLANNING = [
  { id: "RP-801", territory: "Gujarat North-West", route: "Baroda Hub → Makarpura GIDC", salesperson: "Sanjay Patel", scheduledVisits: 3, vehicle: "GJ-01-XX-9821", driver: "Rajesh Kumar" },
  { id: "RP-802", territory: "Maharashtra Central", route: "Mumbai Hub → Andheri East GIDC", salesperson: "Ramesh Kumar", scheduledVisits: 5, vehicle: "MH-02-AA-4567", driver: "Satnam Singh" }
];

// Charts Mock Data
const SALES_TREND_DATA = [
  { month: "Jan", sales: 1250000, target: 1100000, gp: 320000, retention: 94 },
  { month: "Feb", sales: 1480000, target: 1200000, gp: 380000, retention: 95 },
  { month: "Mar", sales: 1950000, target: 1500000, gp: 510000, retention: 94 },
  { month: "Apr", sales: 1120000, target: 1300000, gp: 280000, retention: 96 },
  { month: "May", sales: 1680000, target: 1400000, gp: 440000, retention: 97 },
  { month: "Jun", sales: 2450000, target: 1800000, gp: 680000, retention: 98 }
];

const REGION_SALES_DATA = [
  { name: "West Zone", value: 3400000, color: "#4361ee" },
  { name: "North Zone", value: 1800000, color: "#0891b2" },
  { name: "South Zone", value: 2200000, color: "#16a34a" },
  { name: "East Zone", value: 980000, color: "#d97706" }
];

const TOP_PRODUCTS = [
  { name: "HDPE Granules", sales: 1850000, category: "Polymers" },
  { name: "PVC Compounds", sales: 1420000, category: "Vinyls" },
  { name: "Polypropylene Resin", sales: 1120000, category: "Polymers" }
];

const AGING_ANALYSIS_DATA = [
  { range: "0-30 Days", amount: 150000, color: "#10b981" },
  { range: "31-60 Days", amount: 200000, color: "#f59e0b" },
  { range: "61-90 Days", amount: 88000, color: "#ef4444" },
  { range: "90+ Days", amount: 350000, color: "#7f1d1d" }
];

// Styling utilities
const getTheme = (isDark: boolean) => ({
  pageBg: isDark ? "#090d16" : T.pageBg,
  cardBg: isDark ? "#121824" : "#ffffff",
  text1: isDark ? "#f1f5f9" : T.text1,
  text2: isDark ? "#cbd5e1" : T.text2,
  text3: isDark ? "#94a3b8" : T.text3,
  border: isDark ? "#1e293b" : T.border,
  divider: isDark ? "#0f172a" : T.divider,
  rowHover: isDark ? "#1e293b" : T.rowHover,
  primary: T.primary,
  cyanBg: isDark ? "rgba(6, 182, 212, 0.15)" : T.cyanBg,
  greenBg: isDark ? "rgba(34, 197, 94, 0.15)" : T.greenBg,
  redBg: isDark ? "rgba(239, 68, 68, 0.15)" : T.redBg,
  amberBg: isDark ? "rgba(245, 158, 11, 0.15)" : T.amberBg,
  primaryBg: isDark ? "rgba(67, 97, 238, 0.15)" : "rgba(67, 97, 238, 0.05)"
});

// local helpers
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

const ACCENT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  sales: { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)", text: "#3b82f6" },
  finance: { border: "#22c55e", bg: "rgba(34, 197, 94, 0.08)", text: "#22c55e" },
  alerts: { border: "#ef4444", bg: "rgba(239, 68, 68, 0.08)", text: "#ef4444" },
  pending: { border: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)", text: "#f59e0b" },
  completed: { border: "#10b981", bg: "rgba(16, 185, 129, 0.08)", text: "#10b981" },
  analytics: { border: "#a855f7", bg: "rgba(168, 85, 247, 0.08)", text: "#a855f7" }
};

function Card({ children, style = {}, isDark }: { children: React.ReactNode; style?: React.CSSProperties; isDark?: boolean }) {
  const C = getTheme(!!isDark);
  return (
    <div style={{ ...cardStyle({ padding: 18 }), background: C.cardBg, borderColor: C.border, ...style }}>
      {children}
    </div>
  );
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", zIndex: 99 }}>
      <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill || "#fff", fontSize: 13, fontWeight: 600, margin: "2px 0" }}>
          {p.name ? `${p.name}: ` : ""}{inr(p.value)}
        </p>
      ))}
    </div>
  );
};

function KpiCard({
  label,
  value,
  icon,
  accent = "sales",
  trend,
  subText,
  sparkData = [10, 15, 8, 12, 18, 25],
  onClick,
  isDark
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "sales" | "finance" | "alerts" | "pending" | "completed" | "analytics";
  trend?: { val: string; up: boolean };
  subText?: string;
  sparkData?: number[];
  onClick?: () => void;
  isDark?: boolean;
}) {
  const colors = ACCENT_COLORS[accent] || ACCENT_COLORS.sales;
  const C = getTheme(!!isDark);
  const chartData = sparkData.map((v, i) => ({ x: i, y: v }));

  return (
    <div
      onClick={onClick}
      style={{
        ...cardStyle({ padding: "12px 16px" }),
        flex: "1 1 200px",
        cursor: onClick ? "pointer" : "default",
        background: C.cardBg,
        borderColor: C.border,
        borderLeft: `4.5px solid ${colors.border}`,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 90,
        transition: "transform 0.15s ease, box-shadow 0.15s ease"
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
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
          <span style={{ color: colors.text }}>{icon}</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text1 }}>{value}</div>
      </div>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 }}>
        <div>
          {trend && (
            <span style={{ fontSize: 9, fontWeight: 700, color: trend.up ? T.green : T.red, marginRight: 6 }}>
              {trend.val}
            </span>
          )}
          {subText && <span style={{ fontSize: 8, color: C.text3 }}>{subText}</span>}
        </div>
        <div style={{ width: 60, height: 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
              <Area type="monotone" dataKey="y" stroke={colors.border} fill={colors.bg} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const [isDark, setIsDark] = useState(false);
  const C = getTheme(isDark);

  // Consolidated Workspace state
  const [activeTab, setActiveTab] = useState<PrimaryTab>("dashboard");
  const [ordersSubTab, setOrdersSubTab] = useState<OrdersSubTab>("sales_orders");
  const [warehouseSubTab, setWarehouseSubTab] = useState<WarehouseSubTab>("challans");
  const [customersSubTab, setCustomersSubTab] = useState<CustomersSubTab>("profiles");
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>("price_matrices");

  const [dateFilter, setDateFilter] = useState("Month"); // Today, Week, Month, Quarter, FY

  // AI Prompt Assistant Conversational State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { id: 1, sender: "ai", text: "Hello! I am your Daynisc ERP Sales Co-Pilot. How can I audit company logs for you today?" }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  // Global ERP Search box
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Kanban view state
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  
  // Speed dial FAB State
  const [showSpeedDial, setShowSpeedDial] = useState(false);

  // Modals state
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [approvingItem, setApprovingItem] = useState<any | null>(null);
  const [otpCode, setOtpCode] = useState("");

  // Logistics Live GPS Drawer
  const [activeGPSChallan, setActiveGPSChallan] = useState<any | null>(null);

  // Drawer details view state
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<any | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  // Simulated Database states
  const [quotations, setQuotations] = useState(MOCK_QUOTATIONS);
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [challans, setChallans] = useState(MOCK_CHALLANS);
  const [packingLists, setPackingLists] = useState(MOCK_PACKING);
  const [creditLedgers, setCreditLedgers] = useState(MOCK_CREDIT_CONTROL);
  const [approvalsQueue, setApprovalsQueue] = useState(MOCK_APPROVALS);
  const [returnsList, setReturnsList] = useState(MOCK_RETURNS);
  const [customersList, setCustomersList] = useState(MOCK_CUSTOMERS);
  const [routePlans, setRoutePlans] = useState(MOCK_ROUTE_PLANNING);

  // Portal interactions
  const [portalView, setPortalView] = useState("orders"); // orders, outstanding, complaints
  const [showPaymentSimulator, setShowPaymentSimulator] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any | null>(null);

  // Input states
  const [quoteCust, setQuoteCust] = useState("");
  const [quoteAmt, setQuoteAmt] = useState("");
  const [quoteDiscount, setQuoteDiscount] = useState("5");
  const [quoteItem, setQuoteItem] = useState("");
  const [orderCust, setOrderCust] = useState("");
  const [orderAmt, setOrderAmt] = useState("");
  const [orderPo, setOrderPo] = useState("");
  const [newCustName, setNewCustName] = useState("");
  const [newCustLimit, setNewCustLimit] = useState("");
  const [challanSO, setChallanSO] = useState("SO-1102");
  const [challanVehicle, setChallanVehicle] = useState("");
  const [challanDriver, setChallanDriver] = useState("");

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── AI Conversational Response Generator ───────────────────────────────────
  const triggerAiResponse = (text: string) => {
    setAiLoading(true);
    const lowText = text.toLowerCase();
    let fullResponse = "";
    
    if (lowText.includes("top customer")) {
      fullResponse = "AI Analysis: Supreme Plastics Ltd is our top account contributing ₹34.50L. Average order value stands at ₹2.8L.";
    } else if (lowText.includes("dropped") || lowText.includes("why sales")) {
      fullResponse = "AI Audit: Sales dropped in April due to credit blocking of Sharma Traders (-₹50k available limit) and a raw material import delay.";
    } else if (lowText.includes("predict")) {
      fullResponse = "AI Forecast: Based on Q2 growth, Q3 sales are predicted to rise by 12.5% to ₹78.20L. Projected commissions will reach ₹1.24L.";
    } else if (lowText.includes("overdue") || lowText.includes("inactive")) {
      fullResponse = "AI Audit: Sharma Traders is overdue by 125 days (₹3.50L). Gujarat Polymers has been inactive for 92 days.";
    } else {
      fullResponse = "AI Engine: Ready to audit company outstanding bills and lead pipelines. Try typing 'Show overdue customers'.";
    }

    setTimeout(() => {
      setAiLoading(false);
      let index = 0;
      setMessages(prev => [...prev, { id: Date.now(), sender: "ai", text: "" }]);
      const interval = setInterval(() => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          const updated = { ...last, text: last.text + fullResponse.charAt(index) };
          return [...prev.slice(0, -1), updated];
        });
        index++;
        if (index >= fullResponse.length) {
          clearInterval(interval);
        }
      }, 20);
    }, 800);
  };

  const handleSendAiMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiInput.trim()) return;
    const userMsg = aiInput;
    setMessages(prev => [...prev, { id: Date.now(), sender: "user", text: userMsg }]);
    setAiInput("");
    triggerAiResponse(userMsg);
  };

  const handleQuickAiAction = (action: string) => {
    setMessages(prev => [...prev, { id: Date.now(), sender: "user", text: `Trigger: ${action}` }]);
    setAiLoading(true);
    setTimeout(() => {
      setAiLoading(false);
      let fullResponse = "";
      if (action === "Generate Quotation") {
        fullResponse = "AI Assistant: Drafted quotation QT-2026-004 for Patel Enterprises. Price: ₹1,85,000 for 2,500kg HDPE. Click accept to finalize.";
      } else if (action === "Predict Late Payments") {
        fullResponse = "AI Risk Engine: Sharma Traders (overdue 125 days) has a 92% late payment probability index. ABC Industries has a 14% risk index.";
      } else if (action === "Predict Order Cancellation") {
        fullResponse = "AI Analysis: ABC Industries order SO-1099 has a 35% cancel risk due to credit block warning indicators.";
      } else if (action === "Summarize Today's Work") {
        fullResponse = "AI Executive Summary: 5 orders booked today (total ₹10.68L). GJ-01 delivery transit successful. 1 credit override verification pending.";
      } else if (action === "Forecast Stock") {
        fullResponse = "AI Inventory Forecast: Polypropylene resin will face stock-out in 12 days. Reorder point triggered at 3,000kg.";
      } else if (action === "Draft WhatsApp") {
        fullResponse = "WhatsApp Draft: 'Hi Patel Enterprises, your Delivery Challan DC-2026-501 has been dispatched via vehicle GJ-01-XX-9821. Track live: Daynisc Portal.'";
      }
      
      let index = 0;
      setMessages(prev => [...prev, { id: Date.now(), sender: "ai", text: "" }]);
      const interval = setInterval(() => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          const updated = { ...last, text: last.text + fullResponse.charAt(index) };
          return [...prev.slice(0, -1), updated];
        });
        index++;
        if (index >= fullResponse.length) {
          clearInterval(interval);
        }
      }, 20);
    }, 600);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  
  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const newQuote = {
      id: `QT-2026-00${quotations.length + 1}`,
      customer: quoteCust,
      date: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      amount: parseFloat(quoteAmt) || 120000,
      revisions: 1,
      discount: parseFloat(quoteDiscount) || 5,
      tax: 18,
      status: "Under Review",
      currency: "INR",
      eSignature: "",
      items: [{ desc: quoteItem || "HDPE Granules", qty: 1000, rate: (parseFloat(quoteAmt) || 120000) / 1000 }]
    };
    setQuotations([newQuote, ...quotations]);
    toast.success("Sales Quotation generated successfully! Revision v1 created.");
    setShowNewQuoteModal(false);
    setQuoteCust("");
    setQuoteAmt("");
    setQuoteItem("");
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const checkCredit = creditLedgers.find(c => c.customer.toLowerCase() === orderCust.toLowerCase());
    if (checkCredit && checkCredit.blocked) {
      toast.error(`Order Blocked! Customer ${orderCust} is currently blocked under credit control limits.`);
      return;
    }
    const amt = parseFloat(orderAmt) || 150000;
    if (checkCredit && amt > checkCredit.available) {
      toast.error(`Credit Warning! Requested order value ${inr(amt)} exceeds available credit limit ${inr(checkCredit.available)}`);
    }

    const newSO = {
      id: `SO-${orders.length + 1100}`,
      customer: orderCust,
      date: new Date().toISOString().slice(0, 10),
      delDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      amount: amt,
      outstanding: amt,
      poNum: orderPo || "PO-9912",
      status: "confirmed",
      stage: "Confirmed",
      timeline: { draft: "10:05", approved: "10:15", confirmed: "10:20", packing: "", dispatch: "", delivered: "", paid: "" },
      currency: "INR",
      taxSplit: { cgst: amt * 0.09, sgst: amt * 0.09 },
      items: [{ desc: "Allocated Material", qty: 1000, rate: amt / 1000, amount: amt }],
      auditLogs: [`Maker created SO on ${new Date().toISOString().slice(0, 10)}`],
      comments: []
    };
    setOrders([newSO, ...orders]);
    toast.success("Sales Order confirmed! Stock allocation and reservation triggered.");
    setShowNewOrderModal(false);
    setOrderCust("");
    setOrderAmt("");
    setOrderPo("");
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(newCustLimit) || 500000;
    const newCC = {
      customer: newCustName,
      limit,
      used: 0,
      available: limit,
      overdue: 0,
      blocked: false
    };
    const newCust = {
      name: newCustName,
      email: `${newCustName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
      phone: "+91 99887 76655",
      gstin: "24AAACS" + Math.floor(1000 + Math.random() * 9000) + "D1Z" + Math.floor(1 + Math.random() * 9),
      currency: "INR",
      territory: "West Zone (GJ)",
      address: "Industrial Phase, GIDC",
      timeline: ["Account registered in Daynisc Credit limit setup"],
      rating: 5,
      lastPurchase: 0,
      recoveryRate: 100
    };
    setCreditLedgers([...creditLedgers, newCC]);
    setCustomersList([newCust, ...customersList]);
    toast.success("New Customer account registered under Credit Control registry!");
    setShowNewCustModal(false);
    setNewCustName("");
    setNewCustLimit("");
  };

  const handleCreateChallan = (e: React.FormEvent) => {
    e.preventDefault();
    const newDC = {
      id: `DC-2026-50${challans.length + 1}`,
      orderId: challanSO,
      customer: orders.find(o => o.id === challanSO)?.customer || "Unknown Client",
      date: new Date().toISOString().slice(0, 10),
      status: "In Transit",
      vehicle: challanVehicle || "GJ-01-YY-0099",
      driver: challanDriver || "Surender Singh",
      eway: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
      lrNum: `LR-${Math.floor(100000 + Math.random() * 900000)}`
    };
    setChallans([newDC, ...challans]);
    setOrders(prev => prev.map(o => o.id === challanSO ? { ...o, status: "dispatched", stage: "Dispatch" } : o));
    toast.success(`Delivery Challan ${newDC.id} generated with E-way Bill!`);
    setShowChallanModal(false);
    setChallanVehicle("");
    setChallanDriver("");
  };

  const handleAuthorizeApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== "989898" && otpCode !== "1234") {
      toast.error("Invalid OTP Authorization code!");
      return;
    }
    if (approvingItem) {
      setApprovalsQueue(prev => prev.filter(ap => ap.id !== approvingItem.id));
      if (approvingItem.type === "Sales Order") {
        setOrders(prev => prev.map(o => o.id === approvingItem.id.replace("AP-", "") ? { ...o, stage: "Confirmed", status: "confirmed" } : o));
      }
      toast.success("Digital Token verified. Action authorized!");
    }
    setShowApprovalModal(false);
    setOtpCode("");
    setApprovingItem(null);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedOrderForDrawer) return;
    const newComment = { author: "System User", text: newCommentText };
    setOrders((prev: any[]) => prev.map(o => o.id === selectedOrderForDrawer.id ? { ...o, comments: [...(o.comments || []), newComment] } : o));
    setSelectedOrderForDrawer((prev: any) => ({ ...prev, comments: [...(prev?.comments || []), newComment] }));
    setNewCommentText("");
    toast.success("Comment added!");
  };

  const handleUpdateStage = (stageName: string, statusValue: string) => {
    if (!selectedOrderForDrawer) return;
    setOrders((prev: any[]) => prev.map(o => o.id === selectedOrderForDrawer.id ? { ...o, stage: stageName, status: statusValue, timeline: { ...o.timeline, [statusValue]: new Date().toLocaleTimeString().slice(0, 5) } } : o));
    setSelectedOrderForDrawer((prev: any) => ({ ...prev, stage: stageName, status: statusValue, timeline: { ...prev.timeline, [statusValue]: new Date().toLocaleTimeString().slice(0, 5) } }));
    toast.success(`Order stage updated to ${stageName}!`);
  };

  // Global search filters
  const getGlobalSearchResults = () => {
    if (!globalSearch) return [];
    const lowSearch = globalSearch.toLowerCase();
    const results: any[] = [];
    
    // Search Customers
    customersList.forEach(c => {
      if (c.name.toLowerCase().includes(lowSearch) || c.gstin.toLowerCase().includes(lowSearch)) {
        results.push({ type: "Customer", label: c.name, sub: `GSTIN: ${c.gstin}`, tab: "customers", subTab: "profiles" });
      }
    });

    // Search Orders
    orders.forEach(o => {
      if (o.id.toLowerCase().includes(lowSearch) || o.customer.toLowerCase().includes(lowSearch)) {
        results.push({ type: "Order", label: o.id, sub: o.customer, tab: "orders", subTab: "sales_orders", orderObj: o });
      }
    });

    // Search Vehicles
    challans.forEach(ch => {
      if (ch.vehicle.toLowerCase().includes(lowSearch) || ch.driver.toLowerCase().includes(lowSearch)) {
        results.push({ type: "Transit Challan", label: ch.id, sub: `${ch.vehicle} (Driver: ${ch.driver})`, tab: "warehouse", subTab: "challans" });
      }
    });

    return results;
  };

  // Filter lists based on states
  const filteredOrders = orders.filter(o => {
    const matchesSearch = searchQuery ? (
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.poNum && o.poNum.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : true;
    const matchesStatus = filterStatus === "all" ? true : o.status === filterStatus;
    const matchesCustomer = filterCustomer ? o.customer.toLowerCase().includes(filterCustomer.toLowerCase()) : true;
    const matchesAmt = filterMinAmount ? o.amount >= parseFloat(filterMinAmount) : true;
    return matchesSearch && matchesStatus && matchesCustomer && matchesAmt;
  });

  return (
    <div style={{ padding: "16px 20px", fontFamily: "'Inter', sans-serif", background: C.pageBg, minHeight: "100vh", position: "relative", color: C.text1 }}>
      
      {/* ── BREADCRUMBS & MAIN HEADING ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: C.text3, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <span>🏢 ERP Workspace</span>
            <span>&gt;</span>
            <span>Sales Hub</span>
            <span>&gt;</span>
            <span style={{ fontWeight: 600, color: C.primary }}>{activeTab.toUpperCase()}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text1, letterSpacing: "-0.5px" }}>Sales Operations</h1>
        </div>

        {/* Global Toolbar Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          
          {/* Global search input */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Global Search Customer, Invoice, Order..."
              value={globalSearch}
              onChange={e => { setGlobalSearch(e.target.value); setShowSearchResults(true); }}
              style={{ ...inputFilterStyle, width: 240, padding: "7px 12px", background: C.cardBg, color: C.text1, borderColor: C.border }}
            />
            {showSearchResults && globalSearch && (
              <div style={{
                position: "absolute", top: 34, left: 0, right: 0, background: C.cardBg,
                border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: T.shadowMd,
                zIndex: 99999, maxHeight: 200, overflowY: "auto", padding: 6
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 8, color: C.text3, fontWeight: 800 }}>Search Results</span>
                  <button onClick={() => setShowSearchResults(false)} style={{ background: "none", border: "none", color: C.text3, fontSize: 10, cursor: "pointer" }}>✕</button>
                </div>
                {getGlobalSearchResults().map((res, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setActiveTab(res.tab);
                      if (res.subTab) {
                        if (res.tab === "orders") setOrdersSubTab(res.subTab);
                        if (res.tab === "warehouse") setWarehouseSubTab(res.subTab);
                        if (res.tab === "customers") setCustomersSubTab(res.subTab);
                      }
                      if (res.orderObj) {
                        setSelectedOrderForDrawer(res.orderObj);
                      }
                      setGlobalSearch("");
                      setShowSearchResults(false);
                      toast.success(`Navigated to ${res.type}`);
                    }}
                    style={{ padding: "6px 8px", cursor: "pointer", borderBottom: `1px dashed ${C.divider}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.divider}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <span style={badge(C.primary, C.cyanBg)}>{res.type}</span>
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: C.text1 }}>{res.label}</div>
                    <span style={{ fontSize: 8, color: C.text3 }}>{res.sub}</span>
                  </div>
                ))}
                {getGlobalSearchResults().length === 0 && (
                  <div style={{ padding: 12, fontSize: 10, color: C.text3, textAlign: "center" }}>No results found</div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            style={{
              padding: "7px 12px", background: showAiPanel ? C.cyanBg : C.cardBg,
              color: showAiPanel ? C.primary : C.text2, border: `1px solid ${C.border}`,
              borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex",
              alignItems: "center", gap: 4
            }}
          >
            <span>🤖</span> AI Co-Pilot
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              padding: "7px", background: C.cardBg, color: C.text2,
              border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", display: "flex"
            }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* ── SAP-STYLE ERP METADATA TOOLBAR ── */}
      <div style={{
        display: "flex", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "8px 14px", gap: 18, marginBottom: 14, flexWrap: "wrap", alignItems: "center"
      }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 8, color: C.text3, fontWeight: 800, textTransform: "uppercase" }}>Company</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text1 }}>Daynisc Corp</span>
        </div>
        <div style={{ width: 1, height: 14, background: C.border }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 8, color: C.text3, fontWeight: 800, textTransform: "uppercase" }}>Financial Year</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text1 }}>2026-27</span>
        </div>
        <div style={{ width: 1, height: 14, background: C.border }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 8, color: C.text3, fontWeight: 800, textTransform: "uppercase" }}>Branch Segment</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text1 }}>Gujarat Central</span>
        </div>
        <div style={{ width: 1, height: 14, background: C.border }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 8, color: C.text3, fontWeight: 800, textTransform: "uppercase" }}>Warehouse Plant</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text1 }}>Baroda Plastic GIDC</span>
        </div>
        <div style={{ width: 1, height: 14, background: C.border }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 8, color: C.text3, fontWeight: 800, textTransform: "uppercase" }}>ERP Role</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text1 }}>Sales Director</span>
        </div>
        <div style={{ width: 1, height: 14, background: C.border }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 8, color: C.text3, fontWeight: 800, textTransform: "uppercase" }}>Current Shift</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.green }}>Shift A (Morning)</span>
        </div>
      </div>

      {/* ── MAIN TABS NAVIGATION (6 Tabs) ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 16, overflowX: "auto", gap: 2 }}>
        {[
          { id: "dashboard", label: "Dashboard Space" },
          { id: "orders",    label: "Orders & Pipeline" },
          { id: "warehouse", label: "Logistics & Route" },
          { id: "customers", label: "Customer Ledger" },
          { id: "finance",   label: "Pricing & Discounts" },
          { id: "analytics", label: "Reports Analytics" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as PrimaryTab)}
            style={{
              padding: "8px 16px", border: "none", background: "none",
              fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              color: activeTab === t.id ? C.primary : C.text3,
              borderBottom: activeTab === t.id ? `2.5px solid ${C.primary}` : "2.5px solid transparent",
              transition: "all 0.15s"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}

      {/* ── TAB: Dashboard Workspace ── */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Card Hierarchy Grid */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: "2 1 400px", display: "flex", gap: 12 }}>
              <KpiCard label="Today's Sales" value="₹2,45,000" icon={<TrendingUp size={15} />} accent="sales" trend={{ val: "▲ +12%", up: true }} sparkData={[12, 18, 14, 25, 22, 30]} onClick={() => setActiveTab("orders")} isDark={isDark} />
              <KpiCard label="Monthly Revenue" value="₹48.12L" icon={<Landmark size={15} />} accent="sales" trend={{ val: "▲ +15%", up: true }} sparkData={[40, 42, 45, 38, 48, 52]} onClick={() => setActiveTab("analytics")} isDark={isDark} />
            </div>
            
            <KpiCard label="Weekly Sales" value="₹12.45L" icon={<Activity size={15} />} accent="sales" trend={{ val: "▲ +8%", up: true }} sparkData={[10, 12, 11, 15, 12, 16]} isDark={isDark} />
            <KpiCard label="Yearly Sales Target" value="₹5.50Cr" icon={<Award size={15} />} accent="analytics" subText="Target Achieved: 48%" sparkData={[30, 35, 40, 42, 45, 48]} onClick={() => { setActiveTab("finance"); setFinanceSubTab("targets"); }} isDark={isDark} />
            <KpiCard label="Average Order Value" value="₹2.67L" icon={<ShoppingBag size={15} />} accent="sales" trend={{ val: "▲ +4.2%", up: true }} sparkData={[15, 18, 16, 20, 19, 22]} isDark={isDark} />
            <KpiCard label="Gross Profit Margin" value="28.4%" icon={<Star size={15} />} accent="finance" subText="Direct raw material margins" sparkData={[25, 26, 27, 28, 28, 28]} isDark={isDark} />
            <KpiCard label="Net Profit Margin" value="18.9%" icon={<TrendingUp size={15} />} accent="finance" subText="OpEx deduction index" sparkData={[16, 17, 18, 18, 19, 19]} isDark={isDark} />
            <KpiCard label="Orders Today" value="5 Confirmed" icon={<IconBox size={15} />} accent="completed" subText="3 ready to pick" sparkData={[2, 3, 5, 2, 4, 5]} onClick={() => setActiveTab("orders")} isDark={isDark} />
            <KpiCard label="Quotations Pending" value="3 Quotes" icon={<FileText size={15} />} accent="pending" subText="Awaiting acceptance" sparkData={[4, 2, 3, 5, 3, 3]} onClick={() => { setActiveTab("orders"); setOrdersSubTab("quotations"); }} isDark={isDark} />
            <KpiCard label="Delivery Pending" value="2 Challans" icon={<Clock size={15} />} accent="pending" subText="GJ-01-XX-9821 transit" sparkData={[1, 3, 2, 2, 1, 2]} onClick={() => { setActiveTab("warehouse"); setWarehouseSubTab("challans"); }} isDark={isDark} />
            <KpiCard label="RMA Returns Active" value="1 Request" icon={<ArrowRightLeft size={15} />} accent="alerts" subText="Supreme PVC Defect" sparkData={[1, 0, 2, 1, 0, 1]} onClick={() => { setActiveTab("warehouse"); setWarehouseSubTab("returns"); }} isDark={isDark} />
            <KpiCard label="Cancelled Orders" value="1 Order" icon={<AlertCircle size={15} />} accent="alerts" subText="Sharma credit decline" sparkData={[0, 1, 0, 0, 1, 1]} onClick={() => setActiveTab("orders")} isDark={isDark} />
            <KpiCard label="Top Product Category" value="HDPE Polymers" icon={<IconBox size={15} />} accent="analytics" subText="60% of total revenue" sparkData={[50, 52, 55, 58, 60, 60]} isDark={isDark} />
            <KpiCard label="Top Customer Account" value="Supreme Plastics" icon={<IconUser size={15} />} accent="analytics" subText="Total bought: ₹34.50L" sparkData={[25, 28, 30, 32, 34, 34]} isDark={isDark} />
            <KpiCard label="Sales Growth %" value="+18.5% YoY" icon={<TrendingUp size={15} />} accent="finance" subText="Monsoon sales boost" sparkData={[10, 12, 15, 14, 17, 18]} isDark={isDark} />
            <KpiCard label="Collection %" value="92.4%" icon={<CheckCircle2 size={15} />} accent="completed" subText="Average days outstanding: 29" sparkData={[85, 88, 90, 89, 91, 92]} onClick={() => { setActiveTab("customers"); setCustomersSubTab("portal"); }} isDark={isDark} />
          </div>

          {/* Widgets Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {/* Widget 1: Today's Follow-up & Collections */}
            <Card isDark={isDark}>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: C.text1, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={14} color={C.primary} /> Today's CRM Agenda
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { text: "Call Patel Enterprises regarding revised QT-2026-001", time: "10:30 AM", type: "call" },
                  { text: "Route Visit Supreme Plastics for GJ-01 transit GIDC", time: "02:00 PM", type: "visit" },
                  { text: "Approve pending SO-1102 credit override request", time: "ASAP", type: "approval" }
                ].map((act, i) => (
                  <div key={i} style={{ borderBottom: `1px solid ${C.divider}`, paddingBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.text1 }}>{act.text}</div>
                      <span style={{ fontSize: 8, color: C.text3 }}>{act.time}</span>
                    </div>
                    <span style={badge(C.primary, C.cyanBg)}>{act.type}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Widget 2: Pending Approvals & Late Dispatches */}
            <Card isDark={isDark}>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: C.text1, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} color={T.amber} /> Alerts & Late Dispatches
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ padding: 8, background: C.redBg, borderRadius: 6, border: `1px solid ${T.red}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.red }}>SO-1099 Overdue by 3 days!</div>
                  <span style={{ fontSize: 8, color: C.text2 }}>Material HDPE allocation pending draft status</span>
                </div>
                <div style={{ padding: 8, background: C.amberBg, borderRadius: 6, border: `1px solid ${T.amber}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.amber }}>AP-SO-1102 pending Maker Checker signoff</div>
                  <span style={{ fontSize: 8, color: C.text2 }}>Pending Director release for Patel GIDC limits</span>
                </div>
              </div>
            </Card>

            {/* Widget 3: Live Sales Feed */}
            <Card isDark={isDark}>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: C.text1, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Activity size={14} color={T.green} /> Real-time Activity Logs
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                {[
                  "12:45 PM - Patel Enterprises paid invoice via UPI card - ₹1.80L",
                  "11:30 AM - Lorry loaded MH-02-AA-4567 transit dispatch",
                  "10:20 AM - SO-1102 confirmed by Finance",
                  "09:30 AM - New customer account registered - Anil Agencies"
                ].map((act, i) => (
                  <div key={i} style={{ fontSize: 9, color: C.text2, borderLeft: `2.5px solid ${C.primary}`, paddingLeft: 6 }}>
                    {act}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB: Orders & Pipeline ── */}
      {activeTab === "orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Sub Navigation */}
          <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
            {[
              { id: "sales_orders", label: "Sales Orders Book" },
              { id: "quotations",    label: "CRM Quotations" },
              { id: "approvals",     label: "Maker Checker Approvals" }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setOrdersSubTab(sub.id as OrdersSubTab)}
                style={{
                  padding: "6px 12px", border: "none", background: ordersSubTab === sub.id ? C.primaryBg : "none",
                  color: ordersSubTab === sub.id ? C.primary : C.text2, borderRadius: 20,
                  fontSize: 10, fontWeight: 800, cursor: "pointer"
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Sub-tab 1: Sales Orders */}
          {ordersSubTab === "sales_orders" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...inputFilterStyle, width: 180 }} />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                    <option value="all">All Stages</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                <div style={{ display: "flex", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 4px", gap: 2 }}>
                  <button onClick={() => setViewMode("list")} style={{ padding: "4px 8px", border: "none", fontSize: 9, fontWeight: 700, cursor: "pointer", background: viewMode === "list" ? C.primary : "none", color: viewMode === "list" ? "#fff" : C.text2, borderRadius: 4 }}>List View</button>
                  <button onClick={() => setViewMode("kanban")} style={{ padding: "4px 8px", border: "none", fontSize: 9, fontWeight: 700, cursor: "pointer", background: viewMode === "kanban" ? C.primary : "none", color: viewMode === "kanban" ? "#fff" : C.text2, borderRadius: 4 }}>Kanban Board</button>
                </div>
              </div>

              {viewMode === "list" ? (
                <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: C.divider }}>
                        {["Order ID", "Customer Name", "Order Date", "Delivery Expected", "PO Number", "Amount", "Current Stage", "Timeline", "Actions"].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ ...tdStyle, fontWeight: 700, color: C.primary, cursor: "pointer" }} onClick={() => setSelectedOrderForDrawer(o)}>
                            {o.id} 🔍
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{o.customer}</td>
                          <td style={tdStyle}>{o.date}</td>
                          <td style={tdStyle}>{o.delDate}</td>
                          <td style={{ ...tdStyle, color: C.text3 }}>{o.poNum}</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{inr(o.amount)}</td>
                          <td style={tdStyle}>
                            <span style={badge(
                              o.status === "delivered" ? T.green : o.status === "dispatched" ? T.amber : o.status === "confirmed" ? C.primary : C.text3,
                              o.status === "delivered" ? C.greenBg : o.status === "dispatched" ? C.amberBg : o.status === "confirmed" ? C.cyanBg : C.divider
                            )}>
                              {o.stage}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                              <span style={badge(o.timeline.draft ? T.green : C.text3, o.timeline.draft ? C.greenBg : C.divider)}>Draft</span>
                              <ChevronRight size={8} color={C.text3} />
                              <span style={badge(o.timeline.confirmed ? T.green : C.text3, o.timeline.confirmed ? C.greenBg : C.divider)}>Conf</span>
                              <ChevronRight size={8} color={C.text3} />
                              <span style={badge(o.timeline.dispatch ? T.green : C.text3, o.timeline.dispatch ? C.greenBg : C.divider)}>Disp</span>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <button onClick={() => toast.success(`E-Invoice JSON generated for ${o.id}`)} style={{ padding: "4px 8px", background: C.divider, color: C.text1, border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>GST IRN</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Draft Orders", status: "draft" },
                    { label: "Confirmed/Picking", status: "confirmed" },
                    { label: "Dispatched", status: "dispatched" },
                    { label: "Delivered", status: "delivered" }
                  ].map(col => {
                    const colOrders = filteredOrders.filter(o => o.status === col.status);
                    return (
                      <div key={col.status} style={{ background: C.divider, borderRadius: 8, padding: 10, minHeight: 300 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: C.text2, textTransform: "uppercase" }}>{col.label}</span>
                          <span style={badge(C.primary, C.cyanBg)}>{colOrders.length}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {colOrders.map(o => (
                            <div key={o.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, boxShadow: T.shadow }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: C.primary, cursor: "pointer" }} onClick={() => setSelectedOrderForDrawer(o)}>{o.id} 🔍</span>
                                <span style={{ fontSize: 8, color: C.text3 }}>{o.date}</span>
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: C.text1, marginTop: 4 }}>{o.customer}</div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: C.text2, marginTop: 4 }}>{inr(o.amount)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: CRM Quotations */}
          {ordersSubTab === "quotations" && (
            <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
              <div style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800 }}>Lead-to-Quote Pipeline</span>
                <button onClick={() => setShowNewQuoteModal(true)} style={{ padding: "6px 10px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>+ Create Quote</button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.divider }}>
                    {["Quote No.", "Customer Account", "Date", "Validity", "Est. Amount", "Revisions", "E-Signature", "Status", "Actions"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(q => (
                    <tr key={q.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: C.primary }}>{q.id}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{q.customer}</td>
                      <td style={tdStyle}>{q.date}</td>
                      <td style={tdStyle}>{q.validUntil}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{inr(q.amount)}</td>
                      <td style={tdStyle}><span style={badge(C.primary, C.cyanBg)}>v{q.revisions} Rev</span></td>
                      <td style={{ ...tdStyle, fontStyle: "italic", fontSize: 10 }}>{q.eSignature || "Awaiting Signature"}</td>
                      <td style={tdStyle}>
                        <span style={badge(q.status === "Accepted by Client" ? T.green : T.amber, q.status === "Accepted by Client" ? C.greenBg : C.amberBg)}>
                          {q.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => {
                            setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, revisions: item.revisions + 1 } : item));
                            toast.success("Revision updated!");
                          }} style={{ padding: "4px 8px", background: C.divider, border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer", color: C.text1 }}>Revise</button>
                          {q.status !== "Accepted by Client" && (
                            <button onClick={() => {
                              setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, status: "Accepted by Client", eSignature: "Signed Digitally" } : item));
                              toast.success("Quotation accepted by client!");
                            }} style={{ padding: "4px 8px", background: C.greenBg, color: T.green, border: "none", borderRadius: 4, fontSize: 9, fontWeight: 800, cursor: "pointer" }}>Accept</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Sub-tab 3: Approvals Maker-Checker */}
          {ordersSubTab === "approvals" && (
            <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.divider }}>
                    {["Request ID", "Type", "Amount", "Customer", "Workflow Status", "Actions"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {approvalsQueue.map(ap => (
                    <tr key={ap.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{ap.id}</td>
                      <td style={tdStyle}>{ap.type}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{inr(ap.amount)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{ap.party}</td>
                      <td style={tdStyle}><span style={badge(T.amber, C.amberBg)}>{ap.status}</span></td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setApprovingItem(ap); setShowApprovalModal(true); }} style={{ padding: "4px 8px", background: C.greenBg, border: "none", color: T.green, borderRadius: 4, fontSize: 9, fontWeight: 800, cursor: "pointer" }}>Verify & Release</button>
                          <button onClick={() => {
                            setApprovalsQueue(prev => prev.filter(item => item.id !== ap.id));
                            toast.error("Rejected!");
                          }} style={{ padding: "4px 8px", background: C.redBg, border: "none", color: T.red, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB: Logistics & Route (Warehouse) ── */}
      {activeTab === "warehouse" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Sub Navigation */}
          <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
            {[
              { id: "challans",       label: "Delivery Challans (DC)" },
              { id: "packing",        label: "Packing Lists" },
              { id: "returns",        label: "Returns (RMA)" },
              { id: "route_planning", label: "Route & Territory Schedulers" }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setWarehouseSubTab(sub.id as WarehouseSubTab)}
                style={{
                  padding: "6px 12px", border: "none", background: warehouseSubTab === sub.id ? C.primaryBg : "none",
                  color: warehouseSubTab === sub.id ? C.primary : C.text2, borderRadius: 20,
                  fontSize: 10, fontWeight: 800, cursor: "pointer"
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Sub-tab 1: Delivery Challans */}
          {warehouseSubTab === "challans" && (
            <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.divider }}>
                    {["Challan No.", "Order Ref", "Customer", "Vehicle", "Driver", "E-Way Bill Ref", "LR Number", "Status", "Logistics Control"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {challans.map(ch => (
                    <tr key={ch.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: C.primary }}>{ch.id}</td>
                      <td style={tdStyle}>{ch.orderId}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{ch.customer}</td>
                      <td style={tdStyle}>{ch.vehicle}</td>
                      <td style={tdStyle}>{ch.driver}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 10 }}>{ch.eway}</td>
                      <td style={tdStyle}>{ch.lrNum}</td>
                      <td style={tdStyle}><span style={badge(ch.status === "Fully Delivered" ? T.green : T.amber, ch.status === "Fully Delivered" ? C.greenBg : C.amberBg)}>{ch.status}</span></td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setActiveGPSChallan(ch)} style={{ padding: "4px 8px", background: C.primary, color: "#fff", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}><Truck size={10} /> Live GPS</button>
                          <button onClick={() => toast.success("E-way bill downloaded!")} style={{ padding: "4px 8px", background: C.divider, border: "none", borderRadius: 4, fontSize: 9, color: C.text1, cursor: "pointer" }}>E-Way</button>
                          <button onClick={() => toast.success("Challan printed!")} style={{ padding: "4px 8px", background: C.divider, border: "none", borderRadius: 4, fontSize: 9, color: C.text1, cursor: "pointer" }}>Print</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Sub-tab 2: Packing Lists */}
          {warehouseSubTab === "packing" && (
            <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.divider }}>
                    {["Packing ID", "Order Ref", "Boxes", "Gross Weight (kg)", "Dimensions", "Packed Items", "HSN Code", "Serial Numbers"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {packingLists.map(pl => (
                    <tr key={pl.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: C.primary }}>{pl.id}</td>
                      <td style={tdStyle}>{pl.orderId}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{pl.boxes}</td>
                      <td style={tdStyle}>{pl.weight} kg</td>
                      <td style={tdStyle}>{pl.dimensions}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{pl.items}</td>
                      <td style={tdStyle}>{pl.hsn}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 10 }}>{pl.serials}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Sub-tab 3: Returns RMA */}
          {warehouseSubTab === "returns" && (
            <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.divider }}>
                    {["RMA ID", "Original SO Ref", "Customer Name", "Reason", "Inspection Status", "Replacement Dispatch", "Credit Note"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {returnsList.map(ret => (
                    <tr key={ret.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: C.primary }}>{ret.id}</td>
                      <td style={tdStyle}>{ret.orderId}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{ret.customer}</td>
                      <td style={tdStyle}>{ret.reason}</td>
                      <td style={tdStyle}><span style={badge(ret.status === "Inspected - Passed" ? T.green : T.amber, ret.status === "Inspected - Passed" ? C.greenBg : C.amberBg)}>{ret.status}</span></td>
                      <td style={tdStyle}>{ret.replacement}</td>
                      <td style={tdStyle}>{ret.creditNote || "Awaiting Credit Note"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Sub-tab 4: Route Planning */}
          {warehouseSubTab === "route_planning" && (
            <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
              <div style={{ padding: 14, fontSize: 11, fontWeight: 800 }}>Territory Visit & Route Management</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.divider }}>
                    {["Route Plan ID", "Territory Segment", "Assigned Route", "Field Salesperson", "Scheduled Visits", "Vehicle", "Driver"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {routePlans.map(rp => (
                    <tr key={rp.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: C.primary }}>{rp.id}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{rp.territory}</td>
                      <td style={tdStyle}>{rp.route}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{rp.salesperson}</td>
                      <td style={tdStyle}>{rp.scheduledVisits} visits scheduled</td>
                      <td style={tdStyle}>{rp.vehicle}</td>
                      <td style={tdStyle}>{rp.driver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB: Customer Ledger ── */}
      {activeTab === "customers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Sub Navigation */}
          <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
            {[
              { id: "profiles", label: "Customer Profile Directory" },
              { id: "credit",   label: "Credit Limit Registry" },
              { id: "portal",   label: "Client Portal Simulation" }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setCustomersSubTab(sub.id as CustomersSubTab)}
                style={{
                  padding: "6px 12px", border: "none", background: customersSubTab === sub.id ? C.primaryBg : "none",
                  color: customersSubTab === sub.id ? C.primary : C.text2, borderRadius: 20,
                  fontSize: 10, fontWeight: 800, cursor: "pointer"
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Sub-tab 1: Profiles */}
          {customersSubTab === "profiles" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
              {/* Directory */}
              <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
                <div style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>Registered ERP Accounts</span>
                  <button onClick={() => setShowNewCustModal(true)} style={{ padding: "6px 10px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>+ Add Customer</button>
                </div>
                <div style={{ padding: "0 14px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {customersList.map((cust, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, borderBottom: `1px solid ${C.divider}`, paddingBottom: 10, alignItems: "center" }}>
                      {/* Customer Photo / Logo initial placeholder */}
                      <div style={{
                        width: 40, height: 40, background: C.primaryBg, color: C.primary, borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900
                      }}>
                        {cust.name.slice(0, 2).toUpperCase()}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: C.text1 }}>{cust.name}</span>
                          <span style={{ color: "#eab308", fontSize: 9 }}>
                            {"★".repeat(cust.rating)}{"☆".repeat(5 - cust.rating)}
                          </span>
                        </div>
                        <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>
                          GST: {cust.gstin} | Cur: {cust.currency} | Loc: {cust.territory}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: T.green }}>{inr(cust.lastPurchase)}</div>
                        <span style={{ fontSize: 8, color: C.text3 }}>Last purchase</span>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, fontWeight: 800 }}>{cust.recoveryRate}%</div>
                        <span style={{ fontSize: 8, color: C.text3 }}>Recovery rate</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Customer Communication Timeline logs */}
              <Card isDark={isDark}>
                <h3 style={{ fontSize: 11, fontWeight: 800, color: C.text1, textTransform: "uppercase", marginBottom: 12 }}>Customer Communication & WhatsApp Timeline</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {customersList.map((cust, idx) => (
                    <div key={idx} style={{ background: C.divider, padding: 10, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: C.primary }}>{cust.name} (GSTIN: {cust.gstin})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                        {cust.timeline.map((line, i) => (
                          <div key={i} style={{ fontSize: 9, color: C.text2, borderLeft: `2.5px solid ${C.primary}`, paddingLeft: 6 }}>
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Sub-tab 2: Credit Limits */}
          {customersSubTab === "credit" && (
            <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.divider }}>
                    {["Customer Name", "Credit Limit", "Utilized", "Available Balance", "Overdue outstanding", "Status", "Block/Unblock"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {creditLedgers.map((cr, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{cr.customer}</td>
                      <td style={tdStyle}>{inr(cr.limit)}</td>
                      <td style={{ ...tdStyle, color: T.red, fontWeight: 700 }}>{inr(cr.used)}</td>
                      <td style={{ ...tdStyle, color: cr.available < 0 ? T.red : T.green, fontWeight: 700 }}>{inr(cr.available)}</td>
                      <td style={{ ...tdStyle, color: cr.overdue > 0 ? T.red : C.text2, fontWeight: 700 }}>{inr(cr.overdue)}</td>
                      <td style={tdStyle}><span style={badge(cr.blocked ? T.red : T.green, cr.blocked ? C.redBg : C.greenBg)}>{cr.blocked ? "⛔ Blocked" : "Active Credit"}</span></td>
                      <td style={tdStyle}>
                        <button onClick={() => {
                          setCreditLedgers(prev => prev.map((item, i) => i === idx ? { ...item, blocked: !item.blocked } : item));
                          toast.success("Blocked state updated!");
                        }} style={{ padding: "4px 8px", background: cr.blocked ? C.greenBg : C.redBg, border: "none", color: cr.blocked ? T.green : T.red, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Toggle Block</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Sub-tab 3: Client Portal Simulator */}
          {customersSubTab === "portal" && (
            <div style={{ display: "grid", gridTemplateColumns: "0.5fr 1.5fr", gap: 16 }}>
              <Card isDark={isDark} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { id: "orders", label: "My Delivery Status" },
                  { id: "outstanding", label: "Invoice Outstanding & Pay" },
                  { id: "complaints", label: "Raise Ticket / RMA" }
                ].map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => setPortalView(sec.id)}
                    style={{
                      width: "100%", padding: "8px 12px", border: "none", borderRadius: 6,
                      textAlign: "left", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: portalView === sec.id ? C.cyanBg : "none",
                      color: portalView === sec.id ? C.primary : C.text2
                    }}
                  >
                    {sec.label}
                  </button>
                ))}
              </Card>

              <Card isDark={isDark}>
                {portalView === "orders" && (
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: C.text1, textTransform: "uppercase", marginBottom: 12 }}>My Deliveries Tracking</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {orders.map(o => (
                        <div key={o.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: C.primary }}>{o.id}</div>
                            <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>Expected Delivery: {o.delDate}</div>
                          </div>
                          <span style={badge(o.status === "delivered" ? T.green : o.status === "dispatched" ? T.amber : o.status === "confirmed" ? C.primary : C.text3, o.status === "delivered" ? C.greenBg : o.status === "dispatched" ? C.amberBg : o.status === "confirmed" ? C.cyanBg : C.divider)}>{o.stage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {portalView === "outstanding" && (
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: C.text1, textTransform: "uppercase", marginBottom: 12 }}>Pending Invoices & Online Gateway Payment</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {orders.filter(o => o.outstanding > 0).map(o => (
                        <div key={o.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800 }}>Invoice Ref: {o.id.replace("SO-", "INV-26-")}</div>
                            <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>Outstanding Amount: {inr(o.outstanding)}</div>
                          </div>
                          <button onClick={() => { setSelectedInvoiceForPayment(o); setShowPaymentSimulator(true); }} style={{ padding: "6px 12px", background: T.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Pay Now</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {portalView === "complaints" && (
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: C.text1, textTransform: "uppercase", marginBottom: 12 }}>Raise RMA Ticket / Support Request</h3>
                    <form onSubmit={e => { e.preventDefault(); toast.success("Ticket registered!"); }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <input type="text" placeholder="e.g. SO-1102" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
                      <textarea placeholder="Specify defection or delivery delay..." style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, minHeight: 60, background: C.cardBg, color: C.text1 }} required />
                      <button type="submit" style={{ padding: "8px 14px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Submit Ticket</button>
                    </form>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Pricing & Discounts ── */}
      {activeTab === "finance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Sub Navigation */}
          <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
            {[
              { id: "price_matrices", label: "Corporate Price Matrix" },
              { id: "discount_rules",  label: "Discount Rules Engine" },
              { id: "targets",         label: "Leaderboards & Commission" }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setFinanceSubTab(sub.id as FinanceSubTab)}
                style={{
                  padding: "6px 12px", border: "none", background: financeSubTab === sub.id ? C.primaryBg : "none",
                  color: financeSubTab === sub.id ? C.primary : C.text2, borderRadius: 20,
                  fontSize: 10, fontWeight: 800, cursor: "pointer"
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Sub-tab 1: Price Matrices */}
          {financeSubTab === "price_matrices" && (
            <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.divider }}>
                    {["Product Name", "Retail Tier", "Wholesale Tier", "Distributor Tier", "Dealer Tier", "Export (USD)", "Dealer Margin %", "Profit After GST"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PRICING.map((pr, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: C.primary }}>{pr.product}</td>
                      <td style={tdStyle}>₹{pr.retail}/kg</td>
                      <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>₹{pr.wholesale}/kg</td>
                      <td style={tdStyle}>₹{pr.distributor}/kg</td>
                      <td style={tdStyle}>₹{pr.dealer}/kg</td>
                      <td style={tdStyle}>${pr.export}/kg</td>
                      <td style={tdStyle}>{pr.margin}% margin</td>
                      <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>₹{pr.profitAfterGst}/kg net</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Sub-tab 2: Discount Rules */}
          {financeSubTab === "discount_rules" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card isDark={isDark}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: C.text1, textTransform: "uppercase", marginBottom: 12 }}>Discount Matrix</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {MOCK_DISCOUNTS.map((dc, i) => (
                    <div key={i} style={{ background: C.divider, padding: 12, borderRadius: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: C.text1 }}>{dc.name}</span>
                        <span style={badge(C.primary, C.cyanBg)}>{dc.type}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.text3, marginTop: 6 }}>
                        <span>{dc.rule}</span>
                        <span style={{ fontWeight: 800, color: T.green }}>{dc.rate} Off</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Sub-tab 3: Targets */}
          {financeSubTab === "targets" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
              <Card isDark={isDark} style={{ padding: 0, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.divider }}>
                      {["Employee Name", "Region Branch", "Target", "Achieved Sales", "Commissions"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_TARGETS.map((tg, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{tg.employee}</td>
                        <td style={tdStyle}>{tg.branch}</td>
                        <td style={tdStyle}>{inr(tg.target)}</td>
                        <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>{inr(tg.achieved)}</td>
                        <td style={{ ...tdStyle, color: T.green, fontWeight: 700 }}>{inr(tg.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card isDark={isDark}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: C.text1, textTransform: "uppercase", marginBottom: 12 }}>Sales Performance Leaderboard</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {MOCK_TARGETS.map((tg, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, background: C.divider, padding: 10, borderRadius: 8 }}>
                      <span style={{ fontSize: 14 }}>{idx === 0 ? "🏆" : "🥈"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: C.text1 }}>{tg.employee}</div>
                        <div style={{ fontSize: 9, color: C.text3 }}>{tg.branch}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: T.green }}>{inr(tg.achieved)}</div>
                        <span style={badge(T.green, C.greenBg)}>{tg.rate}% Achieved</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Analytics (Reports Analytics) ── */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* KPI Summary Ribbon at top of charts */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 8, color: C.text3, textTransform: "uppercase" }}>H1 Revenue</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: C.primary }}>₹98.50L</div>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 8, color: C.text3, textTransform: "uppercase" }}>Total SO</div>
              <div style={{ fontSize: 13, fontWeight: 900 }}>45 Orders</div>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 8, color: C.text3, textTransform: "uppercase" }}>Net Margin</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.green }}>26.4%</div>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 8, color: C.text3, textTransform: "uppercase" }}>Total Outstanding</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.red }}>₹5.88L</div>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 8, color: C.text3, textTransform: "uppercase" }}>MoM Comparison</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.green }}>▲ +18.4%</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => toast.success("Exporting report to PDF...")} style={{ padding: "6px 10px", background: C.divider, border: "none", borderRadius: 6, fontSize: 10, color: C.text1, cursor: "pointer" }}>PDF</button>
              <button onClick={() => toast.success("Exporting report to Excel...")} style={{ padding: "6px 10px", background: C.divider, border: "none", borderRadius: 6, fontSize: 10, color: C.text1, cursor: "pointer" }}>Excel</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Revenue vs targets */}
            <Card isDark={isDark}>
              <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Monthly revenue trend vs targets</h3>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SALES_TREND_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: C.text3 }} stroke={C.border} />
                    <YAxis tick={{ fontSize: 9, fill: C.text3 }} stroke={C.border} />
                    <ChartTooltip content={<ChartTip />} />
                    <Area type="monotone" name="Sales Revenue" dataKey="sales" stroke={C.primary} fill={C.primaryBg} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Regional distribution */}
            <Card isDark={isDark}>
              <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Regional revenue breakdown</h3>
              <div style={{ width: "100%", height: 180, display: "flex", justifyContent: "center" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={REGION_SALES_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                      {REGION_SALES_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* GP Margin Index */}
            <Card isDark={isDark}>
              <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Gross Profit Index (H1 2026)</h3>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={SALES_TREND_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: C.text3 }} />
                    <YAxis tick={{ fontSize: 9, fill: C.text3 }} />
                    <ChartTooltip content={<ChartTip />} />
                    <Line type="monotone" name="Gross Profit" dataKey="gp" stroke={T.green} strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Outstanding Aging analysis */}
            <Card isDark={isDark}>
              <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Outstanding Aging analysis buckets</h3>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={AGING_ANALYSIS_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 9, fill: C.text3 }} />
                    <YAxis tick={{ fontSize: 9, fill: C.text3 }} />
                    <ChartTooltip content={<ChartTip />} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {AGING_ANALYSIS_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Conversational AI Co-Pilot Slide Panel (Right side) ── */}
      {showAiPanel && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 330, background: C.cardBg,
          borderLeft: `1px solid ${C.border}`, zIndex: 99999, display: "flex", flexDirection: "column",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.15)", padding: 18
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, color: C.text1 }}>
              <span>🤖</span> AI Sales Co-Pilot
            </h3>
            <button onClick={() => setShowAiPanel(false)} style={{ background: "none", border: "none", color: C.text3, fontSize: 16, cursor: "pointer" }}>✕</button>
          </div>

          {/* Conversation history thread */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, background: C.divider, borderRadius: 8, padding: 10, marginBottom: 10 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  padding: "8px 12px", borderRadius: 12, fontSize: 10, maxWidth: "85%", lineHeight: 1.4,
                  background: msg.sender === "user" ? C.primary : C.cardBg,
                  color: msg.sender === "user" ? "#fff" : C.text1,
                  boxShadow: T.shadow
                }}>
                  {msg.text || (aiLoading ? "Thinking..." : "")}
                </div>
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>

          {/* Pre-fill Chips & AI Operations */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {[
              "Generate Quotation",
              "Predict Late Payments",
              "Predict Order Cancellation",
              "Summarize Today's Work",
              "Forecast Stock",
              "Draft WhatsApp"
            ].map(act => (
              <button
                key={act}
                onClick={() => handleQuickAiAction(act)}
                style={{
                  padding: "4px 8px", background: C.divider, border: `1px solid ${C.border}`,
                  borderRadius: 20, fontSize: 8, fontWeight: 700, color: C.text2, cursor: "pointer"
                }}
              >
                {act}
              </button>
            ))}
          </div>

          {/* Send Input */}
          <form onSubmit={handleSendAiMessage} style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              placeholder="Ask AI..."
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }}
            />
            <button type="submit" style={{ padding: "8px 12px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}>
              <Send size={12} />
            </button>
          </form>
        </div>
      )}

      {/* ── Order Details Slide Drawer ── */}
      {selectedOrderForDrawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", justifyContent: "flex-end" }}>
          {/* Overlay click to close */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)" }} onClick={() => setSelectedOrderForDrawer(null)} />
          
          {/* Drawer content */}
          <div style={{
            position: "relative", width: 440, height: "100%", background: C.cardBg,
            borderLeft: `1px solid ${C.border}`, padding: 24, overflowY: "auto", display: "flex",
            flexDirection: "column", gap: 16, boxShadow: "-10px 0 40px rgba(0,0,0,0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 900, color: C.primary }}>Order Details {selectedOrderForDrawer.id}</h2>
                <span style={{ fontSize: 9, color: C.text3 }}>PO Ref: {selectedOrderForDrawer.poNum}</span>
              </div>
              <button onClick={() => setSelectedOrderForDrawer(null)} style={{ background: "none", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* Clickable Stage Pipeline */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>Interactive ERP Stage Progression</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                {[
                  { name: "Draft", status: "draft" },
                  { name: "Confirmed", status: "confirmed" },
                  { name: "Packing", status: "packing" },
                  { name: "Dispatch", status: "dispatched" },
                  { name: "Delivered", status: "delivered" }
                ].map(st => {
                  const isActive = selectedOrderForDrawer.status === st.status;
                  return (
                    <button
                      key={st.status}
                      onClick={() => handleUpdateStage(st.name, st.status)}
                      style={{
                        padding: "4px 8px", border: "none", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer",
                        background: isActive ? C.primary : C.divider,
                        color: isActive ? "#fff" : C.text2
                      }}
                    >
                      {st.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product items table */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>Product Details</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.divider }}>
                    <th style={{ ...thStyle, fontSize: 9 }}>Item Description</th>
                    <th style={{ ...thStyle, fontSize: 9 }}>Qty</th>
                    <th style={{ ...thStyle, fontSize: 9 }}>Rate</th>
                    <th style={{ ...thStyle, fontSize: 9 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrderForDrawer.items.map((it: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.divider}` }}>
                      <td style={{ ...tdStyle, fontSize: 9 }}>{it.desc}</td>
                      <td style={{ ...tdStyle, fontSize: 9 }}>{it.qty}</td>
                      <td style={{ ...tdStyle, fontSize: 9 }}>₹{it.rate}</td>
                      <td style={{ ...tdStyle, fontSize: 9, fontWeight: 700 }}>{inr(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SGST / CGST Splits */}
            <div style={{ background: C.divider, padding: 10, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                <span>CGST (9%)</span>
                <span>{inr(selectedOrderForDrawer.taxSplit?.cgst)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                <span>SGST (9%)</span>
                <span>{inr(selectedOrderForDrawer.taxSplit?.sgst)}</span>
              </div>
              <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "6px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 900 }}>
                <span>Total Amount (Incl. GST)</span>
                <span>{inr(selectedOrderForDrawer.amount)}</span>
              </div>
            </div>

            {/* Audit Logs */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>ERP Audit Trail Logs</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(selectedOrderForDrawer.auditLogs || []).map((log: string, idx: number) => (
                  <div key={idx} style={{ fontSize: 9, color: C.text2, borderLeft: `2.5px solid ${C.primary}`, paddingLeft: 6 }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Comments block */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>Internal Discussion / Comments</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {(selectedOrderForDrawer.comments || []).map((cmt: any, idx: number) => (
                  <div key={idx} style={{ background: C.divider, padding: 8, borderRadius: 6 }}>
                    <div style={{ fontSize: 8, fontWeight: 900, color: C.primary }}>{cmt.author}</div>
                    <div style={{ fontSize: 10, color: C.text1, marginTop: 2 }}>{cmt.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddComment} style={{ display: "flex", gap: 4 }}>
                <input
                  type="text"
                  placeholder="Add comment..."
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, background: C.cardBg, color: C.text1 }}
                />
                <button type="submit" style={{ padding: "6px 10px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Add</button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ── Logistics Live GPS Map Drawer Overlay ── */}
      {activeGPSChallan && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)" }} onClick={() => setActiveGPSChallan(null)} />
          <div style={{
            position: "relative", width: 400, height: "100%", background: C.cardBg,
            borderLeft: `1px solid ${C.border}`, padding: 24, display: "flex", flexDirection: "column", gap: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 900, color: C.primary }}>GPS Vehicle Tracking Tracer</h3>
                <span style={{ fontSize: 9, color: C.text3 }}>Challan: {activeGPSChallan.id} | Vehicle: {activeGPSChallan.vehicle}</span>
              </div>
              <button onClick={() => setActiveGPSChallan(null)} style={{ background: "none", border: "none", color: C.text3, fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>
            
            {/* GPS Tracer Visual timeline */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, padding: 12, background: C.divider, borderRadius: 8 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <MapPin size={16} color={T.green} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800 }}>Baroda Manufacturing Hub (09:00 AM)</div>
                  <span style={{ fontSize: 8, color: C.text3 }}>Vehicle dispatch log confirmed</span>
                </div>
              </div>
              <div style={{ width: 2, height: 24, background: C.border, marginLeft: 16 }} />
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <MapPin size={16} color={T.green} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800 }}>Expressway Toll Plaza (11:30 AM)</div>
                  <span style={{ fontSize: 8, color: C.text3 }}>RFID Tag cleared GJ-01</span>
                </div>
              </div>
              <div style={{ width: 2, height: 24, background: C.border, marginLeft: 16 }} />
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <MapPin size={16} color={T.amber} className="animate-bounce" />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.amber }}>Transit: Makarpura GIDC highway</div>
                  <span style={{ fontSize: 8, color: C.text3 }}>GPS Coordinates: 22.3072° N, 73.1812° E</span>
                </div>
              </div>
              <div style={{ width: 2, height: 24, background: C.border, marginLeft: 16, borderStyle: "dashed" }} />
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <MapPin size={16} color={C.text3} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.text3 }}>Patel Enterprises Yard (ETA 03:30 PM)</div>
                  <span style={{ fontSize: 8, color: C.text3 }}>Awaiting arrival and OTP validation</span>
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => toast.success("WhatsApp alert dispatched to driver!")} style={{ flex: 1, padding: "8px 12px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Message Driver</button>
              <button onClick={() => toast.success("E-Way bill QR Code ready!")} style={{ padding: "8px 12px", background: C.divider, border: "none", borderRadius: 6, fontSize: 10, color: C.text1, cursor: "pointer" }}>QR Code</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Central Speed Dial FAB ── */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {showSpeedDial && (
          <div style={{
            background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: 8, width: 140,
            display: "flex", flexDirection: "column", gap: 2
          }}>
            {[
              { type: "new-quote", label: "➕ New Quotation" },
              { type: "new-order", label: "📦 New Sales Order" },
              { type: "new-cust",  label: "👤 New Customer" },
              { type: "new-dc",    label: "🚛 Create Challan" },
              { type: "new-rma",   label: "🔁 Raise Returns (RMA)" }
            ].map(opt => (
              <button
                key={opt.type}
                onClick={() => {
                  setShowSpeedDial(false);
                  if (opt.type === "new-quote") setShowNewQuoteModal(true);
                  if (opt.type === "new-order") setShowNewOrderModal(true);
                  if (opt.type === "new-cust") setShowNewCustModal(true);
                  if (opt.type === "new-dc") { setChallanSO("SO-1102"); setShowChallanModal(true); }
                  if (opt.type === "new-rma") { setActiveTab("warehouse"); setWarehouseSubTab("returns"); }
                }}
                style={{
                  display: "block", width: "100%", padding: "6px 8px", border: "none",
                  background: "none", fontSize: 9, fontWeight: 700, color: C.text2,
                  textAlign: "left", cursor: "pointer", borderRadius: 4, transition: "background 0.1s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.divider}
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
            background: C.primary, color: "#fff", border: "none", borderRadius: 50,
            width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(67, 97, 238, 0.4)", cursor: "pointer",
            transform: showSpeedDial ? "rotate(45deg)" : "none", transition: "transform 0.2s ease"
          }}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* ── Modals ── */}
      {showNewQuoteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: C.text1 }}>Draft New Quotation</h3>
              <button onClick={() => setShowNewQuoteModal(false)} style={{ background: "none", border: "none", fontSize: 16, color: C.text3, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateQuote} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" value={quoteCust} onChange={e => setQuoteCust(e.target.value)} placeholder="Customer Name" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
              <input type="number" value={quoteAmt} onChange={e => setQuoteAmt(e.target.value)} placeholder="Est. Amount (₹)" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
              <input type="text" value={quoteItem} onChange={e => setQuoteItem(e.target.value)} placeholder="Quoted Items" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
              <button type="submit" style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 6, padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Create Revision v1</button>
            </form>
          </div>
        </div>
      )}

      {showNewOrderModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: C.text1 }}>Generate Sales Order</h3>
              <button onClick={() => setShowNewOrderModal(false)} style={{ background: "none", border: "none", fontSize: 16, color: C.text3, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateOrder} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" value={orderCust} onChange={e => setOrderCust(e.target.value)} placeholder="Customer Name" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
              <input type="number" value={orderAmt} onChange={e => setOrderAmt(e.target.value)} placeholder="Order Amount" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
              <input type="text" value={orderPo} onChange={e => setOrderPo(e.target.value)} placeholder="PO Number" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} />
              <button type="submit" style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 6, padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Allocate Stock & Confirm</button>
            </form>
          </div>
        </div>
      )}

      {showNewCustModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: C.text1 }}>Add Customer Credit Limit</h3>
              <button onClick={() => setShowNewCustModal(false)} style={{ background: "none", border: "none", fontSize: 16, color: C.text3, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateCustomer} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" value={newCustName} onChange={e => setNewCustName(e.target.value)} placeholder="Customer Account Name" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
              <input type="number" value={newCustLimit} onChange={e => setNewCustLimit(e.target.value)} placeholder="Assigned Credit Limit (₹)" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
              <button type="submit" style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 6, padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Register Credit Account</button>
            </form>
          </div>
        </div>
      )}

      {showChallanModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, width: "100%", maxWidth: 400, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: C.text1 }}>Generate Delivery Challan</h3>
              <button onClick={() => setShowChallanModal(false)} style={{ background: "none", border: "none", fontSize: 16, color: C.text3, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateChallan} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" value={challanVehicle} onChange={e => setChallanVehicle(e.target.value)} placeholder="Vehicle Transport Number" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
              <input type="text" value={challanDriver} onChange={e => setChallanDriver(e.target.value)} placeholder="Driver Full Name" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
              <button type="submit" style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 6, padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Generate DC & E-Way Ref</button>
            </form>
          </div>
        </div>
      )}

      {showApprovalModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 360, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: C.text1 }}>Sales Verification Sign-off</h3>
              <button onClick={() => setShowApprovalModal(false)} style={{ background: "none", border: "none", fontSize: 18, color: C.text3, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ background: C.cyanBg, padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.text1, lineHeight: 1.4 }}>
                <strong>Confirm Release:</strong> {approvingItem?.id}<br />
                <strong>Customer:</strong> {approvingItem?.party}<br />
                <strong>Amount:</strong> {inr(approvingItem?.amount)}
              </div>
            </div>
            <form onSubmit={handleAuthorizeApproval} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="password" value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="🔑 OTP Code (Try 989898)" style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, letterSpacing: 4, textAlign: "center", background: C.cardBg, color: C.text1 }} required />
              <button type="submit" style={{ background: T.green, color: "#fff", border: "none", borderRadius: 6, padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Release Transaction</button>
            </form>
          </div>
        </div>
      )}

      {showPaymentSimulator && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 360, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: C.text1 }}>Razorpay Gateway Payment</h3>
              <button onClick={() => setShowPaymentSimulator(false)} style={{ background: "none", border: "none", fontSize: 18, color: C.text3, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ background: C.divider, padding: 12, borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: C.text3 }}>Payee Merchant: <strong>Daynisc Technologies</strong></div>
              <div style={{ fontSize: 14, fontWeight: 900, color: T.green, marginTop: 4 }}>Amount: {inr(selectedInvoiceForPayment?.outstanding)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => {
                setOrders(prev => prev.map(o => o.id === selectedInvoiceForPayment?.id ? { ...o, outstanding: 0 } : o));
                toast.success("Online payment successful via Razorpay!");
                setShowPaymentSimulator(false);
              }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>💳 Pay Card</button>
              <button onClick={() => {
                setOrders(prev => prev.map(o => o.id === selectedInvoiceForPayment?.id ? { ...o, outstanding: 0 } : o));
                toast.success("UPI cleared successfully!");
                setShowPaymentSimulator(false);
              }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", background: T.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>📱 UPI QR</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
