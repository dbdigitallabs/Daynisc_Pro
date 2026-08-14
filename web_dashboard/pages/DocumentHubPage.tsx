import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge } from "../store/theme";
import { IconFileText, IconUpload, IconSearch } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function DocumentHubPage() {
  const qc = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState("Invoices");
  const [searchVal, setSearchVal] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: dmsData, isLoading } = useQuery<any>({
    queryKey: ["dms-folders"],
    queryFn: () => api.get("/dms/folders").then(r => r.data),
  });

  const { data: searchResults, refetch: runSearch } = useQuery<any[]>({
    queryKey: ["dms-search", searchVal],
    queryFn: () => api.get("/dms/search", { params: { query: searchVal } }).then(r => r.data),
    enabled: false
  });

  const handleSimulatedUpload = () => {
    setUploadingFile(true);
    const fd = new FormData();
    const mockFile = new File(["dummy pdf content"], `${selectedFolder.toLowerCase()}_${Math.floor(Math.random() * 9000 + 1000)}.pdf`, { type: "application/pdf" });
    fd.append("file", mockFile);
    fd.append("folder_id", "fld-1");
    api.post("/dms/upload", fd).then(() => {
      qc.invalidateQueries({ queryKey: ["dms-folders"] });
      setUploadingFile(false);
    });
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Loading Document Drive…</div>;
  }

  const { files = [] } = dmsData || {};
  const folders = ["Invoices", "Purchase Orders", "Receipts", "GST Documents", "Payroll", "Assets", "Contracts"];
  const currentFiles = files.filter((f: any) => f.type.toLowerCase().includes(selectedFolder.toLowerCase().replace(" ", "").slice(0, 4)));

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
            📂 Google Drive - Document Hub
          </h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Enterprise-wide central document drive matching purchase orders, invoices, and contracts.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="#/ai-verification"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4361ee)",
              color: "#fff", borderRadius: T.radiusSm,
              padding: "10px 18px", fontSize: 13, fontWeight: 700,
              textDecoration: "none", display: "inline-flex",
              alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)"
            }}
          >
            ⚡ AI Upload & Tally Verification Studio
          </a>
          <button
            onClick={handleSimulatedUpload}
            disabled={uploadingFile}
            style={{
              background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
              padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            {uploadingFile ? "Uploading..." : <><IconUpload size={14} color="#fff" /> Upload to {selectedFolder}</>}
          </button>
        </div>
      </div>

      {/* OCR Search Bar */}
      <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search items, tags, or OCR content in Drive..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          style={{
            flex: 1, padding: "10px 14px", border: `1.5px solid ${T.border}`, borderRadius: 8,
            fontSize: 13, outline: "none", background: "#fff"
          }}
        />
        <button type="submit" style={{ background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Search Drive
        </button>
      </form>

      {/* Grid Explorer Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        {/* Folders List (Left Sidebar) */}
        <Card style={{ padding: "16px" }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Folders</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {folders.map(fld => {
              const isSelected = fld === selectedFolder;
              return (
                <button
                  key={fld}
                  onClick={() => setSelectedFolder(fld)}
                  style={{
                    display: "block", width: "100%", padding: "9px 12px", textAlign: "left",
                    background: isSelected ? T.primary + "15" : "transparent",
                    color: isSelected ? T.primary : T.text2, border: "none", borderRadius: 8,
                    fontSize: 12, fontWeight: isSelected ? 700 : 500, cursor: "pointer", transition: "all 0.15s"
                  }}
                >
                  📁 {fld}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Files Browser (Right Pane) */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{selectedFolder} Folder</h3>
            <span style={{ fontSize: 11, color: T.text3 }}>{currentFiles.length} files stored</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentFiles.map((file: any) => (
              <div key={file.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px", border: `1px solid ${T.border}`, borderRadius: 10,
                background: "#f8fafc"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <IconFileText size={20} color={T.primary} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text1 }}>{file.name}</div>
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>
                      Version: {file.version} · Size: {file.size} · Uploaded: {file.created_at}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={badge(T.primary, "#eff6ff")}>{file.type}</span>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert("AI OCR Contents:\n\n" + file.ocr_text); }}
                    style={{ fontSize: 11, color: T.primary, textDecoration: "none", fontWeight: 600, marginLeft: 8 }}
                  >
                    View OCR
                  </a>
                </div>
              </div>
            ))}
            {currentFiles.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 12 }}>
                No documents found in this folder.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
