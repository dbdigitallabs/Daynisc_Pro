// src/pages/DashboardPage.tsx
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
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
    <Card style={{ padding: "20px 22px", flex: 1, minWidth: 160 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={iconColor} strokeWidth={1.8} />
        </div>
        {sub && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: subUp ? T.green : T.red,
            background: subUp ? T.greenBg : T.redBg,
            padding: "2px 7px", borderRadius: 20, display: "flex", alignItems: "center", gap: 2,
          }}>
            {subUp ? "+" : "-"}{sub}
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: 12, color: T.text3, marginTop: 4, fontWeight: 500 }}>{label}</div>
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

  const { data: dash } = useQuery<any>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard").then(r => r.data),
    refetchInterval: 60_000,
  });

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

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif" }}>

      {/* Page Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: T.text2, marginTop: 3 }}>
            Welcome back, <span style={{ fontWeight: 600, color: T.primary }}>{user?.name || "Admin"}</span>
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
          <button
            onClick={() => navigate("/ai-verification")}
            style={{
              background: "linear-gradient(135deg, #4361ee, #7c3aed)", border: "none",
              borderRadius: 8, padding: "8px 16px", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <IconAI size={15} color="#fff" />
            AI Scan Bill
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <KPICard label="Total Sales (Today)"    value={inr(kpis.today_sales || 0)}            sub="8.3%"  subUp Icon={IconTrendUp}  iconBg="#eff6ff" iconColor={T.primary} />
        <KPICard label="Total Purchase (Today)" value={inr(kpis.today_purchases || 0)}         sub="3.2%"  subUp Icon={IconCart}     iconBg="#fefce8" iconColor={T.amber}  />
        <KPICard label="Total Profit"           value={inr((kpis.today_sales||0)-(kpis.today_purchases||0))} sub="12.5%" subUp Icon={IconMoney}    iconBg="#f0fdf4" iconColor={T.green}  />
        <KPICard label="Receivables"            value={inr(kpis.outstanding_receivable || 0)}  sub="7.2%"  subUp={false} Icon={IconBank}  iconBg="#f5f3ff" iconColor="#7c3aed" />
        <KPICard label="Payables"               value={inr(kpis.outstanding_payable || 0)}     sub="14.1%" subUp={false} Icon={IconArrowDown} iconBg="#fff1f2" iconColor={T.red} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px 1fr", gap: 16, marginBottom: 22 }}>
        {/* Sales Overview */}
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>Sales Overview</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.text1, marginTop: 2 }}>{inr(kpis.today_sales || 0)}</div>
              {kpis.today_sales > 0 && <div style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>Live Data</div>}
            </div>
            <select style={{ fontSize: 11, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 8px", color: T.text2, background: "#f8fafc" }}>
              <option>This Month</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f4f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="sales" stroke={T.primary} fill="url(#gSales)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Expenses Donut — real top_items from API */}
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text1, marginBottom: 12 }}>Top Items</div>
          {expenseData.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 160, gap: 8 }}>
              <div style={{ fontSize: 28, opacity: 0.3 }}>📦</div>
              <div style={{ fontSize: 11, color: T.text3 }}>No stock data yet</div>
            </div>
          ) : (
            <>
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                <PieChart width={170} height={140}>
                  <Pie data={expenseData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {expenseData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.text1 }}>{inr(expenseTotal)}</div>
                  <div style={{ fontSize: 9, color: T.text3 }}>Total</div>
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                {expenseData.map((e: any) => (
                  <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: T.text2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{e.name}</span>
                    <span style={{ fontWeight: 600, color: T.text1 }}>{e.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Cash Flow */}
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>Cash Flow</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.green, marginTop: 2 }}>{inr(kpis.outstanding_payable || 0)}</div>
              {kpis.outstanding_payable > 0 && <div style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>Outstanding Payable</div>}
            </div>
            <select style={{ fontSize: 11, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 8px", color: T.text2, background: "#f8fafc" }}>
              <option>This Month</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.green} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f4f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.text3 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="purchase" stroke={T.green} fill="url(#gCash)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick Access + Recent Transactions */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text1, marginBottom: 16 }}>Quick Access</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                style={{
                  background: "#f8fafc", border: `1px solid ${T.border}`,
                  borderRadius: 10, padding: "12px 6px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = `${a.color}10`;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = a.color;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
                }}
              >
                <a.Icon size={20} color={a.color} />
                <span style={{ fontSize: 9, color: T.text2, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>{a.label}</span>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f0fdf4", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#166534", fontWeight: 500 }}>
                <IconCheckCircle size={14} color={T.green} /> Tally Connected
              </div>
              <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>Active</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fffbeb", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#92400e", fontWeight: 500 }}>
                <IconClock size={14} color={T.amber} /> Pending Review
              </div>
              <span style={{ fontSize: 11, color: T.amber, fontWeight: 700 }}>{kpis.pending_ai || 0}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#991b1b", fontWeight: 500 }}>
                <IconSync size={14} color={T.red} /> Tally Not Synced
              </div>
              <span style={{ fontSize: 11, color: T.red, fontWeight: 700 }}>{kpis.tally_unsynced || 0}</span>
            </div>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text1 }}>Recent Transactions</div>
            <button onClick={() => navigate("/accounting")} style={{ fontSize: 12, color: T.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              View All
            </button>
          </div>
          {recentTx.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {recentTx.slice(0, 5).map((t: any, i: number) => {
                const isDebit = ["purchase", "payment"].includes(t.voucher_type);
                const color = isDebit ? T.red : T.green;
                const Icon = isDebit ? IconArrowDown : IconUpload;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < recentTx.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>{t.voucher_number}</div>
                      <div style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>{t.voucher_type} · {t.party_name || "—"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color }}>
                        {isDebit ? "-" : "+"}{inr(t.total)}
                      </div>
                      <div style={{ fontSize: 10, color: T.text3, marginTop: 1 }}>
                        {new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : pendingActions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 0", gap: 8 }}>
              <div style={{ fontSize: 28, opacity: 0.3 }}>📋</div>
              <div style={{ fontSize: 12, color: T.text3 }}>No transactions yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 8 }}>
              <div style={{ fontSize: 32, opacity: 0.25 }}>🧾</div>
              <div style={{ fontSize: 12, color: T.text3, fontWeight: 500 }}>No transactions yet</div>
              <div style={{ fontSize: 11, color: T.text4 }}>Create your first sale or purchase</div>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 16 }}>
        {[
          { label: "Stock Value",     value: inr(kpis.stock_value || 0),       Icon: IconBox,     color: "#0891b2", bg: "#ecfeff" },
          { label: "Low Stock Items", value: String(kpis.low_stock_count || 0), Icon: IconWarning, color: T.amber,  bg: "#fffbeb" },
          { label: "AI Pending",      value: String(kpis.pending_ai || 0),      Icon: IconAI,      color: "#7c3aed", bg: "#f5f3ff" },
          { label: "Tally Unsynced",  value: String(kpis.tally_unsynced || 0),  Icon: IconSync,    color: T.red,    bg: "#fff1f2" },
        ].map((s, i) => (
          <Card key={i} style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, background: s.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <s.Icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: T.text3, fontWeight: 500 }}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}



