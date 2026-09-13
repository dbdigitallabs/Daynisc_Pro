// src/pages/ERPSyncPage.tsx
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import {
  IconRefresh,
  IconPlug,
  IconZap,
  IconCheckCircle,
  IconXCircle,
  IconClock,
  IconLink,
  IconUpload,
} from "../components/Icons";

interface SyncVoucher {
  id: string;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name: string;
  total: number;
  tally_synced: boolean;
  tally_error?: string | null;
  narration?: string;
}

function SyncBadge({ synced, error }: { synced: boolean; error?: string | null }) {
  if (synced) return <span style={{ ...badge(T.green, T.greenBg), display: "inline-flex", alignItems: "center", gap: 3 }}><IconCheck size={11} /> Synced</span>;
  if (error)
    return (
      <span
        style={badge(T.red, T.redBg)}
        title={error}
      >
        Error
      </span>
    );
  return <span style={{ ...badge(T.amber, T.amberBg), display: "inline-flex", alignItems: "center", gap: 3 }}><IconClock size={11} /> Pending</span>;
}

const VTYPE_C: Record<string, { color: string; bg: string }> = {
  purchase: { color: T.amber, bg: T.amberBg },
  sales: { color: T.primary, bg: "#eff6ff" },
  payment: { color: T.red, bg: T.redBg },
  receipt: { color: T.green, bg: T.greenBg },
  journal: { color: "#6b7280", bg: "#f3f4f6" },
};

