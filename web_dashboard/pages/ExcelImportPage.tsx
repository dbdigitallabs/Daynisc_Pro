// src/pages/ExcelImportPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge } from "../store/theme";
import {
  IconUpload, IconCheckCircle, IconWarning, IconFile,
  IconArrowDown, IconSync, IconAI
} from "../components/Icons";

const TARGET_FIELDS = [
  { key: "voucher_date", label: "Voucher/Invoice Date", required: true },
  { key: "voucher_number", label: "Voucher/Invoice Number", required: true },
  { key: "party_name", label: "Party (Supplier/Customer) Name", required: true },
  { key: "party_gstin", label: "Party GSTIN", required: false },
  { key: "item_name", label: "Stock Item/Ledger Name", required: true },
  { key: "quantity", label: "Quantity", required: false },
  { key: "rate", label: "Rate/Unit Price", required: false },
  { key: "total", label: "Total Amount", required: true },
];

export default function ExcelImportPage() {
  const navigate = useNavigate();
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isDetecting, setIsDetecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Preview/Import
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [voucherType, setVoucherType] = useState("purchase"); // purchase or sales

  // Simulate loading Excel file and extracting headers/rows
  const handleSimulateUpload = () => {
    // Mocking raw columns from an exported Excel
    const headers = [
      "Inv Date", "Bill Reference No", "Supplier Name", "Supplier GSTIN",
      "Product Description", "Qty Invoiced", "Price Per Unit", "Invoice Value"
    ];
    const rows = [
      {
        "Inv Date": "2026-06-28",
        "Bill Reference No": "PUR-9081",
        "Supplier Name": "Reliance Polymers Ltd",
        "Supplier GSTIN": "24AAACR1234Z1Z9",
        "Product Description": "PP Granules Virgin Grade",
        "Qty Invoiced": "1000",
        "Price Per Unit": "120",
        "Invoice Value": "120000"
      },
      {
        "Inv Date": "2026-06-28",
        "Bill Reference No": "PUR-9082",
        "Supplier Name": "Supreme Plastics Ltd",
        "Supplier GSTIN": "24AAACS4321Z2Z8",
        "Product Description": "LDPE Masterbatch Black",
        "Qty Invoiced": "500",
        "Price Per Unit": "180",
        "Invoice Value": "90000"
      }
    ];

    setFileHeaders(headers);
    setFileRows(rows);
    setStep(2);
    setErrorMsg("");
    detectColumnsWithAI(headers);
  };

  // Hit the backend AI endpoint to auto detect columns
  const detectColumnsWithAI = async (headers: string[]) => {
    setIsDetecting(true);
    try {
      const res = await api.post("/excel-mapper/detect-columns", { headers });
      const detectedMap = res.data.mapping || {};
      
      // Clean up mapping results to match TARGET_FIELDS standard keys
      const finalMap: Record<string, string> = {};
      TARGET_FIELDS.forEach(f => {
        finalMap[f.key] = detectedMap[f.key] || "";
      });
      setMapping(finalMap);
    } catch (err: any) {
      setErrorMsg("Failed to auto-detect columns: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFieldChange = (targetKey: string, sourceHeader: string) => {
    setMapping(prev => ({
      ...prev,
      [targetKey]: sourceHeader
    }));
  };

  const handleNextToPreview = () => {
    // Validate required fields are mapped
    const unmappedRequired = TARGET_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (unmappedRequired.length > 0) {
      setErrorMsg(`Please map all required fields: ${unmappedRequired.map(f => f.label).join(", ")}`);
      return;
    }
    setErrorMsg("");
    setStep(3);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await api.post("/excel-mapper/import", {
        mapping,
        rows: fileRows,
        voucher_type: voucherType
      });
      if (res.data.success) {
        setSuccessMsg(`Successfully imported ${res.data.created} vouchers to Tally queue!`);
        setTimeout(() => {
          navigate("/accounting/vouchers");
        }, 2000);
      } else {
        setErrorMsg("Import failed: " + res.data.errors.join("; "));
      }
    } catch (err: any) {
      setErrorMsg("Failed to import: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, letterSpacing: "-0.4px" }}>Excel to Tally</h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 4 }}>Upload spreadsheet, map headers, and sync to Tally Prime.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
              background: "#fff", color: T.text1, fontSize: 13, fontWeight: 600
            }}
          >
            <option value="purchase">Import as Purchase Voucher</option>
            <option value="sales">Import as Sales Voucher</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div style={{
          background: T.redBg, border: `1px solid ${T.red}30`, borderRadius: T.radius,
          padding: "12px 16px", color: T.red, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 20
        }}>
          <IconWarning size={18} /> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{
          background: T.greenBg, border: `1px solid ${T.green}30`, borderRadius: T.radius,
          padding: "12px 16px", color: T.green, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 20
        }}>
          <IconCheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Step Progress Indicators */}
      <div style={{ display: "flex", gap: 30, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
        {[
          { num: 1, label: "Upload Excel" },
          { num: 2, label: "AI Header Mapping" },
          { num: 3, label: "Preview & Import" }
        ].map(s => (
          <div key={s.num} style={{
            display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600,
            color: step === s.num ? T.primary : T.text3, borderBottom: step === s.num ? `2px solid ${T.primary}` : "none",
            paddingBottom: 10, cursor: "pointer"
          }} onClick={() => s.num < step && setStep(s.num)}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%", background: step >= s.num ? T.primary + "15" : T.border,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: step >= s.num ? T.primary : T.text3
            }}>{s.num}</span>
            {s.label}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div style={cardStyle({ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" })}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%", background: T.primary + "10",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16
          }}>
            <IconUpload size={28} color={T.primary} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text1, marginBottom: 8 }}>Upload Purchase/Sales Excel</h2>
          <p style={{ fontSize: 12, color: T.text3, textAlign: "center", maxWidth: 380, marginBottom: 24 }}>
            Drag and drop your spreadsheet file (.xlsx, .xls, .csv) here or use the simulation mode to test mapping immediately.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleSimulateUpload}
              style={{
                background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
                padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 4px rgba(67, 97, 238, 0.2)"
              }}
            >
              <IconFile size={16} /> Simulate Excel Upload
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && (
        <div style={{ display: "flex", gap: 20 }}>
          {/* Mapping Panel */}
          <div style={{ ...cardStyle({ padding: 22, flex: 2 }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text1 }}>Map Excel Columns</h2>
              {isDetecting ? (
                <span style={{ fontSize: 12, color: T.primary, display: "flex", alignItems: "center", gap: 6 }}>
                  <IconSync size={14} className="animate-spin" /> AI Detecting...
                </span>
              ) : (
                <span style={badge(T.green, T.greenBg)}>
                  <IconAI size={12} style={{ marginRight: 4 }} /> AI Mapped Headers
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {TARGET_FIELDS.map(field => (
                <div key={field.key} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.inputBg
                }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text1 }}>
                      {field.label} {field.required && <span style={{ color: T.red }}>*</span>}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <IconArrowDown size={14} color={T.text3} />
                    <select
                      value={mapping[field.key] || ""}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      style={{
                        padding: "6px 12px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
                        background: "#fff", color: T.text1, fontSize: 13, minWidth: 200
                      }}
                    >
                      <option value="">-- Choose Column --</option>
                      {fileHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                  padding: "9px 16px", fontSize: 13, fontWeight: 600, color: T.text3, cursor: "pointer"
                }}
              >
                Back
              </button>
              <button
                onClick={handleNextToPreview}
                style={{
                  background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
                  padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}
              >
                Next: Preview Data
              </button>
            </div>
          </div>

          {/* Helper panel */}
          <div style={{ ...cardStyle({ padding: 20, flex: 1, height: "fit-content" }) }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 12 }}>Upload Metadata</h3>
            <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
              <p><strong>Total Headers found:</strong> {fileHeaders.length}</p>
              <p><strong>Total Rows:</strong> {fileRows.length}</p>
              <p style={{ marginTop: 12 }}>
                Our OCR and mapping engine has pre-matched columns automatically using a semantic parsing model. Ensure required fields marked with <strong>*</strong> are matched.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div style={cardStyle({ overflow: "hidden" })}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text1 }}>Mapped Vouchers Preview</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
                  padding: "8px 14px", fontSize: 13, fontWeight: 600, color: T.text3, cursor: "pointer"
                }}
              >
                Edit Mapping
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                style={{
                  background: T.green, color: "#fff", border: "none", borderRadius: T.radiusSm,
                  padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6
                }}
              >
                {isImporting ? "Importing..." : "Sync Vouchers to Tally"}
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Invoice Date", "Voucher Number", "Party Name", "GSTIN", "Item Description", "Qty", "Price", "Total"].map(h => (
                  <th key={h} style={{
                    padding: "10px 14px", fontSize: 11, fontWeight: 600, color: T.text3, textTransform: "uppercase",
                    textAlign: "left", borderBottom: `1px solid ${T.border}`
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fileRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.divider}` }}>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: T.text2 }}>{r[mapping.voucher_date]}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: T.text2, fontWeight: 600 }}>{r[mapping.voucher_number]}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: T.text1, fontWeight: 600 }}>{r[mapping.party_name]}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: T.text3 }}>{r[mapping.party_gstin] || "N/A"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: T.text2 }}>{r[mapping.item_name]}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: T.text2 }}>{r[mapping.quantity] || "1"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: T.text2 }}>{inr(r[mapping.rate] || 0)}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: T.primary, fontWeight: 700 }}>{inr(r[mapping.total] || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
