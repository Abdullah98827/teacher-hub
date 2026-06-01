# Teacher-Hub

A secure cross-platform app for verified UK teachers to share educational resources, collaborate with colleagues, and use AI tools to adapt materials for SEN and EAL learners.

**BSc (Hons) Dissertation Project — University of Northampton, April 2026**

---

## The Problem It Solves

UK teachers spend 12 hours a week on planning and resource preparation. Platforms like TES and Teachers Pay Teachers are basically unverified file dumps — no identity checks, no security architecture, no accessibility tools. The ICO consistently lists education as one of the highest-risk sectors for data breaches in the UK.

Teacher-Hub was built to fix all of that in one platform.

---

## Numbers That Matter

- 279 black-box test cases, all documented
- 93/100 System Usability Scale score from real teachers
- WCAG 2.1 Level AA accessibility audit passed
- 28-table PostgreSQL database, designed to third normal form
- Real OWASP A02:2021 vulnerability found and fixed during security testing
- CodeQL scan — 100% source file coverage, zero open alerts
- Dependabot — 6 vulnerabilities identified and resolved, zero remaining

---

## Features

### Security (built first, before any content features)

- Teacher Reference Number (TRN) verification at registration
- Admin approval before any account is activated
- JWT-based authentication with Supabase
- Optional multi-factor authentication
- Row-level security policies enforced at the PostgreSQL database layer — not just application code, so they cannot be bypassed via direct API calls
- Signed URLs expiring after 10 minutes for all file downloads
- File upload whitelisting (PDF, PPTX, DOCX only, 50MB max)
- Full application-level audit logging — every significant action recorded with timestamp, user, role, and details
- HTTPS enforced on all API calls via Supabase infrastructure

### AI Accessibility Tools (processed on-device to protect privacy)

- **EAL Adapter** — simplified English version, bilingual glossary, vocabulary support with contextual examples, and teaching tips. Designed around translanguaging theory rather than simple word-for-word translation
- **Text simplification** — adapts resource content for lower reading levels without removing educational substance
- **Dyslexia-friendly mode** — wider character spacing, increased line height, sans-serif fonts applied across the whole app, based on Rello & Baeza-Yates (2013)
- **Translation** — real-time translation of resource content

### Resource Management

- Multi-format uploads (PDF, Word, PowerPoint)
- Subject and category tagging
- Public and private visibility settings
- Advanced search, filtering, and browse
- Ratings, threaded comments, reporting, and sharing

### Community and Professional Networking

- Activity feeds (relevance-ranked, not just chronological)
- Subject-based group chats
- Direct messaging
- User following and discovery
- Weekly leaderboard — points awarded for uploads, helpful comments, and ratings (not passive engagement)
- Notifications

### Admin Hub

- Membership management (approve, reject, suspend)
- Resource and comment moderation
- Group chat and subject management
- Full audit log viewer with pagination

---

## Tech Stack

| Area | Technology |
|------|-----------|
| Framework | React Native + Expo (iOS, Android, Web) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) |
| Authentication | JWT + Supabase Auth + MFA |
| Database | PostgreSQL, third normal form, 28 tables, RLS policies |
| AI / Translation | Google Translate API, Groq (via Supabase Edge Functions — API keys never in the client) |
| Security Scanning | CodeQL, Dependabot, GitHub Advanced Security |
| Testing | 279 black-box test cases, SUS usability sessions, WCAG 2.1 audit |

---

## Architecture

```
Teacher-Hub
├── Presentation Layer       React Native + Expo (iOS, Android, Web)
├── Business Logic Layer     API calls, Supabase subscriptions, on-device AI
└── Data Layer               PostgreSQL + Row-Level Security (28 tables)

All requests pass through authentication before reaching any feature module.
AI API keys (Google Translate, Groq) live only in Supabase Edge Functions.
They are never present in the client at any point.
```

---

## Database (28 Tables)

Key tables: users, profiles, resources, resource_files, resource_ratings, resource_comments, resource_saves, resource_reports, subjects, memberships, follows, messages, group_chats, group_chat_members, group_chat_messages, notifications, activity_feed, leaderboard_entries, audit_logs, admin_actions.

Row-level security policies on every table. Users can only read and write what their role permits — enforced at the database level, not just in the app.

---

## Security Testing

Manual security testing covered the authentication layer, storage access, and API key handling. A real vulnerability was identified during testing — an exposed API key classified under OWASP A02:2021 (Cryptographic Failures). It was identified, remediated, and documented in the dissertation.

GitHub Advanced Security was configured with three tools active throughout development:

- CodeQL static analysis — 100% JS/TS source file coverage, zero open alerts
- Dependabot — identified 4 high-severity vulnerabilities in @xmldom/xmldom, all resolved
- npm audit — zero vulnerabilities confirmed after remediation

---

## Testing

279 black-box test cases across 8 modules:

| Module | Cases |
|--------|-------|
| Authentication, Sign Up and Login | 20+ |
| Dashboard and Upload | 20+ |
| Resources, Library, Filters, Viewer | 30+ |
| Resource Actions (ratings, comments, save, report, share) | 30+ |
| AI Tools (Translation, EAL Adapter) | 25+ |
| Community, Group Chat, Direct Messages | 40+ |
| Settings, Edit Profile, Password, Onboarding | 30+ |
| General, Performance, Edge Cases | 30+ |

Usability testing: 10 practising teachers, SUS score of 93/100. Survey responses from 20 participants.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Supabase project with Auth, Storage, and Edge Functions enabled

### Install

```bash
git clone https://github.com/Abdullah98827/teacher-hub
cd teacher-hub
npm install
```

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

AI API keys (Google Translate, Groq) go in Supabase Edge Function environment variables — never in the client.

### Run

```bash
npx expo start
```

---

## Why This Project Stands Out

**Security was designed first.** Authentication, TRN verification, and row-level security were all built before any content features. Most platforms bolt security on at the end. This one did not.

**The AI features are backed by research.** The dyslexia mode typography was based on published controlled experiments. The EAL Adapter was redesigned mid-project after the literature showed simple translation was less effective than translanguaging. The code reflects the research, not just a feature list.

**The numbers are real.** 279 test cases, 93/100 SUS, a real vulnerability found and fixed, Dependabot resolving actual CVEs. Nothing in this project was simulated.

---

## Future Work

- Full push notifications via Expo Push API
- Resource version history
- AI-powered resource recommendations based on subject and teaching style
- Automated testing (Jest + Detox)
- School-level accounts with admin delegation

---

## Author

Abdullah Abdullah
BSc (Hons) Web Development & Cyber Security — University of Northampton (2023–2026)
abdullahmbdin021@gmail.com
GitHub: https://github.com/Abdullah98827

---

## Licence

Academic dissertation project. All rights reserved.
