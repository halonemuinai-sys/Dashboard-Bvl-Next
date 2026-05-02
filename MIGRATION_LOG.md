# Bvlgari Intelligence Dashboard - Migration Log

## 📌 Overview
This document tracks the technical migration from the legacy **Google Apps Script (GAS)** environment to this **Next.js + Supabase** architecture. It serves as a reference for verifying logic parity and business rules.

---

## 🏗️ Architecture Mapping

| Layer | Legacy (GAS) | Modern (React/Next.js) |
|---|---|---|
| **Storage** | Google Sheets | Supabase (PostgreSQL) |
| **Logic** | `.gs` Files (Server-side) | `src/services/dashboardService.ts` |
| **Frontend** | `.html` Template + jQuery | React Components + Tailwind CSS |
| **Charts** | Chart.js | Recharts |

---

## 📊 Module Implementation Status

### 1. Monthly Overview
- **Source Logic**: `4-API_Dashboard.gs` (`getDashboardData`)
- **Key Implementation**:
    - **Single-Pass Aggregation**: Replicated the GAS logic where all year data is fetched and processed in one loop to populate multi-year trends, category trends, and monthly KPIs.
    - **KPI Accuracy**: Implemented `totalNet` (Inc. HO), `storeNet` (Exc. HO), and `achievement` using real-time targets from the `targets` table.
    - **YoY Growth**: Calculated by comparing current month-to-date (MTD) with the same period last year.
- **File**: `src/app/page.tsx`

### 2. Advisor Performance
- **Source Logic**: `6-Helpers.gs` (`calculateAdvisorPerformance`)
- **Key Implementation**:
    - **Crossing Sales**: Logic implemented to detect sales where `location != home_location` (requires `master_advisor` sync for home locations).
    - **Ranking**: Implemented ranking system with Medals (🥇🥈🥉) based on achievement.
    - **Performance Mix**: Per-advisor category breakdown (Jewelry, Watches, etc.) shown in a detailed modal.
- **File**: `src/app/advisor-performance/page.tsx`

### 3. Store Performance
- **Source Logic**: `ViewStore.html`
- **Key Implementation**:
    - **Efficiency Metrics**: Sales per qty, cost ratio, and target progression.
    - **Trend Overlay**: Monthly sales trend comparing current vs. previous year.
- **File**: `src/app/store-performance/page.tsx`

---

## 🧮 Logic Verification (Math Rules)

### **MTD Achievement**
`Achievement % = (Store Net Sales / Store Target) * 100`
*Note: Head Office (HO) sales are excluded from achievement calculations to maintain retail focus.*

### **Cost Percentage**
`Cost % = (Total Discount + Card Commission) / Gross Sales`
*Calculated using the `cost` field in `clean_master` which aggregates these values.*

### **YoY Growth**
`Growth % = (Current MTD Sales - Prev Year MTD Sales) / Prev Year MTD Sales`
*Uses month-to-date filtering to ensure "apple-to-apple" comparison.*

---

## 🛠️ Data Requirements (Missing Sync)
To achieve 100% functional parity with the legacy system, the following data points need to be synced to Supabase:
1. **`master_advisor`**: For individual targets and home store mapping.
2. **`master_stock`**: For initial stock values in Daily Reports.
3. **`traffic_summary`**: For Capture Rate and Conversion Rate analytics.
4. **`calendar_notes`**: For the Heatmap Calendar annotation feature.

---

## 🚀 Next Steps
1. **Validation**: Compare numbers in `Monthly Overview` vs. the original Google Sheet.
2. **Export Engine**: Implement Excel/PDF export using `xlsx` and `jspdf`.
3. **Database Views**: Optimize performance by creating SQL views in Supabase for complex aggregations.

---
*Last Updated: 2026-05-02*
