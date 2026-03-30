"use client";

export default function GlobalConfiguration() {
  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 65% 30%, #2d1570 0%, #180d42 40%, #090215 75%)",
      overflowY: "auto",
      padding: "24px",
      boxSizing: "border-box",
      color: "#F1F0F3",
    }}>
      <div style={{
        maxWidth: 1130,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "26px",
      }}>

        <div style={{
          background: "rgba(217,217,217,0.12)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(203,191,255,0.10)",
          borderRadius: "18px",
          padding: "24px",
          boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)",
        }}>
          <h2 style={{ margin: 0, fontSize: "26px", fontFamily: "Montserrat, sans-serif", color: "#f5f2ff" }}>Security Settings</h2>
          <div style={{ marginTop: "12px", borderTop: "1px solid rgba(211, 184, 255, 0.25)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px", marginTop: "16px" }}>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Minimum Password Length</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>12</div>
            </div>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Session Timeout (minutes)</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>10</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px", marginTop: "14px" }}>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Enable Password Expiry</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>Yes</div>
            </div>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Action Lockout Duration (hours)</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>1</div>
            </div>
          </div>
        </div>

        <div style={{
          background: "rgba(217,217,217,0.12)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(203,191,255,0.10)",
          borderRadius: "18px",
          padding: "24px",
          boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)",
        }}>
          <h2 style={{ margin: 0, fontSize: "26px", fontFamily: "Montserrat, sans-serif", color: "#f5f2ff" }}>Data Retention & Backup</h2>
          <div style={{ marginTop: "12px", borderTop: "1px solid rgba(211, 184, 255, 0.25)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px", marginTop: "16px" }}>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Audit Log Retention (days)</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>365</div>
            </div>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Election Data Retention (days)</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>730</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px", marginTop: "14px" }}>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Backup Frequency</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>Daily</div>
            </div>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Backup Retention (days)</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>90</div>
            </div>
          </div>
        </div>

        <div style={{
          background: "rgba(217,217,217,0.12)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(203,191,255,0.10)",
          borderRadius: "18px",
          padding: "24px",
          boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)",
        }}>
          <h2 style={{ margin: 0, fontSize: "26px", fontFamily: "Montserrat, sans-serif", color: "#f5f2ff" }}>Tenant Defaults</h2>
          <div style={{ marginTop: "12px", borderTop: "1px solid rgba(211, 184, 255, 0.25)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px", marginTop: "16px" }}>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Max User Per Tenant</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>12</div>
            </div>
            <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(216,214,255,0.20)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c8c4f1" }}>Max Elections</div>
              <div style={{ marginTop: "8px", fontSize: "18px", fontWeight: 700 }}>100</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
