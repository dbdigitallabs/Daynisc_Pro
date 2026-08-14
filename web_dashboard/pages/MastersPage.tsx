import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, cardStyle, badge, inr } from "../store/theme";
import { toast } from "react-hot-toast";
import {
  IconUsers, IconBox, IconSettings, IconBuilding, IconMoney,
  IconClock, IconFile, IconCreditCard, IconUser
} from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 18, ...style }}>{children}</div>;
}

export default function MastersPage() {
  const [activeMaster, setActiveMaster] = useState("customers");
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [hoveredRow, setHoveredRow] = useState<any>(null);
  const [searchVal, setSearchVal] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState("general");
  const [detailPanelExpanded, setDetailPanelExpanded] = useState(true);
  const navigate = useNavigate();
  
  // Modal toggle state
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add Form states
  const [addName, setAddName] = useState("");
  const [addGstin, setAddGstin] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addLimit, setAddLimit] = useState("");

  const [customers, setCustomers] = useState([
    { id: 1, name: "Sharma Traders", gstin: "24AAACS4321Z2Z8", email: "info@sharmatraders.com", creditLimit: 500000, status: "Active", updated: "2026-06-25", pan: "AMOPS8910H", outstanding: 125000, lastInvoice: "₹85,400 (2026-06-20)", lastPayment: "₹50,000 (2026-06-22)", salesPerson: "Bhavesh Khimsuriya", state: "Gujarat", city: "Ahmedabad", lastPaymentText: "3 days ago", lastInvoiceText: "12 Jun", ordersCount: 15, riskScore: "🟢 Low", documents: ["GST Certificate.pdf", "Partnership Deed.pdf", "Quotation-v2.pdf"] },
    { id: 2, name: "Patel Enterprises", gstin: "24AAACS9999Z2Z1", email: "contact@patelent.in", creditLimit: 1000000, status: "Active", updated: "2026-06-22", pan: "BNIPS4321K", outstanding: 450000, lastInvoice: "₹3,20,000 (2026-06-18)", lastPayment: "₹1,50,000 (2026-06-20)", salesPerson: "Ramesh Shah", state: "Gujarat", city: "Surat", lastPaymentText: "8 days ago", lastInvoiceText: "18 Jun", ordersCount: 8, riskScore: "🟡 Medium", documents: ["GST Certificate.pdf", "Outstanding-Report.pdf"] },
    { id: 3, name: "ABC Industries", gstin: "24AAACA1111Z2Z2", email: "finance@abcind.com", creditLimit: 750000, status: "Active", updated: "2026-06-20", pan: "ABCDS5566G", outstanding: 50000, lastInvoice: "₹50,000 (2026-06-10)", lastPayment: "—", salesPerson: "Bhavesh Khimsuriya", state: "Gujarat", city: "Vadodara", lastPaymentText: "None", lastInvoiceText: "10 Jun", ordersCount: 3, riskScore: "🟢 Low", documents: ["GST Certificate.pdf"] },
    { id: 4, name: "Maa Enterprise", gstin: "24AAACM2222Z2Z3", email: "info@maaent.com", creditLimit: 300000, status: "Inactive", updated: "2026-06-15", pan: "MAAPS9988D", outstanding: 0, lastInvoice: "—", lastPayment: "₹25,000 (2026-06-05)", salesPerson: "System", state: "Gujarat", city: "Rajkot", lastPaymentText: "23 days ago", lastInvoiceText: "None", ordersCount: 1, riskScore: "🔴 High", documents: ["GST Certificate.pdf", "Notice.pdf"] }
  ]);

  const [vendors, setVendors] = useState([
    { id: 1, name: "Reliance Polymers Ltd", gstin: "24AAACR1234Z1Z9", email: "sales@reliancepoly.com", creditLimit: 1500000, status: "Active", updated: "2026-06-28", pan: "CPYPS7722A", outstanding: 220000, lastInvoice: "₹1,80,000 (2026-06-24)", lastPayment: "₹1,20,000 (2026-06-26)", salesPerson: "System", state: "Maharashtra", city: "Mumbai", lastPaymentText: "2 days ago", lastInvoiceText: "24 Jun", ordersCount: 12, riskScore: "🟢 Low", documents: ["GST Certificate.pdf", "Agreement-2026.pdf"] },
    { id: 2, name: "Supreme Plastics Ltd", gstin: "24AAACS4321Z2Z8", email: "billing@supreme.in", creditLimit: 800000, status: "Active", updated: "2026-06-27", pan: "DKLPS9011J", outstanding: 95400, lastInvoice: "₹95,400 (2026-06-25)", lastPayment: "—", salesPerson: "Ramesh Shah", state: "Maharashtra", city: "Thane", lastPaymentText: "None", lastInvoiceText: "25 Jun", ordersCount: 5, riskScore: "🟢 Low", documents: ["GST Certificate.pdf"] }
  ]);

  const ledgers = [
    { name: "Capital Account", group: "Capital Account", balance: 5000000, status: "Active", updated: "2026-06-01" },
    { name: "Purchase Account", group: "Purchase Accounts", balance: 842000, status: "Active", updated: "2026-06-28" },
    { name: "Sales Account", group: "Sales Accounts", balance: 1254000, status: "Active", updated: "2026-06-28" }
  ];

  const godowns = [
    { name: "Main Warehouse", location: "GIDC Baroda, Phase II", capacity: "10,000 MT", status: "Active", updated: "2026-06-10" },
    { name: "Secondary Depo", location: "Surat Ring Road", capacity: "5,000 MT", status: "Active", updated: "2026-06-12" }
  ];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;

    const newObj = {
      id: Math.floor(Math.random() * 1000 + 100),
      name: addName.trim(),
      gstin: addGstin.trim() || "N/A",
      email: addEmail.trim() || "N/A",
      creditLimit: parseFloat(addLimit || "0"),
      status: "Active",
      updated: new Date().toISOString().slice(0, 10),
      pan: "ABCDE1234F",
      outstanding: 0,
      lastInvoice: "—",
      lastPayment: "—",
      salesPerson: "Unassigned",
      state: "Gujarat"
    };

    if (activeMaster === "customers") {
      setCustomers([...customers, newObj]);
      toast.success("Customer created successfully!");
    } else {
      setVendors([...vendors, newObj]);
      toast.success("Vendor created successfully!");
    }

    setAddName("");
    setAddGstin("");
    setAddEmail("");
    setAddLimit("");
    setShowAddModal(false);
  };

  const getBreadcrumb = () => {
    const titles: Record<string, string> = {
      customers: "Customers",
      vendors: "Vendors",
      ledgers: "Chart of Accounts",
      godowns: "Godowns & Warehouses",
      "cost-centers": "Cost Centers",
      currencies: "System Currencies"
    };
    return titles[activeMaster] || "Registry";
  };

  const getContextName = () => {
    const map: Record<string, string> = {
      customers: "Customer",
      vendors: "Vendor",
      ledgers: "Ledger",
      godowns: "Warehouse",
      "cost-centers": "Cost Center",
      currencies: "Currency"
    };
    return map[activeMaster] || "Record";
  };

  // Render contextual stats cards
  const renderStats = () => {
    if (activeMaster === "customers") {
      return (
        <>
          <Card style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Customers</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.text1 }}>257</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.green }}>+12 this month</span>
            </div>
          </Card>
          <Card style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Outstanding</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.red }}>₹5.75L</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.green }}>▼ 8%</span>
            </div>
          </Card>
          <Card style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>High Credit Customers</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.amber }}>14</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: T.text3 }}>Limit Exceeded</span>
            </div>
          </Card>
          <Card style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Collection Efficiency</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.primary }}>92%</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.primary }}>Target 95%</span>
            </div>
          </Card>
        </>
      );
    }
    if (activeMaster === "vendors") {
      return (
        <>
          <Card style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Vendors</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.text1 }}>48</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.green }}>+2 this month</span>
            </div>
          </Card>
          <Card style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Payables</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.amber }}>₹3.15L</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.red }}>▲ 4%</span>
            </div>
          </Card>
          <Card style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>High Payable Accounts</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.red }}>8</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: T.text3 }}>Overdue</span>
            </div>
          </Card>
          <Card style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Delivery Compliance</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.green }}>95%</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.green }}>Target 98%</span>
            </div>
          </Card>
        </>
      );
    }
    if (activeMaster === "ledgers") {
      return (
        <>
          <Card style={{ padding: "10px 12px", flex: 1 }}><div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Total Accounts</div><div style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginTop: 2 }}>132</div></Card>
          <Card style={{ padding: "10px 12px", flex: 1 }}><div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Assets Groups</div><div style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginTop: 2 }}>42</div></Card>
          <Card style={{ padding: "10px 12px", flex: 1 }}><div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Liabilities Groups</div><div style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginTop: 2 }}>28</div></Card>
          <Card style={{ padding: "10px 12px", flex: 1 }}><div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Expenses / Income</div><div style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginTop: 2 }}>62</div></Card>
        </>
      );
    }
    return (
      <>
        <Card style={{ padding: "10px 12px", flex: 1 }}><div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Registry Items</div><div style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginTop: 2 }}>12</div></Card>
        <Card style={{ padding: "10px 12px", flex: 1 }}><div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Last Sync</div><div style={{ fontSize: 16, fontWeight: 800, color: T.green, marginTop: 2 }}>Just Now</div></Card>
        <Card style={{ padding: "10px 12px", flex: 1 }}><div style={{ fontSize: 9, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Connected Nodes</div><div style={{ fontSize: 16, fontWeight: 800, color: T.text1, marginTop: 2 }}>2</div></Card>
      </>
    );
  };

  const outstandingVal = selectedRow?.outstanding || 0;
  const creditLimitVal = selectedRow?.creditLimit || 1;
  const creditPct = Math.round((outstandingVal / creditLimitVal) * 100);

  return (
    <div style={{ padding: "16px 20px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      
      {/* 1. Clickable Breadcrumbs Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        borderBottom: `1.5px solid ${T.border}`, paddingBottom: 14, marginBottom: 14, flexWrap: "wrap", gap: 10
      }}>
        <div>
          <div style={{ fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2, display: "flex", gap: 4, alignItems: "center" }}>
            <span onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.color = T.primary} onMouseLeave={e => e.currentTarget.style.color = T.text3}>Dashboard</span>
            <span>&gt;</span>
            <span onClick={() => navigate("/masters")} style={{ cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.color = T.primary} onMouseLeave={e => e.currentTarget.style.color = T.text3}>Masters</span>
            <span>&gt;</span>
            <span style={{ color: T.primary }}>{getBreadcrumb()}</span>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: T.text1, letterSpacing: "-0.5px" }}>
            Master Registry
          </h1>
          <p style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
            Manage all master records used across accounting, inventory, sales and production.
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: T.primary, color: "#fff", border: "none", borderRadius: 6,
              padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer"
            }}
          >
            + Add {getContextName()}
          </button>
          <button
            onClick={() => toast.success("Registry imported successfully.")}
            style={{ padding: "7px 12px", border: `1px solid ${T.border}`, background: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", color: T.text2 }}
          >
            Import
          </button>
          <button
            onClick={() => toast.success("Registry exported successfully.")}
            style={{ padding: "7px 12px", border: `1px solid ${T.border}`, background: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", color: T.text2 }}
          >
            Export
          </button>
          <button
            onClick={() => { setSelectedRow(null); toast.success("Registry cache refreshed successfully."); }}
            style={{ padding: "7px 12px", border: `1px solid ${T.border}`, background: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", color: T.text2 }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Contextual Statistics Cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {renderStats()}
      </div>

      {/* 3. Grid Selector + Table Container */}
      <div style={{
        display: "grid",
        gridTemplateColumns: detailPanelExpanded ? "18% 52% 30%" : "18% calc(82% - 40px) 40px",
        gap: 14, transition: "grid-template-columns 0.25s"
      }}>
        
        {/* Left selector */}
        <Card style={{ padding: 10 }}>
          <h3 style={{ fontSize: 10, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, paddingLeft: 6 }}>Registries</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { id: "customers", label: "Customers", count: 257, badge: "2 Inactive" },
              { id: "vendors", label: "Vendors", count: 48, badge: null },
              { id: "ledgers", label: "Chart of Accounts", count: 132, badge: null },
              { id: "godowns", label: "Warehouses", count: 5, badge: null },
              { id: "cost-centers", label: "Cost Centers", count: 11, badge: null },
              { id: "currencies", label: "Currencies", count: 3, badge: null }
            ].map(m => {
              const isSel = activeMaster === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { setActiveMaster(m.id); setSelectedRow(null); }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", padding: "8px 10px",
                    background: isSel ? T.primary + "15" : "transparent",
                    color: isSel ? T.primary : T.text2, border: "none", borderRadius: 8,
                    fontSize: 11, fontWeight: isSel ? 700 : 500, cursor: "pointer", transition: "all 0.15s"
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {isSel && <span style={{ color: T.primary, fontSize: 8 }}>●</span>}
                    <span>{m.label}</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {m.badge && (
                      <span style={{
                        fontSize: 8, background: T.amberBg, color: T.amber,
                        padding: "1px 4px", borderRadius: 4, fontWeight: 700
                      }}>
                        {m.badge}
                      </span>
                    )}
                    <span style={{
                      fontSize: 9, background: isSel ? T.primary + "20" : "#f1f5f9",
                      color: isSel ? T.primary : T.text3, padding: "2px 6px", borderRadius: 10,
                      fontWeight: 700
                    }}>
                      {m.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Center: Table & Sticky Toolbar */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          
          {/* Sticky Toolbar */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            padding: "10px 14px", background: "#f8fafc", borderBottom: `1px solid ${T.border}`,
            display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center"
          }}>
            <input
              type="text"
              placeholder={`Search ${getBreadcrumb()}...`}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              style={{ flex: 1, minWidth: 150, padding: "5px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11 }}
            />
            <select value={quickFilter} onChange={(e) => setQuickFilter(e.target.value)} style={{ padding: "5px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, background: "#fff", color: T.text2 }}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button style={{ padding: "5px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Columns</button>
            <button style={{ padding: "5px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Filter</button>
            <button style={{ padding: "5px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Sort</button>
            <button style={{ padding: "5px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Bulk Actions</button>
          </div>

          {/* Quick Filters Pill Bar */}
          {["customers", "vendors"].includes(activeMaster) && (
            <div style={{ display: "flex", gap: 6, padding: "8px 14px", borderBottom: `1px solid ${T.border}`, background: "#fff", flexWrap: "wrap" }}>
              {["All", "Active", "Inactive", "Blocked", "High Credit", "GST Pending"].map(f => (
                <button
                  key={f}
                  onClick={() => toast.success(`Applied quick filter: ${f}`)}
                  style={{
                    padding: "3px 10px", borderRadius: 12, border: `1px solid ${T.border}`,
                    background: "#f8fafc", fontSize: 10, color: T.text3, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {activeMaster === "customers" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "8px 12px", width: 30 }}><input type="checkbox" style={{ cursor: "pointer" }} /></th>
                  {["Name", "GSTIN", "City", "Outstanding", "Last Payment", "Risk Score", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.filter(c => c.name.toLowerCase().includes(searchVal.toLowerCase())).map(c => {
                  const isSel = selectedRow?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => { setSelectedRow(c); setDetailPanelExpanded(true); }}
                      onMouseEnter={() => setHoveredRow(c)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        cursor: "pointer",
                        background: isSel ? "#f0f9ff" : "transparent",
                        boxShadow: isSel ? "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)" : "none",
                        transition: "background 0.15s ease, box-shadow 0.15s ease"
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 12px",
                          borderLeft: isSel ? `4px solid ${T.primary}` : "4px solid transparent",
                          transition: "border-left 0.15s ease"
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          style={{ cursor: "pointer" }}
                          checked={isSel}
                          onChange={() => { setSelectedRow(c); setDetailPanelExpanded(true); }}
                        />
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: T.primary, position: "relative" }}>
                        {c.name}

                        {/* Hover Preview Card */}
                        {hoveredRow?.id === c.id && (
                          <div style={{
                            position: "absolute",
                            left: "90%",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "#fff",
                            border: `1.5px solid ${T.primary}`,
                            borderRadius: 10,
                            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                            padding: "12px 14px",
                            width: 220,
                            zIndex: 9999,
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            color: T.text2,
                            pointerEvents: "none"
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>Quick Summary</div>
                            <div style={{ fontWeight: 800, fontSize: 12, color: T.text1 }}>{c.name}</div>
                            
                            <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                              <span style={{ color: T.text3 }}>Outstanding:</span>
                              <span style={{ fontWeight: 700, color: c.outstanding > 0 ? T.red : T.green }}>{inr(c.outstanding)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                              <span style={{ color: T.text3 }}>Last Invoice:</span>
                              <span style={{ fontWeight: 600 }}>{c.lastInvoiceText || "—"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                              <span style={{ color: T.text3 }}>GST:</span>
                              <span style={{ fontWeight: 700, color: T.green }}>Filed</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                              <span style={{ color: T.text3 }}>Orders:</span>
                              <span style={{ fontWeight: 600 }}>{c.ordersCount || 0}</span>
                            </div>

                            <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                            <div style={{ fontSize: 9, fontWeight: 700, color: T.primary, display: "flex", justifyContent: "flex-end" }}>
                              Open Workspace →
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 10, color: T.text3 }}>{c.gstin}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, color: T.text2 }}>{c.city}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600, color: c.outstanding > 0 ? T.red : T.green }}>{inr(c.outstanding)}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, color: T.text2 }}>{c.lastPaymentText}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: c.riskScore.includes("Low") ? T.green : c.riskScore.includes("Medium") ? T.amber : T.red }}>●</span>
                          {c.riskScore.split(" ")[1]}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={badge(c.status === "Active" ? T.green : T.text3, c.status === "Active" ? T.greenBg : T.border)}>{c.status}</span>
                      </td>
                      <td style={{ padding: "8px 12px", position: "relative" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button title="Open Workspace" onClick={() => { setSelectedRow(c); setDetailPanelExpanded(true); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>👁</button>
                          <button title="Edit Record" onClick={() => { setShowAddModal(true); setAddName(c.name); setAddGstin(c.gstin); setAddEmail(c.email); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>✏</button>
                          <button title="Open Ledger" onClick={() => { toast.success(`Opening Ledger for ${c.name}`); navigate("/accounting"); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>📒</button>
                          <button title="Create Invoice" onClick={() => { toast.success(`Generating Invoice for ${c.name}`); navigate("/sales"); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>🧾</button>
                          <button title="Receive Payment" onClick={() => { toast.success(`Receiving Payment from ${c.name}`); navigate("/accounting"); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>💰</button>
                          <button
                            title="More actions"
                            onClick={() => setActiveDropdownId(activeDropdownId === c.id ? null : c.id)}
                            style={{ border: "none", background: "none", fontSize: 12, fontWeight: 800, cursor: "pointer", color: T.text3, padding: "2px 4px" }}
                          >
                            ⋮
                          </button>
                        </div>
                        
                        {activeDropdownId === c.id && (
                          <div style={{
                            position: "absolute", right: 10, top: 26, background: "#fff",
                            border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadow,
                            zIndex: 10, padding: 4, width: 130
                          }}>
                            {["Duplicate", "Archive", "Delete", "View Audit Log", "Export", "Assign Tags"].map(act => (
                              <button
                                key={act}
                                onClick={() => {
                                  toast.success(`${act} executed successfully.`);
                                  setActiveDropdownId(null);
                                }}
                                style={{
                                  display: "block", width: "100%", padding: "6px 10px", border: "none",
                                  background: "none", fontSize: 10, fontWeight: 600, color: act === "Delete" ? T.red : T.text2,
                                  textAlign: "left", cursor: "pointer"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                              >
                                {act}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {activeMaster === "vendors" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "8px 12px", width: 30 }}><input type="checkbox" style={{ cursor: "pointer" }} /></th>
                  {["Name", "GSTIN", "City", "Outstanding", "Last Payment", "Risk Score", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.filter(v => v.name.toLowerCase().includes(searchVal.toLowerCase())).map(v => {
                  const isSel = selectedRow?.id === v.id;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => { setSelectedRow(v); setDetailPanelExpanded(true); }}
                      onMouseEnter={() => setHoveredRow(v)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        cursor: "pointer",
                        background: isSel ? "#f0f9ff" : "transparent",
                        boxShadow: isSel ? "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)" : "none",
                        transition: "background 0.15s ease, box-shadow 0.15s ease"
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 12px",
                          borderLeft: isSel ? `4px solid ${T.primary}` : "4px solid transparent",
                          transition: "border-left 0.15s ease"
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          style={{ cursor: "pointer" }}
                          checked={isSel}
                          onChange={() => { setSelectedRow(v); setDetailPanelExpanded(true); }}
                        />
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: T.primary, position: "relative" }}>
                        {v.name}

                        {/* Hover Preview Card */}
                        {hoveredRow?.id === v.id && (
                          <div style={{
                            position: "absolute",
                            left: "90%",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "#fff",
                            border: `1.5px solid ${T.primary}`,
                            borderRadius: 10,
                            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                            padding: "12px 14px",
                            width: 220,
                            zIndex: 9999,
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            color: T.text2,
                            pointerEvents: "none"
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>Quick Summary</div>
                            <div style={{ fontWeight: 800, fontSize: 12, color: T.text1 }}>{v.name}</div>
                            
                            <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                              <span style={{ color: T.text3 }}>Outstanding:</span>
                              <span style={{ fontWeight: 700, color: v.outstanding > 0 ? T.red : T.green }}>{inr(v.outstanding)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                              <span style={{ color: T.text3 }}>Last Invoice:</span>
                              <span style={{ fontWeight: 600 }}>{v.lastInvoiceText || "—"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                              <span style={{ color: T.text3 }}>GST:</span>
                              <span style={{ fontWeight: 700, color: T.green }}>Filed</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                              <span style={{ color: T.text3 }}>Orders:</span>
                              <span style={{ fontWeight: 600 }}>{v.ordersCount || 0}</span>
                            </div>

                            <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                            <div style={{ fontSize: 9, fontWeight: 700, color: T.primary, display: "flex", justifyContent: "flex-end" }}>
                              Open Workspace →
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 10, color: T.text3 }}>{v.gstin}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, color: T.text2 }}>{v.city}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600, color: v.outstanding > 0 ? T.red : T.green }}>{inr(v.outstanding)}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, color: T.text2 }}>{v.lastPaymentText}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: v.riskScore.includes("Low") ? T.green : v.riskScore.includes("Medium") ? T.amber : T.red }}>●</span>
                          {v.riskScore.split(" ")[1]}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={badge(v.status === "Active" ? T.green : T.text3, v.status === "Active" ? T.greenBg : T.border)}>{v.status}</span>
                      </td>
                      <td style={{ padding: "8px 12px", position: "relative" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button title="Open Workspace" onClick={() => { setSelectedRow(v); setDetailPanelExpanded(true); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>👁</button>
                          <button title="Edit Record" onClick={() => { setShowAddModal(true); setAddName(v.name); setAddGstin(v.gstin); setAddEmail(v.email); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>✏</button>
                          <button title="Open Ledger" onClick={() => { toast.success(`Opening Ledger for ${v.name}`); navigate("/accounting"); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>📒</button>
                          <button title="Create Invoice" onClick={() => { toast.success(`Generating Invoice for ${v.name}`); navigate("/sales"); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>🧾</button>
                          <button title="Receive Payment" onClick={() => { toast.success(`Receiving Payment from ${v.name}`); navigate("/accounting"); }} style={{ border: "none", background: "none", fontSize: 12, cursor: "pointer", padding: "2px 4px" }}>💰</button>
                          <button
                            title="More actions"
                            onClick={() => setActiveDropdownId(activeDropdownId === v.id ? null : v.id)}
                            style={{ border: "none", background: "none", fontSize: 12, fontWeight: 800, cursor: "pointer", color: T.text3, padding: "2px 4px" }}
                          >
                            ⋮
                          </button>
                        </div>
                        
                        {activeDropdownId === v.id && (
                          <div style={{
                            position: "absolute", right: 10, top: 26, background: "#fff",
                            border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: T.shadow,
                            zIndex: 10, padding: 4, width: 130
                          }}>
                            {["Duplicate", "Archive", "Delete", "View Audit Log", "Export", "Assign Tags"].map(act => (
                              <button
                                key={act}
                                onClick={() => {
                                  toast.success(`${act} executed successfully.`);
                                  setActiveDropdownId(null);
                                }}
                                style={{
                                  display: "block", width: "100%", padding: "6px 10px", border: "none",
                                  background: "none", fontSize: 10, fontWeight: 600, color: act === "Delete" ? T.red : T.text2,
                                  textAlign: "left", cursor: "pointer"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                              >
                                {act}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {activeMaster === "ledgers" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                  {["Ledger Account Name", "Parent Group", "Closing Balance", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledgers.map((l, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }} onMouseEnter={e => e.currentTarget.style.background = T.rowHover} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: T.text1 }}>{l.name}</td>
                    <td style={{ padding: "8px 12px", fontSize: 11, color: T.text2 }}>{l.group}</td>
                    <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600 }}>{inr(l.balance)}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={badge(T.green, T.greenBg)}>{l.status}</span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <button onClick={() => toast.success("Opening ledger detail view")} style={{ border: "none", background: "none", color: T.primary, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✏ Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeMaster === "godowns" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${T.border}` }}>
                  {["Warehouse Name", "Physical Location", "Capacity Limit", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {godowns.map((g, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }} onMouseEnter={e => e.currentTarget.style.background = T.rowHover} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: T.text1 }}>{g.name}</td>
                    <td style={{ padding: "8px 12px", fontSize: 11, color: T.text2 }}>{g.location}</td>
                    <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600 }}>{g.capacity}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={badge(T.green, T.greenBg)}>{g.status}</span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <button onClick={() => toast.success("Opening warehouse detail view")} style={{ border: "none", background: "none", color: T.primary, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✏ Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Polished Empty States for Cost Centers / Currencies */}
          {["cost-centers", "currencies"].includes(activeMaster) && (
            <div style={{ padding: "50px 30px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>No Cost Centers Configured</h3>
              <p style={{ fontSize: 11, color: T.text3, marginTop: 4, marginBottom: 14 }}>
                Cost Centers help classify expenses and departments. Create your first one.
              </p>
              <button
                onClick={() => toast.success("Configuring cost center...")}
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: 6,
                  padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer"
                }}
              >
                Create Cost Center
              </button>
            </div>
          )}
        </Card>

        {/* 4. Sliding / Collapsible Split Workspace Panel */}
        {!detailPanelExpanded ? (
          <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 6, height: "100%" }}>
            <button
              onClick={() => setDetailPanelExpanded(true)}
              style={{ background: "none", border: "none", color: T.primary, cursor: "pointer", fontSize: 14, fontWeight: 800 }}
              title="Expand workspace panel"
            >
              ◀
            </button>
          </Card>
        ) : (
          <div style={{
            position: "relative",
            height: "100%",
            overflow: "hidden"
          }}>
            {/* Empty State Panel */}
            <div style={{
              position: "absolute",
              inset: 0,
              transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out",
              transform: selectedRow ? "translateX(-100%)" : "translateX(0)",
              opacity: selectedRow ? 0 : 1,
              pointerEvents: selectedRow ? "none" : "auto",
            }}>
              <Card style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: "16px 18px",
                background: "#fff",
                overflowY: "auto",
                textAlign: "left",
                gap: 12
              }}>
                {/* Search Header */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                    Open {activeMaster === "customers" ? "Customer" : "Vendor"} Workspace
                  </div>
                  <input
                    type="text"
                    placeholder={`🔍 Search ${activeMaster === "customers" ? "customer" : "vendor"}...`}
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    style={{
                      width: "100%", padding: "7px 10px", border: `1px solid ${T.border}`,
                      borderRadius: 6, fontSize: 11, background: "#f8fafc", outline: "none",
                      transition: "border-color 0.15s ease"
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = T.primary}
                    onBlur={e => e.currentTarget.style.borderColor = T.border}
                  />
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                {/* Workspace Title Header */}
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: T.text1 }}>
                    {activeMaster === "customers" ? "Customer" : "Vendor"} Workspace
                  </h4>
                  <div style={{ fontSize: 10, color: T.text3, marginTop: 1, fontWeight: 600 }}>
                    No {activeMaster === "customers" ? "customer" : "vendor"} selected
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                {/* Quick Start Buttons */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Quick Start
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setShowAddModal(true)}
                      style={{
                        flex: 1, padding: "6px 10px", background: T.primary, color: "#fff", border: "none",
                        borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                      }}
                    >
                      ➕ Create
                    </button>
                    <button
                      onClick={() => toast.success("Import triggered.")}
                      style={{
                        flex: 1, padding: "6px 10px", background: "#f1f5f9", border: `1px solid ${T.border}`,
                        borderRadius: 6, fontSize: 10, color: T.text2, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                      }}
                    >
                      📥 Import
                    </button>
                    <button
                      onClick={() => toast.success("Export triggered.")}
                      style={{
                        flex: 1, padding: "6px 10px", background: "#f1f5f9", border: `1px solid ${T.border}`,
                        borderRadius: 6, fontSize: 10, color: T.text2, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                      }}
                    >
                      📤 Export
                    </button>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                {/* Recently Viewed Section */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Recently Viewed
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(activeMaster === "customers"
                      ? ["Sharma Traders", "Patel Enterprises", "ABC Industries"]
                      : ["Reliance Polymers Ltd", "Supreme Plastics Ltd"]
                    ).map((name, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const list = activeMaster === "customers" ? customers : vendors;
                          const found = list.find((item: any) => item.name === name);
                          if (found) { setSelectedRow(found); setDetailPanelExpanded(true); }
                        }}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          width: "100%", padding: "6px 8px", background: "none", border: `1px dashed ${T.border}`,
                          borderRadius: 6, fontSize: 10, color: T.primary, fontWeight: 700,
                          cursor: "pointer", textAlign: "left", transition: "all 0.15s ease"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = T.rowHover;
                          e.currentTarget.style.borderColor = T.primary;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "none";
                          e.currentTarget.style.borderColor = T.border;
                        }}
                      >
                        <span>• {name}</span>
                        <span style={{ fontSize: 8, color: T.text3 }}>Open ↗</span>
                      </button>
                    ))}
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                {/* Favorites Section */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Favorites
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["Ledger", "Outstanding", "GST"].map((fav, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          toast.success(`Opening ${fav} module...`);
                          if (fav === "Ledger" || fav === "Outstanding") navigate("/accounting");
                          if (fav === "GST") navigate("/gst");
                        }}
                        style={{
                          flex: 1, padding: "6px 8px", background: "#fff", border: `1px solid ${T.border}`,
                          borderRadius: 6, fontSize: 10, color: T.text2, fontWeight: 700, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = T.rowHover;
                          e.currentTarget.style.borderColor = T.primary;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "#fff";
                          e.currentTarget.style.borderColor = T.border;
                        }}
                      >
                        <span>⭐</span>
                        <span>{fav}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                {/* Today's Operational Stats */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Today
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10, color: T.text2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: T.green }}>●</span> <span>2 added</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: T.primary }}>●</span> <span>5 generated</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: T.green }}>●</span> <span>₹1.2L collected</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: T.amber }}>●</span> <span>3 reminders sent</span>
                    </div>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "2px 0" }} />

                {/* AI Suggestions / Recommendations */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    AI Recommendations
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{
                      padding: "8px 10px", background: T.red + "08", border: `1px solid ${T.red}15`,
                      borderRadius: 6, fontSize: 10, color: T.text2, display: "flex", flexDirection: "column", gap: 2
                    }}>
                      <div style={{ fontWeight: 700, color: T.red, display: "flex", alignItems: "center", gap: 4 }}>
                        <span>⚠</span> <span>3 customers need follow-up</span>
                      </div>
                      <div style={{ fontSize: 9, color: T.text3 }}>Outstanding balance is ₹5.75L. Risk levels are rising.</div>
                      <button
                        onClick={() => { toast.success("Opening outstanding collection report..."); navigate("/accounting"); }}
                        style={{ alignSelf: "flex-end", background: "none", border: "none", color: T.primary, fontSize: 9, fontWeight: 700, cursor: "pointer", padding: 0 }}
                      >
                        Open collection report →
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {[
                        { text: "2 inactive customers this week", icon: "💡", color: T.primary },
                        { text: "5 GST pending filing", icon: "💡", color: T.amber },
                        { text: "3 credit limits exceeded", icon: "💡", color: T.red },
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: T.text2 }}>
                          <span style={{ color: item.color }}>{item.icon}</span>
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Workspace Panel */}
            <div style={{
              position: "absolute",
              inset: 0,
              transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out",
              transform: selectedRow ? "translateX(0)" : "translateX(100%)",
              opacity: selectedRow ? 1 : 0,
              pointerEvents: selectedRow ? "auto" : "none",
            }}>
              <Card style={{
                borderLeft: `4px solid ${T.primary}`, border: `1px solid ${T.border}`,
                display: "flex", flexDirection: "column", gap: 10, padding: 14, height: "100%", position: "relative",
                overflowY: "auto"
              }}>
                {/* Workspace Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                      {activeMaster === "customers" ? "Customer Workspace" : "Vendor Workspace"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 800, color: T.text1, letterSpacing: "-0.3px" }}>
                        {selectedRow?.name || "No active record"}
                      </h4>
                      <span style={badge(selectedRow?.status === "Active" ? T.green : T.text3, selectedRow?.status === "Active" ? T.greenBg : T.border)}>
                        {selectedRow?.status || "Active"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      onClick={() => setDetailPanelExpanded(false)}
                      style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 12 }}
                      title="Collapse workspace panel"
                    >
                      ▶
                    </button>
                    <button onClick={() => setSelectedRow(null)} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 14 }}>✕</button>
                  </div>
                </div>

                {/* KPI Summary Grid (2x2 Cards) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  <div style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: T.text3, textTransform: "uppercase" }}>Outstanding Balance</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: selectedRow?.outstanding > 0 ? T.red : T.green, marginTop: 2 }}>
                      {selectedRow ? inr(selectedRow.outstanding) : "₹0"}
                    </div>
                  </div>
                  <div style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: T.text3, textTransform: "uppercase" }}>Credit Used</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.text1, marginTop: 2 }}>{creditPct}%</div>
                    {/* Tiny credit progress bar */}
                    <div style={{ width: "100%", height: 3, background: "#e2e8f0", borderRadius: 1.5, overflow: "hidden", marginTop: 4 }}>
                      <div style={{ width: `${Math.min(creditPct, 100)}%`, height: "100%", background: creditPct > 80 ? T.red : T.primary }} />
                    </div>
                  </div>
                  <div style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: T.text3, textTransform: "uppercase" }}>Last Invoice</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, marginTop: 3 }}>
                      {selectedRow?.lastInvoiceText || "No Invoices"}
                    </div>
                  </div>
                  <div style={{ background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: T.text3, textTransform: "uppercase" }}>Risk Score</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: T.text2, marginTop: 3 }}>
                      <span style={{ color: selectedRow?.riskScore?.includes("Low") ? T.green : selectedRow?.riskScore?.includes("Medium") ? T.amber : T.red }}>●</span>
                      {selectedRow?.riskScore?.split(" ")[1] || "Low"}
                    </div>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />

                {/* Workspace Quick Actions */}
                <div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Quick Bill Actions
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => { toast.success(`Creating invoice for ${selectedRow?.name}`); navigate("/sales"); }}
                      style={{
                        flex: 1, padding: "6px 8px", background: T.primary, color: "#fff", border: "none",
                        borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                      }}
                    >
                      🧾 Create Invoice
                    </button>
                    <button
                      onClick={() => { toast.success(`Recording payment for ${selectedRow?.name}`); navigate("/accounting"); }}
                      style={{
                        flex: 1, padding: "6px 8px", background: "#f1f5f9", border: `1px solid ${T.border}`,
                        borderRadius: 6, fontSize: 10, color: T.text2, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                      }}
                    >
                      💰 Receive Payment
                    </button>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />

                {/* Mini ERP Apps Module Grid */}
                <div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Workspace Apps Modules
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { name: "Profile", icon: "👤", desc: "Master Details" },
                      { name: "Ledger", icon: "📒", desc: "Transactions" },
                      { name: "Invoices", icon: "🧾", desc: "Billing History" },
                      { name: "Payments", icon: "💰", desc: "Payments Recd" },
                      { name: "Orders", icon: "📦", desc: "Direct Sales" },
                      { name: "Contacts", icon: "📞", desc: "Directories" },
                      { name: "Documents", icon: "📂", desc: "Document Vault" },
                      { name: "AI Assistant", icon: "🤖", desc: "Health Insights" }
                    ].map(app => (
                      <div
                        key={app.name}
                        onClick={() => {
                          toast.success(`Opening ${app.name} app console...`);
                          if (app.name === "Ledger" || app.name === "Payments") navigate("/accounting");
                          if (app.name === "Invoices" || app.name === "Orders") navigate("/sales");
                          if (app.name === "Documents") setDetailTab("notes");
                        }}
                        style={{
                          background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 8,
                          padding: "8px 10px", cursor: "pointer", display: "flex", flexDirection: "column",
                          gap: 2, transition: "all 0.15s ease", boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = T.primary;
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(67, 97, 238, 0.08)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = T.border;
                          e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, color: T.text1 }}>
                          <span>{app.icon}</span> <span>{app.name}</span>
                        </div>
                        <div style={{ fontSize: 8, color: T.text3, fontWeight: 500 }}>{app.desc}</div>
                        <div style={{ fontSize: 8, color: T.primary, fontWeight: 700, marginTop: 4, display: "flex", justifyContent: "flex-end" }}>Open →</div>
                      </div>
                    ))}
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />

                {/* AI Recommendations */}
                <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: T.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>AI Suggestions</div>
                  <div style={{ fontSize: 9, color: T.text2, lineHeight: 1.3, fontWeight: 500 }}>
                    💡 AI Insights: Payments usually arrive in 8 days. Outstanding risk is <span style={{ color: T.green, fontWeight: 700 }}>LOW</span>. No action needed.
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />

                {/* Timeline */}
                <div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Timeline
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4, borderLeft: `1px solid ${T.border}`, position: "relative", marginLeft: 6 }}>
                    {[
                      { time: "Yesterday", text: "Invoice Created (#INV-921)" },
                      { time: "Monday", text: "Payment Received (₹50,000)" },
                      { time: "Friday", text: "GST Filing Matches verified" },
                      { time: "2 Jun", text: "Registry Node Added" }
                    ].map((step, idx) => (
                      <div key={idx} style={{ position: "relative", paddingLeft: 10 }}>
                        <div style={{
                          position: "absolute", left: -7.5, top: 4, width: 6, height: 6,
                          borderRadius: 3, background: idx === 0 ? T.primary : T.text3
                        }} />
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.text1 }}>{step.time}</div>
                        <div style={{ fontSize: 8, color: T.text3 }}>{step.text}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />

                {/* Document Vault */}
                <div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Document Vault
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(selectedRow?.documents || ["GST Certificate.pdf"]).map((doc: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => toast.success(`Downloading file: ${doc}`)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
                          background: "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 6,
                          fontSize: 9, color: T.text2, cursor: "pointer", fontWeight: 600
                        }}
                      >
                        <span>📁</span>
                        <span>{doc}</span>
                        <span style={{ fontSize: 8, color: T.primary, marginLeft: "auto" }}>Download</span>
                      </div>
                    ))}
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "4px 0" }} />

                {/* Assigned Manager & Last Activity */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, paddingBottom: 10 }}>
                  <div>
                    <div style={{ color: T.text3, fontSize: 8 }}>Account Manager</div>
                    <div style={{ fontWeight: 700, color: T.text1 }}>Bhavesh Khimsuriya</div>
                    <div style={{ fontSize: 8, color: T.text3 }}>Sales Manager</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: T.text3, fontSize: 8 }}>Last Activity</div>
                    <div style={{ fontWeight: 700, color: T.text1 }}>Invoice Created</div>
                    <div style={{ fontSize: 8, color: T.text3 }}>Yesterday</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Add Master Modal Overlay */}
      {showAddModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999, padding: 20
        }}>
          <div style={{
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16,
            width: "100%", maxWidth: 450, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text1 }}>Add new {activeMaster === "customers" ? "Customer" : "Vendor"}</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", fontSize: 18, color: T.text3, cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Industries Ltd"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>GSTIN</label>
                <input
                  type="text"
                  placeholder="e.g. 24AAACS1234Z2Z1"
                  value={addGstin}
                  onChange={(e) => setAddGstin(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. account@acme.in"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>Credit Limit (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={addLimit}
                  onChange={(e) => setAddLimit(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13 }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
                  padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8
                }}
              >
                Save Registry Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
