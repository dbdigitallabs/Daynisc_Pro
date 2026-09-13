import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge } from "../store/theme";
import { IconSearch, IconClock } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function AuditTrailPage() {
  const [filterUser, setFilterUser] = useState("");

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["audit-logs"],
    queryFn: () => api.get("/audit/logs").then(r => r.data),
  });

  const filteredLogs = logs.filter(log =>
    log.user.toLowerCase().includes(filterUser.toLowerCase()) ||
    log.action.toLowerCase().includes(filterUser.toLowerCase())
  );

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          Enterprise Audit Trail Log
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Secure log of all edits, approvals, ledger modifications, and logins across the system.</p>
      </div>

      {/* Filter controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Filter by user name or action..."
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          style={{
            flex: 1, padding: "10px 14px", border: `1.5px solid ${T.border}`, borderRadius: 8,
            fontSize: 13, outline: "none", background: "#fff"
          }}
        />
      </div>

      {/* Logs Table */}
      <Card style={{ overflow: "hidden", padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading audit history…</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>No audit logs found matching criteria.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                {["Timestamp", "User", "Action Executed", "Old Value", "New Value", "IP / Client Info"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: T.text3, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: T.text3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <IconClock size={12} color={T.text3} /> {log.timestamp}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: T.text1 }}>{log.user}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: T.primary, fontWeight: 600 }}>{log.action}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: T.red, fontFamily: "monospace" }}>{log.old_value || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: T.green, fontFamily: "monospace" }}>{log.new_value || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: T.text3 }}>
                    <div>{log.ip}</div>
                    <div style={{ fontSize: 9, color: T.text4, marginTop: 2 }}>{log.browser}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
