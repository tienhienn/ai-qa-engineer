const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const XLSX = require('xlsx');

const app = express();
app.use(cors());
app.use(express.json());

// Khởi tạo SDK Gemini với API Key từ môi trường
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ CẢNH BÁO: Chưa cấu hình GEMINI_API_KEY trong file .env!");
}
const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' });

// Thư mục lưu trữ ảnh screenshot bằng chứng lỗi
const evidenceDir = path.join(__dirname, 'evidence');
if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
}
app.use('/evidence', express.static(evidenceDir));

/**
 * Hàm gọi Gemini AI với cơ chế thử lại & tự động chuyển model dự phòng khi gặp sự cố (503 / 429 / Rate Limit)
 * Tối ưu danh sách Fallback Models: gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash
 */
async function callGeminiWithFallback(prompt) {
    const candidateModels = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-flash-lite-latest'
    ];

    let lastError = null;

    for (const modelName of candidateModels) {
        try {
            console.log(`[AI Engine] Đang gọi Gemini qua model: ${modelName}...`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
            });

            if (response && response.text) {
                return response.text;
            }
        } catch (err) {
            console.warn(`[AI Warning] Model ${modelName} gặp sự cố (${err.status || err.message}). Chuyển sang model dự phòng...`);
            lastError = err;
            await new Promise((resolve) => setTimeout(resolve, 1200));
        }
    }

    throw lastError || new Error("Tất cả các model Gemini AI hiện tại đều quá tải hoặc bận. Vui lòng thử lại sau.");
}

// ==========================================
// BONUS FEATURE: AI WEBSITE EXPLORER
// ==========================================
app.post('/api/explore-website', async (req, res) => {
    const { url = 'https://automationexercise.com' } = req.body;
    let browser = null;

    try {
        console.log(`[AI Explorer] Đang quét trang web: ${url}...`);
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(url, { timeout: 25000, waitUntil: 'domcontentloaded' });

        const title = await page.title();

        // Trích xuất cấu trúc DOM cơ bản (Links, Buttons, Inputs, Form titles)
        const domInfo = await page.evaluate(() => {
            const navLinks = Array.from(document.querySelectorAll('nav a, header a, .navbar a'))
                .map(a => a.textContent.trim())
                .filter(t => t.length > 2 && t.length < 40)
                .slice(0, 10);

            const buttons = Array.from(document.querySelectorAll('button, .btn, input[type="submit"]'))
                .map(b => b.textContent.trim() || b.value)
                .filter(t => t.length > 2)
                .slice(0, 8);

            const inputs = Array.from(document.querySelectorAll('input'))
                .map(i => i.placeholder || i.name || i.getAttribute('data-qa') || i.type)
                .filter(Boolean)
                .slice(0, 8);

            return { navLinks, buttons, inputs };
        });

        await context.close();

        // Gửi thông tin DOM cho Gemini để phân tích User Flows và đề xuất User Story
        const prompt = `
You are a Principal QA Automation Architect exploring a web application at URL: "${url}".
Scraped Web App Context:
- Page Title: "${title}"
- Navigation Elements: ${JSON.stringify(domInfo.navLinks)}
- Main Buttons & Actions: ${JSON.stringify(domInfo.buttons)}
- Form Fields Found: ${JSON.stringify(domInfo.inputs)}

Analyze this application structure and return ONLY a raw JSON object with:
1. "summary": A 1-2 sentence architectural summary of what this website offers.
2. "userFlows": An array of top 3 critical User Flows for QA testing.
3. "suggestedRequirement": A detailed, realistic QA User Story / Requirement string for testing the User Signup / Login form on this site.

Output MUST be raw JSON only without markdown or extra text.
Schema:
{
  "summary": "string",
  "userFlows": ["Flow 1 description", "Flow 2 description", "Flow 3 description"],
  "suggestedRequirement": "string"
}
`;

        const rawText = await callGeminiWithFallback(prompt);
        let cleanText = rawText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();
        const explorationData = JSON.parse(cleanText);

        return res.json({ exploration: explorationData });

    } catch (err) {
        console.error("AI Website Explorer Error:", err);
        return res.status(500).json({
            error: "Lỗi khi quét và phân tích website",
            details: err.message
        });
    } finally {
        if (browser) {
            await browser.close().catch(() => { });
        }
    }
});

