import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge } from "../store/theme";
import { IconAI, IconSettings, IconSync } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function AutomationBuilderPage() {
  const qc = useQueryClient();
  const [flowName, setFlowName] = useState("");
  const [trigger, setTrigger] = useState("Invoice Uploaded");
  const [condition, setCondition] = useState("Amount > ₹1,00,000");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  const { data: flows = [], isLoading } = useQuery<any[]>({
    queryKey: ["automation-flows"],
    queryFn: () => api.get("/automations/flows").then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (newFlow: any) => api.post("/automations/flows", newFlow),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-flows"] });
      setFlowName("");
      setSelectedActions([]);
      setSuccessMsg("Automation flow published successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  });

  const handleActionToggle = (act: string) => {
    if (selectedActions.includes(act)) {
      setSelectedActions(selectedActions.filter(x => x !== act));
    } else {
      setSelectedActions([...selectedActions, act]);
    }
  };

  const handleSaveFlow = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name: flowName,
      trigger,
      conditions: condition,
      actions: selectedActions
    });
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
          AI-Powered Automation Builder
        </h1>
        <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Construct visual n8n-style node workflows to link document ingestion, AI extractions, approvals, and ERP syncs.</p>
      </div>

      {successMsg && (
        <div style={{ padding: 12, background: T.greenBg, color: T.green, borderRadius: 8, fontSize: 12, marginBottom: 16, fontWeight: 700 }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2.8fr", gap: 20 }}>
        {/* Left Column: Build Flow Form */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Create Node Rule</h3>
          <form onSubmit={handleSaveFlow} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Workflow Name</label>
              <input
                type="text"
                placeholder="e.g. High Value Invoice WhatsApp Rule"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13 }}
                required
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Trigger Event</label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                style={{ padding: "8px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, background: "#fff" }}
              >
                <option value="Invoice Uploaded">Invoice Uploaded</option>
                <option value="Payment Overdue by 7 Days">Payment Overdue by 7 Days</option>
                <option value="Stock Falls Below Reorder Level">Stock Falls Below Reorder Level</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>IF Condition</label>
              <input
                type="text"
                placeholder="e.g. Amount > 100000"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Then Executed Actions</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Run AI OCR", "Trigger Approval Workflow", "Post to Tally Prime", "Send WhatsApp Alert", "Email Vendor"].map(act => {
                  const isChecked = selectedActions.includes(act);
                  return (
                    <label key={act} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.text2, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleActionToggle(act)}
                      />
                      {act}
                    </label>
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
              Publish Flow Node
            </button>
          </form>
        </Card>

        {/* Right Column: n8n style Visual Node Canvas representation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Active Flow Builder Nodes */}
          {flows.map((flow) => (
            <Card key={flow.id} style={{ position: "relative" }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: T.text1, marginBottom: 14 }}>
                Flow: {flow.name}
              </h3>
              
              {/* Visual Node Chain */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Node 1: Trigger */}
                <div style={{ background: "#eff6ff", border: `1px solid ${T.primary}`, borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
                  <div style={{ color: T.text3, fontSize: 9 }}>TRIGGER</div>
                  <strong style={{ color: T.primary }}>{flow.trigger}</strong>
                </div>

                <div style={{ fontSize: 14, color: T.text3 }}>→</div>

                {/* Node 2: Condition */}
                <div style={{ background: "#fffbeb", border: "1px solid #d97706", borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
                  <div style={{ color: T.text3, fontSize: 9 }}>CONDITION</div>
                  <strong style={{ color: "#d97706" }}>{flow.conditions}</strong>
                </div>

                <div style={{ fontSize: 14, color: T.text3 }}>→</div>

                {/* Node 3: Actions Chain */}
                {flow.actions.map((act: string, aIdx: number) => (
                  <div key={act} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: "#f0fdf4", border: `1px solid ${T.green}`, borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
                      <div style={{ color: T.text3, fontSize: 9 }}>ACTION</div>
                      <strong style={{ color: T.green }}>{act}</strong>
                    </div>
                    {aIdx < flow.actions.length - 1 && <span style={{ fontSize: 14, color: T.text3 }}>→</span>}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
