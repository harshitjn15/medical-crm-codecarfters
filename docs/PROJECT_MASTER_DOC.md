# Project Master Documentation
**Project:** Medical CRM SaaS (MERN Stack)
**Version:** 4.1.0
**Last Updated:** March 2026

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Business Requirements](#2-business-requirements)
3. [High Level Architecture (HLD)](#3-high-level-architecture-hld)
4. [Low Level Design (LLD)](#4-low-level-design-lld)
5. [Technical System Design (TSD)](#5-technical-system-design-tsd)
6. [Folder Structure](#6-folder-structure)
7. [Backend Architecture](#7-backend-architecture)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Database Schema](#9-database-schema)
10. [API Documentation](#10-api-documentation)
11. [Features & Modules](#11-features--modules)
12. [UI/UX Architecture](#12-uiux-architecture)
13. [Multi Tenant Architecture](#13-multi-tenant-architecture)
14. [Auth & Security](#14-auth--security)
15. [Notification Architecture](#15-notification-architecture)
16. [Dental Module Architecture](#16-dental-module-architecture)
17. [Appointment Module](#17-appointment-module)
18. [Patient Module](#18-patient-module)
19. [Billing Module](#19-billing-module)
20. [Testing Strategy](#20-testing-strategy)
21. [Deployment](#21-deployment)
22. [Environment Variables](#22-environment-variables)
23. [Performance Strategy](#23-performance-strategy)
24. [Future Roadmap](#24-future-roadmap)
25. [Change Log](#25-change-log)

---

## 1. Project Overview
The Medical CRM SaaS is a high-performance, strictly isolated multi-tenant application built on the MERN stack. Designed specifically for modern clinical operations, it unifies Patient Management, Dental Charting, Appointment Scheduling, and Financial Billing into a single cohesive platform.

## 2. Business Requirements
- **Tenant Autonomy:** Clinics must operate inside completely isolated data silos using the same database.
- **Workflow Automation:** Appointments should dynamically trigger WhatsApp/Email reminders.
- **Resilience:** The application must endure intermittent offline states, caching GETs and queuing POSTs.
- **Premium UX:** The interface must mimic top-tier SaaS (Linear/Stripe) to reduce doctor cognitive load.

## 3. High Level Architecture (HLD)
```
[Client App (React)] <── HTTPS/JWT ──> [Node/Express API Gateway]
     │                                      ├── [Tenant Resolvers]
     └── [IndexedDB (Offline Cache)]        ├── [Cron Schedulers]
                                            └── [Mongoose ORM] <──> [MongoDB Atlas]
                                                   │
                                            [3rd Party APIs: WA Baileys / SMTP]
```

## 4. Low Level Design (LLD)
- **Frontend Contexts:** `AuthContext` governs JWT lifecycle, intercepting `fetch` calls to run a `stale-while-revalidate` caching pattern.
- **Backend Resolvers:** Incoming requests hit `resolveTenant` which extracts the clinic ID from the JWT or header, appending it to `req.clinicId` for strict DB filtering.

## 5. Technical System Design (TSD)
- **Frontend Stack:** React 18, React Router v6 (v7 flags), CSS Variables, `idb`, `lucide-react`, `react-big-calendar`.
- **Backend Stack:** Node.js, Express, Mongoose, Node-Cron, Helmet, express-rate-limit.
- **Storage:** MongoDB.

## 6. Folder Structure
```
medical-crm-codecarfters/
├── client/
│   ├── public/
│   └── src/
│       ├── components/ (Dashboard, Patients, Appointments, etc.)
│       ├── context/ (AuthContext)
│       └── utils/ (offlineDB, syncQueue, formatters)
├── server/
│   ├── models/ (Mongoose Schemas)
│   ├── routes/ (API Endpoints)
│   ├── middleware/ (Tenant, Auth, RBAC)
│   ├── services/ (Email, WA Bots)
│   └── index.js
└── docs/
```

## 7. Backend Architecture
The backend is fundamentally stateless. Every protected route passes through `verifyToken` -> `resolveTenant` -> `requireRole` before executing controller logic. All deleted records are authenticated against `clinicId` to ensure pure isolation.

## 8. Frontend Architecture
The React SPA avoids massive state-management libraries, leveraging `Context API` and local component states. It primarily utilizes pure functional components cleanly tied to a single source of truth CSS design system (`index.css`) injected via CSS Variables.

## 9. Database Schema
Core collections:
- `Clinic`: Holds tenant master settings.
- `User`: Holds RBAC data referencing `clinicId`.
- `Patient`, `Appointment`, `Prescription`, `DentalChart`: Multi-tenant records holding `clinicId`.
Mongoose's global plugins transform `_id` to `id` for REST normalization.

## 10. API Documentation
*Brief summary of major endpoints:*
- `POST /api/auth/login`: Issues JWT.
- `GET /api/patients`: Fetches patients (paginated), cached locally.
- `POST /api/appointments`: Books appointment, optionally auto-generates Patient.
- `POST /api/prescriptions`: Requires `admin` or `super_admin` to execute `DELETE`.

## 11. Features & Modules
- **Authentication:** JWT, Role-based protection.
- **Patients:** Tabbed profile viewing including vitals and file history.
- **Appointments:** Drag & Drop Big Calendar.
- **Dental Chart:** Tooth-surface granularity charting.
- **Prescriptions:** jsPDF rendering and Email dispatch routing.

## 12. UI/UX Architecture
The UI follows a rigid 8px grid system. Native Emojis were stripped in favor of `lucide-react` SVG glyphs. Tables deploy sleek borderless structures. Loading states utilize `.skeleton` pulsing backgrounds instead of jittery spinners to reduce layout shifts.

## 13. Multi Tenant Architecture
A Clinic registers and gets an `_id` (`clinicId`). Users belong to a `clinicId`.
`resolveTenant` reads the JWT -> assigns `req.clinicId`.
Every Mongoose query applies `{ clinicId: req.clinicId }`. Cross-tenant data leaks are mathematically impossible within the DAO tier.

## 14. Auth & Security
- **Authentication:** Signed stateless JSON Web Tokens.
- **Authorization:** `requireRole` protects `DELETE` operations from standard staff.
- **Security Middleware:** `helmet()`, `express-mongo-sanitize()`, and strict rate limiters explicitly guard against DOS and Injection.

## 15. Notification Architecture
Driven entirely by `node-cron` wrapped around `nodemailer` and WhatsApp SDKs.
- Checks daily for appointments matching `<= 24h` and dispatches reminders.

## 16. Dental Module Architecture
Dedicated `DentalChart` document per patient. Nested `ToothSchema` captures surface orientations (`mesial`, `distal`) preventing rigid SQL limitations thanks to MongoDB NoSQL flexibility.

## 17. Appointment Module
Centralizes around `CalendarPage.jsx`, fetching monthly events into memory. Drops an Appointment block triggers `PATCH` requests securely recalculating schedule boundaries.

## 18. Patient Module
Serves as the foreign key anchor for all data. Deleting a patient (Admin only) cascades to or safely detaches vitals and invoices.

## 19. Billing Module
`Invoice` documents map to `Appointment` IDs. Calculations (Tax, Subtotal, Discount) fall back to backend controllers ensuring prices cannot be manipulated linearly from the client.

## 20. Testing Strategy
- **Functional:** Ensure cross-tenant block. Auto-generate patient on naked appointment creation.
- **Offline:** Simulate connection drops to check `syncQueue` array increments.
- **Role Limits:** Trigger 403 Forbidden manually via staff tokens on `DELETE /api/prescriptions/:id`.

## 21. Deployment
Built securely atop Node environments.
`npm run build` pushes React into `client/build`, which `server/index.js` explicitly serves dynamically utilizing an Express static middleware.

## 22. Environment Variables
- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `EMAIL_HOST` / `EMAIL_USER` / `EMAIL_PASS`

## 23. Performance Strategy
- Queries deploy explicit limit cursors `.limit(20)`.
- Client `authFetch` performs `stale-while-revalidate` against IndexedDB bypassing visual network waterfalls entirely.

## 24. Future Roadmap
- Telemedicine Video SDK Integrations.
- AI-driven chief complaint summarizations.
- Automated third-party accounting Sync (Quickbooks/Xero).

## 25. Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v4.1.0 | 2026-03-25 | Stabilized RBAC routes, deployed offline stale-while-revalidate caches, completed rigorous QA End-To-End. | AI Architect |
| v4.0.0 | 2026-03-24 | Redesigned global CSS tokens to Premium Indigo/Slate SaaS format, integrated lucide icons, rewrote layout sidebar. | AI Architect |
| v3.0.0 | 2026-03-23 | Built initial Multi-tenant architecture and CRM baseline. | Original Contributor |

---
**END OF MASTER DOC**