// ==========================================
// 1. API: SINH TEST STRATEGY & 15+ TEST CASES
// ==========================================
app.post('/api/generate-tests', async (req, res) => {
    const { requirement } = req.body;
    if (!requirement) {
        return res.status(400).json({ error: "Vui lòng nhập Requirement / User Story" });
    }

    const prompt = `
You are an expert Senior QA Automation Lead & ISTQB Certified Manager.
Analyze this User Story / Feature Requirement:
"${requirement}"

Task 1: Formulate a comprehensive ISTQB-compliant Test Strategy containing 4 core pillars:
1. Scope of Testing (Included features vs Excluded out-of-scope)
2. Test Approach / Methodologies (Equivalence Partitioning, Boundary Value Analysis, Risk-based Testing)
3. Environment & Automation Tools (Playwright Chromium Engine, Headless/Headed Execution, Node.js API)
4. Risk Assessment & Mitigation (Data contamination, rate limits, false positives, UI selector timeouts)

Task 2: Generate AT LEAST 15 comprehensive test cases categorized into 4 groups:
- Positive (Standard valid signup workflows)
- Negative (Invalid email format, existing duplicate email, invalid characters)
- Boundary (Length limits, min/max length strings)
- Validation (Empty fields, missing @ symbol, trailing spaces)

Target input fields for this signup form are "name" and "email".
Output MUST be strictly a valid raw JSON object without markdown formatting.

JSON Schema:
{
  "testStrategy": {
    "title": "Automated Testing Strategy",
    "scope": {
      "included": ["Name & Email input validation", "Duplicate email error handling", "Form submission redirect"],
      "excluded": ["Payment processing", "Third-party social auth", "Backend database backup"]
    },
    "approach": [
      "Equivalence Partitioning for valid/invalid email formats",
      "Boundary Value Analysis for string input lengths",
      "Automated End-to-End Regression via Playwright"
    ],
    "environment": [
      "Playwright Chromium Browser Automation Engine",
      "Configurable Headless/Headed Execution Mode",
      "Node.js Express backend with Gemini AI integration"
    ],
    "riskAssessment": [
      { "risk": "Duplicate email state conflict in database", "mitigation": "Dynamic unique timestamp suffix generation" },
      { "risk": "Page load & element selector timeout", "mitigation": "Wait for DOM content loaded and robust data-qa selectors" },
      { "risk": "AI Rate-limiting (503 Service Unavailable)", "mitigation": "Automatic 3-tier Gemini model fallback cascade" }
    ]
  },
  "testCases": [
    {
      "id": "TC_01",
      "title": "Short descriptive scenario title",
      "type": "Positive" | "Negative" | "Boundary" | "Validation",
      "name_input": "Value to type in Name field",
      "email_input": "Value to type in Email field",
      "expected": "Expected UI result or explicit error message"
    }
  ]
}
`;

    try {
        const rawText = await callGeminiWithFallback(prompt);
        let cleanText = rawText.trim();
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();

        const parsedData = JSON.parse(cleanText);
        return res.json({
            testStrategy: parsedData.testStrategy || null,
            testCases: parsedData.testCases || []
        });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return res.status(500).json({
            error: "Không thể sinh Test Strategy & Test Cases từ Gemini AI",
            details: error.message
        });
    }
});

