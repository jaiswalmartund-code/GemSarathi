import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F6F9",
          padding: "20px"
        }}>
          <div style={{
            maxWidth: "500px",
            background: "#ffffff",
            padding: "32px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            border: "1px solid #E5E7EB",
            textAlign: "center"
          }}>
            <AlertTriangle size={48} color="#DC2626" style={{ marginBottom: "16px" }} />
            <h2 style={{ fontSize: "20px", color: "#1A2B42", marginBottom: "8px" }}>Something went wrong</h2>
            <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px" }}>
              {this.state.error?.message || "An unexpected error occurred while rendering this page."}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => {
                  window.localStorage.removeItem("gem_access_token");
                  window.location.href = "/login";
                }}
                style={{
                  padding: "10px 18px",
                  background: "#003366",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Back to Login
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 18px",
                  background: "#ffffff",
                  color: "#003366",
                  border: "1px solid #D1D5DB",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <RefreshCw size={14} /> Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
