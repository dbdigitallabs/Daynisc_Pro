// src/pages/TransportPage.tsx
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import { IconTruck, IconMapPin, IconCheckCircle } from "../components/Icons";

const STATUS_C: Record<string, { color: string; bg: string }> = {
  planned:   { color: T.amber,   bg: T.amberBg  },
  in_transit:{ color: T.primary, bg: "#eff6ff"  },
  delivered: { color: T.green,   bg: T.greenBg  },
  cancelled: { color: T.red,     bg: T.redBg    },
};

export default function TransportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["transport"],
    queryFn: () => api.get("/transport/trips", { params: { limit: 100 } }).then(r => r.data).catch(() => ({ items: [] })),
  });
  const trips      = data?.items || [];
  const inTransit  = trips.filter((t: any) => t.status === "in_transit").length;
  const delivered  = trips.filter((t: any) => t.status === "delivered").length;

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, marginBottom: 24, letterSpacing: "-0.4px" }}>Transport</h1>

      <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Total Trips",  value: String(trips.length), icon: <IconTruck size={22} color={T.primary} />,       color: T.primary },
          { label: "In Transit",   value: String(inTransit),    icon: <IconMapPin size={22} color={T.amber} />,        color: T.amber  },
          { label: "Delivered",    value: String(delivered),    icon: <IconCheckCircle size={22} color={T.green} />,   color: T.green  },
        ].map(k => (
          <div key={k.label} style={cardStyle({ padding: "18px 20px", flex: 1 })}>
            <div style={{ marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, marginTop: 4, textTransform: "uppercase" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={cardStyle({ overflow: "hidden" })}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading trips…</div>
        ) : trips.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: T.text3, fontSize: 13 }}>
            <div style={{ marginBottom: 12 }}><IconTruck size={40} color={T.border} /></div>No transport trips found
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Trip No.", "From", "To", "Vehicle", "Driver", "Date", "Status"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {trips.map((t: any) => {
                const sc = STATUS_C[t.status] || { color: T.text3, bg: "#f8fafc" };
                return (
                  <tr key={t.id} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{t.trip_number}</td>
                    <td style={tdStyle}>{t.origin || "—"}</td>
                    <td style={tdStyle}>{t.destination || "—"}</td>
                    <td style={tdStyle}>{t.vehicle_number || "—"}</td>
                    <td style={tdStyle}>{t.driver_name || "—"}</td>
                    <td style={tdStyle}>{t.trip_date?.slice(0, 10) || "—"}</td>
                    <td style={tdStyle}><span style={badge(sc.color, sc.bg)}>{t.status?.replace("_"," ").toUpperCase()}</span></td>
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
