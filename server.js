const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Khởi tạo SDK Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Thư mục lưu ảnh screenshot bằng chứng lỗi
const evidenceDir = path.join(__dirname, 'evidence');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir);
app.use('/evidence', express.static(evidenceDir));

// Hàm gọi Gemini có cơ chế thử lại & tự chuyển model dự phòng khi gặp 503
async function callGeminiWithFallback(prompt) {
    const candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.8-flash',
        'gemini-3.5-flash'
    ];

    let lastError = null;

    for (const modelName of candidateModels) {
        try {
            console.log(`Đang gọi AI qua model: ${modelName}...`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
            });
            return response.text;
        } catch (err) {
            console.warn(`Model ${modelName} gặp sự cố (${err.status || err.message}). Chuyển sang model dự phòng tiếp theo...`);
            lastError = err;
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
    }

    throw lastError;
}

// ==========================================
// 1. API: GỌI AI THẬT ĐỂ SINH 15+ TEST CASES
// ==========================================
app.post('/api/generate-tests', async (req, res) => {
    const { requirement } = req.body;
    if (!requirement) {
        return res.status(400).json({ error: "Missing requirement" });
    }

    const prompt = `
You are an expert QA Automation Lead (ISTQB certified).
Analyze this Requirement/User Story:
"${requirement}"

Generate at least 15 comprehensive and diverse test cases.
You MUST categorize them into 4 groups:
- Positive (Normal successful workflows)
- Negative (Invalid data, duplicate emails, unauthorized formats)
- Boundary (Length limits, edge-case characters)
- Validation (Empty fields, missing @ symbol, format checks)

Target inputs for this form are "name" and "email".
Output MUST be ONLY a valid raw JSON array of objects without markdown formatting, codeblocks, or extra text.

JSON Schema for each object:
[
  {
    "id": "TC_01",
    "title": "Clear description of scenario",
    "type": "Positive" | "Negative" | "Boundary" | "Validation",
    "name_input": "string to type into Name field",
    "email_input": "string to type into Email field",
    "expected": "Expected UI result or error message"
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
        return res.status(500).json({ error: "Failed to generate test cases from AI", details: error.message });
    }
});

// ==========================================
// 2. API: PLAYWRIGHT CHẠY THẬT TRÊN WEB DEMO
// ==========================================
app.post('/api/run-tests', async (req, res) => {
    const { testCases } = req.body;
    if (!testCases || testCases.length === 0) {
        return res.status(400).json({ error: "No test cases provided" });
    }

    // Khởi động Chromium
    const browser = await chromium.launch({ headless: true });
    const results = [];

    try {
        // Lấy 4 test cases đầu tiên để thực thi demo
        const selectedCases = testCases.slice(0, 4);

        for (const tc of selectedCases) {
            const context = await browser.newContext();
            const page = await context.newPage();

            try {
                await page.goto('[https://automationexercise.com/login](https://automationexercise.com/login)', { timeout: 20000, waitUntil: 'domcontentloaded' });

                // Điền dữ liệu vào form New User Signup
                if (tc.name_input) {
                    await page.fill('input[data-qa="signup-name"]', tc.name_input);
                }
                if (tc.email_input) {
                    await page.fill('input[data-qa="signup-email"]', tc.email_input);
                }

                await page.click('button[data-qa="signup-button"]');
                await page.waitForTimeout(2000);

                const errorElement = await page.$('form[action="/signup"] p');
                const errorText = errorElement ? await errorElement.textContent() : '';

                // Kiểm tra kết quả thực tế với mong đợi
                if (tc.type === 'Negative' && tc.expected.toLowerCase().includes('already exist')) {
                    if (!errorText.includes('Email Address already exist!')) {
                        throw new Error(`Expected duplicate email error, but UI showed: "${errorText || 'none'}"`);
                    }
                } else if (tc.type === 'Positive') {
                    const currentUrl = page.url();
                    if (!currentUrl.includes('/signup')) {
                        throw new Error(`Expected redirect to '/signup', but remained on: ${currentUrl}. UI Alert: ${errorText}`);
                    }
                } else {
                    const currentUrl = page.url();
                    if (currentUrl.includes('/signup')) {
                        throw new Error(`Validation Error: Invalid input was accepted by server instead of being blocked!`);
                    }
                }

                results.push({
                    id: tc.id,
                    title: tc.title,
                    status: 'PASSED',
                    expected: tc.expected,
                    error: null,
                    screenshot: null
                });

            } catch (err) {
                // Chụp màn hình khi bài test thất bại
                const screenshotFilename = `${tc.id}_failure_${Date.now()}.png`;
                const screenshotPath = path.join(evidenceDir, screenshotFilename);
                await page.screenshot({ path: screenshotPath, fullPage: true });

                results.push({
                    id: tc.id,
                    title: tc.title,
                    status: 'FAILED',
                    expected: tc.expected,
                    error: err.message,
                    screenshot: `http://localhost:5000/evidence/${screenshotFilename}`
                });
            } finally {
                await context.close();
            }
        }
    } catch (globalErr) {
        console.error("Playwright Runtime Error:", globalErr);
    } finally {
        await browser.close();
    }

    return res.json({ results });
});

// ==========================================
// 3. API: AI PHÂN TÍCH LỖI THẬT & VIẾT BUG REPORT
// ==========================================
app.post('/api/analyze-bug', async (req, res) => {
    const { failedTest } = req.body;
    if (!failedTest) {
        return res.status(400).json({ error: "Missing failed test payload" });
    }

    const prompt = `
You are a Senior QA Manager writing a formal Bug Report for developers in Jira format.
A test case failed during automated Playwright execution.

Test Case Details:
- Test ID: ${failedTest.id}
- Scenario: ${failedTest.title}
- Expected Behavior: ${failedTest.expected}
- Actual Error / Failure Trace: ${failedTest.error}

Generate a clear, professional Bug Report in Markdown format containing:
1. **Bug Title**: Concise summary of the defect
2. **Severity**: Choose one (Critical | Major | Medium | Minor) and justify why
3. **Environment**: Chromium Engine / Automation Exercise Web App
4. **Steps to Reproduce**: 1-2-3 numbered steps
5. **Expected vs Actual Result**
6. **Suspected Root Cause**: Technical explanation of why it failed (e.g., Client-side HTML5 validation bypassed, missing backend duplicate check, selector timeout, or UI uncaught exception)
`;

    try {
        const bugReportText = await callGeminiWithFallback(prompt);
        return res.json({ bugReport: bugReportText });
    } catch (error) {
        console.error("AI Bug Analysis Error:", error);
        return res.status(500).json({ error: "Failed to generate bug report from AI" });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ QA Engine Server is running on http://localhost:${PORT}`);
});