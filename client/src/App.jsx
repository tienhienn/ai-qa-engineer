import React, { useState } from "react";

export default function App() {
  const [requirement, setRequirement] = useState(
    "As a new user, I want to sign up on https://automationexercise.com/login by entering my Name and Email address. If the email is already registered, display the error message 'Email Address already exist!'."
  );
  const [activeTab, setActiveTab] = useState("ALL");
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [bugReports, setBugReports] = useState([]);

  // 1. Gọi API sinh Test Cases từ User Story
  const handleGenerateTests = async () => {
    setLoadingGenerate(true);
    setTestResults([]);
    setBugReports([]);
    try {
      const response = await fetch("http://localhost:5000/api/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement }),
      });
      const data = await response.json();
      setTestCases(data.testCases || []);
    } catch (err) {
      alert("Lỗi khi kết nối với backend. Hãy chắc chắn server.js đang chạy ở port 5000!");
      console.error(err);
    } finally {
      setLoadingGenerate(false);
    }
  };

  // 2. Chạy Playwright Automation & Phân tích lỗi
  const handleRunTests = async () => {
    if (testCases.length === 0) return;
    setLoadingRun(true);
    setTestResults([]);
    setBugReports([]);

    try {
      const response = await fetch("http://localhost:5000/api/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCases }),
      });
      const data = await response.json();
      const results = data.results || [];
      setTestResults(results);

      // Tìm các test case bị FAIL và gọi API phân tích Bug Report
      const failedCases = results.filter((r) => r.status === "FAILED");
      const generatedReports = [];

      for (const failed of failedCases) {
        const bugRes = await fetch("http://localhost:5000/api/analyze-bug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ failedTest: failed }),
        });
        const bugData = await bugRes.json();
        generatedReports.push({
          testId: failed.id,
          title: failed.title,
          report: bugData.bugReport,
          screenshot: failed.screenshot,
        });
      }
      setBugReports(generatedReports);
    } catch (err) {
      alert("Lỗi trong quá trình chạy Playwright Automation!");
      console.error(err);
    } finally {
      setLoadingRun(false);
    }
  };

  // Lọc test cases theo tab
  const filteredCases =
    activeTab === "ALL"
      ? testCases
      : testCases.filter((tc) => tc.type.toUpperCase() === activeTab);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>⚡ AI QA Engineer Workspace</h1>
          <p style={styles.headerSubtitle}>
            Autonomous Test Generation, Playwright Automation & Root-Cause Bug Reporting
          </p>
        </div>
        <div style={styles.badge}>ISTQB Compliant</div>
      </header>

      {/* Grid Layout chính */}
      <main style={styles.mainGrid}>
        {/* CỘT BÊN TRÁI: INPUT & TEST CASES */}
        <section style={styles.column}>
          {/* Card 1: User Story Input */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.stepNum}>1</span>
              <h2 style={styles.cardTitle}>Requirement / User Story</h2>
            </div>
            <textarea
              style={styles.textarea}
              rows={4}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Paste your user story or feature requirement here..."
            />
            <button
              style={{
                ...styles.button,
                backgroundColor: loadingGenerate ? "#4b5563" : "#2563eb",
              }}
              onClick={handleGenerateTests}
              disabled={loadingGenerate}
            >
              {loadingGenerate ? "🤖 AI đang phân tích & sinh test..." : "✨ Generate 15+ Test Cases"}
            </button>
          </div>

          {/* Card 2: Generated Test Cases Table */}
          {testCases.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeaderBetween}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={styles.stepNum}>2</span>
                  <h2 style={styles.cardTitle}>Test Suites ({testCases.length} Cases)</h2>
                </div>
                {/* Tabs */}
                <div style={styles.tabContainer}>
                  {["ALL", "POSITIVE", "NEGATIVE", "BOUNDARY", "VALIDATION"].map((tab) => (
                    <button
                      key={tab}
                      style={{
                        ...styles.tabBtn,
                        ...(activeTab === tab ? styles.tabBtnActive : {}),
                      }}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bảng Test Cases */}
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Scenario Title</th>
                      <th style={styles.th}>Expected Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((tc) => (
                      <tr key={tc.id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: "bold", color: "#60a5fa" }}>
                          {tc.id}
                        </td>
                        <td style={styles.td}>
                          <span style={getTagStyle(tc.type)}>{tc.type}</span>
                        </td>
                        <td style={styles.td}>{tc.title}</td>
                        <td style={{ ...styles.td, color: "#9ca3af" }}>{tc.expected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Button: Run Test */}
              <div style={{ marginTop: 20 }}>
                <button
                  style={{
                    ...styles.button,
                    backgroundColor: loadingRun ? "#4b5563" : "#10b981",
                  }}
                  onClick={handleRunTests}
                  disabled={loadingRun}
                >
                  {loadingRun ? "🚀 Playwright đang mở Chromium chạy test..." : "▶ Run Automated Tests"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* CỘT BÊN PHẢI: KẾT QUẢ AUTOMATION & AI BUG REPORT */}
        <section style={styles.column}>
          {/* Card 3: Execution Status */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.stepNum}>3</span>
              <h2 style={styles.cardTitle}>Automation Results (Playwright)</h2>
            </div>

            {testResults.length === 0 ? (
              <p style={styles.emptyText}>Chưa có bài test nào được chạy. Hãy bấm "Run Automated Tests".</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {testResults.map((res) => (
                  <div
                    key={res.id}
                    style={{
                      ...styles.resultRow,
                      borderColor: res.status === "PASSED" ? "#059669" : "#dc2626",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: "bold", marginRight: 8 }}>{res.id}</span>
                      <span>{res.title}</span>
                    </div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: res.status === "PASSED" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: res.status === "PASSED" ? "#34d399" : "#f87171",
                      }}
                    >
                      {res.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: AI Failure Analysis & Bug Report */}
          {bugReports.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={{ ...styles.stepNum, backgroundColor: "#dc2626" }}>4</span>
                <h2 style={styles.cardTitle}>AI Bug Report & Visual Evidence</h2>
              </div>

              {bugReports.map((bug, index) => (
                <div key={index} style={styles.bugCard}>
                  <div style={styles.bugHeader}>
                    <span style={styles.bugTag}>AUTO LOGGED BUG</span>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{bug.testId} Failure Incident</h3>
                  </div>

                  {/* Screenshot Evidence */}
                  <div style={{ margin: "16px 0" }}>
                    <label style={styles.evidenceLabel}>📷 Screenshot Evidence (Playwright Captured):</label>
                    <img
                      src={bug.screenshot}
                      alt="Bug Evidence"
                      style={styles.screenshotImg}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>

                  {/* Root Cause Markdown Content */}
                  <div style={styles.markdownBox}>
                    <pre style={styles.preformatted}>{bug.report}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Hàm format màu badge theo loại Test Case
function getTagStyle(type = "") {
  const base = {
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
    display: "inline-block",
  };
  switch (type.toUpperCase()) {
    case "POSITIVE":
      return { ...base, backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" };
    case "NEGATIVE":
      return { ...base, backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" };
    case "BOUNDARY":
      return { ...base, backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" };
    case "VALIDATION":
      return { ...base, backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" };
    default:
      return { ...base, backgroundColor: "#374151", color: "#d1d5db" };
  }
}

// Bảng Styles CSS Hiện đại (Dark Theme)
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "24px 32px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1e293b",
    paddingBottom: 16,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    margin: "4px 0 0 0",
  },
  badge: {
    backgroundColor: "#1e293b",
    color: "#38bdf8",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: 12,
    fontWeight: "600",
    border: "1px solid #334155",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 24,
    alignItems: "start",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    border: "1px solid #334155",
    padding: 20,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  cardHeaderBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  stepNum: {
    backgroundColor: "#3b82f6",
    color: "#fff",
    borderRadius: "50%",
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: "bold",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    margin: 0,
  },
  textarea: {
    width: "100%",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#e2e8f0",
    padding: 12,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 16,
    lineHeight: "1.5",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  tabContainer: {
    display: "flex",
    gap: 6,
  },
  tabBtn: {
    backgroundColor: "#0f172a",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 11,
    cursor: "pointer",
    fontWeight: "500",
  },
  tabBtnActive: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    borderColor: "#3b82f6",
  },
  tableWrapper: {
    overflowX: "auto",
    maxHeight: "380px",
    borderRadius: 8,
    border: "1px solid #334155",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: 13,
  },
  th: {
    backgroundColor: "#0f172a",
    padding: "10px 12px",
    color: "#94a3b8",
    fontWeight: "600",
    position: "sticky",
    top: 0,
    borderBottom: "1px solid #334155",
  },
  tr: {
    borderBottom: "1px solid #334155",
  },
  td: {
    padding: "10px 12px",
    verticalAlign: "top",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    padding: "24px 0",
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: "12px 16px",
    borderRadius: 8,
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
    fontSize: 13,
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  bugCard: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 16,
    border: "1px solid rgba(220, 38, 38, 0.4)",
    marginTop: 12,
  },
  bugHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  bugTag: {
    backgroundColor: "#dc2626",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "bold",
  },
  evidenceLabel: {
    display: "block",
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 6,
    fontWeight: "500",
  },
  screenshotImg: {
    width: "100%",
    maxHeight: "220px",
    objectFit: "cover",
    borderRadius: 6,
    border: "1px solid #334155",
  },
  markdownBox: {
    backgroundColor: "#182234",
    padding: 12,
    borderRadius: 6,
    border: "1px solid #334155",
    overflowX: "auto",
  },
  preformatted: {
    margin: 0,
    fontSize: 12,
    color: "#cbd5e1",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
  },
};