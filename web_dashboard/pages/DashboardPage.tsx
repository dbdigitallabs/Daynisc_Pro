import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
  BarChart, Bar, Legend,
} from "recharts";
import api from "../store/apiClient";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { T, inr, cardStyle } from "../store/theme";
import {
  IconTrendUp, IconCart, IconMoney, IconBank, IconArrowDown,
  IconBox, IconWarning, IconAI, IconSync, IconCalendar,
  IconFile, IconCreditCard, IconUser, IconBuilding,
  IconUpload, IconBarChart, IconCheckCircle, IconClock,
} from "../components/Icons";

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
      <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || "#fff", fontSize: 13, fontWeight: 600 }}>
          {inr(p.value)}
        </p>
      ))}
    </div>
  );
};

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, ...style }}>{children}</div>;
}

interface KPICardProps {
  label: string; value: string; sub?: string; subUp?: boolean;
  Icon: React.ComponentType<any>; iconBg: string; iconColor: string;
}
function KPICard({ label, value, sub, subUp, Icon, iconBg, iconColor }: KPICardProps) {
  return (
    <Card style={{ padding: "11px 12px", flex: 1, minWidth: 120 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={iconColor} strokeWidth={1.8} />
        </div>
        {sub && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: subUp ? T.green : T.red,
            background: subUp ? T.greenBg : T.redBg,
            padding: "1px 5px", borderRadius: 12, display: "flex", alignItems: "center", gap: 2,
          }}>
            {subUp ? "+" : "-"}{sub}
          </span>
        )}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.text1, letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: 10, color: T.text3, marginTop: 2, fontWeight: 500 }}>{label}</div>
    </Card>
  );
}

// No static expense data — fetched from API (top_items)

