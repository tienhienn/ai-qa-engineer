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
import "./App.css";

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

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error(`Server trả về HTTP ${response.status} (${response.statusText}). Vui lòng đảm bảo server.js đang chạy!`);
      }

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
    <div className="app-container">
      {/* Toast Notification Alert */}
      {toast.show && (
        <div className={getToastClass(toast.type)}>
          {toast.type === "success" && <CheckCircle2 size={18} />}
          {toast.type === "error" && <XCircle size={18} />}
          {toast.type === "warning" && <AlertTriangle size={18} />}
          {toast.type === "info" && <Info size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="logo-badge">
            <Zap size={24} color="#38bdf8" />
          </div>
          <div>
            <h1 className="header-title">AI QA Engineer Assistant</h1>
            <p className="header-subtitle">
              AI Explorer • ISTQB Test Strategy • Playwright Automation • Human-in-the-Loop Verification • Excel Reporting
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="badge">ISTQB Compliant</span>
          <span className="badge-glow">🏆 200 XP Challenge Ready</span>
        </div>
      </header>

      {/* CARD 0: AI WEBSITE EXPLORER (BONUS FEATURE) */}
      <section style={{ marginBottom: 24 }}>
        <div className="card card-explorer">
          <div className="card-header-between">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="step-num step-num-explorer">0</span>
              <h2 className="card-title">AI Website Explorer (Bonus Feature)</h2>
            </div>
            <span style={{ fontSize: 12, color: "#38bdf8", fontWeight: "600" }}>Playwright Web Scraper & Gemini AI Flow Analysis</span>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div className="input-url-wrapper">
              <Globe size={18} color="#94a3b8" />
              <input
                type="text"
                className="url-input"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="Nhập URL website (vd: https://automationexercise.com)"
              />
            </div>
            <button
              className={`button button-explore ${loadingExplore ? 'button-disabled' : ''}`}
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
            <div className="explorer-result-box">
              <div style={{ marginBottom: 12 }}>
                <span className="explore-badge">WEBSITE ARCHITECTURE</span>
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#cbd5e1" }}>
                  {exploration.summary}
                </p>
              </div>

              {/* 3 Top User Flows */}
              <div style={{ marginBottom: 14 }}>
                <label className="section-label">📌 Top 3 Key User Flows Identified:</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 6 }}>
                  {(exploration.userFlows || []).map((flow, idx) => (
                    <div key={idx} className="flow-card">
                      <span className="flow-num">Flow #{idx + 1}</span>
                      <span style={{ fontSize: 12, color: "#e2e8f0" }}>{flow}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested User Story */}
              {exploration.suggestedRequirement && (
                <div className="suggested-box">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label className="section-label">💡 AI Suggested User Story:</label>
                    <button
                      className="apply-btn"
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
      <main className="main-grid">
        {/* CỘT BÊN TRÁI: REQUIREMENT, STRATEGY & TEST SUITE */}
        <section className="column">
          {/* CARD 1: REQUIREMENT INPUT */}
          <div className="card">
            <div className="card-header-between">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="step-num">1</span>
                <h2 className="card-title">Requirement / User Story</h2>
              </div>
            </div>
            <textarea
              className="textarea"
              rows={4}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Paste user story or feature requirements here..."
            />
            <button
              className={`button ${loadingGenerate ? 'button-disabled' : 'button-primary'}`}
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
            <div className="card card-strategy">
              <div className="card-header-between">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ShieldCheck size={20} color="#38bdf8" />
                  <h2 className="card-title" style={{ color: "#38bdf8" }}>
                    {testStrategy.title || "ISTQB Test Strategy Overview"}
                  </h2>
                </div>
                <span className="badge-glow">QA Strategy Framework</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* 1. Scope of Testing */}
                <div className="strategy-block">
                  <div className="strategy-header">
                    <Layers size={15} color="#60a5fa" />
                    <span>1. Scope of Testing</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ color: "#34d399", fontWeight: "600", marginBottom: 2 }}>Included:</div>
                    <ul className="strategy-list">
                      {(testStrategy.scope?.included || []).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                    <div style={{ color: "#f87171", fontWeight: "600", margin: "6px 0 2px 0" }}>Excluded:</div>
                    <ul className="strategy-list">
                      {(testStrategy.scope?.excluded || []).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 2. Test Approach */}
                <div className="strategy-block">
                  <div className="strategy-header">
                    <Compass size={15} color="#a78bfa" />
                    <span>2. Test Approach & Methodologies</span>
                  </div>
                  <ul className="strategy-list">
                    {(testStrategy.approach || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 3. Environment & Tools */}
                <div className="strategy-block">
                  <div className="strategy-header">
                    <Cpu size={15} color="#f59e0b" />
                    <span>3. Environment & Automation Tools</span>
                  </div>
                  <ul className="strategy-list">
                    {(testStrategy.environment || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 4. Risk Assessment & Mitigation */}
                <div className="strategy-block">
                  <div className="strategy-header">
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
            <div className="card">
              <div className="card-header-between">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="step-num">2</span>
                  <div>
                    <h2 className="card-title">Human Verification & Test Suite</h2>
                    <span className="sub-text-count">
                      Đã chọn {selectedIds.size}/{testCases.length} test cases để chạy
                    </span>
                  </div>
                </div>

                {/* Tab Filtering */}
                <div className="tab-container">
                  {["ALL", "POSITIVE", "NEGATIVE", "BOUNDARY", "VALIDATION"].map((tab) => (
                    <button
                      key={tab}
                      className={`tab-btn ${activeTab === tab ? 'tab-btn-active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toolbar controls (Excel export, Headless toggle, Select all) */}
              <div className="toolbar">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button className="icon-action-btn" onClick={toggleSelectAll}>
                    {isAllFilteredSelected ? (
                      <CheckSquare size={16} color="#38bdf8" />
                    ) : (
                      <Square size={16} color="#94a3b8" />
                    )}
                    <span>{isAllFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</span>
                  </button>

                  <div className="divider-vertical" />

                  {/* Toggle Headless / Headed */}
                  <button
                    className={`toggle-btn ${headless ? 'toggle-btn-headless' : 'toggle-btn-headed'}`}
                    onClick={() => setHeadless(!headless)}
                    title="Chuyển đổi chế độ xem trực tiếp trình duyệt Chromium"
                  >
                    {headless ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span>{headless ? "Headless Mode (Ngầm)" : "Headed Mode (Bật UI Browser)"}</span>
                  </button>
                </div>

                {/* Export Excel Button */}
                <button className="excel-export-btn" onClick={exportFullReportToExcel}>
                  <FileSpreadsheet size={16} />
                  <span>Xuất Excel (.xlsx)</span>
                </button>
              </div>

              {/* Editable Test Cases Table */}
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="th" style={{ width: 40, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={toggleSelectAll}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th className="th" style={{ width: 65 }}>ID</th>
                      <th className="th" style={{ width: 95 }}>Phân loại</th>
                      <th className="th">Kịch bản (Scenario) - Inline Edit</th>
                      <th className="th" style={{ width: 140 }}>Name Input</th>
                      <th className="th" style={{ width: 160 }}>Email Input</th>
                      <th className="th">Expected Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((tc) => {
                      const isSelected = selectedIds.has(tc.id);
                      return (
                        <tr
                          key={tc.id}
                          className={`tr ${isSelected ? 'tr-selected' : ''}`}
                        >
                          <td className="td" style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCase(tc.id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td className="td" style={{ fontWeight: "bold", color: "#60a5fa" }}>
                            {tc.id}
                          </td>
                          <td className="td">
                            <span className={getTagClass(tc.type)}>{tc.type}</span>
                          </td>

                          {/* Editable Title */}
                          <td className="td">
                            <input
                              type="text"
                              className="inline-input"
                              value={tc.title}
                              onChange={(e) => handleCellEdit(tc.id, "title", e.target.value)}
                            />
                          </td>

                          {/* Editable Name Input */}
                          <td className="td">
                            <input
                              type="text"
                              className="inline-input-code"
                              value={tc.name_input || ""}
                              placeholder="(empty)"
                              onChange={(e) => handleCellEdit(tc.id, "name_input", e.target.value)}
                            />
                          </td>

                          {/* Editable Email Input */}
                          <td className="td">
                            <input
                              type="text"
                              className="inline-input-code"
                              value={tc.email_input || ""}
                              placeholder="(empty)"
                              onChange={(e) => handleCellEdit(tc.id, "email_input", e.target.value)}
                            />
                          </td>

                          {/* Editable Expected Result */}
                          <td className="td">
                            <input
                              type="text"
                              className="inline-input"
                              style={{ color: "#9ca3af" }}
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
              <div className="run-action-grid">
                <button
                  className={`button ${loadingRun ? 'button-disabled' : 'button-run'}`}
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
                  className="run-all-secondary-btn"
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
        <section className="column">
          {/* CARD 4: PLAYWRIGHT EXECUTION RESULTS */}
          <div className="card">
            <div className="card-header-between">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="step-num">3</span>
                <h2 className="card-title">Playwright Execution Results</h2>
              </div>
              {testResults.length > 0 && (
                <button className="excel-export-btn-small" onClick={exportFullReportToExcel}>
                  <Download size={14} />
                  <span>Xuất Excel Summary</span>
                </button>
              )}
            </div>

            {testResults.length === 0 ? (
              <div className="empty-container">
                <Info size={32} color="#475569" />
                <p className="empty-text">
                  Chưa có kết quả chạy tự động. Tích chọn các Test Cases và bấm nút "Run Selected Test Cases".
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {testResults.map((res) => (
                  <div
                    key={res.id}
                    className={`result-row ${res.status === 'PASSED' ? 'result-passed' : 'result-failed'}`}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: "bold", color: "#60a5fa" }}>{res.id}</span>
                        <span className={getTagClass(res.type)}>{res.type}</span>
                        <span style={{ fontWeight: "600", fontSize: 13 }}>{res.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        Input: Name=<code>"{res.name_input}"</code> | Email=<code>"{res.email_input}"</code>
                      </div>
                      {res.error && (
                        <div className="error-snippet">
                          ⚠️ Error: {res.error}
                        </div>
                      )}
                    </div>
                    <span
                      className={`status-badge ${res.status === 'PASSED' ? 'status-passed' : 'status-failed'}`}
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
            <div className="card">
              <div className="card-header">
                <span className="step-num step-num-bug">4</span>
                <h2 className="card-title">AI Bug Report & Visual Screenshot Evidence</h2>
              </div>

              {bugReports.map((bug, index) => (
                <div key={index} className="bug-card">
                  <div className="bug-header">
                    <span className="bug-tag">JIRA BUG REPORT</span>
                    <h3 style={{ margin: 0, fontSize: 15, color: "#f8fafc" }}>
                      Incident: {bug.testId} - {bug.title}
                    </h3>
                  </div>

                  {/* Screenshot Visual Evidence */}
                  {bug.screenshot && (
                    <div style={{ margin: "14px 0" }}>
                      <label className="evidence-label">
                        📷 Screenshot Evidence (Playwright Captured on Failure):
                      </label>
                      <a href={bug.screenshot} target="_blank" rel="noopener noreferrer">
                        <img
                          src={bug.screenshot}
                          alt="Bug Evidence Screenshot"
                          className="screenshot-img"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </a>
                    </div>
                  )}

                  {/* Root Cause AI Analysis Markdown */}
                  <div className="markdown-box">
                    <pre className="preformatted">{bug.report}</pre>
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

// Helpers cho CSS Class
function getTagClass(type = "") {
  switch ((type || "").toUpperCase()) {
    case "POSITIVE":
      return "tag-badge tag-positive";
    case "NEGATIVE":
      return "tag-badge tag-negative";
    case "BOUNDARY":
      return "tag-badge tag-boundary";
    case "VALIDATION":
      return "tag-badge tag-validation";
    default:
      return "tag-badge tag-default";
  }
}

function getToastClass(type) {
  switch (type) {
    case "success":
      return "toast toast-success";
    case "error":
      return "toast toast-error";
    case "warning":
      return "toast toast-warning";
    default:
      return "toast toast-info";
  }
}