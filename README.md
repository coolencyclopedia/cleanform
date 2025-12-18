# Cleanform — Data Cleanup & Normalization Tool

Cleanform is a production-grade, browser-first data cleanup tool for fixing messy CSV and Excel files **before** they enter a database or pipeline.

This is **not** an analytics or monitoring app — it focuses purely on **data quality**, **preview-before-apply**, and **safe transformations**.

---

## ✨ Features

### File Support

- Upload **CSV** and **Excel (.xlsx / .xls)**
- Drag & drop or file picker
- Browser-only parsing (no data leaves your machine)

### Header Handling

- Automatic header detection
- Manual override: _“First row contains headers”_
- Safe defaults (never drops data silently)

### Data Cleanup Rules

- Trim whitespace
- Convert empty values to null
- Normalize text case (lower / upper / title)
- Parse numbers
- Parse dates

### Preview-Before-Apply

- Preview changes **per rule**
- Visual diff:
  - 🔴 original value (strikethrough)
  - 🟢 preview value
- Toggle previews on/off instantly

### Apply Controls

- Apply **all** active previews
- Apply **per column**
- Clear previews globally or per column
- Full **undo** support

### Table UX

- Spreadsheet-style grid
- Column resize (drag)
- Double-click header to auto-fit
- Independent vertical & horizontal scrolling
- Sticky header
- Handles wide datasets cleanly

### Export

- Export cleaned data as:
  - CSV
  - JSON
  - Excel

---

## 🧠 Design Principles

- **Preview first, apply later** — no destructive actions
- **Single source of truth** for uploaded data
- **No hidden mutations**
- **No backend required** (yet)
- Built for correctness before features

---

## 🛠 Tech Stack

- **Frontend**: React + TypeScript
- **Build**: Vite
- **Parsing**:
  - CSV: PapaParse
  - Excel: SheetJS (xlsx)
- **Deployment**: Cloudflare Pages

---

## 🚀 Local Development

```bash
npm install
npm run dev
```
