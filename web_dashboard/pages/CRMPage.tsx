// src/pages/CRMPage.tsx
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge, inr, thStyle, tdStyle } from "../store/theme";
import toast from "react-hot-toast";
import {
  Download, Copy, Share2, Mail, FileSpreadsheet,
  Settings, Landmark, FileText, CheckCircle2,
  AlertTriangle, Calendar as IconCal, Info, Printer, ShieldAlert,
  Check, X, Eye, HelpCircle, ShieldCheck, ChevronRight, Activity, Clock,
  ArrowRightLeft, AlertCircle, RefreshCw, Send, Plus, Award, Star,
  TrendingUp, Users, ShoppingBag, AlertOctagon, FileCheck, Clipboard, Play, Moon, Sun, MessageSquare, Phone
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

type CrmStage =
  | "Lead"
  | "Contacted"
  | "Qualified"
  | "Requirement Gathering"
  | "Quotation"
  | "Negotiation"
  | "Approval"
  | "Won"
  | "Lost"
  | "On Hold";

const STAGE_COLORS: Record<CrmStage, { border: string; bg: string; text: string }> = {
  Lead: { border: "#64748b", bg: "rgba(100, 116, 139, 0.12)", text: "#64748b" },
  Contacted: { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6" },
  Qualified: { border: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)", text: "#06b6d4" },
  "Requirement Gathering": { border: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", text: "#6366f1" },
  Quotation: { border: "#a855f7", bg: "rgba(168, 85, 247, 0.12)", text: "#a855f7" },
  Negotiation: { border: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b" },
  Approval: { border: "#14b8a6", bg: "rgba(20, 184, 166, 0.12)", text: "#14b8a6" },
  Won: { border: "#22c55e", bg: "rgba(34, 197, 94, 0.12)", text: "#22c55e" },
  Lost: { border: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", text: "#ef4444" },
  "On Hold": { border: "#475569", bg: "rgba(71, 85, 105, 0.12)", text: "#475569" }
};

const MOCK_LEADS = [
  { id: "OP-901", name: "Rajesh Patel", company: "Supreme Plastics Ltd", value: 480000, status: "Negotiation" as CrmStage, contact: "Rajesh Patel", mobile: "+91 98210 12345", email: "rajesh@supremeplastics.com", industry: "Polymers", city: "Mumbai", state: "MH", priority: "High", assigned: "Sanjay Patel", source: "Reference", date: "2026-06-30", closingDate: "2026-07-15", nextAction: " Today 4:00 PM", product: "Polypropylene Resin PP-40", qty: 5000, budget: 480000, probability: 75, rating: 5, score: 92, timeline: [{ date: "Today", event: "09:30 Call - Interested, requested revised quotation" }, { date: "Yesterday", event: "WhatsApp Sent with product catalog" }, { date: "26-Jun", event: "Meeting at Mumbai Head Office" }], comments: [{ author: "Sanjay", text: "Client wants 5% wholesale discount." }] },
  { id: "OP-902", name: "Sanjay Shah", company: "Patel Enterprises", value: 185000, status: "Quotation" as CrmStage, contact: "Sanjay Shah", mobile: "+91 99012 88710", email: "sanjay@patelent.com", industry: "Packaging", city: "Baroda", state: "GJ", priority: "High", assigned: "Ramesh Kumar", source: "Website", date: "2026-06-29", closingDate: "2026-07-10", nextAction: " Tomorrow 10:30 AM", product: "HDPE Granules Grade A", qty: 2500, budget: 185000, probability: 60, rating: 4, score: 78, timeline: [{ date: "Yesterday", event: "Quotation revised to v3" }, { date: "28-Jun", event: "Visited Baroda plant" }], comments: [] },
  { id: "OP-903", name: "Anil Verma", company: "Verma Chemicals", value: 120000, status: "Contacted" as CrmStage, contact: "Anil Verma", mobile: "+91 91220 44521", email: "anil@verma.com", industry: "Pharma", city: "Ahmedabad", state: "GJ", priority: "Medium", assigned: "Anil Sharma", source: "Cold Call", date: "2026-06-28", closingDate: "2026-07-25", nextAction: " 02 Jul 11:00 AM", product: "PVC Compound PVC-E2", qty: 1200, budget: 120000, probability: 45, rating: 3, score: 62, timeline: [{ date: "28-Jun", event: "Talked with Anil, interested in PVC-E2" }], comments: [] }
];

const WAREHOUSE_STOCK = {
  "HDPE Granules Grade A": { qty: 12500, reserved: 2000, free: 10500, status: "Available", nextProd: "Tomorrow" },
  "Polypropylene Resin PP-40": { qty: 2800, reserved: 1200, free: 1600, status: "Low Stock Warning", nextProd: "02 Jul" },
  "PVC Compound PVC-E2": { qty: 8900, reserved: 1500, free: 7400, status: "Available", nextProd: "04 Jul" }
};

const FINANCE_OUTSTANDING = {
  "Supreme Plastics Ltd": { limit: 2500000, outstanding: 150000, overdue: 0, risk: "Low", since: "2023", totalPurchases: 1840000 },
  "Patel Enterprises": { limit: 1000000, outstanding: 0, overdue: 0, risk: "Low", since: "2024", totalPurchases: 850000 },
  "Verma Chemicals": { limit: 500000, outstanding: 0, overdue: 0, risk: "Low", since: "2025", totalPurchases: 320000 }
};

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

const ACCENT_COLORS = {
  High: { border: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444" },
  Medium: { border: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b" },
  Low: { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" }
};

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

function KpiCard({
  label,
  value,
  icon,
  accent = "blue",
  trend,
  isDark
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
  trend?: string;
  isDark?: boolean;
}) {
  const C = getTheme(!!isDark);
  const strokeColor = accent === "red" ? "#ef4444" : accent === "green" ? "#22c55e" : accent === "orange" ? "#f59e0b" : "#3b82f6";
  const sparkData = [{ y: 10 }, { y: 18 }, { y: 14 }, { y: 25 }, { y: 22 }, { y: 30 }];

  return (
    <div style={{
      ...cardStyle({ padding: "12px 16px" }),
      flex: "1 1 180px", background: C.cardBg, borderColor: C.border,
      borderLeft: `4px solid ${strokeColor}`, display: "flex", flexDirection: "column",
      justifyContent: "space-between", minHeight: 85
    }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 8, color: C.text3, fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
          <span style={{ color: strokeColor }}>{icon}</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text1 }}>{value}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 }}>
        <span style={{ fontSize: 8, color: T.green, fontWeight: 700 }}>{trend}</span>
        <div style={{ width: 50, height: 18 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
              <Area type="monotone" dataKey="y" stroke={strokeColor} fill="rgba(67,97,238,0.05)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const [isDark, setIsDark] = useState(false);
  const C = getTheme(isDark);

  // States
  const [leads, setLeads] = useState<any[]>(MOCK_LEADS);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<any | null>(null);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  
  // Search & Filters
  const [search, setSearch] = useState("");
  const [filterExecutive, setFilterExecutive] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSource, setFilterSource] = useState("");

  // Lead Wizard modal state
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formGstin, setFormGstin] = useState("");
  const [formPan, setFormPan] = useState("");
  const [formCustType, setFormCustType] = useState("New");
  const [formSource, setFormSource] = useState("Website");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formTerritory, setFormTerritory] = useState("West Zone (GJ)");

  // Step 2 fields
  const [formProduct, setFormProduct] = useState("HDPE Granules Grade A");
  const [formQty, setFormQty] = useState("");
  const [formUnit, setFormUnit] = useState("kg");
  const [formValue, setFormValue] = useState("");
  const [formProbability, setFormProbability] = useState("60");
  const [formExecutive, setFormExecutive] = useState("Sanjay Patel");
  const [formPriority, setFormPriority] = useState("High");
  const [formClosingDate, setFormClosingDate] = useState("2026-07-15");
  const [formNextFollowupDate, setFormNextFollowupDate] = useState("2026-07-01");
  const [formNextFollowupTime, setFormNextFollowupTime] = useState("10:30 AM");
  const [formNotes, setFormNotes] = useState("");

  // AI draft message state
  const [aiDraftText, setAiDraftText] = useState("");
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  const stages: CrmStage[] = [
    "Lead", "Contacted", "Qualified", "Requirement Gathering",
    "Quotation", "Negotiation", "Approval", "Won", "Lost", "On Hold"
  ];

  // Filter logic
  const filteredLeads = leads.filter(l => {
    const matchesSearch = search ? (
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      (l.product && l.product.toLowerCase().includes(search.toLowerCase()))
    ) : true;
    const matchesExec = filterExecutive ? l.assigned === filterExecutive : true;
    const matchesPriority = filterPriority ? l.priority === filterPriority : true;
    const matchesSource = filterSource ? l.source === filterSource : true;
    return matchesSearch && matchesExec && matchesPriority && matchesSource;
  });

  const getLeadsByStage = (stage: CrmStage) => filteredLeads.filter(l => l.status === stage);

  // Totals calculations
  const totalPipeline = filteredLeads.reduce((sum, item) => sum + item.value, 0);
  const avgDeal = filteredLeads.length ? totalPipeline / filteredLeads.length : 0;
  const weightedRev = filteredLeads.reduce((sum, item) => sum + (item.value * (item.probability / 100)), 0);
  const hotDealsCount = filteredLeads.filter(l => l.priority === "High").length;

  const handleUpdateStage = (leadId: string, targetStage: CrmStage) => {
    const timeEvent = { date: "Today", event: `Pipeline stage updated to ${targetStage}` };
    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l, status: targetStage,
      timeline: [timeEvent, ...(l.timeline || [])]
    } : l));
    
    if (selectedLeadForDrawer && selectedLeadForDrawer.id === leadId) {
      setSelectedLeadForDrawer((prev: any) => ({
        ...prev, status: targetStage,
        timeline: [timeEvent, ...(prev.timeline || [])]
      }));
    }
    toast.success(`Opportunity stage transitioned to ${targetStage}!`);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    const newL = {
      id: `OP-${Math.floor(904 + Math.random() * 1000)}`,
      name: formName,
      company: formCompany,
      value: parseFloat(formValue) || 100000,
      status: "Lead" as CrmStage,
      contact: formName,
      mobile: formMobile,
      email: formEmail,
      industry: "Polymers",
      city: formCity || "Baroda",
      state: formState || "GJ",
      priority: formPriority,
      assigned: formExecutive,
      source: formSource,
      date: new Date().toISOString().slice(0, 10),
      closingDate: formClosingDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      nextAction: `${formNextFollowupDate || "Tomorrow"} ${formNextFollowupTime || "10:00 AM"}`,
      product: formProduct,
      qty: parseFloat(formQty) || 1000,
      budget: parseFloat(formValue) || 100000,
      probability: parseInt(formProbability, 10) || 60,
      rating: 4,
      score: 80,
      timeline: [{ date: "Today", event: `Lead registered via ${formSource}` }],
      comments: formNotes ? [{ author: "System", text: formNotes }] : []
    };
    setLeads([newL, ...leads]);
    toast.success("New CRM Lead Opportunity & Follow-up generated!");
    setShowAddLeadModal(false);
    setModalStep(1);
    setFormName("");
    setFormCompany("");
    setFormValue("");
    setFormMobile("");
    setFormEmail("");
  };

  const handleTriggerAiDraft = (action: string) => {
    if (!selectedLeadForDrawer) return;
    setAiDraftLoading(true);
    setAiDraftText("");
    
    let fullText = "";
    if (action === "email") {
      fullText = `Subject: Daynisc Corp Quotation Offer - ${selectedLeadForDrawer.product}\n\nDear ${selectedLeadForDrawer.contact},\nThank you for choosing Daynisc Corp. Based on our discussion, we have drafted quotation QT-2026 for ${selectedLeadForDrawer.qty}kg of ${selectedLeadForDrawer.product} with a wholesale discount index.\n\nWarm regards,\n${selectedLeadForDrawer.assigned}`;
    } else {
      fullText = `WhatsApp: 'Hello ${selectedLeadForDrawer.contact}, Amit here from Daynisc Corp. Just wanted to follow up on the quotation sent for ${selectedLeadForDrawer.product}. Let me know if you would like me to process this to a Sales Order.'`;
    }

    setTimeout(() => {
      setAiDraftLoading(false);
      let idx = 0;
      const interval = setInterval(() => {
        setAiDraftText(prev => prev + fullText.charAt(idx));
        idx++;
        if (idx >= fullText.length) {
          clearInterval(interval);
        }
      }, 15);
    }, 600);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedLeadForDrawer) return;
    const cmt = { author: "System User", text: newCommentText };
    setLeads(prev => prev.map(l => l.id === selectedLeadForDrawer.id ? { ...l, comments: [...(l.comments || []), cmt] } : l));
    setSelectedLeadForDrawer((prev: any) => ({ ...prev, comments: [...(prev.comments || []), cmt] }));
    setNewCommentText("");
    toast.success("Comment saved!");
  };

  const handleConvertTarget = (targetType: string) => {
    if (!selectedLeadForDrawer) return;
    setShowConvertMenu(false);
    toast.success(`One-click ERP Integration: Lead ${selectedLeadForDrawer.id} converted to ${targetType}! Document generated.`);
    handleUpdateStage(selectedLeadForDrawer.id, "Won");
  };

  const isExistingCustomerMatch = formCompany.toLowerCase().includes("supreme") || formCompany.toLowerCase().includes("patel");

  return (
    <div style={{ padding: "16px 20px", fontFamily: "'Inter', sans-serif", background: C.pageBg, minHeight: "100vh", position: "relative", color: C.text1, display: "flex", flexDirection: "column" }}>
      
      {/* ── HEADER TOOLBAR ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: C.text3, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <span>Workspace</span>
            <span>&gt;</span>
            <span>CRM Opportunity Pipeline</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text1, letterSpacing: "-0.5px" }}>Customer Relationship Hub</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              padding: "7px", background: C.cardBg, color: C.text2,
              border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", display: "flex"
            }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          
          <button onClick={() => { setModalStep(1); setShowAddLeadModal(true); }} style={{ padding: "7px 12px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={13} /> Create New Lead
          </button>
        </div>
      </div>

      {/* ── CRM DASHBOARD KPI SECTION ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <KpiCard label="Today's Leads" value="18" icon={<Users size={15} />} accent="blue" trend="▲ +12% vs yesterday" isDark={isDark} />
        <KpiCard label="New Enquiries" value="9 active" icon={<Clock size={15} />} accent="orange" trend="5 pending response" isDark={isDark} />
        <KpiCard label="Quotations Sent" value="5 Sent" icon={<FileText size={15} />} accent="blue" trend="Avg value ₹3.40L" isDark={isDark} />
        <KpiCard label="Won Deals" value="₹18.50L" icon={<CheckCircle2 size={15} />} accent="green" trend="▲ +22% MoM" isDark={isDark} />
        <KpiCard label="Lost Opportunities" value="2 Deals" icon={<AlertCircle size={15} />} accent="red" trend="Lost to price margin" isDark={isDark} />
        <KpiCard label="Follow-ups Today" value="14 Agenda" icon={<IconCal size={15} />} accent="orange" trend="9 phone, 5 site visits" isDark={isDark} />
        <KpiCard label="Lead Conversion Rate" value="42%" icon={<TrendingUp size={15} />} accent="green" trend="▲ +4.2% H1" isDark={isDark} />
        <KpiCard label="Expected Revenue Pipeline" value="₹1.24Cr" icon={<Landmark size={15} />} accent="purple" trend="Next closing 15 days" isDark={isDark} />
      </div>

      {/* ── AI RECOMMENDATIONS & INSIGHTS BANNER ── */}
      <div style={{
        background: C.cardBg, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.primary}`,
        borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Sparkles size={16} color={C.primary} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: C.text1 }}>AI CRM Insights & Action Prompts</div>
            <div style={{ fontSize: 10, color: C.text2, display: "flex", gap: 12, marginTop: 2, flexWrap: "wrap" }}>
              <span>• OP-901 has 82% chance to close. Recommend 5% deal discount.</span>
              <span>• Call Patel Enterprises today regarding revised quotation.</span>
              <span>• Negotiation for Verma Chemicals stalled for 6 days!</span>
            </div>
          </div>
        </div>
        <button onClick={() => toast.success("AI Workflow triggers re-evaluated!")} style={{ padding: "6px 10px", background: C.cyanBg, color: C.primary, border: "none", borderRadius: 6, fontSize: 9, fontWeight: 800, cursor: "pointer" }}>Run AI Re-check</button>
      </div>

      {/* ── FILTERING PIPELINE CONTROLS ── */}
      <div style={{
        display: "flex", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 10, gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap"
      }}>
        <input
          type="text"
          placeholder="Search Lead, Company, Product..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputFilterStyle, width: 200, background: C.pageBg, color: C.text1, borderColor: C.border }}
        />
        
        <select value={filterExecutive} onChange={e => setFilterExecutive(e.target.value)} style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}>
          <option value="">Executive: All</option>
          <option value="Sanjay Patel">Sanjay Patel</option>
          <option value="Ramesh Kumar">Ramesh Kumar</option>
          <option value="Anil Sharma">Anil Sharma</option>
        </select>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}>
          <option value="">Priority: All</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>

        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}>
          <option value="">Source: All</option>
          <option value="Website">Website</option>
          <option value="Reference">Reference</option>
          <option value="Cold Call">Cold Call</option>
        </select>

        {(search || filterExecutive || filterPriority || filterSource) && (
          <button
            onClick={() => { setSearch(""); setFilterExecutive(""); setFilterPriority(""); setFilterSource(""); }}
            style={{ background: "none", border: "none", color: C.text2, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Opportunity Kanban Board Pipeline (10 B2B Stages) ── */}
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 10, flex: 1 }}>
        {stages.map(stg => {
          const stageLeads = getLeadsByStage(stg);
          const totalVal = stageLeads.reduce((sum, item) => sum + item.value, 0);
          const stgStyle = STAGE_COLORS[stg] || STAGE_COLORS.Lead;
          const stgColor: string = stgStyle.border;

          return (
            <div key={stg} style={{
              flex: "0 0 250px", background: C.divider, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", maxHeight: "60vh"
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, borderBottom: `2.5px solid ${stgColor}`, paddingBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: C.text1 }}>{stg}</div>
                  <span style={{ fontSize: 9, color: C.text3 }}>{stageLeads.length} Opps | {inr(totalVal)}</span>
                </div>
                <span style={badge(stgColor, stgStyle.bg)}>{stageLeads.length}</span>
              </div>

              {/* Scrolling Card List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, padding: "2px 0" }}>
                {stageLeads.map(lead => {
                  const priColor = ACCENT_COLORS[lead.priority as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.Low;
                  const initials = lead.company.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  
                  return (
                    <div
                      key={lead.id}
                      style={{
                        background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8,
                        padding: 12, cursor: "pointer", transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        borderLeft: `4px solid ${stgColor}`
                      }}
                      onClick={() => setSelectedLeadForDrawer(lead)}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = T.shadowMd;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: 50, background: stgStyle.bg, color: stgColor,
                            fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            {initials}
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 900, color: C.primary }}>{lead.id}</span>
                        </div>
                        <span style={badge(priColor.text, priColor.bg)}>{lead.priority}</span>
                      </div>
                      
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.text1, marginTop: 6 }}>{lead.company}</div>
                      <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>{lead.contact}</div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: T.green }}>{inr(lead.value)}</span>
                        <span style={{ fontSize: 8, fontWeight: 800, color: C.primary, background: C.primaryBg, padding: "2px 6px", borderRadius: 10 }}>Prob: {lead.probability}%</span>
                      </div>

                      <div style={{ fontSize: 9, color: T.amber, marginTop: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={10} /> {lead.nextAction || "Follow up scheduled"}
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 9, color: C.text3 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><User size={11} /> {lead.assigned}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Calendar size={11} /> {lead.date}</span>
                      </div>

                      {/* Compact Icon Action Buttons */}
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", marginTop: 8, borderTop: `1px solid ${C.divider}`, paddingTop: 6 }}>
                        <button onClick={(e) => { e.stopPropagation(); toast.success("Phone dialer triggered!"); }} style={{ padding: "3px 6px", background: C.divider, border: "none", borderRadius: 4, fontSize: 10, cursor: "pointer" }} title="Call Customer"><Phone size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); toast.success("WhatsApp opened!"); }} style={{ padding: "3px 6px", background: C.divider, border: "none", borderRadius: 4, fontSize: 10, cursor: "pointer" }} title="WhatsApp Message"><MessageSquare size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); toast.success("Email mailer opened!"); }} style={{ padding: "3px 6px", background: C.divider, border: "none", borderRadius: 4, fontSize: 10, cursor: "pointer" }} title="Send Email"><Mail size={12} />️</button>
                        <button onClick={(e) => { e.stopPropagation(); toast.success("Schedule Meeting"); }} style={{ padding: "3px 6px", background: C.divider, border: "none", borderRadius: 4, fontSize: 10, cursor: "pointer" }} title="Schedule Meeting"><Calendar size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); toast.success("Add Quick Note"); }} style={{ padding: "3px 6px", background: C.divider, border: "none", borderRadius: 4, fontSize: 10, cursor: "pointer" }} title="Quick Note"><FileText size={12} /></button>
                      </div>
                    </div>
                  );
                })}

                {stageLeads.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", fontSize: 9, color: C.text3 }}>Empty stage</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── STICKY PIPELINE TOTALS FOOTER ── */}
      <div style={{
        position: "sticky", bottom: 0, background: C.cardBg, borderTop: `1px solid ${C.border}`,
        padding: "10px 18px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 -4px 15px rgba(0,0,0,0.08)", marginTop: 10, zIndex: 99, flexWrap: "wrap", gap: 10
      }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div><span style={{ fontSize: 9, color: C.text3, textTransform: "uppercase" }}>Total Pipeline</span><div style={{ fontSize: 13, fontWeight: 900, color: C.primary }}>{inr(totalPipeline)}</div></div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div><span style={{ fontSize: 9, color: C.text3, textTransform: "uppercase" }}>Average Deal</span><div style={{ fontSize: 13, fontWeight: 900 }}>{inr(avgDeal)}</div></div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div><span style={{ fontSize: 9, color: C.text3, textTransform: "uppercase" }}>Weighted Revenue</span><div style={{ fontSize: 13, fontWeight: 900, color: T.green }}>{inr(weightedRev)}</div></div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div><span style={{ fontSize: 9, color: C.text3, textTransform: "uppercase" }}>Active Hot Deals</span><div style={{ fontSize: 13, fontWeight: 900, color: T.amber }}>{hotDealsCount} Deals</div></div>
        </div>
        <div style={{ fontSize: 10, color: C.text3 }}>Showing {filteredLeads.length} total opportunities across 10 stages</div>
      </div>

      {/* ── Natural Sales Workflow Side Drawer ── */}
      {selectedLeadForDrawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)" }} onClick={() => setSelectedLeadForDrawer(null)} />
          
          <div style={{
            position: "relative", width: 460, height: "100%", background: C.cardBg,
            borderLeft: `1px solid ${C.border}`, padding: 24, overflowY: "auto", display: "flex",
            flexDirection: "column", gap: 14, boxShadow: "-10px 0 40px rgba(0,0,0,0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 900, color: C.primary }}>Opportunity {selectedLeadForDrawer.id}</h3>
                <span style={{ fontSize: 9, color: C.text3 }}>Assigned Executive: {selectedLeadForDrawer.assigned}</span>
              </div>
              <button onClick={() => setSelectedLeadForDrawer(null)} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", display: "flex", alignItems: "center" }}><X size={18} /></button>
            </div>

            {/* 1. Customer Summary Card */}
            <div style={{ background: C.divider, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: C.text1 }}>{selectedLeadForDrawer.company}</div>
                <div style={{ color: "#eab308", fontSize: 10 }}>{"".repeat(selectedLeadForDrawer.rating)}{"".repeat(5 - selectedLeadForDrawer.rating)}</div>
              </div>
              <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>
                Customer since {FINANCE_OUTSTANDING[selectedLeadForDrawer.company as keyof typeof FINANCE_OUTSTANDING]?.since || "2023"} | Contact: {selectedLeadForDrawer.contact}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8, borderTop: `1px dashed ${C.border}`, paddingTop: 6 }}>
                <div><span style={{ fontSize: 8, color: C.text3 }}>Total Purchase</span><div style={{ fontSize: 10, fontWeight: 800, color: T.green }}>{inr(FINANCE_OUTSTANDING[selectedLeadForDrawer.company as keyof typeof FINANCE_OUTSTANDING]?.totalPurchases || 1840000)}</div></div>
                <div><span style={{ fontSize: 8, color: C.text3 }}>Outstanding</span><div style={{ fontSize: 10, fontWeight: 800 }}>{inr(FINANCE_OUTSTANDING[selectedLeadForDrawer.company as keyof typeof FINANCE_OUTSTANDING]?.outstanding || 0)}</div></div>
                <div><span style={{ fontSize: 8, color: C.text3 }}>Credit Limit</span><div style={{ fontSize: 10, fontWeight: 800 }}>{inr(FINANCE_OUTSTANDING[selectedLeadForDrawer.company as keyof typeof FINANCE_OUTSTANDING]?.limit || 2500000)}</div></div>
              </div>
            </div>

            {/* 2. Status & Deal Value */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 8, color: C.text3, textTransform: "uppercase" }}>Deal Value</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: T.green }}>{inr(selectedLeadForDrawer.value)}</div>
                <span style={{ fontSize: 9, color: T.amber, fontWeight: 700 }}>{selectedLeadForDrawer.nextAction}</span>
              </div>
              <div>
                <select
                  value={selectedLeadForDrawer.status}
                  onChange={e => handleUpdateStage(selectedLeadForDrawer.id, e.target.value as CrmStage)}
                  style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}
                >
                  {stages.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>

            {/* 3. Actionable AI Recommendation Card */}
            <div style={{ background: C.cyanBg, border: `1px solid ${C.primary}`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: C.primary, textTransform: "uppercase", marginBottom: 4 }}> Actionable AI Recommendation</div>
              <div style={{ fontSize: 10, color: C.text1, lineHeight: 1.4 }}>
                <strong>Win Chance: {selectedLeadForDrawer.probability}%</strong> | Recommended Discount: <strong>2%</strong> | Risk: <strong style={{ color: T.green }}>Low</strong><br />
                <strong>Next Best Action:</strong> Call customer today regarding revised quotation.<br />
                <strong>Expected Closing:</strong> {selectedLeadForDrawer.closingDate}
              </div>
            </div>

            {/* 4. ERP Inventory Integration */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>ERP Warehouse Stock Breakdown</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.text1, marginBottom: 4 }}>{selectedLeadForDrawer.product}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                <div style={{ background: C.divider, padding: 4, borderRadius: 4 }}><span style={{ fontSize: 7, color: C.text3 }}>Available</span><div style={{ fontSize: 9, fontWeight: 800 }}>{WAREHOUSE_STOCK[selectedLeadForDrawer.product as keyof typeof WAREHOUSE_STOCK]?.qty || 8900}kg</div></div>
                <div style={{ background: C.divider, padding: 4, borderRadius: 4 }}><span style={{ fontSize: 7, color: C.text3 }}>Reserved</span><div style={{ fontSize: 9, fontWeight: 800, color: T.amber }}>{WAREHOUSE_STOCK[selectedLeadForDrawer.product as keyof typeof WAREHOUSE_STOCK]?.reserved || 1200}kg</div></div>
                <div style={{ background: C.divider, padding: 4, borderRadius: 4 }}><span style={{ fontSize: 7, color: C.text3 }}>Free Stock</span><div style={{ fontSize: 9, fontWeight: 800, color: T.green }}>{WAREHOUSE_STOCK[selectedLeadForDrawer.product as keyof typeof WAREHOUSE_STOCK]?.free || 7700}kg</div></div>
                <div style={{ background: C.divider, padding: 4, borderRadius: 4 }}><span style={{ fontSize: 7, color: C.text3 }}>Next Run</span><div style={{ fontSize: 9, fontWeight: 800, color: C.primary }}>{WAREHOUSE_STOCK[selectedLeadForDrawer.product as keyof typeof WAREHOUSE_STOCK]?.nextProd || "Tomorrow"}</div></div>
              </div>
            </div>

            {/* 5. ERP Finance Integration */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>ERP Finance Audit</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                <div style={{ background: C.divider, padding: 4, borderRadius: 4 }}><span style={{ fontSize: 7, color: C.text3 }}>Limit</span><div style={{ fontSize: 9, fontWeight: 800 }}>₹25L</div></div>
                <div style={{ background: C.divider, padding: 4, borderRadius: 4 }}><span style={{ fontSize: 7, color: C.text3 }}>Outstanding</span><div style={{ fontSize: 9, fontWeight: 800 }}>₹0</div></div>
                <div style={{ background: C.divider, padding: 4, borderRadius: 4 }}><span style={{ fontSize: 7, color: C.text3 }}>Overdue</span><div style={{ fontSize: 9, fontWeight: 800, color: T.green }}>₹0</div></div>
                <div style={{ background: C.divider, padding: 4, borderRadius: 4 }}><span style={{ fontSize: 7, color: C.text3 }}>Risk</span><div style={{ fontSize: 9, fontWeight: 800, color: T.green }}>Low</div></div>
              </div>
            </div>

            {/* 6. Action Split Button */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowConvertMenu(!showConvertMenu)} style={{ width: "100%", padding: "10px 14px", background: T.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 900, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                ▼ Convert Opportunity
              </button>
              {showConvertMenu && (
                <div style={{ position: "absolute", top: 40, left: 0, right: 0, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, boxShadow: T.shadowMd, zIndex: 99, padding: 4 }}>
                  <button onClick={() => handleConvertTarget("Quotation")} style={{ width: "100%", padding: "8px", border: "none", background: "none", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.text1, cursor: "pointer" }}> Convert to Sales Quotation</button>
                  <button onClick={() => handleConvertTarget("Sales Order")} style={{ width: "100%", padding: "8px", border: "none", background: "none", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.text1, cursor: "pointer" }} style={{ width: "100%", padding: "8px 12px", background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", color: C.text1, display: "flex", alignItems: "center", gap: 6 }}><Box size={13} /> Convert to Sales Order</button>
                  <button onClick={() => handleConvertTarget("Proforma Invoice")} style={{ width: "100%", padding: "8px", border: "none", background: "none", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.text1, cursor: "pointer" }} style={{ width: "100%", padding: "8px 12px", background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", color: C.text1, display: "flex", alignItems: "center", gap: 6 }}><Receipt size={13} /> Convert to Proforma Invoice</button>
                </div>
              )}
            </div>

            {/* 7. Chronological Activity Timeline */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>Chronological Activity Timeline</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(selectedLeadForDrawer.timeline || []).map((item: any, i: number) => (
                  <div key={i} style={{ background: C.divider, padding: 8, borderRadius: 6, borderLeft: `2.5px solid ${C.primary}` }}>
                    <div style={{ fontSize: 8, fontWeight: 900, color: C.primary }}>{item.date}</div>
                    <div style={{ fontSize: 10, color: C.text1, marginTop: 2 }}>{item.event}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 8. AI Assistant draft replies */}
            <div style={{ background: C.divider, padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.text1, marginBottom: 8 }}> AI CRM Co-Pilot Drafts</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button onClick={() => handleTriggerAiDraft("email")} style={{ padding: "6px 10px", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 9, cursor: "pointer", color: C.text1 }}>Draft Email</button>
                <button onClick={() => handleTriggerAiDraft("whatsapp")} style={{ padding: "6px 10px", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 9, cursor: "pointer", color: C.text1 }}>Draft WhatsApp</button>
              </div>

              {aiDraftLoading ? (
                <div style={{ fontSize: 9, color: C.text3 }}>Drafting reply character-by-character...</div>
              ) : aiDraftText ? (
                <div style={{ background: C.cardBg, padding: 8, borderRadius: 6, fontSize: 9, fontFamily: "monospace", whiteSpace: "pre-wrap", color: C.text1, border: `1px solid ${C.border}` }}>
                  {aiDraftText}
                </div>
              ) : null}
            </div>

            {/* 9. Comments log */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: C.text3, textTransform: "uppercase", marginBottom: 6 }}>CRM Team Comments</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                {selectedLeadForDrawer.comments.map((c: any, i: number) => (
                  <div key={i} style={{ background: C.divider, padding: 6, borderRadius: 6 }}>
                    <div style={{ fontSize: 8, fontWeight: 900, color: C.primary }}>{c.author}</div>
                    <div style={{ fontSize: 10, color: C.text1, marginTop: 2 }}>{c.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddComment} style={{ display: "flex", gap: 4 }}>
                <input
                  type="text"
                  placeholder="Type note or comment..."
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, background: C.cardBg, color: C.text1 }}
                />
                <button type="submit" style={{ padding: "6px 10px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Save</button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ── 2-STEP SMART LEAD WIZARD MODAL ── */}
      {showAddLeadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, width: "100%", maxWidth: 500, padding: 24, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
            
            {/* Modal Header with Progress Indicator */}
            <div style={{ marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 900, color: C.text1 }}>Create New Opportunity</h3>
                  <span style={{ fontSize: 9, fontWeight: 900, background: C.cyanBg, color: C.primary, padding: "2px 6px", borderRadius: 4 }}>OP-904</span>
                </div>
                <button onClick={() => setShowAddLeadModal(false)} style={{ background: "none", border: "none", fontSize: 16, color: C.text3, cursor: "pointer" }}><X size={16} /></button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: C.text3, marginBottom: 4 }}>
                <span>●━━━━━━{modalStep === 2 ? "●" : "○"} Step {modalStep} of 2: {modalStep === 1 ? "Lead Profile" : "Sales Details"}</span>
                <span style={{ fontWeight: 800, color: C.primary }}>{modalStep === 1 ? "50%" : "100%"} Complete</span>
              </div>
              <div style={{ width: "100%", height: 4, background: C.divider, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: modalStep === 1 ? "50%" : "100%", height: "100%", background: C.primary, transition: "width 0.3s ease" }} />
              </div>
            </div>

            {/* Wizard Form */}
            <form onSubmit={handleCreateLead} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              
              {/* STEP 1: Lead & Company Profile */}
              {modalStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Contact Name <span style={{ color: T.red }}>*</span></label>
                      <input type="text" placeholder="e.g. Ramesh Shah" value={formName} onChange={e => setFormName(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Company Name <span style={{ color: T.red }}>*</span></label>
                      <input type="text" placeholder="e.g. Supreme Plastics Ltd" value={formCompany} onChange={e => setFormCompany(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
                    </div>
                  </div>

                  {/* Smart Lookup Alert */}
                  {isExistingCustomerMatch && (
                    <div style={{ background: C.greenBg, border: `1px solid ${T.green}`, padding: 8, borderRadius: 6, fontSize: 9, color: T.green }}>
                      <strong style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={12} color={T.green} /> Existing ERP Customer Found!</strong> Outstanding: ₹4.20L | Credit Limit: ₹20.00L | Sales Executive: Anil Sharma
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Mobile <span style={{ color: T.red }}>*</span></label>
                      <input type="text" placeholder="+91 98210 00000" value={formMobile} onChange={e => setFormMobile(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Email</label>
                      <input type="email" placeholder="client@company.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>GST Number</label>
                      <input type="text" placeholder="24AAACS1209D1Z4" value={formGstin} onChange={e => setFormGstin(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>PAN Card</label>
                      <input type="text" placeholder="AAACS1209D" value={formPan} onChange={e => setFormPan(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Customer Type</label>
                      <select value={formCustType} onChange={e => setFormCustType(e.target.value)} style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}>
                        <option value="New">New Lead</option>
                        <option value="Existing">Existing Client</option>
                        <option value="Dealer">Dealer Account</option>
                        <option value="Distributor">Distributor</option>
                        <option value="OEM">OEM Manufacturer</option>
                        <option value="Export">Export Client</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Lead Source</label>
                      <select value={formSource} onChange={e => setFormSource(e.target.value)} style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}>
                        <option value="Website">Website Inbound</option>
                        <option value="IndiaMART">IndiaMART Portal</option>
                        <option value="Trade India">Trade India</option>
                        <option value="WhatsApp">WhatsApp Inquiry</option>
                        <option value="Referral">Reference</option>
                        <option value="Cold Call">Cold Call</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <input type="text" placeholder="City" value={formCity} onChange={e => setFormCity(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} />
                    <input type="text" placeholder="State" value={formState} onChange={e => setFormState(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} />
                    <input type="text" placeholder="Territory" value={formTerritory} onChange={e => setFormTerritory(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} />
                  </div>
                </div>
              )}

              {/* STEP 2: Sales Details & AI Assistance */}
              {modalStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Product Interest <span style={{ color: T.red }}>*</span></label>
                    <select value={formProduct} onChange={e => setFormProduct(e.target.value)} style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}>
                      <option value="HDPE Granules Grade A">HDPE Granules Grade A</option>
                      <option value="Polypropylene Resin PP-40">Polypropylene Resin PP-40</option>
                      <option value="PVC Compound PVC-E2">PVC Compound PVC-E2</option>
                    </select>
                  </div>

                  {/* AI Suggestions Box */}
                  <div style={{ background: C.primaryBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 8, fontSize: 9, color: C.primary }}>
                    <strong style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Sparkles size={12} color={C.primary} /> AI Suggestions:</strong> Customer profile similar to Patel Enterprises. Expected deal value ₹3.50L. Recommended discount: 2%. Suggested polymers: HDPE Grade A, PP Resin.
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr", gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Enquired Qty</label>
                      <input type="number" placeholder="1000" value={formQty} onChange={e => setFormQty(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Unit</label>
                      <select value={formUnit} onChange={e => setFormUnit(e.target.value)} style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}>
                        <option value="kg">kg</option>
                        <option value="Ton">Ton</option>
                        <option value="Bag">Bag</option>
                        <option value="Piece">Piece</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Budget (₹)</label>
                      <input type="number" placeholder="150000" value={formValue} onChange={e => setFormValue(e.target.value)} style={{ padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1 }} required />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Sales Executive <span style={{ color: T.red }}>*</span></label>
                      <select value={formExecutive} onChange={e => setFormExecutive(e.target.value)} style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}>
                        <option value="Sanjay Patel">Sanjay Patel</option>
                        <option value="Ramesh Kumar">Ramesh Kumar</option>
                        <option value="Anil Sharma">Anil Sharma</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Priority</label>
                      <select value={formPriority} onChange={e => setFormPriority(e.target.value)} style={{ ...selectStyle, background: C.cardBg, color: C.text1, borderColor: C.border }}>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.text2 }}>Deal Probability %</label>
                      <span style={{ fontSize: 10, fontWeight: 900, color: C.primary }}>{formProbability}%</span>
                    </div>
                    <input type="range" min="20" max="90" step="10" value={formProbability} onChange={e => setFormProbability(e.target.value)} style={{ width: "100%", cursor: "pointer" }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 8, fontWeight: 700, color: C.text3 }}>Closing Date</label>
                      <input type="date" value={formClosingDate} onChange={e => setFormClosingDate(e.target.value)} style={{ padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, background: C.cardBg, color: C.text1 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 8, fontWeight: 700, color: C.text3 }}>Follow-up Date</label>
                      <input type="date" value={formNextFollowupDate} onChange={e => setFormNextFollowupDate(e.target.value)} style={{ padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, background: C.cardBg, color: C.text1 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <label style={{ fontSize: 8, fontWeight: 700, color: C.text3 }}>Follow-up Time</label>
                      <input type="text" placeholder="10:30 AM" value={formNextFollowupTime} onChange={e => setFormNextFollowupTime(e.target.value)} style={{ padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, background: C.cardBg, color: C.text1 }} />
                    </div>
                  </div>

                  <textarea placeholder="Specific requirements or notes..." value={formNotes} onChange={e => setFormNotes(e.target.value)} style={{ padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, background: C.cardBg, color: C.text1, minHeight: 45 }} />
                </div>
              )}

              {/* Wizard Action Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <div>
                  <button type="button" onClick={() => setShowAddLeadModal(false)} style={{ padding: "8px 12px", background: "none", border: "none", fontSize: 11, color: C.text3, cursor: "pointer" }}>Cancel</button>
                  <button type="button" onClick={() => { toast.success("Draft saved!"); setShowAddLeadModal(false); }} style={{ padding: "8px 12px", background: C.divider, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, color: C.text1, cursor: "pointer", marginLeft: 4 }}>Save Draft</button>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {modalStep === 2 && (
                    <button type="button" onClick={() => setModalStep(1)} style={{ padding: "8px 12px", background: C.divider, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10, color: C.text1, cursor: "pointer" }}>← Back</button>
                  )}
                  {modalStep === 1 ? (
                    <button type="button" onClick={() => setModalStep(2)} style={{ padding: "8px 14px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Next: Sales Details →</button>
                  ) : (
                    <button type="submit" style={{ padding: "8px 14px", background: T.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Create & Schedule Follow-up</button>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
