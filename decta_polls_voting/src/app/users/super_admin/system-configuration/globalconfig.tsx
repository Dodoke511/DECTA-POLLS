"use client";

export default function GlobalConfiguration() {
  return (
    <div style={{
      width: "100%",
      minHeight: "100%",
      background: "transparent",
      overflowY: "auto",
      padding: 0,
      boxSizing: "border-box",
      color: "#F1F0F3",
      display: "flex",
      flexDirection: "column",
      gap: "28px",
    }}>
      {/* Security Settings */}
      <div style={{
        width: "100%",
        minHeight: "320px",
        background: "rgba(217,217,217,0.09)",
        border: "1px solid rgba(203,191,255,0.10)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)",
      }}>
          <div style={{ padding: "32px 34px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, fontFamily: "Montserrat, sans-serif", color: "#e5e7eb", marginBottom: "14px" }}>Security Settings</h2>
            <div style={{ height: "1px", background: "rgba(167, 139, 250, 0.45)", marginBottom: "20px" }} />

            {/* Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Minimum Password Length</label>
                <input
                  type="text"
                  defaultValue="12"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Session Timeout (minutes)</label>
                <input
                  type="text"
                  defaultValue="10 minutes"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", cursor: "pointer" }} />
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>Enable Password Expiry</label>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Max Login Attempts</label>
                <input
                  type="text"
                  defaultValue="5"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Action Lockout Duration (hours)</label>
                <input
                  type="text"
                  defaultValue="1"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div />
            </div>
          </div>
        </div>

        {/* Data Retention & Backup */}
        <div style={{
          width: "100%",
          minHeight: "320px",
          background: "rgba(217,217,217,0.09)",
          border: "1px solid rgba(203,191,255,0.10)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)",
        }}>
          <div style={{ padding: "32px 34px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, fontFamily: "Montserrat, sans-serif", color: "#e5e7eb", marginBottom: "14px" }}>Data Retention & Backup</h2>
            <div style={{ height: "1px", background: "rgba(167, 139, 250, 0.45)", marginBottom: "20px" }} />

            {/* Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Audit Log Retention (days)</label>
                <input
                  type="text"
                  defaultValue="365"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Election Data Retention (days)</label>
                <input
                  type="text"
                  defaultValue="730"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Backup Frequency</label>
                <input
                  type="text"
                  defaultValue="Daily"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Backup Retention (days)</label>
                <input
                  type="text"
                  defaultValue="90"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", cursor: "pointer" }} />
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>Enable Automatic Backups</label>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", cursor: "pointer" }} />
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>Encrypt Backups</label>
              </div>
            </div>
          </div>
        </div>

        {/* Tenant Defaults */}
        <div style={{
          width: "100%",
          minHeight: "280px",
          background: "rgba(217,217,217,0.09)",
          border: "1px solid rgba(203,191,255,0.10)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "5px 5px 10px 2px rgba(255,255,255,0.06)",
        }}>
          <div style={{ padding: "32px 34px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, fontFamily: "Montserrat, sans-serif", color: "#e5e7eb", marginBottom: "14px" }}>Tenant Defaults</h2>
            <div style={{ height: "1px", background: "rgba(167, 139, 250, 0.45)", marginBottom: "20px" }} />

            {/* Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Max User Per Tenant</label>
                <input
                  type="text"
                  defaultValue="12"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Max Elections</label>
                <input
                  type="text"
                  defaultValue="100"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Storage Limit (GB)</label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="Enter value"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>Action Lockout Duration (hours)</label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="Enter value"
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(226, 232, 240, 0.4)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e5e7eb",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
