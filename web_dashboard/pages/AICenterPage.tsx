import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge, inr } from "../store/theme";
import { IconAI, IconClock, IconSearch, IconMoney, IconBox, IconScale } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function AICenterPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"chat" | "ocr" | "forecast" | "insights">("chat");
  const [chatQuery, setChatQuery] = useState("");
  const [chatLog, setChatLog] = useState<{ sender: "user" | "ai"; text: string; sql?: string }[]>([
    { sender: "ai", text: "Hello Bhavesh! I am your AI Copilot. Ask me anything about vouchers, ledgers, or sales metrics." }
  ]);

  const { data: copilot } = useQuery<any>({
    queryKey: ["copilot-brief"],
    queryFn: () => api.get("/copilot/brief").then(r => r.data),
  });

  const { data: verifyDocsRaw, isLoading: loadingVerify } = useQuery<any>({
    queryKey: ["verify-docs"],
    queryFn: () => api.get("/documents?limit=50").then(r => r.data),
  });
  // API returns { items: [...], count: N } — extract the array
  const verifyDocs: any[] = Array.isArray(verifyDocsRaw)
    ? verifyDocsRaw
    : (verifyDocsRaw?.items ?? []);

  const queryMutation = useMutation({
    mutationFn: (q: string) => api.post("/ai-assistant/query", { query: q }),
    onSuccess: (res) => {
      setChatLog(prev => [...prev, {
        sender: "ai",
        text: res.data.summary,
        sql: res.data.query
      }]);
    },
    onError: () => {
      setChatLog(prev => [...prev, { sender: "ai", text: "Sorry, I encountered an error translating that request." }]);
    }
  });

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    const userQ = chatQuery.trim();
    setChatLog(prev => [...prev, { sender: "user", text: userQ }]);
    setChatQuery("");
    queryMutation.mutate(userQ);
  };

  const handleFastApprove = (docId: string) => {
    api.post(`/documents/${docId}/verify`, { approve: true }).then(() => {
      qc.invalidateQueries({ queryKey: ["verify-docs"] });
      alert("Document approved and voucher created successfully!");
    }).catch(() => {
      alert("Failed to approve document. Please try again.");
    });
  };

  const forecasts = copilot?.forecasts || {};
  const insights = copilot?.insights || [];

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", fontFamily: "'Inter', sans-serif", background: T.pageBg }}>
      
      {/* ChatGPT style Left Sidebar */}
      <div style={{ width: 240, borderRight: `1px solid ${T.border}`, background: "#f8fafc", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 6 }}>
          <IconAI size={20} color={T.primary} />
          <span style={{ fontWeight: 800, color: T.text1, fontSize: 14 }}>AI Center Console</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {[
            { id: "chat", label: "AI Copilot Chat", icon: "💬" },
            { id: "ocr", label: "OCR Document Queue", icon: "📂" },
            { id: "forecast", label: "Financial Forecasts", icon: "📈" },
            { id: "insights", label: "Spent & Margin Insights", icon: "💡" }
          ].map(t => {
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                  background: isSel ? T.primary + "15" : "transparent",
                  color: isSel ? T.primary : T.text2, border: "none", borderRadius: 8,
                  fontSize: 12, fontWeight: isSel ? 700 : 500, cursor: "pointer", textAlign: "left", transition: "all 0.15s"
                }}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View Area */}
      <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        
        {/* Tab 1: AI Chat Copilot */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginBottom: 12 }}>AI Accounting Copilot</h2>
            
            {/* Messages box */}
            <div style={{ flex: 1, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
              {chatLog.map((log, idx) => (
                <div key={idx} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  background: log.sender === "ai" ? "#eff6ff" : "transparent",
                  padding: log.sender === "ai" ? 14 : 0, borderRadius: log.sender === "ai" ? 10 : 0
                }}>
                  <span style={{ fontSize: 18 }}>{log.sender === "ai" ? "🤖" : "👤"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>
                      {log.sender === "ai" ? "Daynisc AI Assistant" : "Bhavesh Khimsuriya"}
                    </div>
                    <div style={{ fontSize: 12, color: T.text2, marginTop: 4, lineHeight: 1.5 }}>{log.text}</div>
                    {log.sql && (
                      <pre style={{
                        marginTop: 8, background: "#1e293b", color: "#38bdf8", padding: 10,
                        borderRadius: 6, fontSize: 10, fontFamily: "monospace", overflowX: "auto"
                      }}>
                        {log.sql}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
              {queryMutation.isPending && (
                <div style={{ fontSize: 11, color: T.text3, paddingLeft: 30 }}>Translating schema & querying data...</div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Ask e.g. 'Show me pending vouchers over ₹50,000' or 'Calculate total transport costs'..."
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                style={{ flex: 1, padding: "12px 16px", border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none" }}
              />
              <button type="submit" style={{ background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm, padding: "0 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Send
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: OCR Document Verification Queue */}
        {activeTab === "ocr" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginBottom: 4 }}>AI OCR Document Queue</h2>
                <p style={{ fontSize: 12, color: T.text3 }}>Verify AI-extracted purchase invoices, bank statements & LR copies before syncing to Tally Prime.</p>
              </div>
              <a
                href="#/ai-verification"
                style={{
                  background: "linear-gradient(135deg, #4361ee, #7c3aed)",
                  color: "#fff", padding: "10px 18px", borderRadius: 8,
                  fontSize: 12, fontWeight: 700, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  boxShadow: "0 4px 12px rgba(67, 97, 238, 0.3)"
                }}
              >
                📤 Omnichannel Upload & Scan Studio
              </a>
            </div>

            {/* Loading state */}
            {loadingVerify && (
              <div style={{ textAlign: "center", padding: 40, color: T.text3, fontSize: 13 }}>
                ⏳ Loading document queue...
              </div>
            )}

            {/* Empty state */}
            {!loadingVerify && verifyDocs.length === 0 && (
              <div style={{
                textAlign: "center", padding: 48, background: "#f8fafc",
                borderRadius: 12, border: `2px dashed ${T.border}`
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 6 }}>No documents in queue</div>
                <div style={{ fontSize: 12, color: T.text3 }}>Upload a purchase invoice or bill from the Document Hub to start AI extraction.</div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {verifyDocs.map((doc) => {
                // confidence_score from API is 0.0–1.0; convert to 0–100 for display
                const confPct = doc.confidence_score != null
                  ? (doc.confidence_score <= 1 ? Math.round(doc.confidence_score * 100) : Math.round(doc.confidence_score))
                  : 0;
                const isHighConf = confPct >= 80;
                const filename = doc.original_filename || doc.filename || "Unnamed Document";
                const uploadedAt = doc.created_at || doc.uploaded_at || "";
                return (
                  <Card key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{filename}</div>
                      <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
                        Type: <strong style={{ color: T.text2 }}>{doc.document_type || "—"}</strong>
                        {" · "}Status: <strong style={{ color: doc.status === "pushed" ? T.green : doc.status === "failed" ? T.red : T.amber }}>{doc.status || "pending"}</strong>
                      </div>
                      <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                        AI Confidence: <strong style={{ color: isHighConf ? T.green : T.amber }}>{confPct}%</strong>
                        {uploadedAt ? ` · Uploaded: ${uploadedAt.slice(0, 10)}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => alert("Extracted Data:\n\n" + JSON.stringify(doc.extracted_data, null, 2))}
                        style={{ padding: "6px 12px", border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 11, cursor: "pointer", background: "#fff" }}
                      >
                        Review Data
                      </button>
                      {doc.status !== "pushed" && doc.status !== "failed" && isHighConf && (
                        <button
                          onClick={() => handleFastApprove(doc.id)}
                          style={{ padding: "6px 12px", background: T.green, color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          ✓ Fast Approve
                        </button>
                      )}
                      {doc.status === "pushed" && (
                        <span style={{ padding: "6px 12px", background: T.green + "20", color: T.green, borderRadius: 4, fontSize: 11, fontWeight: 700 }}>✓ Synced</span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Projections & Forecasts */}
        {activeTab === "forecast" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Cash flow */}
            <Card>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <IconMoney size={16} color={T.green} /> Cash Flow Forecast
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {forecasts.cash_flow?.map((c: any, idx: number) => (
                  <div key={idx} style={{ borderBottom: idx < forecasts.cash_flow.length - 1 ? `1px solid ${T.border}` : "none", paddingBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
                      <span>{c.month}</span>
                      <span style={{ color: T.green }}>+{inr(c.net)} Net</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, height: 6, borderRadius: 3, overflow: "hidden", background: "#f1f5f9" }}>
                      <div style={{ width: `${(c.inflow / (c.inflow + c.outflow)) * 100}%`, background: T.green }} />
                      <div style={{ width: `${(c.outflow / (c.inflow + c.outflow)) * 100}%`, background: T.red }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* GST */}
            <Card>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <IconScale size={16} color={T.primary} /> Est. GST Liability Forecast
              </h3>
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text2, marginBottom: 6 }}>
                  <span>Month</span>
                  <span style={{ fontWeight: 700 }}>{forecasts.gst_liability?.month}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text3, marginBottom: 6 }}>
                  <span>Output Tax Payable</span>
                  <span>{inr(forecasts.gst_liability?.payable)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.green, marginBottom: 10 }}>
                  <span>Input Tax Credit (ITC)</span>
                  <span>-{inr(forecasts.gst_liability?.itc_available)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: T.red, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                  <span>Net Payable Cash</span>
                  <span>{inr(forecasts.gst_liability?.net_payable)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 4: AI Insights */}
        {activeTab === "insights" && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginBottom: 12 }}>Spent & Margin Insights</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {insights.map((ins: string, idx: number) => (
                <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "14px 18px", background: "#eff6ff", borderRadius: 10, border: `1px solid ${T.primary}20` }}>
                  <span style={{ color: T.primary, fontSize: 18 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 12, color: T.primary, fontWeight: 700 }}>AI Margin Alert</div>
                    <p style={{ fontSize: 12, color: T.text2, marginTop: 4, lineHeight: 1.4 }}>{ins}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
