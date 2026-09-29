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
            // Trì hoãn nhẹ trước khi chuyển model
            await new Promise((resolve) => setTimeout(resolve, 1200));
        }
    }

    throw lastError || new Error("Tất cả các model Gemini AI hiện tại đều quá tải hoặc bận. Vui lòng thử lại sau.");
}

// ==========================================
// 1. API: SINH TEST CASES TỪ REQUIREMENT (15+ CASES)
// ==========================================
app.post('/api/generate-tests', async (req, res) => {
    const { requirement } = req.body;
    if (!requirement) {
        return res.status(400).json({ error: "Vui lòng nhập Requirement / User Story" });
    }

    const prompt = `
You are an expert Senior QA Automation Engineer & ISTQB Certified Lead.
Analyze this User Story / Feature Requirement carefully:
"${requirement}"

Generate AT LEAST 15 comprehensive, realistic, and highly detailed test cases.
You MUST categorize them into 4 distinct QA groups:
1. Positive (Successful workflows, valid standard inputs)
2. Negative (Invalid emails, existing duplicate emails, wrong character types)
3. Boundary (Field length limits, min/max length strings, edge characters)
4. Validation (Empty fields, missing @ symbol, missing domain, trailing spaces)

Target input fields for this signup form are "name" and "email".
Output MUST be strictly a valid raw JSON array of objects without markdown formatting, codeblocks, or extra text.

JSON Array Schema:
[
  {
    "id": "TC_01",
    "title": "Short descriptive scenario title",
    "type": "Positive" | "Negative" | "Boundary" | "Validation",
    "name_input": "Value to type in Name field",
    "email_input": "Value to type in Email field",
    "expected": "Expected result or explicit UI error message"
  }
]
`;

    try {
        const rawText = await callGeminiWithFallback(prompt);
        let cleanText = rawText.trim();
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();

        const testCases = JSON.parse(cleanText);
        return res.json({ testCases });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return res.status(500).json({ 
            error: "Không thể sinh Test Cases từ Gemini AI", 
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
        // Khởi động Chromium với chế độ Headless / Headed tùy chọn
        console.log(`[Playwright] Khởi chạy Chromium (Headless: ${headless})...`);
        browser = await chromium.launch({ headless: Boolean(headless) });

        for (const tc of testCases) {
            let context = null;
            let page = null;

            try {
                context = await browser.newContext();
                page = await context.newPage();

                // Điều hướng tới trang signup/login demo
                await page.goto('https://automationexercise.com/login', { 
                    timeout: 25000, 
                    waitUntil: 'domcontentloaded' 
                });

                // Điền dữ liệu Name & Email do người dùng kiểm chứng / chỉnh sửa
                if (tc.name_input !== undefined && tc.name_input !== null) {
                    await page.fill('input[data-qa="signup-name"]', String(tc.name_input));
                }
                if (tc.email_input !== undefined && tc.email_input !== null) {
                    await page.fill('input[data-qa="signup-email"]', String(tc.email_input));
                }

                // Bấm nút Signup
                await page.click('button[data-qa="signup-button"]');
                await page.waitForTimeout(2000);

                // Lấy thông báo lỗi UI (nếu có)
                const errorElement = await page.$('form[action="/signup"] p');
                const errorText = errorElement ? (await errorElement.textContent()).trim() : '';

                // Kiểm tra Logic kết quả với loại Test Case
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
                // Chụp ảnh bằng chứng lỗi khi test case FAILED
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
                // Đảm bảo luôn đóng context sau mỗi test case
                if (context) {
                    await context.close().catch(() => {});
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
        // Gợi ý bắt buộc: Đảm bảo browser luôn được đóng trong khối finally để chống leak tiến trình Chromium
        if (browser) {
            console.log("[Playwright] Đóng trình duyệt Chromium sạch sẽ.");
            await browser.close().catch(() => {});
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
        const { type, testCases, testResults, bugReports } = req.body;
        const wb = XLSX.utils.book_new();

        if (type === 'testcases' && Array.isArray(testCases)) {
            const data = testCases.map(tc => ({
                'ID': tc.id,
                'Phân loại (Type)': tc.type,
                'Tiêu đề Kịch bản (Scenario Title)': tc.title,
                'Name Input': tc.name_input || '',
                'Email Input': tc.email_input || '',
                'Kết quả mong đợi (Expected Result)': tc.expected
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 25 }, { wch: 45 }];
            XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
        } else if (type === 'results' && Array.isArray(testResults)) {
            const summaryData = testResults.map(r => ({
                'ID': r.id,
                'Phân loại': r.type || '',
                'Tiêu đề Kịch bản': r.title,
                'Trạng thái (Status)': r.status,
                'Kết quả mong đợi': r.expected,
                'Chi tiết lỗi (Error Log)': r.error || 'None',
                'Screenshot Link': r.screenshot || 'N/A'
            }));
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 40 }, { wch: 45 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, "Execution Summary");

            if (Array.isArray(bugReports) && bugReports.length > 0) {
                const bugData = bugReports.map(b => ({
                    'Test ID': b.testId,
                    'Tiêu đề Bug': b.title,
                    'Chi tiết Bug Report (Jira Format)': b.report,
                    'Screenshot URL': b.screenshot || 'N/A'
                }));
                const wsBugs = XLSX.utils.json_to_sheet(bugData);
                wsBugs['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 80 }, { wch: 50 }];
                XLSX.utils.book_append_sheet(wb, wsBugs, "AI Bug Reports");
            }
        } else {
            return res.status(400).json({ error: "Payload không hợp lệ để xuất Excel" });
        }

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=QA_Report_${Date.now()}.xlsx`);
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