// ==========================================
// 2. API: PLAYWRIGHT CHẠY AUTOMATION TEST
// ==========================================
app.post('/api/run-tests', async (req, res) => {
    const { testCases, headless = true } = req.body;
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
        return res.status(400).json({ error: "Không có test cases nào được chọn để chạy" });
    }

    let browser = null;
    const results = [];

    try {
        console.log(`[Playwright] Khởi chạy Chromium (Headless: ${headless})...`);
        browser = await chromium.launch({ headless: Boolean(headless) });

        for (const tc of testCases) {
            let context = null;
            let page = null;

            try {
                context = await browser.newContext();
                page = await context.newPage();

                await page.goto('https://automationexercise.com/login', {
                    timeout: 25000,
                    waitUntil: 'domcontentloaded'
                });

                if (tc.name_input !== undefined && tc.name_input !== null) {
                    await page.fill('input[data-qa="signup-name"]', String(tc.name_input));
                }
                if (tc.email_input !== undefined && tc.email_input !== null) {
                    await page.fill('input[data-qa="signup-email"]', String(tc.email_input));
                }

                await page.click('button[data-qa="signup-button"]');
                await page.waitForTimeout(2000);

                const errorElement = await page.$('form[action="/signup"] p');
                const errorText = errorElement ? (await errorElement.textContent()).trim() : '';

                const typeUpper = (tc.type || '').toUpperCase();
                const expectedLower = (tc.expected || '').toLowerCase();

                if (typeUpper === 'NEGATIVE' && expectedLower.includes('already exist')) {
                    if (!errorText.includes('Email Address already exist!')) {
                        throw new Error(`Kỳ vọng báo lỗi trùng email "Email Address already exist!", nhưng UI hiển thị: "${errorText || 'Không hiển thị lỗi'}"`);
                    }
                } else if (typeUpper === 'POSITIVE') {
                    const currentUrl = page.url();
                    if (!currentUrl.includes('/signup')) {
                        throw new Error(`Kỳ vọng chuyển hướng sang trang điền thông tin chi tiết '/signup', nhưng URL hiện tại: ${currentUrl}. Thông báo UI: "${errorText}"`);
                    }
                } else if (typeUpper === 'VALIDATION' || typeUpper === 'BOUNDARY') {
                    const currentUrl = page.url();
                    if (currentUrl.includes('/signup') && !errorText) {
                        throw new Error(`Lỗi Validation: Dữ liệu không hợp lệ / biên đã bị hệ thống chấp nhận thay vì chặn lại!`);
                    }
                }

                results.push({
                    id: tc.id,
                    type: tc.type,
                    title: tc.title,
                    name_input: tc.name_input,
                    email_input: tc.email_input,
                    status: 'PASSED',
                    expected: tc.expected,
                    error: null,
                    screenshot: null
                });

            } catch (err) {
                let screenshotUrl = null;
                if (page) {
                    try {
                        const screenshotFilename = `${tc.id}_failure_${Date.now()}.png`;
                        const screenshotPath = path.join(evidenceDir, screenshotFilename);
                        await page.screenshot({ path: screenshotPath, fullPage: true });
                        screenshotUrl = `http://localhost:5000/evidence/${screenshotFilename}`;
                    } catch (ssErr) {
                        console.error(`[Playwright Screenshot Error - ${tc.id}]:`, ssErr);
                    }
                }

                results.push({
                    id: tc.id,
                    type: tc.type,
                    title: tc.title,
                    name_input: tc.name_input,
                    email_input: tc.email_input,
                    status: 'FAILED',
                    expected: tc.expected,
                    error: err.message,
                    screenshot: screenshotUrl
                });
            } finally {
                if (context) {
                    await context.close().catch(() => { });
                }
            }
        }
    } catch (globalErr) {
        console.error("Playwright Runtime Error:", globalErr);
        return res.status(500).json({
            error: "Lỗi thực thi Playwright Test",
            details: globalErr.message
        });
    } finally {
        if (browser) {
            console.log("[Playwright] Đóng trình duyệt Chromium sạch sẽ.");
            await browser.close().catch(() => { });
        }
    }

    return res.json({ results });
});

