// src/pages/ERPSyncPage.tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import { IconMonitor, IconSettings, IconRefresh, IconPlug, IconZap, IconCheckCircle, IconXCircle, IconClock, IconSync, IconLink } from "../components/Icons";

interface SyncVoucher {
  id: string; voucher_number: string; voucher_type: string;
  voucher_date: string; party_name: string;
  total: number; tally_synced: boolean; tally_error?: string | null;
}

function SyncBadge({ synced, error }: { synced: boolean; error?: string | null }) {
  if (synced) return <span style={badge(T.green, T.greenBg)}>✓ Synced</span>;
  if (error)  return <span style={badge(T.red, T.redBg)}>✗ Error</span>;
  return <span style={badge(T.amber, T.amberBg)}>⏳ Pending</span>;
}

const VTYPE_C: Record<string, { color: string; bg: string }> = {
  purchase: { color: T.amber,   bg: T.amberBg },
  sales:    { color: T.primary, bg: "#eff6ff" },
  payment:  { color: T.red,     bg: T.redBg   },
  receipt:  { color: T.green,   bg: T.greenBg },
};

export default function ERPSyncPage() {
  const qc = useQueryClient();
  const [syncingId, setSyncingId]             = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing]         = useState(false);
  const [connStatus, setConnStatus]           = useState<{ connected: boolean; error?: string } | null>(null);
  const [testingConn, setTestingConn]         = useState(false);
  const [activeTab, setActiveTab]             = useState<"pending" | "history">("pending");
  const [bulkResult, setBulkResult]           = useState<{ synced: number; failed: number } | null>(null);

  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ["tally-pending"],
    queryFn: () => api.get("/accounting/vouchers", { params: { tally_synced: false, limit: 100 } })
      .then(r => r.data).catch(() => ({ items: [] })),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["tally-history"],
    queryFn: () => api.get("/accounting/vouchers", { params: { tally_synced: true, limit: 50 } })
      .then(r => r.data).catch(() => ({ items: [] })),
    enabled: activeTab === "history",
  });

  const pendingVouchers: SyncVoucher[] = pendingData?.items || [];
  const historyVouchers: SyncVoucher[] = historyData?.items || [];
  const totalPendingValue = pendingVouchers.reduce((s, v) => s + Number(v.total || 0), 0);

  async function testConnection() {
    setTestingConn(true); setConnStatus(null);
    try {
      const res = await api.get("/erp/connection/test/tally");
      setConnStatus(res.data);
    } catch (e: any) {
      setConnStatus({ connected: false, error: e.response?.data?.detail || "Cannot reach backend" });
    } finally { setTestingConn(false); }
  }

  async function syncSingle(id: string) {
    setSyncingId(id);
    try {
      await api.post(`/erp/sync/voucher/${id}`);
      await refetchPending();
      qc.invalidateQueries({ queryKey: ["tally-history"] });
    } catch (e: any) {
      alert("Sync failed: " + (e.response?.data?.detail || e.message));
    } finally { setSyncingId(null); }
  }

  async function bulkSync() {
    setBulkSyncing(true); setBulkResult(null);
    try {
      const res = await api.post("/erp/sync/bulk");
      setBulkResult({ synced: res.data.synced, failed: res.data.failed });
      await refetchPending();
      qc.invalidateQueries({ queryKey: ["tally-history"] });
    } catch (e: any) {
      alert("Bulk sync failed: " + (e.response?.data?.detail || e.message));
    } finally { setBulkSyncing(false); }
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px", marginBottom: 3, display: "flex", alignItems: "center", gap: 10 }}>
            <IconLink size={22} color={T.primary} /> Tally Integration
          </h1>
          <p style={{ fontSize: 13, color: T.text3 }}>Push accounting vouchers to TallyPrime via XML HTTP server</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={testConnection} disabled={testingConn} style={{
            padding: "9px 18px",
            background: connStatus?.connected ? T.greenBg : "#fff",
            border: `1.5px solid ${connStatus?.connected ? T.green : T.border}`,
            borderRadius: 8, cursor: "pointer",
            color: connStatus?.connected ? T.green : T.text2,
            fontSize: 13, fontWeight: 600, transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {testingConn
              ? <><IconClock size={14} color={T.text3} /> Testing…</>
              : connStatus?.connected
              ? <><IconCheckCircle size={14} color={T.green} /> Tally Connected</>
              : <><IconPlug size={14} color={T.text3} /> Test Connection</>}
          </button>
          {pendingVouchers.length > 0 && (
            <button onClick={bulkSync} disabled={bulkSyncing} style={{
              padding: "9px 20px",
              background: bulkSyncing ? T.amberBg : T.primary,
              border: "none", borderRadius: 8,
              color: bulkSyncing ? T.amber : "#fff",
              cursor: bulkSyncing ? "default" : "pointer",
              fontSize: 13, fontWeight: 700,
              boxShadow: bulkSyncing ? "none" : "0 4px 12px rgba(67,97,238,0.3)",
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8,
            }}>
              {bulkSyncing
                ? <><IconRefresh size={14} color={T.amber} /> Syncing…</>
                : <><IconZap size={14} color="#fff" /> Sync All ({pendingVouchers.length})</>}
            </button>
          )}
        </div>
      </div>

      {/* Connection banner */}
      {connStatus && (
        <div style={{
          borderRadius: 10, padding: "12px 18px", marginBottom: 20,
          background: connStatus.connected ? T.greenBg : T.redBg,
          border: `1px solid ${connStatus.connected ? "#86efac" : "#fca5a5"}`,
          display: "flex", alignItems: "center", gap: 12, fontSize: 13,
        }}>
          <span style={{ display: "flex" }}>{connStatus.connected ? <IconCheckCircle size={20} color={T.green} /> : <IconXCircle size={20} color={T.red} />}</span>
          <span style={{ fontWeight: 600, color: connStatus.connected ? T.green : T.red }}>
            {connStatus.connected
              ? "TallyPrime is reachable and responding."
              : `Cannot connect: ${connStatus.error}`}
          </span>
          {!connStatus.connected && (
            <span style={{ color: T.text3, fontSize: 12 }}>
              → Open Tally → F12 → Advanced Config → Enable HTTP Server → Port 9000
            </span>
          )}
        </div>
      )}

      {/* Bulk result banner */}
      {bulkResult && (
        <div style={{
          borderRadius: 10, padding: "12px 18px", marginBottom: 20,
          background: bulkResult.failed > 0 ? T.amberBg : T.greenBg,
          border: `1px solid ${bulkResult.failed > 0 ? "#fcd34d" : "#86efac"}`,
          display: "flex", alignItems: "center", gap: 12, fontSize: 13,
        }}>
          <span style={{ fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 6 }}>
            <IconCheckCircle size={16} color={T.green} /> Sync complete — Synced: {bulkResult.synced}, Failed: {bulkResult.failed}
          </span>
          <button onClick={() => setBulkResult(null)} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: T.text3, cursor: "pointer", display: "flex", alignItems: "center",
          }}><IconXCircle size={16} color={T.text3} /></button>
        </div>
      )}

      {/* Setup steps */}
      <div style={{
        ...cardStyle({ padding: 20, marginBottom: 22 }),
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20,
      }}>
        {[
          { n: "1", Icon: IconMonitor,  title: "Enable Tally HTTP Server", desc: "Open TallyPrime → F12 → Advanced Config → Enable HTTP Server (Port 9000)" },
          { n: "2", Icon: IconSettings,  title: "Configure in Settings",    desc: "Go to Settings → ERP/Tally → Enter your Tally URL and Company Name" },
          { n: "3", Icon: IconRefresh,   title: "Sync Vouchers",            desc: "Click 'Test Connection' then 'Sync All' to push all pending vouchers to Tally" },
        ].map(s => (
          <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: "#eff6ff", border: `1.5px solid ${T.primary}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: T.primary,
            }}>{s.n}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text1, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                <s.Icon size={14} color={T.primary} /> {s.title}
              </div>
              <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Pending Sync",   value: String(pendingVouchers.length), color: pendingVouchers.length > 0 ? T.amber : T.green },
          { label: "Pending Value",  value: inr(totalPendingValue),          color: T.amber },
          { label: "Synced Total",   value: String(historyVouchers.length),  color: T.green },
          { label: "Sync Errors",    value: String(pendingVouchers.filter(v => v.tally_error).length), color: T.red },
        ].map(k => (
          <div key={k.label} style={cardStyle({ padding: "16px 20px" })}>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 18 }}>
        {[
          { id: "pending", label: `Pending (${pendingVouchers.length})` },
          { id: "history", label: "Sync History" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
            padding: "9px 22px", border: "none", background: "none",
            borderBottom: `2px solid ${activeTab === t.id ? T.primary : "transparent"}`,
            color: activeTab === t.id ? T.primary : T.text3,
            cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Pending table */}
      {activeTab === "pending" && (
        <div style={cardStyle({ overflow: "hidden" })}>
          {pendingLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading pending vouchers…</div>
          ) : pendingVouchers.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ marginBottom: 12 }}><IconCheckCircle size={40} color={T.green} /></div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.green, marginBottom: 6 }}>All synced!</div>
              <div style={{ fontSize: 13, color: T.text3 }}>No pending vouchers — everything is up to date in Tally</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Voucher No.", "Type", "Date", "Party", "Amount", "Status", "Action"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {pendingVouchers.map(v => {
                  const vc = VTYPE_C[v.voucher_type] || { color: T.text3, bg: "#f8fafc" };
                  return (
                    <tr key={v.id}
                      onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{v.voucher_number}</td>
                      <td style={tdStyle}><span style={badge(vc.color, vc.bg)}>{v.voucher_type?.toUpperCase()}</span></td>
                      <td style={tdStyle}>{v.voucher_date}</td>
                      <td style={{ ...tdStyle, color: T.text1 }}>{v.party_name || "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.amber }}>{inr(v.total)}</td>
                      <td style={tdStyle}><SyncBadge synced={v.tally_synced} error={v.tally_error} /></td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => syncSingle(v.id)}
                          disabled={syncingId === v.id}
                          style={{
                            padding: "5px 14px", borderRadius: 6,
                            background: syncingId === v.id ? "#f8fafc" : T.primary,
                            border: `1px solid ${syncingId === v.id ? T.border : T.primary}`,
                            color: syncingId === v.id ? T.text3 : "#fff",
                            cursor: syncingId === v.id ? "default" : "pointer",
                            fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                          }}
                        >
                          {syncingId === v.id ? "Syncing…" : "Sync"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* History table */}
      {activeTab === "history" && (
        <div style={cardStyle({ overflow: "hidden" })}>
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading history…</div>
          ) : historyVouchers.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 13 }}>No sync history yet</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Voucher No.", "Type", "Date", "Party", "Amount", "Status"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {historyVouchers.map(v => {
                  const vc = VTYPE_C[v.voucher_type] || { color: T.text3, bg: "#f8fafc" };
                  return (
                    <tr key={v.id}
                      onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{v.voucher_number}</td>
                      <td style={tdStyle}><span style={badge(vc.color, vc.bg)}>{v.voucher_type?.toUpperCase()}</span></td>
                      <td style={tdStyle}>{v.voucher_date}</td>
                      <td style={{ ...tdStyle, color: T.text1 }}>{v.party_name || "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.green }}>{inr(v.total)}</td>
                      <td style={tdStyle}><SyncBadge synced={true} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
