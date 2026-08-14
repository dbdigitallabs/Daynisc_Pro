import { useState } from "react";
import { T, cardStyle, badge } from "../store/theme";
import { IconDownload, IconBarChart, IconAI } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function ReportsPage() {
  const [activeReportTab, setActiveReportTab] = useState("builder");
  const [customWidgets, setCustomWidgets] = useState<string[]>([
    "Sales Revenue Widget", "GST Liability Widget"
  ]);

  const handleAddWidget = (widgetName: string) => {
    if (customWidgets.includes(widgetName)) return;
    setCustomWidgets([...customWidgets, widgetName]);
  };

  const handleRemoveWidget = (widgetName: string) => {
    setCustomWidgets(customWidgets.filter(w => w !== widgetName));
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
            📈 Reports & Custom Dashboard Builder
          </h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Compile core registers (financial statement, sales/purchase books) or build custom dashboard widgets.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
        {[
          { id: "builder", label: "Dashboard Widget Builder" },
          { id: "financial", label: "Financial Reports" },
          { id: "sales", label: "Sales & Purchases" },
          { id: "gst", label: "GST Summary Reports" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveReportTab(t.id)}
            style={{
              padding: "10px 18px", border: "none", background: "none",
              color: activeReportTab === t.id ? T.primary : T.text3,
              fontWeight: activeReportTab === t.id ? 700 : 500, fontSize: 12,
              borderBottom: activeReportTab === t.id ? `2px solid ${T.primary}` : "none",
              cursor: "pointer"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Dashboard Widget Builder */}
      {activeReportTab === "builder" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2.8fr", gap: 20 }}>
          {/* Controls */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 12 }}>Available Widgets</h3>
            <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.4, marginBottom: 14 }}>
              Click any reporting metric to append it directly to your custom executive dashboard.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Sales Revenue Widget",
                "GST Liability Widget",
                "Cash Flow Projection Widget",
                "Warehouse Stock Level Widget",
                "AI Anomalies Widget"
              ].map(w => (
                <button
                  key={w}
                  onClick={() => handleAddWidget(w)}
                  style={{
                    padding: "8px 12px", background: "#f8fafc", border: `1px solid ${T.border}`,
                    borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    textAlign: "left", color: T.text1
                  }}
                >
                  + Add {w.replace(" Widget", "")}
                </button>
              ))}
            </div>
          </Card>

          {/* Visual Dashboard Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {customWidgets.map(widget => (
              <Card key={widget} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 160, borderLeft: `4px solid ${T.primary}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: T.text1 }}>{widget}</span>
                  <button
                    onClick={() => handleRemoveWidget(widget)}
                    style={{ background: "none", border: "none", color: T.red, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>

                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <IconBarChart size={24} color={T.primary} />
                  <div style={{ fontSize: 10, color: T.text3, marginTop: 6 }}>Dashboard rendering data source live...</div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => alert("Downloading CSV of " + widget)}
                    style={{ background: "none", border: "none", color: T.primary, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    Export CSV
                  </button>
                </div>
              </Card>
            ))}

            {customWidgets.length === 0 && (
              <div style={{ gridColumn: "span 2", padding: 40, textAlign: "center", color: T.text3, fontSize: 12 }}>
                Your custom reporting dashboard is empty. Select widgets from the left panel.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other report types */}
      {activeReportTab !== "builder" && (
        <Card style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 12 }}>
          Standard registry report tabular logs are available for Excel download.
        </Card>
      )}
    </div>
  );
}