// ==========================================
// 3. API: AI PHÂN TÍCH LỖI & VIẾT BUG REPORT
// ==========================================
app.post('/api/analyze-bug', async (req, res) => {
    const { failedTest } = req.body;
    if (!failedTest) {
        return res.status(400).json({ error: "Thiếu dữ liệu test case thất bại" });
    }

    const prompt = `
You are a Senior QA Manager writing a formal Bug Report for developers in Jira standard format.
An automated test case failed during Playwright execution.

Test Case Details:
- Test ID: ${failedTest.id}
- Category: ${failedTest.type || 'N/A'}
- Scenario: ${failedTest.title}
- Input Name: ${failedTest.name_input || 'N/A'}
- Input Email: ${failedTest.email_input || 'N/A'}
- Expected Result: ${failedTest.expected}
- Failure Stack Trace / Error: ${failedTest.error}

Generate a clear, highly professional Bug Report in Markdown format containing:
1. **Bug Title**: Concise summary of defect
2. **Severity**: (Critical | Major | Medium | Minor) with justification
3. **Environment**: Chromium Engine / Automation Exercise Web App
4. **Steps to Reproduce**: Step-by-step numbered guide
5. **Expected vs Actual Result**
6. **Suspected Root Cause**: Technical explanation (Client-side validation bypass, missing backend duplicate check, selector timeout, or unhandled UI exception)
`;

    try {
        const bugReportText = await callGeminiWithFallback(prompt);
        return res.json({ bugReport: bugReportText });
    } catch (error) {
        console.error("AI Bug Analysis Error:", error);
        return res.status(500).json({ error: "Không thể phân tích Bug Report bằng AI" });
    }
});

// ==========================================
// 4. API: XUẤT BÁO CÁO EXCEL CHUẨN QA (.XLSX)
// ==========================================
app.post('/api/export-excel', (req, res) => {
    try {
        const { testStrategy, testCases, testResults, bugReports } = req.body;
        const wb = XLSX.utils.book_new();

        // Sheet 1: Test Strategy & Cases
        const sheet1Data = [];

        if (testStrategy) {
            sheet1Data.push({ 'Col1': '=== TEST STRATEGY OVERVIEW ===', 'Col2': '', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '' });
            sheet1Data.push({ 'Col1': 'Strategy Title', 'Col2': testStrategy.title || 'ISTQB Test Strategy', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '' });
            if (testStrategy.scope) {
                sheet1Data.push({ 'Col1': 'Scope Included', 'Col2': (testStrategy.scope.included || []).join('; '), 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '' });
                sheet1Data.push({ 'Col1': 'Scope Excluded', 'Col2': (testStrategy.scope.excluded || []).join('; '), 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '' });
            }
            sheet1Data.push({ 'Col1': '', 'Col2': '', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '' });
        }

        sheet1Data.push({
            'Col1': 'ID',
            'Col2': 'Phân loại (Type)',
            'Col3': 'Tiêu đề Kịch bản (Scenario Title)',
            'Col4': 'Name Input',
            'Col5': 'Email Input',
            'Col6': 'Kết quả mong đợi (Expected Result)'
        });

        if (Array.isArray(testCases)) {
            testCases.forEach(tc => {
                sheet1Data.push({
                    'Col1': tc.id,
                    'Col2': tc.type,
                    'Col3': tc.title,
                    'Col4': tc.name_input || '',
                    'Col5': tc.email_input || '',
                    'Col6': tc.expected
                });
            });
        }

        const ws1 = XLSX.utils.json_to_sheet(sheet1Data, { skipHeader: true });
        ws1['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 42 }, { wch: 20 }, { wch: 25 }, { wch: 45 }];
        XLSX.utils.book_append_sheet(wb, ws1, "Test Strategy & Cases");

        // Sheet 2: Execution & Bug Reports
        if (Array.isArray(testResults) && testResults.length > 0) {
            const summaryData = testResults.map(r => ({
                'ID': r.id,
                'Phân loại': r.type || '',
                'Tiêu đề Kịch bản': r.title,
                'Trạng thái (Status)': r.status,
                'Kết quả mong đợi': r.expected,
                'Chi tiết lỗi (Error Log)': r.error || 'None',
                'Screenshot Link': r.screenshot || 'N/A'
            }));
            const ws2 = XLSX.utils.json_to_sheet(summaryData);
            ws2['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 40 }, { wch: 45 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(wb, ws2, "Execution & Bug Reports");
        }

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=QA_FullReport_${Date.now()}.xlsx`);
        return res.send(buffer);
    } catch (err) {
        console.error("Export Excel Error:", err);
        return res.status(500).json({ error: "Lỗi tạo file Excel", details: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ AI QA Engineer Server running at http://localhost:${PORT}`);
});