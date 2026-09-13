import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge } from "../store/theme";
import { IconCalendar, IconClock } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function CalendarPage() {
  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["calendar-events"],
    queryFn: () => api.get("/calendar/events").then(r => r.data),
  });

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          Central ERP Calendar
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>One unified calendar combining GST due dates, vendor pay warnings, production tasks, and user approvals.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: 20 }}>
        {/* Left Side: Events List Registry */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Schedule Log</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {events.map((e) => {
              const colorsMap: Record<string, string> = {
                "GST Due": T.red,
                "Payment Due": T.amber,
                "Production": T.primary,
                "Meetings": T.green
              };
              const col = colorsMap[e.type] || T.text2;

              return (
                <div key={e.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 18px", border: `1px solid ${T.border}`, borderRadius: 10,
                  background: "#f8fafc"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{e.title}</div>
                      <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>{e.type} Schedule</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>{e.date}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right Side: Quick Add / Reminders Summary */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 12 }}>Calendar Settings</h3>
          <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.4, marginBottom: 14 }}>
            Sync these calendar events to your Outlook, Google Calendar, or Apple Calendar using your direct iCal URL feed.
          </p>
          <input
            type="text"
            readOnly
            value="https://api.daynisc.ai/v1/feed/ical/hash_9831"
            style={{ width: "100%", padding: 8, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, background: "#f1f5f9", outline: "none", fontFamily: "monospace" }}
          />
          <button
            onClick={() => alert("Copied iCal link to clipboard!")}
            style={{
              width: "100%", padding: "10px", background: T.primary, color: "#fff", border: "none",
              borderRadius: T.radiusSm, fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 10
            }}
          >
            Copy Calendar Feed URL
          </button>
        </Card>
      </div>
    </div>
  );
}
