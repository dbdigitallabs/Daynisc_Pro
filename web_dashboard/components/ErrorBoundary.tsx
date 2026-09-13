// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          padding: 24,
        }}>
          <div style={{
            maxWidth: 520,
            width: "100%",
            background: "#141927",
            border: "1px solid #2a3347",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: "#f5a623" }}>
              Workspace View Recovered
            </h2>
            <p style={{ fontSize: 13, color: "#8892a4", lineHeight: 1.6, marginBottom: 20 }}>
              An unexpected render issue was safely intercepted.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.hash = "#/ai-verification";
                  window.location.reload();
                }}
                style={{
                  padding: "10px 20px",
                  background: "#f5a623",
                  color: "#0a0a0f",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Reload Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.hash = "#/login";
                  window.location.reload();
                }}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: "#8892a4",
                  border: "1px solid #2a3347",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
