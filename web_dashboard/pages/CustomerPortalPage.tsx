import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge, inr } from "../store/theme";
import { IconMoney, IconDownload, IconClipboard } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function CustomerPortalPage() {
  const [selectedCust, setSelectedCust] = useState("Sharma Traders");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [tickets, setTickets] = useState<{ id: string; subject: string; status: string }[]>([]);
  const [ticketSubject, setTicketSubject] = useState("");

  const { data: vouchersData } = useQuery<any>({
    queryKey: ["vouchers-list"],
    queryFn: () => api.get("/accounting/vouchers?limit=20").then(r => r.data),
  });

  const handleSimulatePayment = () => {
    setPaymentLoading(true);
    setSuccessMsg("");
    setTimeout(() => {
      setPaymentLoading(false);
      setSuccessMsg(`Simulated Payment of ₹${inr(totalReceivable)} Successful! receipt voucher auto-generated.`);
    }, 1500);
  };

  const handleRaiseTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) return;
    setTickets(prev => [...prev, { id: `t-${prev.length+1}`, subject: ticketSubject.trim(), status: "open" }]);
    setTicketSubject("");
  };

  const customerInvoices = vouchersData?.items?.filter((v: any) => v.party_name === selectedCust && v.voucher_type === "sales") || [];
  const totalReceivable = customerInvoices.reduce((s: number, v: any) => s + v.total, 0);

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Page Title & Selector */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
            Customer Self-Service Portal
          </h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Client dashboard to download sales bills, pay outstanding dues, and raise service tickets.</p>
        </div>
        <select
          value={selectedCust}
          onChange={(e) => setSelectedCust(e.target.value)}
          style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", cursor: "pointer" }}
        >
          <option value="Sharma Traders">Sharma Traders</option>
          <option value="Patel Enterprises">Patel Enterprises</option>
          <option value="Kumar & Sons">Kumar & Sons</option>
        </select>
      </div>

      {successMsg && (
        <div style={{ padding: 12, background: T.greenBg, color: T.green, borderRadius: 8, fontSize: 12, marginBottom: 16, fontWeight: 700 }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: 20 }}>
        {/* Left Side: Dues & Bills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Outstanding Card */}
          <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff", border: "none" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>Your Total Outstanding</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 4 }}>{inr(totalReceivable)}</div>
            </div>
            <button
              onClick={handleSimulatePayment}
              disabled={paymentLoading || totalReceivable === 0}
              style={{
                background: "#fff", color: "#059669", border: "none", borderRadius: T.radiusSm,
                padding: "12px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer"
              }}
            >
              {paymentLoading ? "Processing Dues..." : "Pay Outstanding Dues"}
            </button>
          </Card>

          {/* Sales Invoices List */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Billing Invoices Ledger</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Invoice No.", "Billing Date", "Total Amount", "PDF Document", "Payment Status"].map(h => (
                      <th key={h} style={{ padding: "10px", textAlign: "left", fontSize: 11, color: T.text3, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customerInvoices.map((v: any) => (
                    <tr key={v.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "10px", fontSize: 12, fontWeight: 700, color: T.primary }}>{v.voucher_number}</td>
                      <td style={{ padding: "10px", fontSize: 11, color: T.text3 }}>{v.voucher_date}</td>
                      <td style={{ padding: "10px", fontSize: 12, fontWeight: 700, color: T.text1 }}>{inr(v.total)}</td>
                      <td style={{ padding: "10px" }}>
                        <button
                          onClick={() => alert("Downloading PDF for invoice: " + v.voucher_number)}
                          style={{
                            background: "none", border: "none", color: T.primary, fontSize: 11, fontWeight: 600,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                          }}
                        >
                          <IconDownload size={12} color={T.primary} /> Download PDF
                        </button>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span style={badge(v.tally_synced ? T.green : T.amber, v.tally_synced ? T.greenBg : T.amberBg)}>
                          {v.tally_synced ? "Settled" : "Outstanding"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {customerInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 20, textAlign: "center", color: T.text3, fontSize: 12 }}>No invoices recorded for this customer.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Side: Tickets Dispute */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 14 }}>Raise Service / Support Ticket</h3>
          <form onSubmit={handleRaiseTicket} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              placeholder="e.g. Billing error on INV-3004 or requesting payment extension..."
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, height: 60 }}
              required
            />
            <button type="submit" style={{ background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Submit Support Ticket
            </button>
          </form>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5 }}>Active Support Tickets</h4>
            {tickets.map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 6, border: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12, color: T.text1, fontWeight: 600 }}>{t.subject}</span>
                <span style={badge(T.amber, T.amberBg)}>{t.status.toUpperCase()}</span>
              </div>
            ))}
            {tickets.length === 0 && (
              <div style={{ fontSize: 11, color: T.text3, textAlign: "center", padding: "10px 0" }}>No support tickets raised yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
