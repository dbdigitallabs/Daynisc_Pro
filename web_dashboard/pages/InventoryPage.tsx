// src/pages/InventoryPage.tsx
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, inr, cardStyle, badge, thStyle, tdStyle } from "../store/theme";
import { IconBox, IconMoney, IconWarning, IconTag } from "../components/Icons";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingestion modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.get("/inventory/items", { params: { limit: 200 } }).then(r => r.data).catch(() => ({ items: [] })),
  });
  const items = data?.items || [];

  // Robust parsing to support both demo mock server and production Postgres columns
  const totalValue = items.reduce((s: number, i: any) => {
    const stock = Number(i.current_stock !== undefined ? i.current_stock : (i.quantity !== undefined ? i.quantity : 0));
    const cost = Number(i.avg_cost !== undefined ? i.avg_cost : (i.purchase_rate !== undefined ? i.purchase_rate : 0));
    return s + (stock * cost);
  }, 0);

  const lowStock = items.filter((i: any) => {
    const stock = Number(i.current_stock !== undefined ? i.current_stock : (i.quantity !== undefined ? i.quantity : 0));
    const minStock = Number(i.min_stock !== undefined ? i.min_stock : (i.reorder_level !== undefined ? i.reorder_level : 0));
    return stock <= minStock;
  }).length;

  const categories = [...new Set(items.map((i: any) => i.category || i.item_group).filter(Boolean))].length;

  // Ingestion Event Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage("Unsupported file type. Please upload a .csv, .xlsx or .xls file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setErrorMessage(null);
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    try {
      const res = await api.post("/inventory/import-sheet", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setImportResult(res.data);
      // Invalidate query cache to hot-reload inventory items table instantly
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Something went wrong while importing the sheet.";
      setErrorMessage(msg);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportResult(null);
    setErrorMessage(null);
  };

  const closeModal = () => {
    setShowImportModal(false);
    resetImport();
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter',sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header with Import Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, margin: 0, letterSpacing: "-0.4px" }}>Inventory</h1>
        <button 
          onClick={() => setShowImportModal(true)}
          style={{
            background: T.primary,
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(99, 102, 241, 0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.2)";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import Items
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Total Items",   value: String(items.length), icon: <IconBox size={22} color={T.primary} />,     color: T.primary },
          { label: "Stock Value",   value: inr(totalValue),      icon: <IconMoney size={22} color={T.green} />,     color: T.green  },
          { label: "Low Stock",     value: String(lowStock),     icon: <IconWarning size={22} color={T.red} />,     color: T.red    },
          { label: "Categories",    value: String(categories),   icon: <IconTag size={22} color={T.amber} />,       color: T.amber  },
        ].map(k => (
          <div key={k.label} style={cardStyle({ padding: "18px 20px", flex: 1 })}>
            <div style={{ marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={cardStyle({ overflow: "hidden" })}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading inventory…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: T.text3, fontSize: 13 }}>
            <div style={{ marginBottom: 12 }}><IconBox size={40} color={T.border} /></div>
            No inventory items found
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Item Name", "SKU / Code", "Category", "Stock", "Unit", "Avg Cost", "Value", "Status"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const name = item.name || item.item_name || "—";
                const sku = item.sku || item.item_code || "—";
                const category = item.category || item.item_group || "—";
                
                const stock = Number(item.current_stock !== undefined ? item.current_stock : (item.quantity !== undefined ? item.quantity : 0));
                const minStock = Number(item.min_stock !== undefined ? item.min_stock : (item.reorder_level !== undefined ? item.reorder_level : 0));
                const isLow = stock <= minStock;
                
                const avgCost = Number(item.avg_cost !== undefined ? item.avg_cost : (item.purchase_rate !== undefined ? item.purchase_rate : 0));
                const val = stock * avgCost;

                return (
                  <tr key={item.id || sku} onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: T.text1 }}>{name}</td>
                    <td style={{ ...tdStyle, color: T.text3, fontFamily: "monospace", fontSize: 12 }}>{sku}</td>
                    <td style={tdStyle}>{category}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: isLow ? T.red : T.green }}>
                      {stock.toLocaleString("en-IN")}
                    </td>
                    <td style={tdStyle}>{item.unit || "KG"}</td>
                    <td style={tdStyle}>{inr(avgCost)}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{inr(val)}</td>
                    <td style={tdStyle}>
                      <span style={badge(isLow ? T.red : T.green, isLow ? T.redBg : T.greenBg)}>
                        {isLow ? "⚠ Low Stock" : "✓ OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Ingestion Glassmorphic Modal */}
      {showImportModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(255,255,255,0.5)",
            width: "550px",
            maxWidth: "90%",
            padding: "28px",
            fontFamily: "'Inter', sans-serif",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            position: "relative"
          }}>
            {/* Close Button */}
            <button 
              onClick={closeModal}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                border: "none",
                background: "transparent",
                color: T.text3,
                cursor: "pointer",
                padding: "4px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 style={{ fontSize: "18px", fontWeight: 800, color: T.text1, marginTop: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import Inventory Items
            </h2>
            <p style={{ fontSize: "13px", color: T.text3, marginTop: 0, marginBottom: "20px", lineHeight: "1.4" }}>
              Upload your CSV or Excel files. We will automatically map <code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 4 }}>title</code> to the item name and <code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 4 }}>dept. name</code> to the category, and generate unique SKUs!
            </p>

            {/* Error Message */}
            {errorMessage && (
              <div style={{
                background: T.redBg,
                color: T.red,
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: `1px solid rgba(220, 38, 38, 0.1)`
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMessage}
              </div>
            )}

            {/* Content Area */}
            {!importResult ? (
              <div>
                {/* Drag and Drop Container */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  style={{
                    border: `2px dashed ${dragActive ? T.primary : "rgba(67, 97, 238, 0.3)"}`,
                    backgroundColor: dragActive ? "rgba(67, 97, 238, 0.04)" : "rgba(255, 255, 255, 0.5)",
                    borderRadius: "12px",
                    padding: "36px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    boxShadow: dragActive ? "0 0 16px rgba(67, 97, 238, 0.1)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px"
                  }}
                  onMouseEnter={e => {
                    if (!dragActive) {
                      e.currentTarget.style.borderColor = T.primary;
                      e.currentTarget.style.backgroundColor = "rgba(67, 97, 238, 0.02)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!dragActive) {
                      e.currentTarget.style.borderColor = "rgba(67, 97, 238, 0.3)";
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                    }
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    style={{ display: "none" }} 
                  />
                  
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(67, 97, 238, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: T.primary,
                    marginBottom: "4px"
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>

                  {selectedFile ? (
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: T.text1, wordBreak: "break-all" }}>{selectedFile.name}</div>
                      <div style={{ fontSize: "11px", color: T.text3, marginTop: "4px" }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: T.text1 }}>
                        Drag & drop your file here, or <span style={{ color: T.primary, textDecoration: "underline" }}>browse</span>
                      </div>
                      <div style={{ fontSize: "11px", color: T.text3, marginTop: "6px" }}>
                        Supports CSV, XLSX, or XLS sheets
                      </div>
                    </div>
                  )}
                </div>

                {/* Guidelines */}
                <div style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(0,0,0,0.02)",
                  border: `1px solid ${T.border}`,
                  fontSize: "12px",
                  color: T.text2
                }}>
                  <div style={{ fontWeight: 700, color: T.text1, marginBottom: "4px" }}>💡 Template Columns:</div>
                  <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.5", color: T.text3 }}>
                    <li>Must include <strong style={{ color: T.text2 }}>title</strong> (Item Name / description) column.</li>
                    <li>Must include <strong style={{ color: T.text2 }}>dept. name</strong> (Category / department / item group) column.</li>
                    <li>Existing item names are skipped automatically to prevent duplication.</li>
                  </ul>
                </div>

                {/* Footer buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                  <button 
                    onClick={closeModal}
                    disabled={importing}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      border: `1px solid ${T.border}`,
                      background: "#fff",
                      color: T.text2,
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "#fff"}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpload}
                    disabled={!selectedFile || importing}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: "none",
                      background: selectedFile ? T.primary : "rgba(67, 97, 238, 0.4)",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: selectedFile && !importing ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: selectedFile ? "0 4px 12px rgba(99, 102, 241, 0.2)" : "none"
                    }}
                  >
                    {importing ? (
                      <>
                        <div className="spinner" style={{
                          width: "14px",
                          height: "14px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTop: "2px solid #fff",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite"
                        }} />
                        Processing...
                      </>
                    ) : "Upload & Import"}
                  </button>
                </div>
              </div>
            ) : (
              /* Success / Result View */
              <div>
                <div style={{ textAlign: "center", padding: "10px 0 20px 0" }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: T.greenBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: T.green,
                    margin: "0 auto 12px auto"
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: T.text1, margin: "0 0 6px 0" }}>Import Complete!</h3>
                  <p style={{ fontSize: "13px", color: T.text3, margin: 0 }}>
                    {importResult.message}
                  </p>
                </div>

                {/* Import Statistics */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <div style={{ flex: 1, padding: "12px", borderRadius: "8px", backgroundColor: "rgba(22, 163, 74, 0.05)", border: `1px solid rgba(22, 163, 74, 0.1)`, textAlign: "center" }}>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: T.green }}>{importResult.imported}</div>
                    <div style={{ fontSize: "11px", color: T.text3, fontWeight: 600, textTransform: "uppercase", marginTop: "2px" }}>Imported</div>
                  </div>
                  <div style={{ flex: 1, padding: "12px", borderRadius: "8px", backgroundColor: "rgba(217, 119, 6, 0.05)", border: `1px solid rgba(217, 119, 6, 0.1)`, textAlign: "center" }}>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: T.amber }}>{importResult.skipped}</div>
                    <div style={{ fontSize: "11px", color: T.text3, fontWeight: 600, textTransform: "uppercase", marginTop: "2px" }}>Skipped (Duplicates)</div>
                  </div>
                </div>

                {/* Items List (Collapsible scrollable list of imported items) */}
                {importResult.items && importResult.items.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: T.text1, marginBottom: "8px" }}>Successfully Added ({importResult.items.length}):</div>
                    <div style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      border: `1px solid ${T.border}`,
                      borderRadius: "8px",
                      backgroundColor: "#fff"
                    }}>
                      {importResult.items.map((item: any, idx: number) => (
                        <div key={idx} style={{
                          padding: "8px 12px",
                          borderBottom: idx === importResult.items.length - 1 ? "none" : `1px solid ${T.divider}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "12px"
                        }}>
                          <div style={{ fontWeight: 600, color: T.text1 }}>{item.item_name}</div>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "11px", color: T.text3, background: "rgba(0,0,0,0.03)", padding: "2px 6px", borderRadius: "4px" }}>
                              {item.item_code}
                            </span>
                            <span style={badge(T.primary, T.purpleBg)}>
                              {item.item_group}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    onClick={closeModal}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "8px",
                      border: "none",
                      background: T.primary,
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)"
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global CSS spinner rule */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