export default function ERPSyncPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [connStatus, setConnStatus] = useState<{ connected: boolean; message?: string; error?: string } | null>(null);
  const [testingConn, setTestingConn] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [bulkResult, setBulkResult] = useState<{ synced: number; failed: number } | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Tally Config
  const [tallyUrl, setTallyUrl] = useState("http://localhost:9000");
  const [tallyCompany, setTallyCompany] = useState("DB Digital Labs");
  const [savingSettings, setSavingSettings] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ["tally-pending"],
    queryFn: () =>
      api
        .get("/accounting/vouchers", { params: { tally_synced: false, limit: 200 } })
        .then((r) => r.data)
        .catch(() => ({ items: [] })),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["tally-history"],
    queryFn: () =>
      api
        .get("/accounting/vouchers", { params: { tally_synced: true, limit: 100 } })
        .then((r) => r.data)
        .catch(() => ({ items: [] })),
    enabled: activeTab === "history",
  });

  const rawPending: SyncVoucher[] = pendingData?.items || [];
  const rawHistory: SyncVoucher[] = historyData?.items || [];

  // Filtered pending vouchers
  const pendingVouchers = rawPending.filter((v) => {
    const matchesSearch =
      (v.voucher_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.party_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || v.voucher_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalPendingValue = rawPending.reduce((s, v) => s + Number(v.total || 0), 0);

  async function testConnection() {
    setTestingConn(true);
    try {
      const res = await api.get("/erp/connection/test/tally");
      setConnStatus(res.data);
      if (res.data.connected) {
        toast.success(`Connected to TallyPrime (Company: ${res.data.company_name || tallyCompany})`);
      } else if (res.data.tally_online && !res.data.company_open) {
        toast.error("TallyPrime is online, but NO Company is open. Please open your company in TallyPrime.", { duration: 6000 });
      } else {
        toast.error("TallyPrime is offline. Check Port 9000.");
      }
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.message || "Cannot reach backend";
      setConnStatus({ connected: false, error: msg });
      toast.error(`Connection failed: ${msg}`);
    } finally {
      setTestingConn(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      await api.patch("/settings/company", { tally_url: tallyUrl, tally_company: tallyCompany });
      toast.success("Tally settings saved!");
      await testConnection();
      setShowConfig(false);
    } catch (e: any) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  useEffect(() => {
    api
      .get("/settings/company")
      .then((res) => {
        if (res.data?.tally_url) setTallyUrl(res.data.tally_url);
        if (res.data?.tally_company) setTallyCompany(res.data.tally_company);
      })
      .catch(() => {});
    testConnection();
  }, []);

  async function syncSingle(id: string, voucherNum: string) {
    setSyncingId(id);
    try {
      await api.post(`/erp/sync/voucher/${id}`);
      toast.success(`Voucher ${voucherNum} synced to TallyPrime!`);
      await refetchPending();
      qc.invalidateQueries({ queryKey: ["tally-history"] });
    } catch (e: any) {
      const errMsg = e.response?.data?.detail || e.message || "Sync failed";
      toast.error(`Sync error: ${errMsg}`);
      await refetchPending();
    } finally {
      setSyncingId(null);
    }
  }

  async function bulkSync() {
    setBulkSyncing(true);
    setBulkResult(null);
    try {
      const res = await api.post("/erp/sync/bulk");
      setBulkResult({ synced: res.data.synced, failed: res.data.failed });
      if (res.data.synced > 0) {
        toast.success(`Synced ${res.data.synced} vouchers to TallyPrime!`);
      }
      if (res.data.failed > 0) {
        toast.error(`${res.data.failed} vouchers failed to sync.`);
      }
      await refetchPending();
      qc.invalidateQueries({ queryKey: ["tally-history"] });
    } catch (e: any) {
      const errMsg = e.response?.data?.detail || e.message || "Bulk sync failed";
      toast.error(`Bulk sync failed: ${errMsg}`);
      await refetchPending();
    } finally {
      setBulkSyncing(false);
    }
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: T.text1,
              letterSpacing: "-0.4px",
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <IconLink size={24} color={T.primary} /> Tally Prime Sync
          </h1>
          <p style={{ fontSize: 13, color: T.text3 }}>
            Synchronize verified accounting entries into TallyPrime via its built-in XML HTTP server
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              padding: "9px 14px",
              background: "#fff",
              border: `1.5px solid ${T.border}`,
              borderRadius: 8,
              cursor: "pointer",
              color: T.text2,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Settings
          </button>
          <button
            onClick={testConnection}
            disabled={testingConn}
            style={{
              padding: "9px 16px",
              background: connStatus?.connected
                ? T.greenBg
                : connStatus?.tally_online && !connStatus?.company_open
                ? "#fef3c7"
                : connStatus && !connStatus.connected
                ? T.redBg
                : "#fff",
              border: `1.5px solid ${
                connStatus?.connected
                  ? T.green
                  : connStatus?.tally_online && !connStatus?.company_open
                  ? "#f59e0b"
                  : connStatus && !connStatus.connected
                  ? "#f87171"
                  : T.border
              }`,
              borderRadius: 8,
              cursor: "pointer",
              color: connStatus?.connected
                ? T.green
                : connStatus?.tally_online && !connStatus?.company_open
                ? "#b45309"
                : connStatus && !connStatus.connected
                ? T.red
                : T.text2,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {testingConn ? (
              <>
                <IconClock size={14} color={T.text3} /> Testing…
              </>
            ) : connStatus?.connected ? (
              <>
                <IconCheckCircle size={14} color={T.green} /> Tally: {connStatus.company_name || "Connected"}
              </>
            ) : connStatus?.tally_online && !connStatus?.company_open ? (
              <>
                <IconClock size={14} color="#b45309" /> Open Company in Tally
              </>
            ) : (
              <>
                <IconPlug size={14} color={T.text3} /> Test Connection
              </>
            )}
          </button>
          {rawPending.length > 0 && (
            <button
              onClick={bulkSync}
              disabled={bulkSyncing}
              style={{
                padding: "9px 20px",
                background: bulkSyncing ? T.amberBg : T.primary,
                border: "none",
                borderRadius: 8,
                color: bulkSyncing ? T.amber : "#fff",
                cursor: bulkSyncing ? "default" : "pointer",
                fontSize: 13,
                fontWeight: 700,
                boxShadow: bulkSyncing ? "none" : "0 4px 12px rgba(67,97,238,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {bulkSyncing ? (
                <>
                  <IconRefresh size={14} color={T.amber} /> Syncing…
                </>
              ) : (
                <>
                  <IconZap size={14} color="#fff" /> Sync All to Tally ({rawPending.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Settings Drawer/Card (Collapsible) ────────────────────────────── */}
      {showConfig && (
        <div
          style={{
            ...cardStyle({ padding: "16px 20px", marginBottom: 20 }),
            background: "#ffffff",
            border: `1.5px solid ${T.primary}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>TallyPrime HTTP Server Configuration</h3>
            <button
              onClick={() => setShowConfig(false)}
              style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 16 }}
            ><IconX size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 4 }}>
                Tally Server URL / Port
              </label>
              <input
                type="text"
                value={tallyUrl}
                onChange={(e) => setTallyUrl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: `1px solid ${T.border}`,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 4 }}>
                Target Company Name in Tally
              </label>
              <input
                type="text"
                value={tallyCompany}
                onChange={(e) => setTallyCompany(e.target.value)}
                placeholder="e.g. DB Digital Labs"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: `1px solid ${T.border}`,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: T.text3 }}>
              <b>How to enable in TallyPrime:</b> Press <b>F12</b> → <b>Advanced Configuration</b> → Set{" "}
              <b>Enable HTTP Server</b> to <em>Yes</em> and Port to <em>9000</em>.
            </div>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              style={{
                padding: "8px 18px",
                background: T.primary,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {savingSettings ? "Saving…" : "Save Configuration"}
            </button>
          </div>
        </div>
      )}

      {/* ── Connection Banner ────────────────────────────────────────────── */}
      {connStatus && (
        <div
          style={{
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 20,
            background: connStatus.connected
              ? T.greenBg
              : connStatus.tally_online && !connStatus.company_open
              ? "#fef3c7"
              : T.redBg,
            border: `1px solid ${
              connStatus.connected
                ? "#86efac"
                : connStatus.tally_online && !connStatus.company_open
                ? "#f59e0b"
                : "#fca5a5"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 13,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "flex" }}>
              {connStatus.connected ? (
                <IconCheckCircle size={20} color={T.green} />
              ) : connStatus.tally_online && !connStatus.company_open ? (
                <IconClock size={20} color="#b45309" />
              ) : (
                <IconXCircle size={20} color={T.red} />
              )}
            </span>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: connStatus.connected
                    ? "#15803d"
                    : connStatus.tally_online && !connStatus.company_open
                    ? "#92400e"
                    : "#b91c1c",
                }}
              >
                {connStatus.connected
                  ? connStatus.message || `TallyPrime Connected (Active Company: ${connStatus.company_name || "Active"})`
                  : connStatus.tally_online && !connStatus.company_open
                  ? "TallyPrime is Online, but NO Company is Opened in Tally!"
                  : "TallyPrime server is currently offline or unreachable on Port 9000"}
              </div>
              {!connStatus.connected && connStatus.error && (
                <div style={{ fontSize: 12, color: connStatus.tally_online ? "#b45309" : "#991b1b", marginTop: 2 }}>
                  {connStatus.error}
                </div>
              )}
            </div>
          </div>
          {connStatus.tally_online && !connStatus.company_open ? (
            <div
              style={{
                color: "#78350f",
                fontSize: 12,
                background: "rgba(255,255,255,0.85)",
                padding: "8px 14px",
                borderRadius: 6,
                fontWeight: 600,
                border: "1px solid #fde68a",
              }}
            >
              In TallyPrime: Select your company from the list and press <strong>Enter</strong> to open it. Then click <strong>Test Connection</strong>.
            </div>
          ) : !connStatus.connected ? (
            <div
              style={{
                color: "#7f1d1d",
                fontSize: 12,
                background: "rgba(255,255,255,0.75)",
                padding: "6px 12px",
                borderRadius: 6,
                fontWeight: 500,
              }}
            >
               Quick fix: Open TallyPrime → Press <strong>F12</strong> → <strong>Advanced Configuration</strong> →{" "}
              <strong>Enable HTTP Server: Yes</strong> (Port <strong>9000</strong>)
            </div>
          ) : null}
        </div>
      )}

      {/* ── Bulk Sync Result Banner ──────────────────────────────────────── */}
      {bulkResult && (
        <div
          style={{
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 20,
            background: bulkResult.failed > 0 ? T.amberBg : T.greenBg,
            border: `1px solid ${bulkResult.failed > 0 ? "#fcd34d" : "#86efac"}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 13,
          }}
        >
          <span style={{ fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 6 }}>
            <IconCheckCircle size={16} color={T.green} /> Bulk sync completed — Synced: {bulkResult.synced}, Failed:{" "}
            {bulkResult.failed}
          </span>
          <button
            onClick={() => setBulkResult(null)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: T.text3,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <IconXCircle size={16} color={T.text3} />
          </button>
        </div>
      )}

      {/* ── KPI Summary Cards ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {[
          {
            label: "Pending to Sync",
            value: String(rawPending.length),
            color: rawPending.length > 0 ? T.amber : T.green,
            subtitle: "Verified entries awaiting push",
          },
          {
            label: "Pending Amount",
            value: inr(totalPendingValue),
            color: T.amber,
            subtitle: "Total value of pending entries",
          },
          {
            label: "Successfully Synced",
            value: String(rawHistory.length),
            color: T.green,
            subtitle: "Imported into TallyPrime",
          },
          {
            label: "Sync Errors",
            value: String(rawPending.filter((v) => v.tally_error).length),
            color: T.red,
            subtitle: "Need connection or retry",
          },
        ].map((k) => (
          <div key={k.label} style={cardStyle({ padding: "16px 18px" })}>
            <div
              style={{
                fontSize: 11,
                color: T.text3,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 4,
              }}
            >
              {k.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 2 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: T.text3 }}>{k.subtitle}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs & Search Bar ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${T.border}`,
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex" }}>
          {[
            { id: "pending", label: `Pending Sync (${rawPending.length})` },
            { id: "history", label: `Sync History (${rawHistory.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: "10px 22px",
                border: "none",
                background: "none",
                borderBottom: `2px solid ${activeTab === t.id ? T.primary : "transparent"}`,
                color: activeTab === t.id ? T.primary : T.text3,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        {activeTab === "pending" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: `1px solid ${T.border}`,
                fontSize: 12,
                color: T.text2,
                outline: "none",
                background: "#fff",
              }}
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="sales">Sales</option>
              <option value="payment">Payment</option>
              <option value="receipt">Receipt</option>
            </select>

            <input
              type="text"
              placeholder="Search party or voucher #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: `1px solid ${T.border}`,
                fontSize: 12,
                width: 200,
                outline: "none",
                background: "#fff",
              }}
            />
          </div>
        )}
      </div>

      {/* ── Pending Sync Table ───────────────────────────────────────────── */}
      {activeTab === "pending" && (
        <div style={cardStyle({ overflow: "hidden" })}>
          {pendingLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading pending entries…</div>
          ) : rawPending.length === 0 ? (
            /* Empty state: prompt user to upload bills */
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ marginBottom: 14 }}>
                <IconCheckCircle size={44} color={T.green} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text1, marginBottom: 6 }}>
                All Entries Synced to Tally!
              </div>
              <p style={{ fontSize: 13, color: T.text3, maxWidth: 420, margin: "0 auto 20px" }}>
                There are no pending vouchers. Upload invoices, bills, or receipts in AI Verification to extract and
                queue new entries.
              </p>
              <button
                onClick={() => navigate("/ai-verification")}
                style={{
                  padding: "10px 22px",
                  background: "linear-gradient(135deg, #4361ee, #7c3aed)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(67, 97, 238, 0.3)",
                }}
              >
                <IconUpload size={16} color="#fff" />
                Upload Bill / Invoice Now
              </button>
            </div>
          ) : pendingVouchers.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>No vouchers match your filter criteria.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Voucher No.", "Type", "Date", "Party / Vendor", "Total (₹)", "Status", "Action"].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingVouchers.map((v) => {
                  const vc = VTYPE_C[v.voucher_type] || { color: T.text3, bg: "#f8fafc" };
                  return (
                    <tr
                      key={v.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.rowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                      style={{ borderBottom: `1px solid ${T.divider}` }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>
                        <div>{v.voucher_number}</div>
                        {v.narration && (
                          <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>{v.narration}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={badge(vc.color, vc.bg)}>{v.voucher_type?.toUpperCase()}</span>
                      </td>
                      <td style={tdStyle}>{v.voucher_date}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: T.text1 }}>{v.party_name || "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.amber }}>{inr(v.total)}</td>
                      <td style={tdStyle}>
                        <SyncBadge synced={v.tally_synced} error={v.tally_error} />
                        {v.tally_error && (
                          <div
                            style={{
                              fontSize: 10,
                              color: T.red,
                              marginTop: 3,
                              maxWidth: 200,
                              whiteSpace: "normal",
                              lineHeight: 1.3,
                            }}
                            title={v.tally_error}
                          >
                            {v.tally_error
                              .replace(/<[^>]+>/g, " ")
                              .replace(/&apos;/g, "'")
                              .replace(/&quot;/g, '"')
                              .replace(/&amp;/g, "&")
                              .replace(/&lt;/g, "<")
                              .replace(/&gt;/g, ">")
                              .replace(/\s+/g, " ")
                              .trim()}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => syncSingle(v.id, v.voucher_number)}
                          disabled={syncingId === v.id}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 6,
                            background: syncingId === v.id ? "#f8fafc" : T.primary,
                            border: `1px solid ${syncingId === v.id ? T.border : T.primary}`,
                            color: syncingId === v.id ? T.text3 : "#fff",
                            cursor: syncingId === v.id ? "default" : "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                            transition: "all 0.15s",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {syncingId === v.id ? (
                            "Syncing…"
                          ) : (
                            <>
                              <IconZap size={12} color="#fff" />
                              Sync to Tally
                            </>
                          )}
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

      {/* ── Sync History Table ───────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div style={cardStyle({ overflow: "hidden" })}>
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading history…</div>
          ) : rawHistory.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 13 }}>
              No synced history entries recorded yet.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Voucher No.", "Type", "Date", "Party / Vendor", "Total (₹)", "Status"].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawHistory.map((v) => {
                  const vc = VTYPE_C[v.voucher_type] || { color: T.text3, bg: "#f8fafc" };
                  return (
                    <tr
                      key={v.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.rowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                      style={{ borderBottom: `1px solid ${T.divider}` }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{v.voucher_number}</td>
                      <td style={tdStyle}>
                        <span style={badge(vc.color, vc.bg)}>{v.voucher_type?.toUpperCase()}</span>
                      </td>
                      <td style={tdStyle}>{v.voucher_date}</td>
                      <td style={{ ...tdStyle, color: T.text1 }}>{v.party_name || "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.green }}>{inr(v.total)}</td>
                      <td style={tdStyle}>
                        <SyncBadge synced={true} />
                      </td>
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
