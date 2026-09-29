import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Sparkles,
  Play,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Edit3,
  Bug,
  Info,
  Zap,
  Globe,
  Compass,
  ShieldCheck,
  Layers,
  Cpu,
  AlertOctagon,
  ArrowRight
} from "lucide-react";

export default function App() {
  // State Explorer Website (Bonus Feature)
  const [targetUrl, setTargetUrl] = useState("https://automationexercise.com");
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [exploration, setExploration] = useState(null);

  // State Requirement & Generation
  const [requirement, setRequirement] = useState(
    "As a new user, I want to sign up on https://automationexercise.com/login by entering my Name and Email address. If the email is already registered, display the error message 'Email Address already exist!'."
  );
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [testStrategy, setTestStrategy] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState("ALL");

  // State Automation Execution & Bug Report
  const [headless, setHeadless] = useState(true);
  const [loadingRun, setLoadingRun] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [bugReports, setBugReports] = useState([]);

  // Toast Notification state
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "info" });
    }, 3800);
  };

  // 0. BONUS FEATURE: AI WEBSITE EXPLORER
  const handleExploreWebsite = async () => {
    if (!targetUrl.trim()) {
      showToast("Vui lòng nhập URL trang web!", "warning");
      return;
    }
    setLoadingExplore(true);
    try {
      showToast("🔍 Playwright đang mở trang web & AI trích xuất cấu trúc...", "info");
      const response = await fetch("http://localhost:5000/api/explore-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error(`Server trả về HTTP ${response.status} (${response.statusText}). Vui lòng đảm bảo server.js bản mới nhất đang chạy!`);
      }

      if (!response.ok) throw new Error(data.error || "Lỗi explore website");

      setExploration(data.exploration);
      showToast("🌐 AI đã phân tích xong cấu trúc Website & các User Flows!", "success");
    } catch (err) {
      showToast(`Lỗi Explore: ${err.message}`, "error");
      console.error(err);
    } finally {
      setLoadingExplore(false);
    }
  };

  const applySuggestedRequirement = (suggested) => {
    if (suggested) {
      setRequirement(suggested);
      showToast("⚡ Đã áp dụng User Story gợi ý vào ô Requirement!", "success");
    }
  };

  // 1. MANDATORY FEATURE: GỌI API SINH TEST STRATEGY & 15+ TEST CASES
  const handleGenerateTests = async () => {
    if (!requirement.trim()) {
      showToast("Vui lòng nhập Requirement trước khi sinh test cases!", "warning");
      return;
    }
    setLoadingGenerate(true);
    setTestResults([]);
    setBugReports([]);
    try {
      showToast("🤖 AI đang lập Test Strategy & sinh 15+ Test Cases...", "info");
      const response = await fetch("http://localhost:5000/api/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error(`Server trả về HTTP ${response.status} (${response.statusText}). Vui lòng khởi động lại server.js!`);
      }

      if (!response.ok) throw new Error(data.error || "Lỗi sinh Test Cases");

      const generatedCases = data.testCases || [];
      setTestStrategy(data.testStrategy || null);
      setTestCases(generatedCases);
      setSelectedIds(new Set(generatedCases.map((tc) => tc.id)));
      showToast(`✨ Đã sinh thành công Test Strategy & ${generatedCases.length} Test Cases!`, "success");
    } catch (err) {
      showToast(`Lỗi: ${err.message}`, "error");
      console.error(err);
    } finally {
      setLoadingGenerate(false);
    }
  };

  // Quản lý Checkbox Chọn Test Cases (Human-in-the-loop)
  const toggleSelectCase = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCases.length && filteredCases.length > 0) {
      const next = new Set(selectedIds);
      filteredCases.forEach((tc) => next.delete(tc.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredCases.forEach((tc) => next.add(tc.id));
      setSelectedIds(next);
    }
  };

  // Chỉnh sửa trực tiếp (Inline Edit) dữ liệu Test Cases
  const handleCellEdit = (id, field, value) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  // 2. CHẠY AUTOMATED TESTS VỚI PLAYWRIGHT
  const handleRunTests = async (runMode = "selected") => {
    let casesToRun = [];
    if (runMode === "all") {
      casesToRun = testCases;
    } else {
      casesToRun = testCases.filter((tc) => selectedIds.has(tc.id));
    }

    if (casesToRun.length === 0) {
      showToast("Vui lòng tích chọn ít nhất 1 Test Case để thực thi!", "warning");
      return;
    }

    setLoadingRun(true);
    setTestResults([]);
    setBugReports([]);

    showToast(`🚀 Đang khởi tạo Playwright (${headless ? "Headless Mode" : "Headed UI Mode"})...`, "info");

    try {
      const response = await fetch("http://localhost:5000/api/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCases: casesToRun, headless }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lỗi chạy Playwright");

      const results = data.results || [];
      setTestResults(results);

      const passedCount = results.filter((r) => r.status === "PASSED").length;
      const failedCases = results.filter((r) => r.status === "FAILED");

      showToast(`Hoàn tất! Pass: ${passedCount}/${results.length}, Fail: ${failedCases.length}`, failedCases.length > 0 ? "warning" : "success");

      // Tự động phân tích lỗi & lập Bug Report cho các case FAILED
      if (failedCases.length > 0) {
        showToast("🤖 AI đang phân tích nguyên nhân gốc & lập Bug Report...", "info");
        const generatedReports = [];

        for (const failed of failedCases) {
          try {
            const bugRes = await fetch("http://localhost:5000/api/analyze-bug", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ failedTest: failed }),
            });
            const bugData = await bugRes.json();
            if (bugRes.ok) {
              generatedReports.push({
                testId: failed.id,
                title: failed.title,
                report: bugData.bugReport,
                screenshot: failed.screenshot,
              });
            }
          } catch (bugErr) {
            console.error("Bug analysis failed for", failed.id, bugErr);
          }
        }
        setBugReports(generatedReports);
      }
    } catch (err) {
      showToast(`Lỗi chạy Playwright Automation: ${err.message}`, "error");
      console.error(err);
    } finally {
      setLoadingRun(false);
    }
  };

  // 3. TÍNH NĂNG XUẤT EXCEL 2-SHEET CHUẨN QA (1-CLICK EXPORT)
  const exportFullReportToExcel = () => {
    if (testCases.length === 0) {
      showToast("Chưa có dữ liệu để xuất file Excel!", "warning");
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Test Strategy & Cases
    const sheet1Data = [];

    if (testStrategy) {
      sheet1Data.push({ A: "=== ISTQB TEST STRATEGY OVERVIEW ===", B: "", C: "", D: "", E: "", F: "" });
      sheet1Data.push({ A: "Strategy Title", B: testStrategy.title || "Automated Test Strategy", C: "", D: "", E: "", F: "" });
      if (testStrategy.scope) {
        sheet1Data.push({ A: "Scope Included", B: (testStrategy.scope.included || []).join("; "), C: "", D: "", E: "", F: "" });
        sheet1Data.push({ A: "Scope Excluded", B: (testStrategy.scope.excluded || []).join("; "), C: "", D: "", E: "", F: "" });
      }
      sheet1Data.push({ A: "", B: "", C: "", D: "", E: "", F: "" });
    }

    sheet1Data.push({
      A: "ID",
      B: "Phân loại (Category)",
      C: "Kịch bản (Scenario Title)",
      D: "Name Input",
      E: "Email Input",
      F: "Kết quả mong đợi (Expected Result)"
    });

    testCases.forEach((tc) => {
      sheet1Data.push({
        A: tc.id,
        B: tc.type,
        C: tc.title,
        D: tc.name_input || "",
        E: tc.email_input || "",
        F: tc.expected
      });
    });

    const ws1 = XLSX.utils.json_to_sheet(sheet1Data, { skipHeader: true });
    ws1["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 42 }, { wch: 20 }, { wch: 25 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, ws1, "Test Strategy & Cases");

    // Sheet 2: Execution & Bug Reports
    if (testResults.length > 0) {
      const summaryData = testResults.map((r) => ({
        "Test ID": r.id,
        "Phân loại": r.type || "",
        "Tiêu đề Kịch bản": r.title,
        "Trạng thái (Status)": r.status,
        "Kết quả mong đợi": r.expected,
        "Chi tiết lỗi (Error Log)": r.error || "None",
        "Screenshot URL": r.screenshot || "N/A"
      }));
      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      ws2["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 38 }, { wch: 15 }, { wch: 40 }, { wch: 45 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, ws2, "Execution & Bug Reports");
    }

    XLSX.writeFile(workbook, `QA_FullReport_${Date.now()}.xlsx`);
    showToast("📊 Xuất Báo cáo Excel 2-Sheet thành công!", "success");
  };

  // Lọc test cases theo tab
  const filteredCases =
    activeTab === "ALL"
      ? testCases
      : testCases.filter((tc) => (tc.type || "").toUpperCase() === activeTab);

  const isAllFilteredSelected =
    filteredCases.length > 0 &&
    filteredCases.every((tc) => selectedIds.has(tc.id));

  return (
    <div style={styles.container}>
      {/* Toast Notification Alert */}
      {toast.show && (
        <div style={{ ...styles.toast, ...getToastStyle(toast.type) }}>
          {toast.type === "success" && <CheckCircle2 size={18} />}
          {toast.type === "error" && <XCircle size={18} />}
          {toast.type === "warning" && <AlertTriangle size={18} />}
          {toast.type === "info" && <Info size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={styles.logoBadge}>
            <Zap size={24} color="#38bdf8" />
          </div>
          <div>
            <h1 style={styles.headerTitle}>AI QA Engineer Assistant</h1>
            <p style={styles.headerSubtitle}>
              AI Explorer • ISTQB Test Strategy • Playwright Automation • Human-in-the-Loop Verification • Excel Reporting
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={styles.badge}>ISTQB Compliant</span>
          <span style={styles.badgeGlow}>🏆 200 XP Challenge Ready</span>
        </div>
      </header>

      {/* CARD 0: AI WEBSITE EXPLORER (BONUS FEATURE) */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ ...styles.card, borderColor: "rgba(56, 189, 248, 0.4)" }}>
          <div style={styles.cardHeaderBetween}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ ...styles.stepNum, backgroundColor: "#0284c7" }}>0</span>
              <h2 style={styles.cardTitle}>AI Website Explorer (Bonus Feature)</h2>
            </div>
            <span style={{ fontSize: 12, color: "#38bdf8", fontWeight: "600" }}>Playwright Web Scraper & Gemini AI Flow Analysis</span>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={styles.inputUrlWrapper}>
              <Globe size={18} color="#94a3b8" />
              <input
                type="text"
                style={styles.urlInput}
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="Nhập URL website (vd: https://automationexercise.com)"
              />
            </div>
            <button
              style={{
                ...styles.button,
                width: "220px",
                backgroundColor: loadingExplore ? "#4b5563" : "#0284c7",
              }}
              onClick={handleExploreWebsite}
              disabled={loadingExplore}
            >
              {loadingExplore ? (
                <>
                  <RefreshCw className="spin" size={16} />
                  <span>AI đang khám phá...</span>
                </>
              ) : (
                <>
                  <Compass size={16} />
                  <span>🔍 AI Explore Website</span>
                </>
              )}
            </button>
          </div>

          {/* Result of Website Exploration */}
          {exploration && (
            <div style={styles.explorerResultBox}>
              <div style={{ marginBottom: 12 }}>
                <span style={styles.exploreBadge}>WEBSITE ARCHITECTURE</span>
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#cbd5e1" }}>
                  {exploration.summary}
                </p>
              </div>

              {/* 3 Top User Flows */}
              <div style={{ marginBottom: 14 }}>
                <label style={styles.sectionLabel}>📌 Top 3 Key User Flows Identified:</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 6 }}>
                  {(exploration.userFlows || []).map((flow, idx) => (
                    <div key={idx} style={styles.flowCard}>
                      <span style={styles.flowNum}>Flow #{idx + 1}</span>
                      <span style={{ fontSize: 12, color: "#e2e8f0" }}>{flow}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested User Story */}
              {exploration.suggestedRequirement && (
                <div style={styles.suggestedBox}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={styles.sectionLabel}>💡 AI Suggested User Story:</label>
                    <button
                      style={styles.applyBtn}
                      onClick={() => applySuggestedRequirement(exploration.suggestedRequirement)}
                    >
                      <ArrowRight size={14} />
                      <span>⚡ Áp dụng vào ô Requirement</span>
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "#93c5fd", fontStyle: "italic" }}>
                    "{exploration.suggestedRequirement}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Grid Content */}
      <main style={styles.mainGrid}>
        {/* CỘT BÊN TRÁI: REQUIREMENT, STRATEGY & TEST SUITE */}
        <section style={styles.column}>
          {/* CARD 1: REQUIREMENT INPUT */}
          <div style={styles.card}>
            <div style={styles.cardHeaderBetween}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={styles.stepNum}>1</span>
                <h2 style={styles.cardTitle}>Requirement / User Story</h2>
              </div>
            </div>
            <textarea
              style={styles.textarea}
              rows={4}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Paste user story or feature requirements here..."
            />
            <button
              style={{
                ...styles.button,
                backgroundColor: loadingGenerate ? "#4b5563" : "#2563eb",
              }}
              onClick={handleGenerateTests}
              disabled={loadingGenerate}
            >
              {loadingGenerate ? (
                <>
                  <RefreshCw className="spin" size={18} />
                  <span>AI đang sinh Test Strategy & 15+ Test Cases (Fallback)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate Test Strategy & 15+ Test Cases</span>
                </>
              )}
            </button>
          </div>

          {/* CARD 2: TEST STRATEGY VIEW (MANDATORY FEATURE) */}
          {testStrategy && (
            <div style={{ ...styles.card, borderLeft: "4px solid #38bdf8" }}>
              <div style={styles.cardHeaderBetween}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ShieldCheck size={20} color="#38bdf8" />
                  <h2 style={{ ...styles.cardTitle, color: "#38bdf8" }}>
                    {testStrategy.title || "ISTQB Test Strategy Overview"}
                  </h2>
                </div>
                <span style={styles.badgeGlow}>QA Strategy Framework</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* 1. Scope of Testing */}
                <div style={styles.strategyBlock}>
                  <div style={styles.strategyHeader}>
                    <Layers size={15} color="#60a5fa" />
                    <span>1. Scope of Testing</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ color: "#34d399", fontWeight: "600", marginBottom: 2 }}>Included:</div>
                    <ul style={styles.strategyList}>
                      {(testStrategy.scope?.included || []).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                    <div style={{ color: "#f87171", fontWeight: "600", margin: "6px 0 2px 0" }}>Excluded:</div>
                    <ul style={styles.strategyList}>
                      {(testStrategy.scope?.excluded || []).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 2. Test Approach */}
                <div style={styles.strategyBlock}>
                  <div style={styles.strategyHeader}>
                    <Compass size={15} color="#a78bfa" />
                    <span>2. Test Approach & Methodologies</span>
                  </div>
                  <ul style={styles.strategyList}>
                    {(testStrategy.approach || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 3. Environment & Tools */}
                <div style={styles.strategyBlock}>
                  <div style={styles.strategyHeader}>
                    <Cpu size={15} color="#f59e0b" />
                    <span>3. Environment & Automation Tools</span>
                  </div>
                  <ul style={styles.strategyList}>
                    {(testStrategy.environment || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 4. Risk Assessment & Mitigation */}
                <div style={styles.strategyBlock}>
                  <div style={styles.strategyHeader}>
                    <AlertOctagon size={15} color="#ef4444" />
                    <span>4. Risk Assessment & Mitigation</span>
                  </div>
                  <div style={{ fontSize: 11 }}>
                    {(testStrategy.riskAssessment || []).map((r, i) => (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <span style={{ color: "#fca5a5", fontWeight: "600" }}>Risk: </span>
                        <span>{r.risk}</span>
                        <br />
                        <span style={{ color: "#6ee7b7", fontWeight: "600" }}>Mitigation: </span>
                        <span>{r.mitigation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CARD 3: TEST CASES TABLE & HUMAN VERIFICATION */}
          {testCases.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeaderBetween}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={styles.stepNum}>2</span>
                  <div>
                    <h2 style={styles.cardTitle}>Human Verification & Test Suite</h2>
                    <span style={styles.subTextCount}>
                      Đã chọn {selectedIds.size}/{testCases.length} test cases để chạy
                    </span>
                  </div>
                </div>

                {/* Tab Filtering */}
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

              {/* Toolbar controls (Excel export, Headless toggle, Select all) */}
              <div style={styles.toolbar}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button style={styles.iconActionBtn} onClick={toggleSelectAll}>
                    {isAllFilteredSelected ? (
                      <CheckSquare size={16} color="#38bdf8" />
                    ) : (
                      <Square size={16} color="#94a3b8" />
                    )}
                    <span>{isAllFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</span>
                  </button>

                  <div style={styles.dividerVertical} />

                  {/* Toggle Headless / Headed */}
                  <button
                    style={{
                      ...styles.toggleBtn,
                      backgroundColor: headless ? "#1e293b" : "#3b82f6",
                      borderColor: headless ? "#334155" : "#60a5fa",
                    }}
                    onClick={() => setHeadless(!headless)}
                    title="Chuyển đổi chế độ xem trực tiếp trình duyệt Chromium"
                  >
                    {headless ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span>{headless ? "Headless Mode (Ngầm)" : "Headed Mode (Bật UI Browser)"}</span>
                  </button>
                </div>

                {/* Export Excel Button */}
                <button style={styles.excelExportBtn} onClick={exportFullReportToExcel}>
                  <FileSpreadsheet size={16} />
                  <span>Xuất Excel (.xlsx)</span>
                </button>
              </div>

              {/* Editable Test Cases Table */}
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: 40, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={toggleSelectAll}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th style={{ ...styles.th, width: 65 }}>ID</th>
                      <th style={{ ...styles.th, width: 95 }}>Phân loại</th>
                      <th style={styles.th}>Kịch bản (Scenario) - Inline Edit</th>
                      <th style={{ ...styles.th, width: 140 }}>Name Input</th>
                      <th style={{ ...styles.th, width: 160 }}>Email Input</th>
                      <th style={styles.th}>Expected Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((tc) => {
                      const isSelected = selectedIds.has(tc.id);
                      return (
                        <tr
                          key={tc.id}
                          style={{
                            ...styles.tr,
                            backgroundColor: isSelected ? "rgba(59, 130, 246, 0.05)" : "transparent",
                          }}
                        >
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCase(tc.id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td style={{ ...styles.td, fontWeight: "bold", color: "#60a5fa" }}>
                            {tc.id}
                          </td>
                          <td style={styles.td}>
                            <span style={getTagStyle(tc.type)}>{tc.type}</span>
                          </td>

                          {/* Editable Title */}
                          <td style={styles.td}>
                            <input
                              type="text"
                              style={styles.inlineInput}
                              value={tc.title}
                              onChange={(e) => handleCellEdit(tc.id, "title", e.target.value)}
                            />
                          </td>

                          {/* Editable Name Input */}
                          <td style={styles.td}>
                            <input
                              type="text"
                              style={styles.inlineInputCode}
                              value={tc.name_input || ""}
                              placeholder="(empty)"
                              onChange={(e) => handleCellEdit(tc.id, "name_input", e.target.value)}
                            />
                          </td>

                          {/* Editable Email Input */}
                          <td style={styles.td}>
                            <input
                              type="text"
                              style={styles.inlineInputCode}
                              value={tc.email_input || ""}
                              placeholder="(empty)"
                              onChange={(e) => handleCellEdit(tc.id, "email_input", e.target.value)}
                            />
                          </td>

                          {/* Editable Expected Result */}
                          <td style={styles.td}>
                            <input
                              type="text"
                              style={{ ...styles.inlineInput, color: "#9ca3af" }}
                              value={tc.expected || ""}
                              onChange={(e) => handleCellEdit(tc.id, "expected", e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Run Actions */}
              <div style={styles.runActionGrid}>
                <button
                  style={{
                    ...styles.button,
                    backgroundColor: loadingRun ? "#4b5563" : "#10b981",
                  }}
                  onClick={() => handleRunTests("selected")}
                  disabled={loadingRun}
                >
                  {loadingRun ? (
                    <>
                      <RefreshCw className="spin" size={18} />
                      <span>Playwright đang chạy {selectedIds.size} Test Cases...</span>
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      <span>▶ Run {selectedIds.size} Selected Test Cases</span>
                    </>
                  )}
                </button>

                <button
                  style={styles.runAllSecondaryBtn}
                  onClick={() => handleRunTests("all")}
                  disabled={loadingRun}
                >
                  <span>Chạy tất cả {testCases.length} Cases</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* CỘT BÊN PHẢI: AUTOMATION RESULTS & AI BUG REPORT */}
        <section style={styles.column}>
          {/* CARD 4: PLAYWRIGHT EXECUTION RESULTS */}
          <div style={styles.card}>
            <div style={styles.cardHeaderBetween}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={styles.stepNum}>3</span>
                <h2 style={styles.cardTitle}>Playwright Execution Results</h2>
              </div>
              {testResults.length > 0 && (
                <button style={styles.excelExportBtnSmall} onClick={exportFullReportToExcel}>
                  <Download size={14} />
                  <span>Xuất Excel Summary</span>
                </button>
              )}
            </div>

            {testResults.length === 0 ? (
              <div style={styles.emptyContainer}>
                <Info size={32} color="#475569" />
                <p style={styles.emptyText}>
                  Chưa có kết quả chạy tự động. Tích chọn các Test Cases và bấm nút "Run Selected Test Cases".
                </p>
              </div>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: "bold", color: "#60a5fa" }}>{res.id}</span>
                        <span style={getTagStyle(res.type)}>{res.type}</span>
                        <span style={{ fontWeight: "600", fontSize: 13 }}>{res.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        Input: Name=<code>"{res.name_input}"</code> | Email=<code>"{res.email_input}"</code>
                      </div>
                      {res.error && (
                        <div style={styles.errorSnippet}>
                          ⚠️ Error: {res.error}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor:
                          res.status === "PASSED" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: res.status === "PASSED" ? "#34d399" : "#f87171",
                      }}
                    >
                      {res.status === "PASSED" ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={13} /> PASSED
                        </span>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <XCircle size={13} /> FAILED
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CARD 5: AI BUG REPORT & VISUAL SCREENSHOT EVIDENCE */}
          {bugReports.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={{ ...styles.stepNum, backgroundColor: "#dc2626" }}>4</span>
                <h2 style={styles.cardTitle}>AI Bug Report & Visual Screenshot Evidence</h2>
              </div>

              {bugReports.map((bug, index) => (
                <div key={index} style={styles.bugCard}>
                  <div style={styles.bugHeader}>
                    <span style={styles.bugTag}>JIRA BUG REPORT</span>
                    <h3 style={{ margin: 0, fontSize: 15, color: "#f8fafc" }}>
                      Incident: {bug.testId} - {bug.title}
                    </h3>
                  </div>

                  {/* Screenshot Visual Evidence */}
                  {bug.screenshot && (
                    <div style={{ margin: "14px 0" }}>
                      <label style={styles.evidenceLabel}>
                        📷 Screenshot Evidence (Playwright Captured on Failure):
                      </label>
                      <a href={bug.screenshot} target="_blank" rel="noopener noreferrer">
                        <img
                          src={bug.screenshot}
                          alt="Bug Evidence Screenshot"
                          style={styles.screenshotImg}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </a>
                    </div>
                  )}

                  {/* Root Cause AI Analysis Markdown */}
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

// Helpers
function getTagStyle(type = "") {
  const base = {
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
    display: "inline-block",
  };
  switch ((type || "").toUpperCase()) {
    case "POSITIVE":
      return { ...base, backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" };
    case "NEGATIVE":
      return { ...base, backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" };
    case "BOUNDARY":
      return { ...base, backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" };
    case "VALIDATION":
      return { ...base, backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", border: "1px solid rgba(139, 92, 246, 0.3)" };
    default:
      return { ...base, backgroundColor: "#374151", color: "#d1d5db" };
  }
}

function getToastStyle(type) {
  switch (type) {
    case "success":
      return { backgroundColor: "#065f46", color: "#6ee7b7", border: "1px solid #047857" };
    case "error":
      return { backgroundColor: "#991b1b", color: "#fca5a5", border: "1px solid #b91c1c" };
    case "warning":
      return { backgroundColor: "#92400e", color: "#fde68a", border: "1px solid #b45309" };
    default:
      return { backgroundColor: "#1e293b", color: "#38bdf8", border: "1px solid #334155" };
  }
}

// Styles CSS Dark Theme
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "24px 32px",
    boxSizing: "border-box",
    position: "relative",
  },
  toast: {
    position: "fixed",
    top: 20,
    right: 24,
    zIndex: 9999,
    padding: "12px 18px",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    fontWeight: "500",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
    animation: "fadeIn 0.3s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1e293b",
    paddingBottom: 20,
    marginBottom: 24,
  },
  logoBadge: {
    backgroundColor: "#1e293b",
    padding: 10,
    borderRadius: 12,
    border: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    margin: 0,
    letterSpacing: "-0.5px",
    background: "linear-gradient(to right, #ffffff, #94a3b8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  headerSubtitle: {
    fontSize: 13,
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
  badgeGlow: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: 12,
    fontWeight: "600",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr",
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
  cardHeaderBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  stepNum: {
    backgroundColor: "#2563eb",
    color: "#fff",
    borderRadius: "50%",
    width: 28,
    height: 28,
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
  inputUrlWrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "0 12px",
  },
  urlInput: {
    width: "100%",
    backgroundColor: "transparent",
    border: "none",
    color: "#38bdf8",
    padding: "10px 0",
    fontSize: 13,
    outline: "none",
    fontFamily: "monospace",
  },
  explorerResultBox: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 14,
    border: "1px solid #334155",
  },
  exploreBadge: {
    backgroundColor: "rgba(2, 132, 199, 0.2)",
    color: "#38bdf8",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "700",
    border: "1px solid rgba(2, 132, 199, 0.4)",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  flowCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  flowNum: {
    fontSize: 10,
    color: "#38bdf8",
    fontWeight: "700",
  },
  suggestedBox: {
    backgroundColor: "rgba(30, 58, 138, 0.25)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
  },
  applyBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  strategyBlock: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 12,
    border: "1px solid #334155",
  },
  strategyHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 8,
    color: "#f8fafc",
  },
  strategyList: {
    margin: 0,
    paddingLeft: 16,
    color: "#cbd5e1",
    fontSize: 11,
    lineHeight: "1.6",
  },
  subTextCount: {
    fontSize: 12,
    color: "#38bdf8",
    marginTop: 2,
    display: "block",
  },
  textarea: {
    width: "100%",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#e2e8f0",
    padding: 12,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 16,
    lineHeight: "1.5",
    resize: "vertical",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all 0.2s",
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
    padding: "4px 10px",
    fontSize: 11,
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  tabBtnActive: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderColor: "#3b82f6",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: "8px 12px",
    borderRadius: 8,
    marginBottom: 12,
    border: "1px solid #334155",
  },
  iconActionBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#cbd5e1",
    fontSize: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: "500",
  },
  toggleBtn: {
    border: "1px solid",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.2s",
  },
  excelExportBtn: {
    backgroundColor: "#065f46",
    color: "#6ee7b7",
    border: "1px solid #047857",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  excelExportBtnSmall: {
    backgroundColor: "#065f46",
    color: "#6ee7b7",
    border: "1px solid #047857",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  dividerVertical: {
    width: 1,
    height: 18,
    backgroundColor: "#334155",
  },
  tableWrapper: {
    overflowX: "auto",
    maxHeight: "400px",
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
    zIndex: 2,
  },
  tr: {
    borderBottom: "1px solid #334155",
    transition: "background-color 0.15s",
  },
  td: {
    padding: "8px 10px",
    verticalAlign: "middle",
  },
  inlineInput: {
    width: "100%",
    backgroundColor: "transparent",
    border: "1px solid transparent",
    borderRadius: 4,
    color: "#f8fafc",
    fontSize: 12,
    padding: "4px 6px",
    outline: "none",
    transition: "border-color 0.2s, background-color 0.2s",
    boxSizing: "border-box",
  },
  inlineInputCode: {
    width: "100%",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 4,
    color: "#38bdf8",
    fontFamily: "monospace",
    fontSize: 12,
    padding: "4px 6px",
    outline: "none",
    boxSizing: "border-box",
  },
  runActionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 140px",
    gap: 12,
    marginTop: 16,
  },
  runAllSecondaryBtn: {
    backgroundColor: "#1e293b",
    color: "#cbd5e1",
    border: "1px solid #334155",
    borderRadius: 8,
    fontWeight: "600",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  emptyContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "36px 16px",
    gap: 12,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    margin: 0,
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#0f172a",
    padding: "12px 14px",
    borderRadius: 8,
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  errorSnippet: {
    marginTop: 6,
    fontSize: 12,
    color: "#f87171",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: "6px 8px",
    borderRadius: 4,
    border: "1px solid rgba(239, 68, 68, 0.2)",
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
    maxHeight: "240px",
    objectFit: "cover",
    borderRadius: 6,
    border: "1px solid #334155",
    cursor: "pointer",
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