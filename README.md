# അഴിമതി മയം — Academic Resource & Student Learning Platform

Production-ready academic resource and student learning platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL & Authentication**, and a modular **Google Drive Sharing-Link Storage Architecture**.

---

## Core Architecture

1. **Public Unified Authentication (`/login` & `/register`)**
   - Username + password login shared by Students and the Super Administrator (`admin@invytra`).
   - Role-verified server redirection: Students → `/dashboard`, Administrator → `/admin`.
   - Public Student Self-Registration (`/register`) with instant curriculum personalization (University, Programme, Specialization, Semester, Regulation), plus full Administrator account provisioning and management in `/admin/students`.

2. **Student Application (`/dashboard/*` & `/resources/[id]`)**
   - Personalized homepage driven by enrolled University, Programme, Specialization, Regulation, and Current Semester.
   - Global search with instant subject/resource autocomplete and persisted recent searches.
   - Full study material library & dedicated Previous Question Papers hub with multi-level academic filters.
   - Dedicated embedded Google Drive PDF Preview (`/resources/[id]`) using canonical `https://drive.google.com/file/d/FILE_ID/preview` URLs, full-screen mode, fallback helper bar, and deduplicated download tracking (`/api/resources/[id]/download`).
   - Saved Bookmarks, Recently Viewed history, Notifications feed, Profile photo & curriculum editor, and secure Password Change.
   - **Short Notes & Exam Special (`/dashboard/short-notes`)**: quick-revision short notes and cheat sheets (resource categories `short-notes` / `cheat-sheets`, added by migration `0002`), published through the normal admin Upload flow.
   - **Student Requests (`/dashboard/requests`)**: students request missing notes, papers, short notes or cheat sheets and track the status (Waiting → Being worked on → Done); admins answer from **Student Requests (`/admin/requests`)** — status changes notify the student automatically.
   - **Help & Contact (`/dashboard/help`)**: quick fixes plus direct contact (call / WhatsApp / email; defaults in `src/lib/support.ts`, email overridable via Admin Settings → support_email).

3. **Super Administrator Console (`/admin/*`)**
   - Real-time PostgreSQL overview metrics (zero synthetic statistics).
   - **Upload Resources (`/admin/upload`)**: Manual Google Drive sharing-link workflow with server-side URL & File ID validation, reachability inspection, pre-publish embedded preview, Save as Draft, and Publish.
   - **Study Materials Management (`/admin/resources`)**: Search, filter, bulk publish/unpublish/delete, metadata editing, and Google Drive link replacement (preserving original Drive documents).
   - **Student Management (`/admin/students`)**: Create student accounts, assign courses/semesters, activate/deactivate access, reset passwords, and inspect individual student activity.
   - **Dynamic Academic Taxonomy**: Manage Universities, Degree Programmes, Specializations, Academic Regulations, Semesters, Subjects, and Resource Categories without code changes.
   - **Notices & Announcements (`/admin/notices`)**: Global enable/disable switch, pinned notices, priority tags, expiry dates, image/PDF attachments, and automatic student notifications.
   - **Advertisement Layer (`/admin/advertisements`)**: Configurable, clearly labeled sponsor or Google AdSense slots with optional student consent and strict UX compliance.
   - **Analytics & Audit Trail (`/admin/analytics`)**: Programme breakdowns, download logs, and administrative audit trail.

---

## Environment Variables (Vercel / `.env.local`)

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable (anon) key
- `SUPABASE_SECRET_KEY` — Server-only Supabase secret key (never exposed to browser bundles)
- `DATABASE_URL` — PostgreSQL connection string (for running migrations/provisioning)
- `ADMIN_INITIAL_USERNAME` — `admin@invytra`
- `ADMIN_INITIAL_PASSWORD` — Initial administrator password used by `npm run db:provision`
- `NEXT_PUBLIC_SITE_URL` — Production domain (e.g., `https://your-domain.vercel.app`)

---

## Commands

```bash
# Apply PostgreSQL schema, RLS policies, initial Kerala academic taxonomy, and provision admin@invytra
npm run db:provision

# Start local development server (Turbopack)
npm run dev

# Build optimized production bundle
npm run build

# Start production server
npm run start

# Run end-to-end verification suite
npm run test:e2e
```