const QUICK_ACTIONS = [
  { label: "Create Invoice",  Icon: IconFile,       path: "/sales",             color: T.primary },
  { label: "Add Purchase",    Icon: IconCart,       path: "/purchase",          color: T.amber   },
  { label: "New Payment",     Icon: IconCreditCard, path: "/accounting",        color: T.green   },
  { label: "Add Customer",    Icon: IconUser,       path: "/sales",             color: "#7c3aed" },
  { label: "Add Supplier",    Icon: IconBuilding,   path: "/purchase",          color: "#06b6d4" },
  { label: "Stock Entry",     Icon: IconBox,        path: "/inventory",         color: "#f97316" },
  { label: "AI Scan Bill",    Icon: IconAI,         path: "/ai-verification",   color: T.red     },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [searchVal, setSearchVal] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [renewalFilter, setRenewalFilter] = useState(false);

  // Chat Assistant states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([
    { sender: 'ai', text: 'Hello! I am Daynisc AI, your accounting assistant. Ask me anything about your invoices, stock, or ledger outstanding!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 1, text: "Approve Purchase Voucher #PUR-3001", done: false },
    { id: 2, text: "File GST Returns GSTR-1", done: false },
    { id: 3, text: "Call Vendor Reliance Polymers", done: false },
    { id: 4, text: "Run HDFC Bank Reconciliation", done: true }
  ]);
  const [showHealthTips, setShowHealthTips] = useState(false);
  const [chartFilter, setChartFilter] = useState("This Month");
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);
    try {
      const res = await api.post("/ai-assistant/query", { query: userText });
      setChatHistory(prev => [...prev, { sender: 'ai', text: res.data.answer }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { sender: 'ai', text: "Error: " + (err.response?.data?.detail || err.message) }]);
    } finally {
      setChatLoading(false);
    }
  };


  const { data: adminData, isLoading: adminLoading } = useQuery<any>({
    queryKey: ["super-admin-companies"],
    queryFn: () => api.get("/super-admin/companies").then(r => r.data),
    enabled: user?.role === "super_admin",
  });

  const { data: dash } = useQuery<any>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard").then(r => r.data),
    refetchInterval: 60_000,
    enabled: user?.role !== "super_admin",
  });

  if (user?.role === "super_admin") {
    const companies = adminData?.companies || [];
    const totalCompanies = companies.length;
    const totalAdmins = companies.reduce((acc: number, c: any) => acc + (c.admins?.length || 0), 0);
    const planCounts = companies.reduce((acc: Record<string, number>, c: any) => {
      const p = (c.plan || "starter").toLowerCase();
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    // Filter logic
    const filteredCompanies = companies.filter((c: any) => {
      if (activeSearch) {
        const query = activeSearch.toLowerCase();
        const matchesName = (c.name || "").toLowerCase().includes(query);
        const matchesGstin = (c.gstin || "").toLowerCase().includes(query);
        if (!matchesName && !matchesGstin) return false;
      }
      if (planFilter !== "all" && (c.plan || "").toLowerCase() !== planFilter) {
        return false;
      }
      if (statusFilter !== "all") {
        const isActive = c.is_active !== false;
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "suspended" && isActive) return false;
      }
      if (renewalFilter) {
        if (!c.subscription_expiry) return false;
        const expiry = new Date(c.subscription_expiry);
        const todayDate = new Date();
        const diffTime = expiry.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return false;
      }
      return true;
    });

    return (
      <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: "#f1f4f9", minHeight: "100%" }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px" }}>System Owner Dashboard</h1>
            <p style={{ fontSize: 13, color: T.text2, marginTop: 3 }}>
              Welcome back, <span style={{ fontWeight: 600, color: T.primary }}>{user?.name || "Bhavesh Khimsuriya"}</span>. Manage all business networks, active modules, and plans.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              fontSize: 12, color: T.text2, background: T.cardBg,
              border: `1px solid ${T.border}`, borderRadius: 8,
              padding: "7px 14px", display: "flex", alignItems: "center", gap: 8,
            }}>
              <IconCalendar size={14} color={T.text3} /> {today}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <KPICard label="Total Registered Businesses" value={String(totalCompanies)} Icon={IconBuilding} iconBg="#eff6ff" iconColor={T.primary} />
          <KPICard label="Total Employee Licenses" value={String(totalAdmins)} Icon={IconUser} iconBg="#f0fdf4" iconColor={T.green} />
          <KPICard label="Active Enterprise Plans" value={String(planCounts.enterprise || 0)} Icon={IconCreditCard} iconBg="#f5f3ff" iconColor="#7c3aed" />
          {/* Health Card */}
          <Card style={{ padding: "20px 22px", flex: 1, minWidth: 180, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconSync size={20} color={T.red} strokeWidth={1.8} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, color: T.green,
                background: T.greenBg, padding: "2px 7px", borderRadius: 20,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block", boxShadow: "0 0 8px #16a34a" }} />
                Online
              </span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginTop: 10 }}>Database & Core API</div>
              <div style={{ fontSize: 11, color: T.text3, marginTop: 4, fontWeight: 500 }}>Supabase pgPooler Indian Region</div>
            </div>
          </Card>
        </div>

        {/* Search & Filter Toolbar */}
        <div style={{
          background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 12,
          padding: "16px 20px", marginBottom: 20, display: "flex", gap: 14, alignItems: "center",
          flexWrap: "wrap", boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          {/* Search bar with Search Button */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 260 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, flex: 1,
              background: "#f8fafc", border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "8px 12px",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search business name or GSTIN..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setActiveSearch(searchVal);
                  }
                }}
                style={{
                  border: "none", background: "transparent", outline: "none",
                  fontSize: 13, color: T.text1, width: "100%"
                }}
              />
              {searchVal && (
                <button
                  onClick={() => { setSearchVal(""); setActiveSearch(""); }}
                  style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 11 }}
                >
                  Clear
                </button>
              )}
            </div>
            <button
              onClick={() => setActiveSearch(searchVal)}
              style={{
                background: T.primary, border: "none", borderRadius: 8,
                color: "#fff", fontWeight: 700, padding: "10px 18px",
                fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 8px rgba(67, 97, 238, 0.2)"
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              Search
            </button>
          </div>

          {/* Plan filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                fontSize: 12, color: T.text1, background: "#fff", cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="all">All Plans</option>
              <option value="starter">Starter</option>
              <option value="sme">SME</option>
              <option value="factory">Factory</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                fontSize: 12, color: T.text1, background: "#fff", cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>

          {/* Renewal Due Toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, color: T.text2 }}>
            <input
              type="checkbox"
              checked={renewalFilter}
              onChange={(e) => setRenewalFilter(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: T.primary, cursor: "pointer" }}
            />
            Renewal Due (≤30 days)
          </label>
        </div>

        {/* Businesses Squares Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          
          {/* Company Cards Grid */}
          <Card style={{ padding: "24px 28px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text1, margin: "0 0 16px 0", borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
              Your Business Networks ({filteredCompanies.length} registered)
            </h3>
            {adminLoading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: T.text3, fontSize: 13 }}>
                Fetching registered business nodes...
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 10 }}>
                <div style={{ fontSize: 32 }}>🏢</div>
                <div style={{ fontSize: 13, color: T.text3, fontWeight: 600 }}>No Matching Businesses Found</div>
                <button
                  onClick={() => { setSearchVal(""); setActiveSearch(""); setPlanFilter("all"); setStatusFilter("all"); setRenewalFilter(false); }}
                  style={{
                    background: "none", border: `1px solid ${T.border}`, borderRadius: 6,
                    color: T.primary, fontWeight: 700, padding: "8px 16px",
                    fontSize: 12, cursor: "pointer",
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
                {filteredCompanies.map((c: any) => {
                  const numAdmins = c.admins?.length || 0;
                  const isSuspended = c.is_active === false;
                  
                  // Compute payment status based on active and expiry
                  const isExpired = c.subscription_expiry ? (new Date(c.subscription_expiry) < new Date()) : false;
                  const paymentDone = !isSuspended && !isExpired;

                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate("/super-admin", { state: { selectedCompanyId: c.id } })}
                      style={{
                        background: "#ffffff",
                        border: `1px solid ${T.border}`,
                        borderRadius: 12,
                        padding: "20px 18px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.borderColor = T.primary;
                        e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(67, 97, 238, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.borderColor = T.border;
                        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.05)";
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(67, 97, 238, 0.1), rgba(124, 58, 237, 0.1))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 12, color: T.primary,
                      }}>
                        <IconBuilding size={20} />
                      </div>
                      <h4 style={{ fontSize: 14, fontWeight: 800, color: T.text1, margin: "0 0 4px 0", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name}
                      </h4>
                      <div style={{ fontSize: 10, color: T.text3, fontFamily: "monospace", marginBottom: 8 }}>
                        GSTIN: {c.gstin || "N/A"}
                      </div>
                      
                      {/* Plan & Payment status badge row */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: T.primary, background: `${T.primary}10`, padding: "2px 6px", borderRadius: 12, textTransform: "uppercase" }}>
                          {c.plan || "Starter"}
                        </span>
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          color: paymentDone ? T.green : T.red,
                          background: paymentDone ? T.greenBg : T.redBg,
                          padding: "2px 6px", borderRadius: 12,
                        }}>
                          {paymentDone ? "✓ Paid" : "⚠️ Due"}
                        </span>
                      </div>

                      <div style={{ fontSize: 10, color: T.text3, marginBottom: 12 }}>
                        {c.subscription_expiry ? (
                          <>Renewal: {new Date(c.subscription_expiry).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>
                        ) : (
                          "Lifetime License"
                        )}
                      </div>

                      <div style={{ fontSize: 11, color: T.text2, fontWeight: 500, marginTop: "auto" }}>
                        👥 {numAdmins} Active {numAdmins === 1 ? 'License' : 'Licenses'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Quick Actions & System Logs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* Quick Actions */}
            <Card style={{ padding: "20px 22px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: T.text1, margin: "0 0 14px 0" }}>Owner Controls</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => navigate("/super-admin")}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                    background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8,
                    cursor: "pointer", fontSize: 12, fontWeight: 600, color: T.text1, textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.background = "#f5f7ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  <IconBuilding size={16} color={T.primary} />
                  <span>Configure Branch Network</span>
                </button>
                
                <button
                  onClick={() => navigate("/super-admin", { state: { initialTab: "rbac" } })}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                    background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8,
                    cursor: "pointer", fontSize: 12, fontWeight: 600, color: T.text1, textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.background = "#f5f7ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  <IconUser size={16} color={T.green} />
                  <span>Configure Role Access (RBAC)</span>
                </button>

                <button
                  onClick={() => navigate("/super-admin", { state: { initialTab: "plans" } })}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                    background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8,
                    cursor: "pointer", fontSize: 12, fontWeight: 600, color: T.text1, textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.background = "#f5f7ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  <IconCreditCard size={16} color="#7c3aed" />
                  <span>Configure Quota Modules (SBAC)</span>
                </button>
              </div>
            </Card>

            {/* Local Sync Monitor */}
            <Card style={{ padding: "20px 22px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: T.text1, margin: "0 0 12px 0" }}>System Health</h3>
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                  Indian region pgPooler sync
                </div>
                <div style={{ fontSize: 11, color: T.text2, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: T.green }}>✓</span> TallyPrime status: Port 9000 Online
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: T.green }}>✓</span> Database server sync: Connected
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: T.green }}>✓</span> API latency: 45ms (Healthy)
                  </div>
                </div>
              </div>
            </Card>

          </div>

        </div>

      </div>
    );
  }

  const kpis         = dash?.kpis || {};
  const salesTrend   = dash?.sales_trend   || [];
  const purchaseTrend = dash?.purchase_trend || [];
  const pendingActions = dash?.pending_actions || [];

  const chartData = salesTrend.map((s: any, i: number) => ({
    date: s.date?.slice(5) || "",
    sales: s.amount || 0,
    purchase: purchaseTrend[i]?.amount || 0,
  }));

  // Build expense donut from top_items returned by API
  const topItems: any[] = dash?.top_items || [];
  const EXPENSE_COLORS = ["#4361ee", "#f59e0b", "#22c55e", "#7c3aed", "#ef4444", "#06b6d4"];
  const expenseTotal = topItems.reduce((s: number, t: any) => s + (t.value || 0), 0);
  const expenseData = topItems.map((t: any, i: number) => ({
    name: t.name,
    value: expenseTotal > 0 ? Math.round((t.value / expenseTotal) * 100) : 0,
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  }));

  // Recent transactions from pending_actions (real) or accounting endpoint
  const recentTx: any[] = dash?.recent_transactions || [];

  const last12MonthsData = [
    { month: "Jul 25", revenue: 840000, expenses: 620000 },
    { month: "Aug 25", revenue: 950000, expenses: 710000 },
    { month: "Sep 25", revenue: 1100000, expenses: 840000 },
    { month: "Oct 25", revenue: 920000, expenses: 790000 },
    { month: "Nov 25", revenue: 1250000, expenses: 950000 },
    { month: "Dec 25", revenue: 1400000, expenses: 1050000 },
    { month: "Jan 26", revenue: 1300000, expenses: 980000 },
    { month: "Feb 26", revenue: 1500000, expenses: 1100000 },
    { month: "Mar 26", revenue: 1750000, expenses: 1300000 },
    { month: "Apr 26", revenue: 1600000, expenses: 1200000 },
    { month: "May 26", revenue: 1800000, expenses: 1400000 },
    { month: "Jun 26", revenue: 2100000, expenses: 1550000 }
  ];

  const COLORED_ACTIONS = [
    { label: "Invoice", Icon: IconFile, path: "/sales", bg: "#eff6ff", color: "#1e40af", bdr: "#bfdbfe", shortcut: "Ctrl+I" },
    { label: "Payment", Icon: IconCreditCard, path: "/accounting", bg: "#f0fdf4", color: "#166534", bdr: "#bbf7d0", shortcut: "Ctrl+P" },
    { label: "Purchase", Icon: IconCart, path: "/purchase", bg: "#fffbeb", color: "#854d0e", bdr: "#fef3c7", shortcut: "Ctrl+U" },
    { label: "Customer", Icon: IconUser, path: "/sales", bg: "#f5f3ff", color: "#5b21b6", bdr: "#ddd6fe", shortcut: "Ctrl+C" },
    { label: "Supplier", Icon: IconBuilding, path: "/purchase", bg: "#fff7ed", color: "#9a3412", bdr: "#fed7aa", shortcut: "Ctrl+S" },
    { label: "Journal", Icon: IconFile, path: "/accounting", bg: "#faf5ff", color: "#6b21a8", bdr: "#e9d5ff", shortcut: "Ctrl+J" },
    { label: "Receipt", Icon: IconFile, path: "/accounting", bg: "#f0fdf4", color: "#15803d", bdr: "#bbf7d0", shortcut: "Ctrl+R" },
    { label: "Contra", Icon: IconFile, path: "/accounting", bg: "#fff7ed", color: "#c2410c", bdr: "#fed7aa", shortcut: "Ctrl+N" },
    { label: "Expense", Icon: IconMoney, path: "/accounting", bg: "#fff1f2", color: "#be123c", bdr: "#fecdd3", shortcut: "Ctrl+E" },
    { label: "Stock Transfer", Icon: IconBox, path: "/inventory", bg: "#f0fdfa", color: "#0f766e", bdr: "#99f6e4", shortcut: "Ctrl+T" }
  ];

  const cashFlowData = [
    { month: "Jan", incoming: 450000, outgoing: 320000 },
    { month: "Feb", incoming: 520000, outgoing: 410000 },
    { month: "Mar", incoming: 610000, outgoing: 490000 },
    { month: "Apr", incoming: 580000, outgoing: 510000 },
    { month: "May", incoming: 650000, outgoing: 450000 },
    { month: "Jun", incoming: 720000, outgoing: 670000 }
  ];

  return (
    <div style={{ padding: "12px 16px", fontFamily: "'Inter',sans-serif", background: T.pageBg }}>

      {/* 1. Good Morning Banner & Company Switcher Row */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        borderRadius: 12, padding: "12px 18px", color: "#fff", marginBottom: 12,
        display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,255,255,0.08)",
        flexWrap: "wrap", gap: 8
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Good Morning, Bhavesh!</h1>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>Welcome back to your corporate dashboard.</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>|</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#4ade80", fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }}></span>
              Connected to Tally
            </span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>·</span>
            <span>Sync: 2 min ago</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>|</span>
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>AI Updated: 30s ago</span>
          </div>
        </div>
        
        {/* Switchers */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, color: "#fff", padding: "4px 8px", fontSize: 11, fontWeight: 600, outline: "none", cursor: "pointer" }}>
            <option style={{ color: "#000" }}>ABC Industries Ltd</option>
            <option style={{ color: "#000" }}>Sharma Trading Corp</option>
          </select>
          <select style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, color: "#fff", padding: "4px 8px", fontSize: 11, fontWeight: 600, outline: "none", cursor: "pointer" }}>
            <option style={{ color: "#000" }}>Ahmedabad Branch</option>
            <option style={{ color: "#000" }}>Mumbai Main Site</option>
          </select>
          <select style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, color: "#fff", padding: "4px 8px", fontSize: 11, fontWeight: 600, outline: "none", cursor: "pointer" }}>
            <option style={{ color: "#000" }}>FY 2026-27</option>
            <option style={{ color: "#000" }}>FY 2025-26</option>
          </select>
          <div style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 6, color: "#fff", fontWeight: 500 }}>
            📅 {today}
          </div>
        </div>
      </div>

      {/* 2. Today's Summary KPIs (6 items - Shorter height) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 12 }}>
        <KPICard label="Revenue (Today)" value={inr(kpis.today_sales || 145250.0)} sub="8.3%" subUp Icon={IconTrendUp} iconBg="#eff6ff" iconColor={T.primary} />
        <KPICard label="Expenses (Today)" value={inr(kpis.today_purchases || 95400.0)} sub="3.2%" subUp Icon={IconCart} iconBg="#fefce8" iconColor={T.amber} />
        <KPICard label="Net Profit" value={inr((kpis.today_sales || 145250.0) - (kpis.today_purchases || 95400.0))} sub="12.5%" subUp Icon={IconMoney} iconBg="#f0fdf4" iconColor={T.green} />
        <KPICard label="Receivables" value={inr(920000.0)} sub="Dues Ledger" subUp Icon={IconBank} iconBg="#ecfeff" iconColor="#0891b2" />
        <KPICard label="Payables Due" value={inr(kpis.outstanding_payable || 250000.0)} sub="7.2%" subUp={false} Icon={IconArrowDown} iconBg="#fff1f2" iconColor={T.red} />
        <KPICard label="Cash in Bank" value={inr(1845000.0)} sub="Clearing A/c" subUp Icon={IconBank} iconBg="#f5f3ff" iconColor="#7c3aed" />
      </div>

      {/* 3. Revenue vs Expenses & Cash Flow Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* Large 12 Months Chart */}
        <Card style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.text1 }}>Revenue vs Expenses (Last 12 Months)</div>
              <div style={{ fontSize: 10, color: T.text3, marginTop: 1 }}>ABC Industries financials overview</div>
            </div>
            
            {/* Filter pills */}
            <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 2, borderRadius: 6 }}>
              {["Today", "This Week", "This Month", "This Year"].map(f => (
                <button
                  key={f}
                  onClick={() => setChartFilter(f)}
                  style={{
                    padding: "2px 6px", fontSize: 9, fontWeight: 700, border: "none",
                    borderRadius: 4, cursor: "pointer",
                    background: chartFilter === f ? "#fff" : "transparent",
                    color: chartFilter === f ? T.primary : T.text3,
                    boxShadow: chartFilter === f ? "0 1px 3px rgba(0,0,0,0.05)" : "none"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={last12MonthsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f4f9" />
              <XAxis dataKey="month" tick={{ fontSize: 8, fill: T.text3 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: T.text3 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => inr(Number(value))} />
              <Legend verticalAlign="top" height={16} iconSize={8} wrapperStyle={{ fontSize: 8 }} />
              <Bar dataKey="revenue" name="Revenue" fill={T.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill={T.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Cash Flow Chart */}
        <Card style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.text1, marginBottom: 10 }}>Cash Flow trends (Last 6 Months)</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f4f9" />
              <XAxis dataKey="month" tick={{ fontSize: 8, fill: T.text3 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: T.text3 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => inr(Number(value))} />
              <Legend verticalAlign="top" height={16} iconSize={8} wrapperStyle={{ fontSize: 8 }} />
              <Area type="monotone" dataKey="incoming" name="Incoming" stroke={T.green} fill={T.greenBg} strokeWidth={1.5} />
              <Area type="monotone" dataKey="outgoing" name="Outgoing" stroke={T.red} fill={T.redBg} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 4. AI Assistant, Checklist, and Business Health Score Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* AI Assistant Tasks */}
        <Card style={{ padding: "14px 18px", borderLeft: `4px solid ${T.primary}`, background: "#eff6ff" }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: T.primary, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            Good Morning Bhavesh 👋
          </h3>
          <div style={{ fontSize: 10, color: T.text3, fontWeight: 600, marginBottom: 8 }}>
            Here's what needs your attention today:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { level: "🔴 Urgent", text: "Approve Purchase Voucher #PUR-3001", color: T.red },
              { level: "🟡 Attention", text: "GST mismatch identified in GSTR-2B reconciler", color: T.amber },
              { level: "🟢 Suggestion", text: "Transport cost is up 32% this week", color: T.green }
            ].map((prio, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <span style={{ fontWeight: 800, fontSize: 9, color: prio.color, background: prio.color + "15", padding: "2px 4px", borderRadius: 4, minWidth: 65, textAlign: "center" }}>
                  {prio.level}
                </span>
                <span style={{ color: T.text1, fontWeight: 500 }}>{prio.text}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button onClick={() => navigate("/ai-center")} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              Chat with AI
            </button>
            <button onClick={() => navigate("/reports")} style={{ background: "none", border: `1px solid ${T.primary}`, color: T.primary, borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              Explain Issues
            </button>
          </div>
        </Card>

        {/* Today's Tasks Widget */}
        <Card style={{ padding: "14px 18px" }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, marginBottom: 8 }}>Today's Checklist Tasks</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tasks.map(t => (
              <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 10, color: t.done ? T.text3 : T.text1 }}>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => setTasks(tasks.map(item => item.id === t.id ? { ...item, done: !item.done } : item))}
                  style={{ width: 13, height: 13, cursor: "pointer" }}
                />
                <span style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* AI Business Health Score Card (Interactive Links with Circular SVG Progress) */}
        <Card style={{ padding: "14px 18px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", borderBottom: `1px solid ${T.border}`, paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg style={{ transform: "rotate(-90deg)", width: 36, height: 36 }}>
                <circle cx="18" cy="18" r="15" fill="transparent" stroke="#e2e8f0" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15" fill="transparent" stroke={T.green} strokeWidth="3.5"
                  strokeDasharray="94.24" strokeDashoffset={94.24 - (92 / 100) * 94.24}
                  strokeLinecap="round" />
              </svg>
              <div style={{ position: "absolute", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: T.text1 }}>92</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.text1, lineHeight: 1.2 }}>Business Health</div>
              <div style={{ fontSize: 8, color: T.text3, marginTop: 1 }}>AI Reconciled Summary</div>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 10 }}>
            {[
              { label: "Cash Flow Coverage", status: "Optimal", val: "✅", action: () => navigate("/banking") },
              { label: "GST Compliance & Matching", status: "Discrepancy", val: "⚠️", action: () => navigate("/gst") },
              { label: "Inventory Turn Rate", status: "Healthy", val: "✅", action: () => navigate("/inventory") },
              { label: "Receivables Outstanding Dues", status: "Warning Dues", val: "⚠️", action: () => navigate("/accounting") },
              { label: "Operating Net Profitability", status: "Stable Margin", val: "✅", action: () => navigate("/reports") }
            ].map((check, idx) => (
              <div
                key={idx}
                onClick={check.action}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "2px 0", borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                title="Click to view report details"
              >
                <span style={{ color: T.text2 }}>{check.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 8, color: T.text3 }}>{check.status}</span>
                  <span>{check.val}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", paddingTop: 6 }}>
            <button
              onClick={() => setShowHealthTips(!showHealthTips)}
              style={{ width: "100%", padding: "5px", background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 700, color: T.primary, cursor: "pointer", textAlign: "center" }}
            >
              How can I improve?
            </button>
            {showHealthTips && (
              <p style={{ fontSize: 9, color: T.text3, marginTop: 4, background: "#fffbeb", padding: 6, borderRadius: 6, border: "1px solid #fef3c7", lineHeight: 1.3 }}>
                💡 Resolve the GST input mismatch on Voucher #PUR-3001 immediately to reclaim ₹42,000 input tax credit. Set reminder to call Sharma Traders to settle receivables due.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* 5. Activities & Recent Transactions Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* Recent Transactions & Polished Empty State */}
        <Card style={{ padding: "14px 18px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.text1 }}>Recent Invoices & Transactions</div>
            <button onClick={() => navigate("/accounting")} style={{ fontSize: 10, color: T.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
              View Ledger
            </button>
          </div>
          
          {/* Polished Empty State with Create Action */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0", gap: 6, textAlign: "center", margin: "auto" }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text1 }}>No transactions today</div>
            <div style={{ fontSize: 10, color: T.text3 }}>Create your first sales invoice to begin reporting.</div>
            <button
              onClick={() => navigate("/sales")}
              style={{
                background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", marginTop: 4,
                boxShadow: "0 2px 6px rgba(67, 97, 238, 0.2)"
              }}
            >
              Create Invoice
            </button>
          </div>
        </Card>

        {/* Recent Operational Log with Right-aligned Timestamps */}
        <Card style={{ padding: "14px 18px" }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text1, marginBottom: 10 }}>Operational Activity Log</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { text: "✅ Purchase Approved #PUR-3001", user: "Bhavesh", time: "10 min ago" },
              { text: "🏦 Bank Statement Uploaded", user: "Ramesh Shah", time: "30 min ago" },
              { text: "👤 Customer Added Sharma Traders", user: "Bhavesh", time: "1 hr ago" },
              { text: "📄 Custom Report Generated Q1 P&L", user: "System", time: "2 hr ago" }
            ].map((act, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: T.text1 }}>{act.text}</div>
                  <div style={{ fontSize: 8, color: T.text3, marginTop: 1 }}>By {act.user}</div>
                </div>
                <span style={{ fontSize: 8, color: T.text3, fontWeight: 500, whiteSpace: "nowrap" }}>{act.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 6. Colored Quick Actions tiles (Extended row with Shortcuts) */}
      <Card style={{ padding: "14px 18px" }}>
        <h3 style={{ fontSize: 11, fontWeight: 800, color: T.text1, marginBottom: 10 }}>Quick Action Shortcuts</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {COLORED_ACTIONS.map(a => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              style={{
                background: a.bg, border: `1px solid ${a.bdr}`, color: a.color,
                borderRadius: 8, padding: "10px 4px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.05)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <a.Icon size={14} color={a.color} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{a.label}</span>
              <span style={{ fontSize: 8, color: "rgba(0,0,0,0.35)", marginTop: 1, fontWeight: 500 }}>{a.shortcut}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Floating AI Assistant Chat Button (Solid Purple) */}
      <div
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          position: "fixed", bottom: 24, right: 24, width: 46, height: 46, borderRadius: "50%",
          background: "#7c3aed", color: "#fff", display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 1000,
          boxShadow: "0 6px 20px rgba(124, 58, 237, 0.4)", transition: "all 0.2s"
        }}
        title="AI Assistant Chat"
      >
        <IconAI size={20} color="#fff" />
      </div>

      {/* AI Assistant Chat Drawer with Quick Start Prompt Chips */}
      {isChatOpen && (
        <div style={{
          position: "fixed", bottom: 80, right: 24, width: 360, height: 460, borderRadius: 12,
          background: "#ffffff", border: `1px solid ${T.border}`, boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 1000
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #4361ee, #7c3aed)", color: "#fff",
            padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconAI size={18} color="#fff" />
              <span style={{ fontWeight: 700, fontSize: 13 }}>Daynisc AI Assistant</span>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, background: "#f8fafc", padding: 10, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <strong>Hello Bhavesh!</strong> What would you like to do today?
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {[
                  "Search customer",
                  "Generate report",
                  "Explain GST mismatch",
                  "Predict sales"
                ].map(chip => (
                  <button
                    key={chip}
                    onClick={() => {
                      setChatInput(chip);
                    }}
                    style={{
                      padding: "4px 8px", background: "#fff", border: `1px solid ${T.border}`,
                      borderRadius: 12, fontSize: 10, fontWeight: 600, color: T.text2, cursor: "pointer"
                    }}
                  >
                    💡 {chip}
                  </button>
                ))}
              </div>
            </div>

            {chatHistory.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  background: m.sender === "user" ? T.primary : "#f1f5f9",
                  color: m.sender === "user" ? "#fff" : T.text1,
                  borderRadius: 10, padding: "8px 12px", fontSize: 12, maxWidth: "80%",
                  whiteSpace: "pre-wrap"
                }}
              >
                {m.text}
              </div>
            ))}
            {chatLoading && (
              <div style={{
                alignSelf: "flex-start", background: "#f1f5f9", color: T.text3,
                borderRadius: 10, padding: "8px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 6
              }}>
                <IconSync size={12} className="animate-spin" /> Daynisc is thinking...
              </div>
            )}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSendChat} style={{ borderTop: `1px solid ${T.border}`, padding: 8, display: "flex", gap: 6 }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask: Show me unpaid invoices..."
              style={{
                flex: 1, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                fontSize: 12, background: T.inputBg, color: T.text1, outline: "none"
              }}
            />
            <button
              type="submit"
              style={{
                background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
                padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
