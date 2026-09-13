import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge, inr } from "../store/theme";
import { IconClipboard, IconCheckCircle, IconXCircle, IconClock, IconSync } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function WorkflowEnginePage() {
  const qc = useQueryClient();
  const [ruleName, setRuleName] = useState("");
  const [amountLimit, setAmountLimit] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [stages, setStages] = useState<string[]>([]);
  const [selectedVch, setSelectedVch] = useState<any>(null);
  const [actionComments, setActionComments] = useState("");
  const [actionStage, setActionStage] = useState("manager");

  const { data: rules = [], isLoading: loadingRules } = useQuery<any[]>({
    queryKey: ["workflow-rules"],
    queryFn: () => api.get("/workflows/rules").then(r => r.data),
  });

  const { data: vouchersData, isLoading: loadingVch } = useQuery<any>({
    queryKey: ["vouchers-list"],
    queryFn: () => api.get("/accounting/vouchers?limit=10").then(r => r.data),
  });

  const createRuleMutation = useMutation({
    mutationFn: (newRule: any) => api.post("/workflows/rules", newRule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-rules"] });
      setRuleName("");
      setAmountLimit("");
      setAutoApprove(false);
      setStages([]);
    }
  });

  const approvalMutation = useMutation({
    mutationFn: (payload: any) => api.post("/workflows/action", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-rules"] });
      setSelectedVch(null);
      setActionComments("");
    }
  });

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    createRuleMutation.mutate({
      name: ruleName,
      amount_limit: parseFloat(amountLimit || "0"),
      auto_approve: autoApprove,
      stages
    });
  };

  const toggleStage = (s: string) => {
    if (stages.includes(s)) {
      setStages(stages.filter(x => x !== s));
    } else {
      setStages([...stages, s]);
    }
  };

  const handleApproval = (action: "approve" | "reject") => {
    if (!selectedVch) return;
    approvalMutation.mutate({
      voucher_number: selectedVch.voucher_number,
      stage: actionStage,
      action,
      comments: actionComments,
      user: "Bhavesh Khimsuriya"
    });
  };

  const pendingVouchers = vouchersData?.items?.filter((v: any) => !v.tally_synced) || [];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          Workflow & Approval Engine
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Configure multi-level approval triggers, thresholds, and view pending vouchers requiring sign-offs.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: 20 }}>
        {/* Left Column: Create Approval Rule */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Create Approval Rule</h3>
            <form onSubmit={handleCreateRule} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Large Purchase Invoices"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, background: T.inputBg }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Amount Threshold (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={amountLimit}
                  onChange={(e) => setAmountLimit(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, background: T.inputBg }}
                  required
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="auto_app"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                />
                <label htmlFor="auto_app" style={{ fontSize: 12, color: T.text2, fontWeight: 600 }}>Auto-Approve Below Threshold</label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Approval Hierarchy Stages</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["accountant", "manager", "finance_head"].map(stg => {
                    const isSel = stages.includes(stg);
                    return (
                      <button
                        key={stg}
                        type="button"
                        onClick={() => toggleStage(stg)}
                        style={{
                          padding: "6px 12px", borderRadius: 20, border: `1px solid ${isSel ? T.primary : T.border}`,
                          background: isSel ? T.primary + "15" : "#fff", color: isSel ? T.primary : T.text3,
                          fontSize: 11, fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        {stg.replace("_", " ").toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
                  padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8
                }}
              >
                Save Policy Rule
              </button>
            </form>
          </Card>

          {/* Active Rules List */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 12 }}>Active Rules</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rules.map((r: any) => (
                <div key={r.id} style={{ padding: 12, background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>
                    Threshold: {inr(r.amount_limit)} · Auto-Approve: {r.auto_approve ? "YES" : "NO"}
                  </div>
                  {r.stages.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {r.stages.map((s: string) => (
                        <span key={s} style={{ fontSize: 9, background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                          {s.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Pending Approvals Queue */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Vouchers Pending Approval</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Voucher No.", "Party Name", "Date", "Total", "Action"].map(h => (
                      <th key={h} style={{ padding: "10px", textAlign: "left", fontSize: 11, color: T.text3, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingVouchers.slice(0, 6).map((v: any) => (
                    <tr key={v.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "10px", fontSize: 12, fontWeight: 700, color: T.primary }}>{v.voucher_number}</td>
                      <td style={{ padding: "10px", fontSize: 12, color: T.text2 }}>{v.party_name}</td>
                      <td style={{ padding: "10px", fontSize: 11, color: T.text3 }}>{v.voucher_date}</td>
                      <td style={{ padding: "10px", fontSize: 12, fontWeight: 700, color: T.text1 }}>{inr(v.total)}</td>
                      <td style={{ padding: "10px" }}>
                        <button
                          onClick={() => setSelectedVch(v)}
                          style={{
                            padding: "4px 8px", background: "#f1f5f9", border: `1px solid ${T.border}`,
                            borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", color: T.text1
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Inline Review Panel */}
          {selectedVch && (
            <Card style={{ borderLeft: `4px solid ${T.primary}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: T.text1, marginBottom: 10 }}>
                Reviewing {selectedVch.voucher_number} · {selectedVch.party_name}
              </h3>
              <p style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>Voucher Total: <strong>{inr(selectedVch.total)}</strong></p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Approval Stage</label>
                  <select
                    value={actionStage}
                    onChange={(e) => setActionStage(e.target.value)}
                    style={{ padding: "8px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, outline: "none", background: "#fff" }}
                  >
                    <option value="accountant">Accountant Approval</option>
                    <option value="manager">Manager Approval</option>
                    <option value="finance_head">Finance Head Signoff</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Decision Comments</label>
                  <textarea
                    placeholder="Provide audit notes or reasons for rejection..."
                    value={actionComments}
                    onChange={(e) => setActionComments(e.target.value)}
                    style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, height: 60 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => handleApproval("approve")}
                    style={{
                      flex: 1, background: T.green, color: "#fff", border: "none",
                      borderRadius: T.radiusSm, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Approve Voucher
                  </button>
                  <button
                    onClick={() => handleApproval("reject")}
                    style={{
                      padding: "10px 18px", background: "#fff", border: `1.5px solid ${T.red}`,
                      color: T.red, borderRadius: T.radiusSm, fontSize: 12, fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
