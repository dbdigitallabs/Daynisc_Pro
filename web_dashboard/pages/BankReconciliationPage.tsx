// src/pages/BankReconciliationPage.tsx
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import {
  IconCheck, IconEye, IconPlus, IconDownload, IconPrinter, IconAlertTriangle,
  IconBarChart, IconSearch, IconX, IconBuilding, IconFolder, IconMoney,
  IconArrowUp, IconArrowDown, IconAI, IconClipboard
} from "../components/Icons";
import toast from "react-hot-toast";

export default function BankReconciliationPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedStatementId, setSelectedStatementId] = useState<string>("stmt-hdfc-01");
  const [activeTab, setActiveTab] = useState<"exact" | "suggested" | "missing" | "unpresented">("missing");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [brsModalOpen, setBrsModalOpen] = useState(false);
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [selectedTxnForVoucher, setSelectedTxnForVoucher] = useState<any>(null);

  // Form states for manual voucher customization
  const [customParty, setCustomParty] = useState("");
  const [customVType, setCustomVType] = useState("payment");
  const [customLedger, setCustomLedger] = useState("");
  const [customSyncTally, setCustomSyncTally] = useState(true);

  // Upload modal states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState("HDFC Bank Current A/c - 50200012345");
  const [allowReimport, setAllowReimport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: statementsData } = useQuery({
    queryKey: ["bank-statements"],
    queryFn: () => api.get("/bank/statements").then((r) => r.data).catch(() => ({ items: [] })),
  });

  const { data: reconData, isLoading: reconLoading, refetch: refetchRecon } = useQuery({
    queryKey: ["bank-reconcile", selectedStatementId],
    queryFn: () => api.get(`/bank/reconcile/${selectedStatementId}`).then((r) => r.data).catch(() => null),
    enabled: Boolean(selectedStatementId),
  });

  const statements = statementsData?.items || [];
  const recon = reconData?.reconciliation || {};
  const brs = reconData?.brs || {};
  const stats = recon?.stats || {};

  const exactMatches = recon?.exact_matches || [];
  const suggestedMatches = recon?.suggested_matches || [];
  const missingInBooks = recon?.missing_in_books || [];
  const unpresentedVouchers = recon?.unpresented_vouchers || [];

  // ── Actions & Mutations ─────────────────────────────────────────────────────
  const createVoucherMutation = useMutation({
    mutationFn: (payload: any) => api.post("/bank/reconcile/create-voucher", payload),
    onSuccess: (res) => {
      toast.success(res.data?.message || "Voucher created successfully!");
      if (res.data?.tally_synced) {
        toast.success("✓ Synced to TallyPrime!");
      }
      refetchRecon();
      qc.invalidateQueries({ queryKey: ["vouchers-list"] });
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
      setCustomizeModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Failed to create voucher");
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: () => api.post("/bank/reconcile/bulk-create-vouchers", {
      statement_id: selectedStatementId,
      sync_to_tally: true,
    }),
    onSuccess: (res) => {
      toast.success(res.data?.message || `Created ${res.data?.created_count} vouchers!`);
      refetchRecon();
      qc.invalidateQueries({ queryKey: ["vouchers-list"] });
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Bulk creation failed");
    },
  });

  const confirmMatchMutation = useMutation({
    mutationFn: ({ txn_id, voucher_id }: { txn_id: string; voucher_id: string }) =>
      api.post("/bank/reconcile/match", {
        statement_id: selectedStatementId,
        txn_id,
        voucher_id,
      }),
    onSuccess: (res) => {
      toast.success(res.data?.message || "Match confirmed!");
      refetchRecon();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.message || "Match confirmation failed");
    },
  });

  // Handle Statement Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a bank statement file (PDF, Excel, or CSV)");
      return;
    }

    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("bank_account", selectedBankAccount);
    fd.append("allow_reimport", String(allowReimport));

    try {
      const res = await api.post("/bank/statements/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.is_duplicate) {
        toast.error(res.data?.message || "This statement was already imported.");
      } else {
        toast.success(res.data?.message || "Statement imported and analyzed successfully!");
        if (res.data?.statement_id) {
          setSelectedStatementId(res.data.statement_id);
        }
      }
      setUploadModalOpen(false);
      setSelectedFile(null);
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
      refetchRecon();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Failed to import statement");
    } finally {
      setIsUploading(false);
    }
  };

  const openCustomizeModal = (txn: any) => {
    setSelectedTxnForVoucher(txn);
    const ai = txn.ai_analysis || {};
    setCustomParty(ai.identified_party || txn.party_name || "");
    setCustomVType(ai.recommended_voucher_type || (txn.withdrawal > 0 ? "payment" : "receipt"));
    setCustomLedger(ai.suggested_ledger || "Direct Bank Entry");
    setCustomSyncTally(true);
    setCustomizeModalOpen(true);
  };

  const handleQuickCreateVoucher = (txn: any) => {
    const ai = txn.ai_analysis || {};
    createVoucherMutation.mutate({
      statement_id: selectedStatementId,
      txn_id: txn.id,
      party_name: ai.identified_party || txn.party_name,
      voucher_type: ai.recommended_voucher_type || (txn.withdrawal > 0 ? "payment" : "receipt"),
      account_ledger: ai.suggested_ledger,
      sync_to_tally: true,
    });
  };

  // Filter missing items by search query
  const filteredMissing = missingInBooks.filter((m: any) => {
    const q = searchQuery.toLowerCase();
    return (
      (m.narration || "").toLowerCase().includes(q) ||
      (m.reference_number || "").toLowerCase().includes(q) ||
      (m.ai_analysis?.identified_party || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #0f766e, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <IconBuilding size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text1, margin: 0 }}>
                Bank Automation & Reconciliation
              </h1>
              <p style={{ fontSize: 12, color: T.text3, marginTop: 2, margin: 0 }}>
                Import PDF/Excel statements, auto-identify parties with NLP, generate vouchers & certify BRS
              </p>
            </div>
          </div>
        </div>

        {/* Top Control Bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Statement Picker */}
          <select
            value={selectedStatementId}
            onChange={(e) => setSelectedStatementId(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: T.radiusSm,
              border: `1px solid ${T.border}`,
              background: "#fff",
              fontSize: 12,
              fontWeight: 600,
              color: T.text1,
              cursor: "pointer",
            }}
          >
            {statements.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.filename} ({s.total_lines} lines) — {s.bank_account}
              </option>
            ))}
          </select>

          {/* Upload Statement Button */}
          <button
            onClick={() => setUploadModalOpen(true)}
            style={{
              background: "linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)",
              color: "#fff",
              border: "none",
              borderRadius: T.radiusSm,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(67, 97, 238, 0.3)",
            }}
          >
            <IconPlus size={14} color="#fff" /> Upload Statement (PDF/Excel)
          </button>

          {/* BRS Report Button */}
          <button
            onClick={() => setBrsModalOpen(true)}
            style={{
              background: "#f0fdfa",
              color: "#0f766e",
              border: "1px solid #0d9488",
              borderRadius: T.radiusSm,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconClipboard size={14} color="#0f766e" /> Certified BRS Statement
          </button>
        </div>
      </div>

      {/* ── BRS Financial Balance Bar ────────────────────────────────────────── */}
      <div
        style={{
          ...cardStyle({
            padding: "16px 20px",
            marginBottom: 20,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e2e8f0",
          }),
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Bank Statement Balance</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text1, marginTop: 4 }}>
              {inr(reconData?.closing_balance || brs.balance_as_per_bank_statement)}
            </div>
            <div style={{ fontSize: 10, color: T.green, fontWeight: 600, marginTop: 2 }}>
              Closing balance as per statement
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>In-Transit Adjustments</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.primary, marginTop: 4 }}>
              {inr((brs.adjustments?.add_uncredited_deposits || 0) - (brs.adjustments?.less_unpresented_cheques || 0))}
            </div>
            <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>
              Unpresented: {inr(brs.adjustments?.less_unpresented_cheques || 0)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>ERP Books Balance</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text1, marginTop: 4 }}>
              {inr(brs.balance_as_per_books)}
            </div>
            <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>
              Total posted ERP vouchers
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Reconciliation Discrepancy</div>
            <div style={{ marginTop: 6 }}>
              {brs.is_reconciled ? (
                <span style={{ ...badge(T.green, T.greenBg), padding: "4px 10px", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconCheck size={12} color={T.green} /> Fully Reconciled (₹0.00)
                </span>
              ) : (
                <span style={{ ...badge(T.amber, T.amberBg), padding: "4px 10px", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconAlertTriangle size={12} color={T.amber} /> Discrepancy: {inr(brs.reconciliation_discrepancy)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Metric Summary Row ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ ...cardStyle({ padding: "14px 16px", borderLeft: `4px solid ${T.primary}` }) }}>
          <div style={{ fontSize: 10, color: T.text3, fontWeight: 700, textTransform: "uppercase" }}>Total Statement Lines</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text1, marginTop: 4 }}>{stats.total_statement_lines || 0}</div>
          <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>Extracted transactions</div>
        </div>

        <div style={{ ...cardStyle({ padding: "14px 16px", borderLeft: `4px solid ${T.green}` }) }}>
          <div style={{ fontSize: 10, color: T.green, fontWeight: 700, textTransform: "uppercase" }}>Auto-Matched (Exact)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.green, marginTop: 4 }}>{stats.exact_matched_count || 0}</div>
          <div style={{ fontSize: 10, color: T.green, fontWeight: 600, marginTop: 2 }}>{stats.match_rate_pct || 0}% match rate</div>
        </div>

        <div style={{ ...cardStyle({ padding: "14px 16px", borderLeft: `4px solid ${T.amber}` }) }}>
          <div style={{ fontSize: 10, color: T.amber, fontWeight: 700, textTransform: "uppercase" }}>Suggested (Review)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.amber, marginTop: 4 }}>{stats.suggested_count || 0}</div>
          <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>AI confidence 70–94%</div>
        </div>

        <div style={{ ...cardStyle({ padding: "14px 16px", borderLeft: `4px solid ${T.purple}` }) }}>
          <div style={{ fontSize: 10, color: T.purple, fontWeight: 700, textTransform: "uppercase" }}>Missing in ERP Books</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.purple, marginTop: 4 }}>{stats.missing_books_count || 0}</div>
          <div style={{ fontSize: 10, color: T.purple, fontWeight: 600, marginTop: 2 }}>Ready for 1-click creation</div>
        </div>

        <div style={{ ...cardStyle({ padding: "14px 16px", borderLeft: `4px solid ${T.cyan}` }) }}>
          <div style={{ fontSize: 10, color: T.cyan, fontWeight: 700, textTransform: "uppercase" }}>In-Transit Vouchers</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.cyan, marginTop: 4 }}>{stats.unpresented_vouchers_count || 0}</div>
          <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>Book vouchers awaiting clearing</div>
        </div>
      </div>

      {/* ── 4-Tab Reconciliation Workbench ─────────────────────────────────── */}
      <div style={{ ...cardStyle({ padding: 0, overflow: "hidden" }) }}>
        {/* Workbench Header Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: "#f8fafc", padding: "0 16px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "missing", label: "Missing in ERP Books", count: missingInBooks.length, color: T.purple },
              { key: "suggested", label: "Suggested Matches", count: suggestedMatches.length, color: T.amber },
              { key: "exact", label: "Auto-Matched (Exact)", count: exactMatches.length, color: T.green },
              { key: "unpresented", label: "In-Transit Vouchers", count: unpresentedVouchers.length, color: T.cyan },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: "14px 16px",
                  border: "none",
                  background: "transparent",
                  borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : "3px solid transparent",
                  color: activeTab === tab.key ? T.text1 : T.text3,
                  fontWeight: activeTab === tab.key ? 800 : 600,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {tab.label}
                <span
                  style={{
                    background: activeTab === tab.key ? tab.color : "#e2e8f0",
                    color: activeTab === tab.key ? "#fff" : T.text2,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 10,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Action Toolbar on Tab */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0" }}>
            {activeTab === "missing" && missingInBooks.length > 0 && (
              <button
                disabled={bulkCreateMutation.isPending}
                onClick={() => bulkCreateMutation.mutate()}
                style={{
                  background: T.purple,
                  color: "#fff",
                  border: "none",
                  borderRadius: T.radiusSm,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <IconAI size={13} color="#fff" />
                {bulkCreateMutation.isPending ? "Generating Vouchers…" : `Bulk Create All Vouchers (${missingInBooks.length})`}
              </button>
            )}

            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search narration, party, UTR…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "6px 10px 6px 28px",
                  borderRadius: T.radiusSm,
                  border: `1px solid ${T.border}`,
                  fontSize: 11,
                  width: 200,
                  outline: "none",
                }}
              />
              <span style={{ position: "absolute", left: 8, top: 7, color: T.text4 }}>
                <IconSearch size={12} color={T.text4} />
              </span>
            </div>
          </div>
        </div>

        {/* ── Tab Content: Missing in Books ─────────────────────────────────── */}
        {activeTab === "missing" && (
          <div style={{ padding: 16 }}>
            {missingInBooks.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.greenBg, color: T.green, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <IconCheck size={22} color={T.green} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>All Bank Entries Accounted For!</h3>
                <p style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>No missing transactions found. All statement credits and debits exist in ERP accounting.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Bank Narration & Channel</th>
                    <th style={thStyle}>Reference / UTR</th>
                    <th style={thStyle}>Withdrawal / Deposit</th>
                    <th style={thStyle}>AI Identified Party & Ledger</th>
                    <th style={thStyle}>Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMissing.map((txn: any) => {
                    const ai = txn.ai_analysis || {};
                    const isWithdrawal = txn.withdrawal > 0;
                    return (
                      <tr key={txn.id} style={{ borderBottom: `1px solid ${T.divider}` }}>
                        <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: "nowrap" }}>{txn.date}</td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700, color: T.text1, fontSize: 12 }}>{txn.narration}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                            <span style={{ ...badge(T.primary, "#eff6ff"), fontSize: 9 }}>{ai.channel || "BANK"}</span>
                            <span style={{ fontSize: 10, color: T.text3 }}>{ai.category}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11, fontFamily: "monospace", color: T.text2 }}>
                          {txn.reference_number || "—"}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: isWithdrawal ? T.red : T.green }}>
                          {isWithdrawal ? `- ${inr(txn.withdrawal)}` : `+ ${inr(txn.deposit)}`}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700, color: T.text1, display: "flex", alignItems: "center", gap: 4 }}>
                            {ai.identified_party || "Unknown Party"}
                            {ai.is_matched_master && (
                              <span style={{ ...badge(T.green, T.greenBg), fontSize: 9 }}>Master Verified</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>
                            Ledger: <strong>{ai.suggested_ledger}</strong>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                              disabled={createVoucherMutation.isPending}
                              onClick={() => handleQuickCreateVoucher(txn)}
                              style={{
                                background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <IconPlus size={11} color="#fff" />
                              Create Voucher & Push Tally
                            </button>
                            <button
                              onClick={() => openCustomizeModal(txn)}
                              style={{
                                background: "#f8fafc",
                                border: `1px solid ${T.border}`,
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: 10,
                                fontWeight: 600,
                                color: T.text2,
                                cursor: "pointer",
                              }}
                            >
                              Customize
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Tab Content: Suggested Matches ───────────────────────────────── */}
        {activeTab === "suggested" && (
          <div style={{ padding: 16 }}>
            {suggestedMatches.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p style={{ fontSize: 12, color: T.text3 }}>No fuzzy/suggested matches requiring review.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {suggestedMatches.map((sugg: any, idx: number) => {
                  const st = sugg.statement_txn;
                  const v = sugg.voucher;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 14,
                        border: `1.5px solid ${T.amber}40`,
                        borderRadius: 8,
                        background: "#fffbeb",
                        display: "grid",
                        gridTemplateColumns: "1fr auto 1fr auto",
                        gap: 16,
                        alignItems: "center",
                      }}
                    >
                      {/* Left: Statement */}
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: T.amber, textTransform: "uppercase" }}>Bank Statement Entry</div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: T.text1, marginTop: 2 }}>{st.narration}</div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>
                          Date: {st.date} | Ref: {st.reference_number || "—"}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: st.withdrawal > 0 ? T.red : T.green, marginTop: 4 }}>
                          {st.withdrawal > 0 ? `Withdrawal: - ${inr(st.withdrawal)}` : `Deposit: + ${inr(st.deposit)}`}
                        </div>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <span style={{ ...badge(T.amber, "#fef3c7"), padding: "4px 8px", fontSize: 11, fontWeight: 800 }}>
                          {Math.round((sugg.confidence || 0.85) * 100)}% Match
                        </span>
                        <div style={{ fontSize: 9, color: T.text3, marginTop: 4 }}>{sugg.match_type}</div>
                      </div>

                      {/* Right: ERP Voucher candidate */}
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: T.primary, textTransform: "uppercase" }}>Candidate ERP Voucher</div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: T.text1, marginTop: 2 }}>
                          {v.voucher_number} — {v.party_name}
                        </div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>
                          Date: {v.voucher_date} | Type: {v.voucher_type?.toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: T.primary, marginTop: 4 }}>
                          Voucher Amount: {inr(v.total)}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button
                          disabled={confirmMatchMutation.isPending}
                          onClick={() => confirmMatchMutation.mutate({ txn_id: st.id, voucher_id: v.id })}
                          style={{
                            background: T.green,
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "6px 12px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Confirm Match
                        </button>
                        <button
                          onClick={() => toast.success("Entry marked for manual review")}
                          style={{
                            background: "#fff",
                            border: `1px solid ${T.border}`,
                            borderRadius: 4,
                            padding: "6px 12px",
                            fontSize: 10,
                            fontWeight: 600,
                            color: T.text3,
                            cursor: "pointer",
                          }}
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab Content: Exact Matches ───────────────────────────────────── */}
        {activeTab === "exact" && (
          <div style={{ padding: 16 }}>
            {exactMatches.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p style={{ fontSize: 12, color: T.text3 }}>No exact matches discovered yet.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Statement Narration</th>
                    <th style={thStyle}>Matched ERP Voucher</th>
                    <th style={thStyle}>Party Name</th>
                    <th style={thStyle}>Reconciled Amount</th>
                    <th style={thStyle}>Confidence & Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {exactMatches.map((m: any, idx: number) => {
                    const st = m.statement_txn;
                    const v = m.voucher;
                    return (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.divider}` }}>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{st.date}</td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700, color: T.text1 }}>{st.narration}</div>
                          <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>Ref: {st.reference_number || "—"}</div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>
                          {v.voucher_number} ({v.voucher_type?.toUpperCase()})
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700, color: T.text1 }}>{v.party_name}</div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: T.green }}>
                          {inr(st.amount || v.total)}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ ...badge(T.green, T.greenBg), fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <IconCheck size={11} color={T.green} /> {m.match_type} (99%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Tab Content: In-Transit Vouchers ──────────────────────────────── */}
        {activeTab === "unpresented" && (
          <div style={{ padding: 16 }}>
            {unpresentedVouchers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p style={{ fontSize: 12, color: T.text3 }}>No unpresented or in-transit vouchers.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={thStyle}>Voucher No</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Party Name</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unpresentedVouchers.map((v: any) => (
                    <tr key={v.id} style={{ borderBottom: `1px solid ${T.divider}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: T.primary }}>{v.voucher_number}</td>
                      <td style={tdStyle}>{v.voucher_date}</td>
                      <td style={tdStyle}>
                        <span style={{ ...badge(v.voucher_type === "payment" ? T.red : T.green, v.voucher_type === "payment" ? T.redBg : T.greenBg), fontSize: 10 }}>
                          {v.voucher_type?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{v.party_name}</td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{inr(v.total)}</td>
                      <td style={tdStyle}>
                        <span style={{ ...badge(T.cyan, T.cyanBg), fontSize: 10 }}>
                          Awaiting Bank Clearance
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Statement Upload ────────────────────────────────────────── */}
      {uploadModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: T.radius, width: "100%", maxWidth: 520, boxShadow: T.shadowMd, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1, margin: 0 }}>Import Bank Statement</h3>
              <button onClick={() => setUploadModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: T.text3 }}>
                <IconX size={16} color={T.text3} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.text2, display: "block", marginBottom: 6 }}>
                  Select Bank Account
                </label>
                <select
                  value={selectedBankAccount}
                  onChange={(e) => setSelectedBankAccount(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, fontSize: 12, outline: "none" }}
                >
                  <option value="HDFC Bank Current A/c - 50200012345">HDFC Bank Current A/c - 50200012345</option>
                  <option value="SBI Operational A/c - 42749619675">SBI Operational A/c - 42749619675</option>
                  <option value="ICICI Bank Collection A/c - 00210500918">ICICI Bank Collection A/c - 00210500918</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.text2, display: "block", marginBottom: 6 }}>
                  Upload File (PDF, Excel, or CSV)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${selectedFile ? T.green : T.primary}`,
                    borderRadius: T.radiusSm,
                    padding: "24px 16px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: selectedFile ? T.greenBg : "#f8fafc",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  {selectedFile ? (
                    <div>
                      <div style={{ fontWeight: 700, color: T.green, fontSize: 13 }}>{selectedFile.name}</div>
                      <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB — Ready to parse
                      </div>
                    </div>
                  ) : (
                    <div>
                      <IconDownload size={24} color={T.primary} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text1, marginTop: 8 }}>
                        Click to select bank statement or drag & drop
                      </div>
                      <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                        Supports HDFC, SBI, ICICI, Axis, Kotak statements in PDF, Excel, or CSV
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="reimport"
                  checked={allowReimport}
                  onChange={(e) => setAllowReimport(e.target.checked)}
                />
                <label htmlFor="reimport" style={{ fontSize: 11, color: T.text2, cursor: "pointer" }}>
                  Allow re-import if file hash exists (overwrite / refresh)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  style={{ padding: "8px 14px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  style={{
                    background: T.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: T.radiusSm,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isUploading ? "Parsing & Analyzing…" : "Import & Auto-Reconcile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Certified BRS Statement ──────────────────────────────────── */}
      {brsModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: T.radius, width: "100%", maxWidth: 680, boxShadow: T.shadowMd, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text1, margin: 0 }}>Certified Bank Reconciliation Statement</h3>
                <p style={{ fontSize: 11, color: T.text3, margin: 0, marginTop: 2 }}>{brs.bank_name || "HDFC Bank"} — As of {brs.as_of_date || "Today"}</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => window.print()} style={{ border: `1px solid ${T.border}`, background: "#fff", borderRadius: 4, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <IconPrinter size={12} /> Print
                </button>
                <button onClick={() => setBrsModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: T.text3 }}>
                  <IconX size={16} color={T.text3} />
                </button>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "8px 0", fontWeight: 700 }}>Balance as per Bank Statement</td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 800 }}>{inr(brs.balance_as_per_bank_statement)}</td>
                  </tr>

                  <tr style={{ color: T.green }}>
                    <td style={{ padding: "8px 0 4px 12px" }}><strong>Add:</strong> Cheques / Deposits entered in books but not yet credited by bank</td>
                    <td style={{ padding: "8px 0 4px 0", textAlign: "right", fontWeight: 700 }}>+ {inr(brs.adjustments?.add_uncredited_deposits)}</td>
                  </tr>

                  <tr style={{ color: T.green }}>
                    <td style={{ padding: "4px 0 8px 12px" }}><strong>Add:</strong> Direct deposits / credits in bank not entered in books</td>
                    <td style={{ padding: "4px 0 8px 0", textAlign: "right", fontWeight: 700 }}>+ {inr(brs.adjustments?.add_direct_bank_credits_unrecorded)}</td>
                  </tr>

                  <tr style={{ color: T.red }}>
                    <td style={{ padding: "8px 0 4px 12px" }}><strong>Less:</strong> Cheques issued but not yet presented for payment (In-Transit)</td>
                    <td style={{ padding: "8px 0 4px 0", textAlign: "right", fontWeight: 700 }}>- {inr(brs.adjustments?.less_unpresented_cheques)}</td>
                  </tr>

                  <tr style={{ color: T.red, borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "4px 0 8px 12px" }}><strong>Less:</strong> Direct debits / bank charges in bank not entered in books</td>
                    <td style={{ padding: "4px 0 8px 0", textAlign: "right", fontWeight: 700 }}>- {inr(brs.adjustments?.less_direct_bank_debits_unrecorded)}</td>
                  </tr>

                  <tr style={{ borderBottom: `2px solid ${T.text1}`, background: "#f8fafc" }}>
                    <td style={{ padding: "10px 0", fontWeight: 800 }}>Adjusted Bank Balance</td>
                    <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 800 }}>{inr(brs.adjusted_balance_as_per_bank)}</td>
                  </tr>

                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 0", fontWeight: 800 }}>Balance as per ERP Accounting Cash/Bank Book</td>
                    <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 800 }}>{inr(brs.balance_as_per_books)}</td>
                  </tr>

                  <tr style={{ background: brs.is_reconciled ? T.greenBg : T.amberBg }}>
                    <td style={{ padding: "10px 8px", fontWeight: 800, color: brs.is_reconciled ? T.green : T.amber }}>
                      Net Reconciliation Discrepancy
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 900, color: brs.is_reconciled ? T.green : T.amber }}>
                      {brs.is_reconciled ? "₹0.00 (Perfect Match)" : inr(brs.reconciliation_discrepancy)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 20, padding: 12, background: "#f8fafc", borderRadius: 6, fontSize: 11, color: T.text3, border: `1px solid ${T.border}` }}>
                <strong>Audit Compliance Note:</strong> Prepared in accordance with Indian Accounting Standard (Ind AS 7). All electronic funds transfers and clearing cheques are verified with UTR hashes.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Customize Voucher Creation ─────────────────────────────── */}
      {customizeModalOpen && selectedTxnForVoucher && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: T.radius, width: "100%", maxWidth: 480, boxShadow: T.shadowMd, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text1, margin: 0 }}>Create ERP Voucher from Statement Line</h3>
              <button onClick={() => setCustomizeModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: T.text3 }}>
                <IconX size={16} color={T.text3} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ padding: 10, background: "#f1f5f9", borderRadius: 6, marginBottom: 14, fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: T.text1 }}>{selectedTxnForVoucher.narration}</div>
                <div style={{ color: T.text3, marginTop: 2 }}>
                  Amount: <strong>{inr(selectedTxnForVoucher.amount || selectedTxnForVoucher.deposit || selectedTxnForVoucher.withdrawal)}</strong> | Date: {selectedTxnForVoucher.date}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.text2, display: "block", marginBottom: 4 }}>Voucher Type</label>
                <select
                  value={customVType}
                  onChange={(e) => setCustomVType(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, fontSize: 12 }}
                >
                  <option value="payment">Payment (Vendor, Expense, Charges)</option>
                  <option value="receipt">Receipt (Customer collection, Interest)</option>
                  <option value="contra">Contra (Cash deposit / withdrawal, inter-bank)</option>
                  <option value="journal">Journal entry</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.text2, display: "block", marginBottom: 4 }}>Party / Entity Name</label>
                <input
                  type="text"
                  value={customParty}
                  onChange={(e) => setCustomParty(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, fontSize: 12 }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.text2, display: "block", marginBottom: 4 }}>Account Ledger</label>
                <input
                  type="text"
                  value={customLedger}
                  onChange={(e) => setCustomLedger(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, fontSize: 12 }}
                />
              </div>

              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="syncTally"
                  checked={customSyncTally}
                  onChange={(e) => setCustomSyncTally(e.target.checked)}
                />
                <label htmlFor="syncTally" style={{ fontSize: 11, color: T.text2, cursor: "pointer", fontWeight: 600 }}>
                  Immediately Push Voucher to TallyPrime (Port 9000)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  onClick={() => setCustomizeModalOpen(false)}
                  style={{ padding: "8px 14px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  disabled={createVoucherMutation.isPending}
                  onClick={() =>
                    createVoucherMutation.mutate({
                      statement_id: selectedStatementId,
                      txn_id: selectedTxnForVoucher.id,
                      party_name: customParty,
                      voucher_type: customVType,
                      account_ledger: customLedger,
                      sync_to_tally: customSyncTally,
                    })
                  }
                  style={{
                    background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: T.radiusSm,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {createVoucherMutation.isPending ? "Posting…" : "Post Voucher & Reconcile"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
