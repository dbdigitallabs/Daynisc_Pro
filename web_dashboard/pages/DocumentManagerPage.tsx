import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/apiClient";
import { T, cardStyle, badge } from "../store/theme";
import { IconFileText, IconUpload, IconSearch, IconSync } from "../components/Icons";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.cardBg, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: T.shadow, padding: 20, ...style }}>{children}</div>;
}

export default function DocumentManagerPage() {
  const qc = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState("fld-1");
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

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.post("/dms/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dms-folders"] });
      setUploadingFile(false);
    }
  });

  const handleSimulatedUpload = () => {
    setUploadingFile(true);
    const fd = new FormData();
    const mockFile = new File(["dummy pdf content"], `invoice_${Math.floor(Math.random() * 9000 + 1000)}.pdf`, { type: "application/pdf" });
    fd.append("file", mockFile);
    fd.append("folder_id", selectedFolderId);
    uploadMutation.mutate(fd);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 13 }}>Loading DMS Explorer…</div>;
  }

  const { folders = [], files = [] } = dmsData || {};
  const currentFiles = files.filter((f: any) => f.folder_id === selectedFolderId);

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif", background: T.pageBg, minHeight: "100%" }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text1, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.4px" }}>
            📁 Document Management System (DMS)
          </h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 3 }}>Store, tag, index, and perform OCR text searches on all business files.</p>
        </div>
        <button
          onClick={handleSimulatedUpload}
          disabled={uploadingFile}
          style={{
            background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
            padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6
          }}
        >
          {uploadingFile ? "AI Ingesting..." : <><IconUpload size={14} color="#fff" /> Upload Bill / LR / Challan</>}
        </button>
      </div>

      {/* OCR Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="OCR Text Search (e.g. 'Supreme Plastics' or invoice content)..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          style={{
            flex: 1, padding: "10px 14px", border: `1.5px solid ${T.border}`, borderRadius: 8,
            fontSize: 13, outline: "none", background: "#fff"
          }}
        />
        <button
          type="submit"
          style={{
            background: T.primary, color: "#fff", border: "none", borderRadius: T.radiusSm,
            padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}
        >
          Search
        </button>
      </form>

      {/* Search results banner if search matches */}
      {searchVal && searchResults && (
        <Card style={{ marginBottom: 20, background: "#f0fdf4" }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: T.green, marginBottom: 8 }}>🔍 OCR Text Matches</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map((f: any) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#fff", borderRadius: 6, border: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: T.text3, fontStyle: "italic", marginTop: 2 }}>"{f.ocr_text}"</div>
                </div>
                <span style={badge(T.primary, "#eff6ff")}>{f.type}</span>
              </div>
            ))}
            {searchResults.length === 0 && <div style={{ fontSize: 12, color: T.text3 }}>No matches found inside PDF OCR index.</div>}
          </div>
        </Card>
      )}

      {/* Explorer Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        {/* Folders List */}
        <Card style={{ padding: "16px" }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Categories</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {folders.map((f: any) => {
              const isSelected = f.id === selectedFolderId;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  style={{
                    display: "block", width: "100%", padding: "9px 12px", textAlign: "left",
                    background: isSelected ? T.primary + "15" : "transparent",
                    color: isSelected ? T.primary : T.text2, border: "none", borderRadius: 8,
                    fontSize: 12, fontWeight: isSelected ? 700 : 500, cursor: "pointer", transition: "all 0.15s"
                  }}
                >
                  📁 {f.name}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Files Browser */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>
              {folders.find((f: any) => f.id === selectedFolderId)?.name || "Files"}
            </h3>
            <span style={{ fontSize: 11, color: T.text3 }}>{currentFiles.length} documents stored</span>
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
                    View OCR Text
                  </a>
                </div>
              </div>
            ))}

            {currentFiles.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: T.text3, fontSize: 12 }}>
                No files uploaded in this folder yet. Drag/drop or use the upload button.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
