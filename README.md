# 🤖 Autonomous AI QA Engineer Assistant

[![Challenge](https://img.shields.io/badge/7--Day%20AI%20Builder%20Challenge-Tester%20%2F%20QA-8a2be2.svg)](https://automationexercise.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Lucide-00d8ff.svg)](client/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green.svg)](server.js)
[![Automation](https://img.shields.io/badge/Automation-Playwright%20Chromium-red.svg)](https://playwright.dev/)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Google%20Gemini%20API-orange.svg)](https://ai.google.dev/)

> **Tên ứng dụng:** **Autonomous AI QA Engineer Assistant**  
> **Người thực hiện:** Huỳnh Lê Tiến Hiển 

---

## 📌 1. Executive Summary & Problem Statement (Đặt vấn đề)

### Thực trạng nghẽn cổ chai của QA / Tester truyền thống:
Trong quy trình phát triển phần mềm hiện đại (Agile/Scrum), các kỹ sư QA thường đối mặt với các vấn đề ngốn thời gian và dễ xảy ra sai sót:
1. **Phân tích Requirement & Viết Test Matrix thủ công:** Mất từ 60 - 120 phút để đọc User Story và suy nghĩ các kịch bản kiểm thử (Positive, Negative, Boundary, Validation).
2. **Thực thi Test Cases lặp đi lặp lại:** Gõ dữ liệu test, kiểm tra form validation và chuyển trang bằng tay trên trình duyệt.
3. **Triage & Viết Bug Report:** Khi phát hiện lỗi, QA phải chụp ảnh màn hình, lấy error log, mở Jira và gõ từng bước Reproduce Steps, Expected vs Actual Result (tốn 10-15 phút/lỗi).
4. **Báo cáo tiến độ:** Phải tổng hợp kết quả vào file Excel/CSV thủ công để gửi cho PM/Lead.

### Giải pháp "Autonomous AI QA Engineer Assistant":
Ứng dụng **AI QA Engineer Assistant** là giải pháp toàn diện (End-to-End Automated Platform) kết hợp sức mạnh của **Google Gemini AI** và **Playwright Automation Engine** giúp tự động hóa toàn bộ vòng đời kiểm thử phần mềm từ lúc đọc Requirement đến khi xuất Báo cáo Bug Report chuẩn Jira.

---

## 🌐 2. Target Website & Tested Scope (Trang web & Phạm vi kiểm thử)

- **Target Website:** [`https://automationexercise.com/login`](https://automationexercise.com/login)
- **Feature Focus:** Form **"New User Signup"** (Đăng ký tài khoản người dùng mới).
- **Lý do lựa chọn:** Đây là trang thương mại điện tử thực tế chuẩn cho Automation QA, chứa các kịch bản validation form phong phú (Duplicate Email check, Dynamic URL redirects, Input Length Constraints, Special Characters).

### Tested Scope (Phạm vi kiểm thử):
- **Positive Scenarios:** Đăng ký thành công với Name & Email hợp lệ (Dynamic Timestamp Unique Email).
- **Negative Scenarios:** Email trùng lặp đã tồn tại trong hệ thống (`Email Address already exist!`), định dạng Email không hợp lệ.
- **Boundary Value Analysis (BVA):** Chuỗi Name/Email chạm ngưỡng độ dài tối thiểu (1 kí tự), tối đa (255+ kí tự).
- **Validation Rules:** Trường rỗng (Empty fields), thiếu ký tự `@`, khoảng trắng dư thừa (Leading/Trailing spaces), ký tự đặc biệt (`<script>`, SQL injection strings).

---

## 🏗️ 3. Architecture & Workflow (Kiến trúc & Quy trình hoạt động)

```
 +-----------------------------------------------------------------------------------+
 |                                 USER INTERFACE                                    |
 |                    React (Vite) Dark Theme Dashboard & Control Panel              |
 +----------------------------------+------------------------------------------------+
                                    |
                                    v
 +----------------------------------+------------------------------------------------+
 |                           BONUS: AI WEBSITE EXPLORER                              |
 |   Playwright headless fetch DOM -> Gemini AI build Summary & Suggested Req        |
 +----------------------------------+------------------------------------------------+
                                    |
                                    v
 +----------------------------------+------------------------------------------------+
 |                       STEP 1: REQUIREMENT ANALYSIS                                |
 |            Input User Story -> Gemini AI Fallback Engine (3.7/3.6/3.5)            |
 +----------------------------------+------------------------------------------------+
                                    |
                                    v
 +----------------------------------+------------------------------------------------+
 |                  STEP 2: ISTQB TEST STRATEGY & TEST CASES                         |
 |  Generate Scope, Methodologies, Risk Mitigation & 15+ Categorized Test Cases     |
 +----------------------------------+------------------------------------------------+
                                    |
                                    v
 +----------------------------------+------------------------------------------------+
 |                 STEP 3: HUMAN-IN-THE-LOOP VERIFICATION                            |
 |     Inline Edit inputs/expected results, Filter tabs, Select/Deselect test cases  |
 +----------------------------------+------------------------------------------------+
                                    |
                                    v
 +----------------------------------+------------------------------------------------+
 |                 STEP 4: PLAYWRIGHT AUTOMATION ENGINE                              |
 |  Execute headless/headed Chromium tests on https://automationexercise.com/login   |
 |       - If PASS: Log result with status PASSED                                    |
 |       - If FAIL: Capture Full-Page Screenshot & Error Traceback to /evidence      |
 +----------------------------------+------------------------------------------------+
                                    |
                                    v
 +----------------------------------+------------------------------------------------+
 |                STEP 5: AI BUG TRIAGE & JIRA BUG REPORT                            |
 |  Gemini AI analyzes failure stack & screenshot -> Generates Jira Markdown Bug     |
 +----------------------------------+------------------------------------------------+
                                    |
                                    v
 +----------------------------------+------------------------------------------------+
 |                     STEP 6: 2-SHEET EXCEL REPORT EXPORT                           |
 |   Sheet 1: Test Strategy & Cases | Sheet 2: Execution Results & Bug Evidence Links|
 +-----------------------------------------------------------------------------------+
```

---

## 🛡️ 4. Test Strategy (Chiến lược kiểm thử ISTQB Compliant)

Hệ thống tự động khởi tạo **Test Strategy** theo chuẩn quốc tế ISTQB gồm 4 trụ cột cốt lõi:

| Trụ cột ISTQB | Chi tiết triển khai trong hệ thống |
| :--- | :--- |
| **1. Scope of Testing** | **Included:** Kiểm thử Form "New User Signup" (Name, Email), Validation tin nhắn lỗi UI, chuyển hướng URL `/signup`.<br>**Excluded:** Đăng thanh toán, Xác thực Auth bên thứ 3 (Google/FB), Backup Database. |
| **2. Test Approach** | **Equivalence Partitioning:** Phân vùng tương đương cho Email hợp lệ/không hợp lệ.<br>**Boundary Value Analysis (BVA):** Đo độ dài chuỗi đầu vào.<br>**Negative Testing:** Thử nạp SQLi/XSS payload & email đã tồn tại. |
| **3. Test Environment** | **Browser Engine:** Playwright Chromium (Headless / Headed UI mode).<br>**Backend:** Node.js Express server (`server.js`).<br>**AI Model Engine:** Multi-Model Gemini Cascade (`gemini-3.7-flash` -> `gemini-3.6-flash` -> `gemini-3.5-flash`). |
| **4. Risk & Mitigation** | **Xung đột email trùng:** Tự sinh chuỗi timestamp ngẫu nhiên.<br>**Timeout Selector UI:** Sử dụng `data-qa` attributes ổn định và cơ chế `waitUntil: 'domcontentloaded'`. |

---

## 📜 5. Prompts Used in System (Trích dẫn Prompt hệ thống)

Dưới đây là 2 System Prompts chính được nhúng trực tiếp trong file backend `server.js`:

### Prompt 1: Generation of ISTQB Test Strategy & 15+ Test Cases (`/api/generate-tests`)
```text
You are an expert Senior QA Automation Lead & ISTQB Certified Manager.
Analyze this User Story / Feature Requirement:
"{requirement}"

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
    "scope": { "included": [...], "excluded": [...] },
    "approach": [...],
    "environment": [...],
    "riskAssessment": [{ "risk": "...", "mitigation": "..." }]
  },
  "testCases": [
    {
      "id": "TC_01",
      "title": "...",
      "type": "Positive" | "Negative" | "Boundary" | "Validation",
      "name_input": "...",
      "email_input": "...",
      "expected": "..."
    }
  ]
}
```

### Prompt 2: Failure Analysis & Jira Bug Report Generation (`/api/analyze-bug`)
```text
You are a Senior QA Manager writing a formal Bug Report for developers in Jira standard format.
An automated test case failed during Playwright execution.

Test Case Details:
- Test ID: {failedTest.id}
- Category: {failedTest.type}
- Scenario: {failedTest.title}
- Input Name: {failedTest.name_input}
- Input Email: {failedTest.email_input}
- Expected Result: {failedTest.expected}
- Failure Stack Trace / Error: {failedTest.error}

Generate a clear, highly professional Bug Report in Markdown format containing:
1. **Bug Title**: Concise summary of defect
2. **Severity**: (Critical | Major | Medium | Minor) with justification
3. **Environment**: Chromium Engine / Automation Exercise Web App
4. **Steps to Reproduce**: Step-by-step numbered guide
5. **Expected vs Actual Result**
6. **Suspected Root Cause**: Technical explanation (Client-side validation bypass, missing backend duplicate check, selector timeout, or unhandled UI exception)
```

---

## 🚀 6. Installation & Running Guide (Hướng dẫn cài đặt & Chạy dự án)

### Yêu cầu tiên quyết:
- **Node.js**: `v18.0.0` trở lên
- **npm**: `v9.0.0` trở lên
- **Google Gemini API Key**: Lấy tại [Google AI Studio](https://aistudio.google.com/)

### Bước 1: Clone dự án & Cấu hình môi trường (.env)
```bash
git clone <repository_url>
cd ai-qa-engineer
```

Tạo file `.env` tại thư mục gốc dự án:
```env
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Bước 2: Cài đặt Backend & Trình duyệt Playwright
Tại thư mục gốc dự án (`ai-qa-engineer`), chạy các lệnh:
```bash
# Cài đặt Node dependencies cho backend
npm install

# Cài đặt trình duyệt Chromium cho Playwright
npx playwright install chromium
```

Khởi chạy backend Node.js Express server:
```bash
node server.js
```
*(Server sẽ lắng nghe tại `http://localhost:5000`)*

### Bước 3: Cài đặt & Khởi chạy Frontend React (Vite)
Mở một cửa sổ Terminal mới, chuyển vào thư mục `client`:
```bash
cd client

# Cài đặt Node dependencies cho frontend
npm install

# Chạy giao diện React Vite Dev Server
npm run dev
```
*(Giao diện ứng dụng sẽ mở tại `http://localhost:5173` hoặc `http://localhost:5174`)*

---

## ⚡ 7. Key Features Showcase (Tính năng nổi bật)

1. **AI Website Explorer (Bonus):** Tự động truy cập URL mục tiêu bằng Playwright headless, bóc tách các nút bấm, input, navigation links để Gemini AI phân tích và đề xuất User Story.
2. **ISTQB Test Strategy & 15+ Test Cases Auto-Generator:** Sinh kịch bản kiểm thử có cấu trúc phân loại rõ ràng (Positive, Negative, Boundary, Validation).
3. **Human-in-the-Loop Verification:** Cho phép QA trực tiếp chỉnh sửa Inline Edit dữ liệu `Name`, `Email`, `Expected Result` và chọn checkbox lọc case trước khi bấm chạy.
4. **Playwright Visual Evidence Capture:** Tự động chụp ảnh screenshot trang web khi xảy ra lỗi FAILED và tạo đường dẫn tĩnh xem trực tiếp trên Dashboard.
5. **1-Click 2-Sheet Excel Report (.xlsx):** Xuất báo cáo chuyên nghiệp gồm Sheet 1 (Strategy & Suite) và Sheet 2 (Execution Log & Bug Screenshots).

---

## ⚠️ 8. Limitations & Future Improvements (Giới hạn & Hướng phát triển)

### Giới hạn hiện tại:
- **Phụ thuộc vào Gemini API Quota:** Đôi khi gặp rate limit khi gửi quá nhiều request cùng lúc (đã được khắc phục bằng cơ chế Multi-Model Fallback Cascade).
- **Phạm vi Form Single Page:** Hiện tại tối ưu hóa cao nhất cho luồng SignUp/Login Form.

### Kế hoạch phát triển (Roadmap 7 ngày tiếp theo):
1. **Self-healing Locators:** Tích hợp cơ chế tự phục hồi Selector khi giao diện HTML thay đổi bằng DOM Snapshot comparison.
2. **Trực tiếp Sync Webhook với Jira / TestRail:** Đẩy tự động các Bug Report lên backlog Jira của dự án thông qua Jira REST API.
3. **Cross-Browser & Parallel Execution:** Hỗ trợ chạy song song đồng thời trên Chromium, Firefox, và WebKit (Safari engine).
