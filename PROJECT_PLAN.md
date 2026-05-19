# MRA Project Management: Next.js + Vercel Implementation

## 1. HIERARKI LOKASI PROYEK
- **Space:** Software Development
- **Folder:** [Nama Aplikasi Anda] Web App
- **List:** Sprint 1 - MVP & Vercel Production Release

## 2. DAFTAR TUGAS (TASKS & SUBTASKS)

### Epic 1: Architecture & Repository Foundation
*Fokus: Membangun pondasi kode yang kokoh sebelum staf mulai mengerjakan UI.*

- **Task 1.1: Standardisasi Arsitektur & Tech Stack**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Description:** Menentukan versi Next.js (App Router), library UI (misal: Shadcn UI / MUI), ORM (misal: Prisma/Drizzle), dan State Management (Zustand/Redux).
- **Task 1.2: Inisialisasi Repository & Linter**
  - **Assignee:** Staff
  - **Status:** To Do
  - **Dependencies:** Waiting on Task 1.1
  - **Description:** `npx create-next-app@latest`, setup Tailwind, konfigurasi ESLint, Prettier, dan Absolute Imports (`@/components`).
- **Task 1.3: Setup Git Workflow & Pre-commit Hooks**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Description:** Konfigurasi Husky & lint-staged agar staf tidak bisa melakukan commit jika kode masih error atau tidak rapi. Mengatur branch protection di GitHub/GitLab.

### Epic 2: Vercel CI/CD & Environment
*Fokus: Mengatur jalur otomatisasi (pipeline) dari repo ke server.*

- **Task 2.1: Vercel Project Linking & Domains**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Description:** Menghubungkan repo utama ke Vercel. Mengatur Custom Domain untuk Production (app.domain.com) dan domain bawaan Vercel untuk Staging.
- **Task 2.2: Konfigurasi Environment Variables (.env)**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Description:** Memasukkan semua `DATABASE_URL`, `NEXTAUTH_SECRET`, dan API Keys ke tab Environment Variables di dasbor Vercel (pisahkan nilai untuk Production, Preview, dan Development).
- **Task 2.3: Konfigurasi Vercel Analytics & Webhooks**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Description:** Mengaktifkan Vercel Speed Insights dan mengatur Webhook Notifikasi Vercel ke Slack/Discord tim jika build gagal.

### Epic 3: Authentication & Security Logic
*Fokus: Sistem login dan pembatasan akses hak guna.*

- **Task 3.1: Setup NextAuth / Auth.js & OAuth Provider**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Description:** Membuat logic otentikasi di `app/api/auth/[...nextauth]/route.ts`. Mengatur Google Cloud Console / GitHub OAuth keys.
- **Task 3.2: Slicing UI Halaman Login & Register**
  - **Assignee:** Staff
  - **Status:** To Do
  - **Dependencies:** Waiting on Task 1.2
  - **Description:** Membuat tampilan antarmuka form Login/Register lengkap dengan validasi client-side menggunakan Zod & React Hook Form.
- **Task 3.3: Integrasi UI ke Auth Session**
  - **Assignee:** Staff
  - **Status:** To Do
  - **Dependencies:** Waiting on Task 3.1 & 3.2
  - **Description:** Membungkus layout dengan `SessionProvider`. Membuat fungsi redirect (middleware) jika user belum login mencoba masuk ke halaman dashboard.

### Epic 4: Frontend Development (Slicing & Components)
*Fokus: Pengerjaan antarmuka pengguna berdasarkan desain UI/UX.*

- **Task 4.1: Slicing Global Layouts**
  - **Assignee:** Staff
  - **Status:** To Do
  - **Description:** Membangun `layout.tsx` utama: Sidebar Navigasi, Topbar (termasuk dropdown profil), dan sistem Dark/Light Mode.
- **Task 4.2: Pembuatan Komponen Reusable (UI Kit)**
  - **Assignee:** Staff
  - **Status:** To Do
  - **Description:** Membuat komponen standar: Custom Buttons, Modals, Data Tables (dengan paginasi dasar), dan Toast Notifications.
- **Task 4.3: Slicing Halaman Dashboard Utama**
  - **Assignee:** Staff
  - **Status:** To Do
  - **Description:** Membuat layout statistik, grafik (menggunakan Recharts/Chart.js), dan skeleton loading state (`loading.tsx`).

### Epic 5: Backend API (Next.js Route Handlers) & Database
*Fokus: Menghubungkan aplikasi dengan data nyata.*

- **Task 5.1: Desain Skema Database & Migrasi (Prisma/Drizzle)**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Description:** Menulis skema database (contoh: `schema.prisma`), mendefinisikan relasi antar tabel, dan menjalankan migrasi ke database production/staging.
- **Task 5.2: Pembuatan Endpoint API Utama (CRUD)**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Dependencies:** Waiting on Task 5.1
  - **Description:** Membuat Route Handlers (`app/api/endpoint/route.ts`) dengan validasi token keamanan (mencegah unauthorized access).
- **Task 5.3: Fetching Data dari Frontend ke API**
  - **Assignee:** Staff
  - **Status:** To Do
  - **Dependencies:** Waiting on Task 5.2 & 4.3
  - **Description:** Menggunakan SWR, React Query, atau fetch bawaan Next.js untuk menampilkan data database ke dalam tabel/grafik di dashboard yang sudah dislicing.

### Epic 6: Testing, QA, & Deployment Sign-off
*Fokus: Memastikan tidak ada bug dan performa maksimal sebelum dirilis.*

- **Task 6.1: Cross-Browser & Responsiveness Test**
  - **Assignee:** Staff
  - **Status:** To Do
  - **Description:** Memeriksa tampilan di berbagai ukuran layar (Mobile, Tablet, Desktop) menggunakan Vercel Preview Deployment URL.
- **Task 6.2: Code Review (Pull Request)**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Description:** Manager mereview Pull Request (PR) dari staf. Memeriksa kualitas kode, kebocoran memori, dan keamanan endpoint sebelum di-merge ke branch main.
- **Task 6.3: Production Deployment & Lighthouse Audit**
  - **Assignee:** Manager
  - **Status:** To Do
  - **Dependencies:** Waiting on Task 6.2
  - **Description:** Menyetujui deploy ke Production di Vercel. Melakukan tes performa Google Lighthouse (target nilai > 90 untuk Performance, Accessibility, SEO).

## 3. METADATA TUGAS YANG DISARANKAN
Tambahkan struktur metadata ini ke dalam tiket/task di platform manajemen proyek Anda:

- **GitHub Branch (Text/URL):** Tempat staf menaruh nama branch tempat mereka bekerja (misal: `feat/login-ui`).
- **Vercel Preview Link (URL):** Link otomatis yang dihasilkan Vercel setiap staf membuat Pull Request. Sangat berguna untuk manajer melakukan testing visual tanpa harus pull code ke laptop.
- **Task Type (Dropdown):** Feature | Bugfix | Chore | Refactor
- **Environment (Dropdown):** Local | Vercel Preview | Vercel Production
- **Estimated Time (Number/Time):** Jam estimasi pengerjaan.
