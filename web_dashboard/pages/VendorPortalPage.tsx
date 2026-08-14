import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge, inr } from "../store/theme";
import { IconUpload, IconMoney, IconClipboard, IconSync } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function VendorPortalPage() {
  const qc = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState("Reliance Polymers Ltd");
  const [ticketSubject, setTicketSubject] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{ sender: string; text: string }[]>([
    { sender: "accounts", text: "Hello! We have verified your invoice PUR-3001. Payment has been scheduled for next Tuesday." }
  ]);

  const { data: tickets = [], isLoading: loadingTickets } = useQuery<any[]>({
    queryKey: ["vendor-tickets"],
    queryFn: () => api.get("/portal/vendor/tickets").then(r => r.data),
  });

  const createTicketMutation = useMutation({
    mutationFn: (newTicket: any) => api.post("/portal/vendor/ticket", newTicket),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-tickets"] });
      setTicketSubject("");
    }
  });

  const { data: vouchersData } = useQuery<any>({
    queryKey: ["vouchers-list"],
    queryFn: () => api.get("/accounting/vouchers?limit=20").then(r => r.data),
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    createTicketMutation.mutate({
      vendor: selectedVendor,
      subject: ticketSubject
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatLog(prev => [...prev, { sender: "vendor", text: chatInput.trim() }]);
    setChatInput("");
    setTimeout(() => {
      setChatLog(prev => [...prev, { sender: "accounts", text: "Received. Let me double check with our senior manager." }]);
    }, 1000);
  };

  const vendorInvoices = vouchersData?.items?.filter((v: any) => v.party_name === selectedVendor && v.voucher_type === "purchase") || [];
  const totalOutstanding = vendorInvoices.reduce((s: number, v: any) => s + v.total, 0);

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Page Title & Portal Selector */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
            🤝 Supplier & Vendor Self-Service Portal
          </h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Vendor console to upload invoices, verify tax filings, download ledgers, and chat with finance.</p>
        </div>
        <select
          value={selectedVendor}
          onChange={(e) => setSelectedVendor(e.target.value)}
          style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", cursor: "pointer" }}
        >
          <option value="Reliance Polymers Ltd">Reliance Polymers Ltd</option>
          <option value="Supreme Plastics Ltd">Supreme Plastics Ltd</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: 20 }}>
        {/* Left: Invoice status & Outstanding list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Summary tiles */}
          <div style={{ display: "flex", gap: 14 }}>
            <Card style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <IconMoney size={18} color={T.red} />
                <span style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: "uppercase" }}>Outstanding Balance</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.red }}>{inr(totalOutstanding)}</div>
            </Card>
            <Card style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <IconClipboard size={18} color={T.primary} />
                <span style={{ fontSize: 11, fontWeight: 600, color: T.text3, textTransform: "uppercase" }}>Invoices Uploaded</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text1 }}>{vendorInvoices.length} Bills</div>
            </Card>
          </div>

          {/* Invoices List */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Uploaded Bills & Payment Status</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Invoice No.", "Date", "Total Amount", "Tally Synced", "Payment Status"].map(h => (
                      <th key={h} style={{ padding: "10px", textAlign: "left", fontSize: 11, color: T.text3, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendorInvoices.map((v: any) => (
                    <tr key={v.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "10px", fontSize: 12, fontWeight: 700, color: T.primary }}>{v.voucher_number}</td>
                      <td style={{ padding: "10px", fontSize: 11, color: T.text3 }}>{v.voucher_date}</td>
                      <td style={{ padding: "10px", fontSize: 12, fontWeight: 700, color: T.text1 }}>{inr(v.total)}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={badge(v.tally_synced ? T.green : T.amber, v.tally_synced ? T.greenBg : T.amberBg)}>
                          {v.tally_synced ? "✓ Synced" : "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span style={badge(v.tally_synced ? T.green : T.amber, v.tally_synced ? T.greenBg : T.amberBg)}>
                          {v.tally_synced ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {vendorInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 20, textAlign: "center", color: T.text3, fontSize: 12 }}>No invoices recorded for this supplier.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Raise Support Ticket */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Raise GST or Payment Dispute Ticket</h3>
            <form onSubmit={handleCreateTicket} style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                placeholder="e.g. GST Mismatch on June filing or invoice payment overdue..."
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, background: T.inputBg }}
                required
              />
              <button
                type="submit"
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
                  padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                }}
              >
                Raise Dispute Ticket
              </button>
            </form>

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {tickets.filter(t => t.vendor === selectedVendor).map((t: any) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 6, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, color: T.text1, fontWeight: 600 }}>{t.subject}</div>
                  <span style={badge(t.status === "open" ? T.amber : T.green, t.status === "open" ? T.amberBg : T.greenBg)}>
                    {t.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Live Chat Container */}
        <Card style={{ display: "flex", flexDirection: "column", height: 460 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Chat with Accounts</h3>
          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
            {chatLog.map((c, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: c.sender === "vendor" ? "flex-end" : "flex-start",
                  background: c.sender === "vendor" ? T.primary : "#e2e8f0",
                  color: c.sender === "vendor" ? "#fff" : T.text1,
                  borderRadius: 10, padding: "8px 12px", fontSize: 12, maxWidth: "85%"
                }}
              >
                <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2 }}>{c.sender === "vendor" ? "Supplier" : "Accounts Dept"}</div>
                {c.text}
              </div>
            ))}
          </div>
          {/* Chat Input */}
          <form onSubmit={handleSendChat} style={{ display: "flex", gap: 6, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
            <input
              type="text"
              placeholder="Ask a question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, outline: "none" }}
            />
            <button type="submit" style={{ background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Send
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
