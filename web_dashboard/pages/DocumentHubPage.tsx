import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, badge, inr } from "../store/theme";
import {
  IconFileText,
  IconUpload,
  IconSearch,
  IconEye,
  IconCheck,
  IconDownload,
  IconTrash,
  IconFolder,
  IconZap,
  IconCheckCircle
} from "../components/Icons";

function Card({ children, style = {}, className = "" }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: T.cardBg,
        borderRadius: 12,
        border: `1px solid ${T.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        padding: 20,
        ...style
      }}
    >
      {children}
    </div>
  );
}

const DEFAULT_DOCS = [
  {
    id: "doc-101",
    name: "Purchase_Invoice_Reliance_AUG26.pdf",
    type: "Invoices",
    document_type: "purchase_bill",
    size: "1.4 MB",
    version: "v1.2",
    created_at: "2026-08-18 14:22",
    status: "verified",
    confidence: "99.2%",
    ocr_summary: "Vendor: Reliance Industries Ltd · Amount: ₹5,40,000 · GSTIN: 24AABCR2419B1Z8 · Items: HDPE Granules (10 MT)"
  },
  {
    id: "doc-102",
    name: "PO_SupremePlastics_4920.pdf",
    type: "Purchase Orders",
    document_type: "purchase_order",
    size: "820 KB",
    version: "v1.0",
    created_at: "2026-08-17 11:05",
    status: "verified",
    confidence: "98.4%",
    ocr_summary: "PO #PO-4920 · Total: ₹3,20,000 · Terms: 30 Days Net · Delivery: Surat Warehouse"
  },
  {
    id: "doc-103",
    name: "Bank_Statement_HDFC_July2026.pdf",
    type: "Receipts",
    document_type: "bank_statement",
    size: "3.1 MB",
    version: "v1.0",
    created_at: "2026-08-16 09:40",
    status: "reconciled",
    confidence: "97.8%",
    ocr_summary: "A/C #502000849201 · Total Credits: ₹48,20,000 · Total Debits: ₹41,10,000 · Reconciled: 94%"
  },
  {
    id: "doc-104",
    name: "GSTR_3B_July_2026_Ack.pdf",
    type: "GST Documents",
    document_type: "gst_return",
    size: "450 KB",
    version: "v1.0",
    created_at: "2026-08-15 17:30",
    status: "filed",
    confidence: "100%",
    ocr_summary: "ARN #AA2407260918239 · Total Output Tax: ₹4,52,000 · ITC Claimed: ₹3,81,000"
  },
  {
    id: "doc-105",
    name: "Transport_LR_VRL_Logistics_991.pdf",
    type: "Invoices",
    document_type: "lr",
    size: "620 KB",
    version: "v1.1",
    created_at: "2026-08-14 16:15",
    status: "verified",
    confidence: "96.5%",
    ocr_summary: "LR #VRL-99120 · Truck: GJ-05-BX-4920 · Origin: Dahej · Destination: Surat · Freight: ₹18,500"
  },
  {
    id: "doc-106",
    name: "Vendor_Agreement_GujaratMinerals.pdf",
    type: "Contracts",
    document_type: "contract",
    size: "2.8 MB",
    version: "v2.0",
    created_at: "2026-08-10 10:00",
    status: "active",
    confidence: "99.0%",
    ocr_summary: "Annual Supply Contract · Material: Calcium Carbonate · Price Lock: ₹18.5/KG till Dec 2026"
  }
];

export default function DocumentHubPage() {
  const qc = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [searchVal, setSearchVal] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<any | null>(null);

  // Fetch documents from backend /documents endpoint
  const { data: serverDocsRaw, isLoading: loadingDocs } = useQuery<any>({
    queryKey: ["hub-documents"],
    queryFn: () => api.get("/documents?limit=100").then(r => r.data).catch(() => null),
  });

  // Extract server items safely
  const serverItems = Array.isArray(serverDocsRaw)
    ? serverDocsRaw
    : (serverDocsRaw?.items ?? []);

  // Format server items into unified document list
  const formattedServerDocs = serverItems.map((doc: any) => ({
    id: doc.id || `doc-${Math.random()}`,
    name: doc.original_filename || doc.filename || "Uploaded_Document.pdf",
    type: (doc.document_type === "purchase_bill" || doc.document_type === "invoice") ? "Invoices" :
          (doc.document_type === "purchase_order") ? "Purchase Orders" :
          (doc.document_type === "bank_statement") ? "Receipts" :
          (doc.document_type === "gst_return" || doc.document_type === "eway_bill") ? "GST Documents" :
          "Invoices",
    document_type: doc.document_type || "other",
    size: doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : "1.2 MB",
    version: "v1.0",
    created_at: doc.created_at ? doc.created_at.slice(0, 16).replace("T", " ") : "2026-08-19",
    status: doc.status || "pending",
    confidence: doc.confidence_score ? `${Math.round(doc.confidence_score * 100)}%` : "95.0%",
    ocr_summary: doc.extracted_data ? JSON.stringify(doc.extracted_data).slice(0, 120) + "..." : "AI OCR processed successfully"
  }));

  // Combine server documents with default demo repository
  const allDocs = [...formattedServerDocs, ...DEFAULT_DOCS];

  const folders = ["All", "Invoices", "Purchase Orders", "Receipts", "GST Documents", "Contracts"];

  // Filter documents safely
  const filteredDocs = allDocs.filter((doc) => {
    const matchesFolder = selectedFolder === "All" || (doc.type && doc.type.toLowerCase() === selectedFolder.toLowerCase());
    const matchesSearch = !searchVal.trim() ||
      (doc.name && doc.name.toLowerCase().includes(searchVal.toLowerCase())) ||
      (doc.ocr_summary && doc.ocr_summary.toLowerCase().includes(searchVal.toLowerCase()));
    return matchesFolder && matchesSearch;
  });

  const handleSimulatedUpload = () => {
    setUploadingFile(true);
    setTimeout(() => {
      setUploadingFile(false);
      alert("Document uploaded successfully to Document Drive! AI Extraction initiated.");
      qc.invalidateQueries({ queryKey: ["hub-documents"] });
    }, 800);
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px", margin: "0 0 4px 0" }}>
            <IconFolder size={24} color={T.primary} /> Central Document Hub & Cloud Drive
          </h1>
          <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>
            Unified enterprise repository indexing purchase bills, sales invoices, lorry receipts, and GST certificates.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="#/ai-verification"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4361ee)",
              color: "#fff",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)"
            }}
          >
            <IconZap size={15} color="#fff" /> AI Upload & Scan Studio
          </a>
          <button
            onClick={handleSimulatedUpload}
            disabled={uploadingFile}
            style={{
              background: T.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            {uploadingFile ? "Uploading..." : <><IconUpload size={15} color="#fff" /> Upload to Drive</>}
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            placeholder="Search documents by filename, party name, GSTIN, or OCR text..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px 12px 38px",
              border: `1.5px solid ${T.border}`,
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
              background: "#fff",
              boxSizing: "border-box"
            }}
          />
          <span style={{ position: "absolute", left: 14, top: 14, color: T.text3 }}>
            <IconSearch size={16} />
          </span>
        </div>
      </div>

      {/* Grid Explorer Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        
        {/* Folders List (Left Sidebar) */}
        <Card style={{ padding: "16px", height: "fit-content" }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, margin: "0 0 12px 0" }}>
            Drive Folders
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {folders.map(fld => {
              const isSelected = fld === selectedFolder;
              const count = fld === "All"
                ? allDocs.length
                : allDocs.filter(d => d.type && d.type.toLowerCase() === fld.toLowerCase()).length;

              return (
                <button
                  key={fld}
                  onClick={() => setSelectedFolder(fld)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    padding: "10px 12px",
                    textAlign: "left",
                    background: isSelected ? T.primary + "15" : "transparent",
                    color: isSelected ? T.primary : T.text2,
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IconFolder size={14} color={isSelected ? T.primary : T.text2} />
                    <span>{fld}</span>
                  </div>
                  <span style={{ fontSize: 10, background: isSelected ? T.primary : "#e2e8f0", color: isSelected ? "#fff" : T.text3, padding: "2px 6px", borderRadius: 10, fontWeight: 700 }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text1, marginBottom: 6 }}>Drive Storage</div>
            <div style={{ background: "#e2e8f0", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ width: "28%", background: T.primary, height: "100%" }} />
            </div>
            <div style={{ fontSize: 10, color: T.text3 }}>2.8 GB of 10 GB used</div>
          </div>
        </Card>

        {/* Files Browser (Right Pane) */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text1, margin: 0 }}>
                {selectedFolder === "All" ? "All Documents" : `${selectedFolder} Folder`}
              </h3>
              <span style={{ fontSize: 11, color: T.text3 }}>{filteredDocs.length} files available</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredDocs.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  background: "#f8fafc",
                  transition: "border 0.15s",
                  flexWrap: "wrap",
                  gap: 12
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ background: "#eff6ff", width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconFileText size={22} color={T.primary} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
                      Folder: <strong style={{ color: T.text2 }}>{file.type}</strong> · Size: {file.size} · Uploaded: {file.created_at}
                    </div>
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                      AI OCR Confidence: <strong style={{ color: T.green }}>{file.confidence}</strong> · Status: <span style={{ color: T.primary, fontWeight: 700 }}>{file.status}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => setSelectedDocForPreview(file)}
                    style={{
                      padding: "7px 14px",
                      background: "#fff",
                      border: `1px solid ${T.border}`,
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <IconEye size={13} color={T.primary} /> View OCR
                  </button>
                  <a
                    href="#/ai-verification"
                    style={{
                      padding: "7px 14px",
                      background: T.green,
                      color: "#fff",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <IconCheck size={13} color="#fff" /> Tally Sync
                  </a>
                </div>
              </div>
            ))}

            {filteredDocs.length === 0 && (
              <div style={{ padding: 48, textAlign: "center", background: "#f8fafc", borderRadius: 10, border: `2px dashed ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <IconFolder size={36} color={T.text3} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text1, marginBottom: 4 }}>No documents found</div>
                <div style={{ fontSize: 12, color: T.text3 }}>No files match the selected folder or search query.</div>
              </div>
            )}
          </div>
        </Card>

      </div>

      {/* OCR Preview Modal */}
      {selectedDocForPreview && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 640, borderRadius: 14, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", color: "#fff", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                <IconFileText size={18} color="#93c5fd" /> OCR Metadata & Document Preview
              </div>
              <button
                onClick={() => setSelectedDocForPreview(null)}
                style={{ background: "transparent", color: "#fff", border: "none", fontSize: 18, cursor: "pointer" }}
              ><IconX size={16} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text1 }}>{selectedDocForPreview.name}</div>
                <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>
                  Confidence: <strong style={{ color: T.green }}>{selectedDocForPreview.confidence}</strong> · Type: {selectedDocForPreview.document_type}
                </div>
              </div>
              <div style={{ background: "#0f172a", color: "#38bdf8", padding: 16, borderRadius: 10, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, maxHeight: 240, overflowY: "auto" }}>
                {selectedDocForPreview.ocr_summary}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setSelectedDocForPreview(null)}
                  style={{ padding: "8px 18px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#fff" }}
                >
                  Close
                </button>
                <a
                  href="#/ai-verification"
                  onClick={() => setSelectedDocForPreview(null)}
                  style={{ padding: "8px 18px", background: T.primary, color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
                >
                  Open in AI Verification Studio
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
