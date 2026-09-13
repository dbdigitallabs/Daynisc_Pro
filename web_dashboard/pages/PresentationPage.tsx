import React from "react";
import { T } from "../store/theme";

export default function PresentationPage() {
  return (
    <div style={{ width: "100%", height: "100%", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: T.pageBg, minHeight: "calc(100vh - 70px)", boxSizing: "border-box" }}>
      
      {/* Top Header Card */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#ffffff",
        padding: "16px 24px",
        borderRadius: "12px",
        border: `1px solid ${T.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            Academic Project Presentation (10 Slides)
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
            Daynisc AI ERP & Business Automation Ecosystem — Proposal & Viva Interactive Slide Deck
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href="/Daynisc_Academic_Presentation.pptx"
            download="Daynisc_Academic_Presentation.pptx"
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
              gap: "6px",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)"
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
            ↗️ Open Fullscreen Presenter
          </button>
        </div>
      </div>

      {/* Embedded Presentation Frame */}
      <div style={{
        flex: 1,
        border: "1px solid #cbd5e1",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#0f172a",
        minHeight: "750px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}>
        <iframe
          src="/presentation.html"
          title="Academic Presentation"
          style={{ width: "100%", height: "100%", minHeight: "750px", border: "none", display: "block" }}
        />
      </div>

    </div>
  );
}
