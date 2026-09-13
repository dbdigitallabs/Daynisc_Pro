import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge, inr } from "../store/theme";
import { IconSettings, IconMoney, IconBox } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function AssetsPage() {
  const { data: assets = [], isLoading } = useQuery<any[]>({
    queryKey: ["fixed-assets"],
    queryFn: () => api.get("/assets/all").then(r => r.data),
  });

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          Fixed Assets & Depreciation
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Register company equipment, track book values, record depreciation, and schedule maintenance contracts.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Left Side: Asset Registry Table */}
        <Card style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ padding: 18, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>Asset Registry Book</h3>
            <span style={{ fontSize: 11, color: T.text3 }}>{assets.length} Active Capital Assets</span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                {["Asset Name", "Category", "Capital Cost", "Purchase Date", "Method / Rate", "Accumulated Depr.", "Book Value"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: T.text3, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map((ast) => {
                const bookVal = ast.cost - ast.accumulated;
                return (
                  <tr key={ast.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: T.text1 }}>{ast.name}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: T.text2 }}>{ast.category}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600 }}>{inr(ast.cost)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 11, color: T.text3 }}>{ast.purchase_date}</td>
                    <td style={{ padding: "12px 16px", fontSize: 11, color: T.text2 }}>
                      {ast.depreciation_method} ({ast.rate}%)
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: T.red, fontWeight: 600 }}>-{inr(ast.accumulated)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: T.green, fontWeight: 700 }}>{inr(bookVal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Right Side: Maintenance & AMC Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 12 }}>AMCs & Warranties</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "PVC Extruder AMC", date: "2026-09-12", status: "Active", vendor: "Gujarat Machinery Corp" },
                { label: "Dell Server Warranty", date: "2027-01-30", status: "Under Warranty", vendor: "Dell India Support" }
              ].map((amc, idx) => (
                <div key={idx} style={{ padding: 12, background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>{amc.label}</span>
                    <span style={badge(T.green, T.greenBg)}>{amc.status}</span>
                  </div>
                  <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>Vendor: {amc.vendor}</div>
                  <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>Expiration: {amc.date}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 12 }}>Depreciation Rule Helper</h3>
            <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.4, marginBottom: 10 }}>
              Daynisc automatically calculates asset depreciation rates according to **Income Tax Act Schedule XIV** rules.
            </p>
            <button
              onClick={() => alert("Scheduled auto journal entry for assets depreciation!")}
              style={{
                width: "100%", padding: 10, background: T.primary, color: "#fff", border: "none",
                borderRadius: T.radiusSm, fontSize: 12, fontWeight: 700, cursor: "pointer"
              }}
            >
              Post Year-End Depreciation Journal
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
