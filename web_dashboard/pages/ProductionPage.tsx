// pages/ProductionPage.tsx — BOM + Production Orders + QC
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge, thStyle, tdStyle } from "../store/theme";

const TAB_STYLE = (active: boolean) => ({
  padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13,
  background: active ? T.primary : "transparent",
  color: active ? "#fff" : T.text3, border: "none", cursor: "pointer",
});

const QC_COLOR: Record<string, string> = { pass: T.green, fail: T.red, pending: T.amber };

export default function ProductionPage() {
  const [tab, setTab] = useState<"orders" | "bom" | "qc">("orders");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNewBom, setShowNewBom] = useState(false);
  const [showNewQC, setShowNewQC] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const qc = useQueryClient();

  const { data: ordersData, isLoading: ordLoading } = useQuery({
    queryKey: ["prod-orders"],
    queryFn: () => api.get("/production/orders", { params: { limit: 100 } }).then(r => r.data),
  });

  const { data: bomData, isLoading: bomLoading } = useQuery({
    queryKey: ["bom-list"],
    queryFn: () => api.get("/production/bom").then(r => r.data),
    enabled: tab === "bom",
  });

  const { data: qcData, isLoading: qcLoading } = useQuery({
    queryKey: ["qc-list"],
    queryFn: () => api.get("/production/qc", { params: { limit: 100 } }).then(r => r.data),
    enabled: tab === "qc",
  });

  const { data: items } = useQuery({
    queryKey: ["items-simple"],
    queryFn: () => api.get("/inventory/items", { params: { limit: 200 } }).then(r => r.data.items || []),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, ...p }: any) => api.patch(`/production/orders/${id}`, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prod-orders"] }),
  });

  const updateQC = useMutation({
    mutationFn: ({ id, ...p }: any) => api.patch(`/production/qc/${id}`, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qc-list"] }),
  });

  const orders = ordersData?.items || [];
  const boms = bomData?.items || [];
  const checks = qcData?.items || [];

  const kpis = [
    { label: "Total Orders", value: orders.length, color: T.primary },
    { label: "In Progress", value: orders.filter((o: any) => o.status === "in_progress").length, color: T.amber },
    { label: "Completed", value: orders.filter((o: any) => o.status === "completed").length, color: T.green },
    { label: "QC Pending", value: checks.filter((c: any) => c.result === "pending").length, color: T.red },
  ];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, margin: 0 }}>Production</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "orders" && <button onClick={() => setShowNewOrder(true)} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>+ New Order</button>}
          {tab === "bom" && <button onClick={() => setShowNewBom(true)} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>+ New BOM</button>}
          {tab === "qc" && <button onClick={() => setShowNewQC(true)} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>+ New QC Check</button>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={cardStyle({ padding: "14px 18px", flex: 1, textAlign: "center" })}>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {(["orders", "bom", "qc"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={TAB_STYLE(tab === t)}>
            {t === "orders" ? "Orders" : t === "bom" ? "BOM" : "QC"}
          </button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <div style={cardStyle({ overflow: "hidden" })}>
          {ordLoading ? <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading…</div> :
            orders.length === 0 ? <div style={{ padding: 60, textAlign: "center", color: T.text3 }}>No production orders yet.<br /><span style={{ fontSize: 11 }}>Create a BOM first, then add orders.</span></div> :
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Order No.", "Product", "BOM", "Planned Qty", "Actual Qty", "Date", "Shift", "Status", "Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {orders.map((o: any) => {
                    const sc = { planned: { c: T.text3, bg: "#f8fafc" }, in_progress: { c: T.amber, bg: T.amberBg }, completed: { c: T.green, bg: T.greenBg }, cancelled: { c: T.red, bg: T.redBg } }[o.status as string] || { c: T.text3, bg: "#f8fafc" };
                    return (
                      <tr key={o.id} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                        <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{o.order_number}</td>
                        <td style={{ ...tdStyle, color: T.text1 }}>{o.product_name || "—"}</td>
                        <td style={tdStyle}>{o.bom_name || "—"}</td>
                        <td style={tdStyle}>{o.planned_qty}</td>
                        <td style={tdStyle}>{o.actual_qty ?? "—"}</td>
                        <td style={tdStyle}>{o.planned_date?.slice(0, 10) || "—"}</td>
                        <td style={tdStyle}>{o.shift || "—"}</td>
                        <td style={tdStyle}><span style={badge(sc.c, sc.bg)}>{o.status?.replace("_", " ").toUpperCase()}</span></td>
                        <td style={tdStyle}>
                          <select value={o.status} onChange={e => updateOrder.mutate({ id: o.id, status: e.target.value })}
                            style={{ fontSize: 11, borderRadius: 6, border: `1px solid ${T.border}`, padding: "3px 6px", cursor: "pointer" }}>
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On Hold</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>}
        </div>
      )}

      {/* BOM TAB */}
      {tab === "bom" && (
        <div style={cardStyle({ overflow: "hidden" })}>
          {bomLoading ? <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading…</div> :
            boms.length === 0 ? <div style={{ padding: 60, textAlign: "center", color: T.text3 }}>No BOMs yet. Create a Bill of Materials to start production.</div> :
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["BOM Name", "Finished Item", "Output Qty", "Unit", "Components", "Status"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {boms.map((b: any) => (
                    <tr key={b.id} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{b.bom_name}</td>
                      <td style={{ ...tdStyle, color: T.text1 }}>{b.finished_item_name || "—"}</td>
                      <td style={tdStyle}>{b.output_quantity}</td>
                      <td style={tdStyle}>{b.output_unit}</td>
                      <td style={tdStyle}><span style={badge(T.primary, T.primary + "15")}>{b.component_count} items</span></td>
                      <td style={tdStyle}><span style={badge(b.is_active ? T.green : T.text3, b.is_active ? T.greenBg : "#f8fafc")}>{b.is_active ? "ACTIVE" : "INACTIVE"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </div>
      )}

      {/* QC TAB */}
      {tab === "qc" && (
        <div style={cardStyle({ overflow: "hidden" })}>
          {qcLoading ? <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading…</div> :
            checks.length === 0 ? <div style={{ padding: 60, textAlign: "center", color: T.text3 }}>No QC checks yet.</div> :
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Order No.", "Check Name", "Type", "Expected", "Actual", "Tolerance", "Checked By", "Result", "Action"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {checks.map((c: any) => (
                    <tr key={c.id} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{c.order_number || "—"}</td>
                      <td style={{ ...tdStyle, color: T.text1, fontWeight: 600 }}>{c.check_name}</td>
                      <td style={tdStyle}>{c.check_type}</td>
                      <td style={tdStyle}>{c.expected_value || "—"}</td>
                      <td style={tdStyle}>{c.actual_value || "—"}</td>
                      <td style={tdStyle}>{c.tolerance_pct}%</td>
                      <td style={tdStyle}>{c.checked_by || "—"}</td>
                      <td style={tdStyle}><span style={badge(QC_COLOR[c.result] || T.text3, (QC_COLOR[c.result] || T.text3) + "20")}>{c.result?.toUpperCase()}</span></td>
                      <td style={tdStyle}>
                        {c.result === "pending" && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => updateQC.mutate({ id: c.id, result: "pass" })} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>Pass</button>
                            <button onClick={() => updateQC.mutate({ id: c.id, result: "fail" })} style={{ background: T.red, color: "#fff", border: "none", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>Fail</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </div>
      )}

      {/* NEW ORDER MODAL */}
      {showNewOrder && <Modal title="New Production Order" onClose={() => setShowNewOrder(false)}>
        <NewOrderForm boms={boms} onSubmit={async (d: any) => {
          await api.post("/production/orders", d);
          qc.invalidateQueries({ queryKey: ["prod-orders"] });
          setShowNewOrder(false);
        }} />
      </Modal>}

      {/* NEW BOM MODAL */}
      {showNewBom && <Modal title="New Bill of Materials" onClose={() => setShowNewBom(false)}>
        <NewBomForm items={items || []} onSubmit={async (d: any) => {
          await api.post("/production/bom", d);
          qc.invalidateQueries({ queryKey: ["bom-list"] });
          setShowNewBom(false);
        }} />
      </Modal>}

      {/* NEW QC MODAL */}
      {showNewQC && <Modal title="New QC Check" onClose={() => setShowNewQC(false)}>
        <NewQCForm orders={orders} onSubmit={async (d: any) => {
          await api.post("/production/qc", d);
          qc.invalidateQueries({ queryKey: ["qc-list"] });
          setShowNewQC(false);
        }} />
      </Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: any) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 480, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px #0003" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text1 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.text3 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase" }}>{label}</label>{children}</div>;
}

const inp = { width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 13, boxSizing: "border-box" as const };
const btn = { background: T.primary, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", width: "100%", fontSize: 14, marginTop: 8 };

function NewOrderForm({ boms, onSubmit }: any) {
  const [f, setF] = useState({ bom_id: "", planned_qty: "1", planned_date: new Date().toISOString().slice(0, 10), shift: "morning", notes: "" });
  const s = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v.target.value }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...f, planned_qty: Number(f.planned_qty) }); }}>
      <Field label="BOM / Product"><select value={f.bom_id} onChange={s("bom_id")} style={inp} required><option value="">Select BOM…</option>{boms.map((b: any) => <option key={b.id} value={b.id}>{b.bom_name} — {b.finished_item_name}</option>)}</select></Field>
      <Field label="Planned Qty"><input type="number" value={f.planned_qty} onChange={s("planned_qty")} style={inp} min="0.001" step="0.001" required /></Field>
      <Field label="Planned Date"><input type="date" value={f.planned_date} onChange={s("planned_date")} style={inp} required /></Field>
      <Field label="Shift"><select value={f.shift} onChange={s("shift")} style={inp}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="night">Night</option></select></Field>
      <Field label="Notes"><textarea value={f.notes} onChange={s("notes")} style={{ ...inp, height: 60 }} /></Field>
      <button type="submit" style={btn}>Create Order</button>
    </form>
  );
}

function NewBomForm({ items, onSubmit }: any) {
  const [f, setF] = useState({ finished_item_id: "", bom_name: "", output_quantity: "1", output_unit: "KG", notes: "" });
  const [comps, setComps] = useState<any[]>([]);
  const s = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v.target.value }));
  const addComp = () => setComps(c => [...c, { item_id: "", quantity: "1", unit: "KG", wastage_pct: "0" }]);
  const sc = (i: number, k: string) => (v: any) => setComps(c => c.map((r, j) => j === i ? { ...r, [k]: v.target.value } : r));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...f, output_quantity: Number(f.output_quantity), components: comps.map(c => ({ ...c, quantity: Number(c.quantity), wastage_pct: Number(c.wastage_pct) })) }); }}>
      <Field label="BOM Name"><input value={f.bom_name} onChange={s("bom_name")} style={inp} required /></Field>
      <Field label="Finished Item"><select value={f.finished_item_id} onChange={s("finished_item_id")} style={inp} required><option value="">Select item…</option>{items.map((i: any) => <option key={i.id} value={i.id}>{i.item_name}</option>)}</select></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="Output Qty"><input type="number" value={f.output_quantity} onChange={s("output_quantity")} style={inp} min="0.001" step="0.001" required /></Field></div>
        <div style={{ flex: 1 }}><Field label="Unit"><select value={f.output_unit} onChange={s("output_unit")} style={inp}><option>KG</option><option>PCS</option><option>LTR</option><option>MT</option></select></Field></div>
      </div>
      <div style={{ borderTop: `1px solid ${T.border}`, marginBottom: 12, paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>Raw Materials / Components</span>
          <button type="button" onClick={addComp} style={{ fontSize: 12, background: T.primary + "15", color: T.primary, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>+ Add</button>
        </div>
        {comps.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 3 }}><select value={c.item_id} onChange={sc(i, "item_id")} style={{ ...inp, padding: "6px 8px" }}><option value="">Item…</option>{items.map((it: any) => <option key={it.id} value={it.id}>{it.item_name}</option>)}</select></div>
            <div style={{ flex: 1 }}><input type="number" placeholder="Qty" value={c.quantity} onChange={sc(i, "quantity")} style={{ ...inp, padding: "6px 8px" }} min="0.001" step="0.001" /></div>
            <div style={{ flex: 1 }}><select value={c.unit} onChange={sc(i, "unit")} style={{ ...inp, padding: "6px 8px" }}><option>KG</option><option>PCS</option><option>LTR</option><option>MT</option></select></div>
            <div style={{ flex: 1 }}><input type="number" placeholder="Wastage%" value={c.wastage_pct} onChange={sc(i, "wastage_pct")} style={{ ...inp, padding: "6px 8px" }} min="0" max="100" /></div>
            <button type="button" onClick={() => setComps(c2 => c2.filter((_, j) => j !== i))} style={{ background: T.redBg, color: T.red, border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>×</button>
          </div>
        ))}
        {comps.length === 0 && <div style={{ fontSize: 12, color: T.text3, textAlign: "center", padding: 8 }}>No components yet — click Add</div>}
      </div>
      <button type="submit" style={btn}>Save BOM</button>
    </form>
  );
}

function NewQCForm({ orders, onSubmit }: any) {
  const [f, setF] = useState({ production_order_id: "", check_name: "", check_type: "visual", expected_value: "", tolerance_pct: "0" });
  const s = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v.target.value }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...f, tolerance_pct: Number(f.tolerance_pct) }); }}>
      <Field label="Production Order"><select value={f.production_order_id} onChange={s("production_order_id")} style={inp} required><option value="">Select order…</option>{orders.map((o: any) => <option key={o.id} value={o.id}>{o.order_number} — {o.product_name}</option>)}</select></Field>
      <Field label="Check Name"><input value={f.check_name} onChange={s("check_name")} style={inp} placeholder="e.g. Weight Check, Colour Check" required /></Field>
      <Field label="Check Type"><select value={f.check_type} onChange={s("check_type")} style={inp}><option value="visual">Visual</option><option value="measurement">Measurement</option><option value="weight">Weight</option><option value="lab">Lab Test</option></select></Field>
      <Field label="Expected Value"><input value={f.expected_value} onChange={s("expected_value")} style={inp} placeholder="e.g. 100 KG, Red, Pass" /></Field>
      <Field label="Tolerance %"><input type="number" value={f.tolerance_pct} onChange={s("tolerance_pct")} style={inp} min="0" max="100" /></Field>
      <button type="submit" style={btn}>Add QC Check</button>
    </form>
  );
}
