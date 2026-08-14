import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge } from "../store/theme";
import { IconSettings, IconSync } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function MarketplacePage() {
  const qc = useQueryClient();
  const [toggleId, setToggleId] = useState<string | null>(null);

  const { data: plugins = [], isLoading } = useQuery<any[]>({
    queryKey: ["marketplace-plugins"],
    queryFn: () => api.get("/marketplace/plugins").then(r => r.data),
  });

  const handleToggleInstall = (pId: string, current: boolean) => {
    setToggleId(pId);
    setTimeout(() => {
      // Simulate backend modification
      const found = plugins.find(p => p.id === pId);
      if (found) {
        found.installed = !current;
      }
      setToggleId(null);
      qc.setQueryData(["marketplace-plugins"], [...plugins]);
    }, 1000);
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          🏪 Modular Plugin Marketplace
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Install and activate pre-built integrations for shipping carriers, payment gateways, e-invoicing portals, and CRM channels.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {plugins.map((plug) => (
          <Card key={plug.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 200 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: T.text1 }}>{plug.name}</h3>
                <span style={badge(plug.price === "Free" ? T.green : T.primary, plug.price === "Free" ? T.greenBg : T.primary + "15")}>
                  {plug.price}
                </span>
              </div>
              <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.4 }}>{plug.desc}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 12 }}>
              <span style={badge(plug.installed ? T.green : T.text3, plug.installed ? T.greenBg : "#f1f5f9")}>
                {plug.installed ? "Active" : "Disabled"}
              </span>
              
              <button
                onClick={() => handleToggleInstall(plug.id, plug.installed)}
                disabled={toggleId === plug.id}
                style={{
                  background: plug.installed ? T.red + "15" : T.primary,
                  color: plug.installed ? T.red : "#fff",
                  border: "none", borderRadius: T.radiusSm, padding: "6px 12px",
                  fontSize: 11, fontWeight: 700, cursor: "pointer"
                }}
              >
                {toggleId === plug.id ? "Updating..." : plug.installed ? "Deactivate" : "Activate"}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
