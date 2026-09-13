import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../store/apiClient";
import { T, cardStyle, badge, inr } from "../store/theme";
import { IconAI, IconSync, IconMoney, IconBox, IconScale, IconClock, IconLightbulb, IconZap } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function AICopilotPage() {
  const navigate = useNavigate();
  const [runningActionId, setRunningActionId] = useState<string | null>(null);

  const { data: copilot, isLoading } = useQuery<any>({
    queryKey: ["copilot-brief"],
    queryFn: () => api.get("/copilot/brief").then(r => r.data),
  });

  const handleRunAction = (action: any) => {
    setRunningActionId(action.id);
    setTimeout(() => {
      setRunningActionId(null);
      navigate(action.target);
    }, 1200);
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 13 }}>Consulting AI Copilot…</div>;
  }

  const { greeting, brief, recommended_actions = [], forecasts = {}, insights = [] } = copilot || {};

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          <IconAI size={22} color={T.primary} /> AI Accounting Copilot & Forecasting
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>AI accountant assistant giving daily briefs, action recommendations, and cash flow projections.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        {/* Left Side: Daily Brief & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Greeting Box */}
          <Card style={{
            background: "linear-gradient(135deg, #4361ee 0%, #7c3aed 100%)",
            color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 20, padding: 24
          }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
              
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{greeting}, Bhavesh!</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{brief}</p>
            </div>
          </Card>

          {/* Recommended Actions */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Recommended Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recommended_actions.map((act: any) => (
                <div key={act.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 10
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <IconLightbulb size={18} color={T.amber} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>{act.action}</div>
                      <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>Triggering this creates automated entries instantly</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRunAction(act)}
                    disabled={runningActionId !== null}
                    style={{
                      background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
                      padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
                    }}
                  >
                    {runningActionId === act.id ? "Executing..." : "Run Action"}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Insights Panel */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>AI Financial Insights</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {insights.map((ins: string, idx: number) => (
                <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "#eff6ff", borderRadius: 8 }}>
                  <IconZap size={14} color={T.primary} />
                  <p style={{ fontSize: 12, color: T.primary, fontWeight: 600, lineHeight: 1.4 }}>{ins}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Side: AI Forecasting */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Cash Flow Forecast */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <IconMoney size={16} color={T.green} /> AI Cash Flow Projection
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {forecasts.cash_flow?.map((c: any, idx: number) => (
                <div key={idx} style={{ borderBottom: idx < forecasts.cash_flow.length - 1 ? `1px solid ${T.border}` : "none", paddingBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                    <span>{c.month}</span>
                    <span style={{ color: T.green }}>+{inr(c.net)} Net</span>
                  </div>
                  {/* Progress bar comparison */}
                  <div style={{ display: "flex", gap: 4, height: 6, borderRadius: 3, overflow: "hidden", background: "#f1f5f9" }}>
                    <div style={{ width: `${(c.inflow / (c.inflow + c.outflow)) * 100}%`, background: T.green }} />
                    <div style={{ width: `${(c.outflow / (c.inflow + c.outflow)) * 100}%`, background: T.red }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.text3, marginTop: 4 }}>
                    <span>Inflow: {inr(c.inflow)}</span>
                    <span>Outflow: {inr(c.outflow)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Inventory Demand Forecast */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <IconBox size={16} color={T.amber} /> Inventory Demand Forecast
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {forecasts.sales_demand?.map((item: any, idx: number) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fffbeb", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>{item.item}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.amber }}>{item.predicted_qty} {item.unit}</div>
                    <div style={{ fontSize: 9, color: T.text3 }}>Est. Requirement Next Week</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* GST Liability Forecast */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <IconScale size={16} color={T.primary} /> Est. GST Liability Forecast
            </h3>
            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text2, marginBottom: 6 }}>
                <span>Month</span>
                <span style={{ fontWeight: 700 }}>{forecasts.gst_liability?.month}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text3, marginBottom: 6 }}>
                <span>Output Tax Payable</span>
                <span>{inr(forecasts.gst_liability?.payable)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.green, marginBottom: 10 }}>
                <span>Input Tax Credit (ITC)</span>
                <span>-{inr(forecasts.gst_liability?.itc_available)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: T.red, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                <span>Net Payable Cash</span>
                <span>{inr(forecasts.gst_liability?.net_payable)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
