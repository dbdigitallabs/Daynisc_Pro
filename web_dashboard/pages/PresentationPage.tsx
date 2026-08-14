import React from "react";

export default function PresentationPage() {
  return (
    <div style={{ width: "100%", height: "100%", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "16px 24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: 0 }}>Academic Project Presentation (10 Slides)</h1>
          <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Daynisc AI ERP & Business Automation Ecosystem — Proposal & Viva Slide Deck</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <a
            href="/Daynisc_Academic_Presentation.pptx"
            download
            style={{
              background: "#2563eb",
              color: "#ffffff",
              padding: "10px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            Download PowerPoint (.PPTX)
          </a>
          <button
            onClick={() => window.open("/presentation.html", "_blank")}
            style={{
              background: "#0f172a",
              color: "#ffffff",
              padding: "10px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            Launch Interactive Presenter
          </button>
        </div>
      </div>

      <div style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: "12px", overflow: "hidden", background: "#0f172a" }}>
        <iframe
          src="/presentation.html"
          title="Academic Presentation"
          style={{ width: "100%", height: "100%", minHeight: "650px", border: "none" }}
        />
      </div>
    </div>
  );
}
