# 📚 The Book Haven — Full Stack Application

A production-ready digital library with authentication, book management, reading progress, personalized recommendations, and an admin panel.

---

## 🏗️ Architecture

```
BookHaven/
├── BookHaven-Backend/                     # Node.js + Express API
│   └── src/
│       ├── config/
│       │   ├── database.js      # PostgreSQL DB
│       │   ├── redis.js         # Redis cache
│       │   ├── storage.js       # Google/AWS S3 uploads
│       │   ├── migrate.js       # DB schema migrations
│       │   └── seed.js          # Initial data seeder
│       ├── controllers/
│       │   ├── authController.js      # Auth: register/login/refresh/logout
│       │   ├── booksController.js     # Books: CRUD + search + S3 URLs
│       │   └── libraryController.js   # Shelf, progress, reviews, admin
│       ├── middleware/
│       │   ├── auth.js          # JWT authenticate + authorize
│       │   └── errorHandler.js  # Global error handler
│       ├── routes/index.js      # All routes + rate limiters
│       ├── utils/jwt.js         # Token generation + rotation
│       └── server.js            # Express entry point
│
└── bookhaven-frontend/                   # Next.js 14 + TypeScript
    └── src/
        ├── app/
        │   ├── page.tsx                # Landing page
        │   ├── auth/login/page.tsx     # Login
        │   ├── auth/register/page.tsx  # Register
        │   ├── dashboard/page.tsx      # Home (personalized)
        │   ├── browse/page.tsx         # Catalog + filters
        │   ├── books/[id]/page.tsx     # Book detail + reader + reviews
        │   ├── shelf/page.tsx          # Bookshelf
        │   ├── history/page.tsx        # Reading history
        │   └── admin/page.tsx          # Admin panel
        ├── components/
        │   ├── ui/             # Button, Input
        │   ├── layout/         # Sidebar, DashboardLayout
        │   └── books/          # BookCard (grid + list + skeleton)
        ├── hooks/useLibrary.ts  # React Query hooks for all data
        ├── lib/
        │   ├── api.ts           # Axios client + auto-refresh interceptor
        │   └── queryClient.ts   # React Query config
        ├── store/authStore.ts   # Zustand auth state (persisted)
        └── types/index.ts       # TypeScript interfaces
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+  |  PostgreSQL 14+  |  Redis (optional)  |  AWS S3 bucket

### 1. Install

```bash
cd book-haven
npm install --workspace=bookhaven-backend
npm install --workspace=bookhaven-frontend
```

### 2. Backend Environment

```bash
cd BookHaven-Backend
cp .env.example .env
# Fill in: DATABASE_URL, JWT secrets, Google or AWS S3 keys
```

### 3. Database Setup

```bash
npm run migrate    # Creates all tables, indexes, triggers
npm run seed       # Seeds categories + admin user

# Admin: admin@havenlibrary.com / Admin@123
```

### 4. Frontend Environment

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1" > frontend/.env.local
```

### 5. Run

```bash
npm run dev   # Starts both backend (port 5000) and frontend (port 3000)
```

---

## 🔑 Core API Routes

### Auth
```
POST  /auth/register        Create account (returns token pair)
POST  /auth/login           Login
POST  /auth/refresh         Rotate refresh token
POST  /auth/logout          Revoke token
GET   /auth/me              Current user
```

### Books
```
GET   /books                Paginated list (search, filter, sort)
GET   /books/featured       Featured picks
GET   /books/categories     All categories with counts
GET   /books/:id            Book detail
GET   /books/:id/read-url   Signed S3 URL for reading [auth]
POST  /books                Upload book [admin/librarian]
PATCH /books/:id            Update metadata [admin/librarian]
DELETE /books/:id           Delete [admin]
```

### Library (all require auth)
```
GET/POST/DELETE  /shelf              Personal bookshelf
POST             /progress           Save reading position
GET              /progress/:bookId   Get progress
GET              /progress/history   Reading history
GET/POST/DELETE  /books/:id/reviews  Reviews
GET              /recommendations    Personalized picks
```

### Admin
```
GET   /admin/stats              Dashboard statistics
GET   /admin/users              User list + search
PATCH /admin/users/:id/toggle   Activate/deactivate user
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#1a5276` teal | Buttons, active nav, focus rings |
| Accent | `#c9841e` gold | Stars, featured labels |
| Parchment | `#fdf8f0` | Page backgrounds |
| Display | Playfair Display | All headings, book titles |
| Body | Lora | Paragraph text |
| UI | DM Sans | Nav, buttons, labels |

---

## 🔒 Security

- JWT access tokens (15-min) + rolling refresh tokens (7-day)
- Refresh tokens stored in DB — fully revocable
- bcrypt password hashing (cost factor 12)
- Helmet, CORS whitelist, rate limiting (10 auth / 200 API per 15min)
- S3 private book files — time-limited signed URLs (1 hr)
- Input validation via express-validator + zod (frontend)

---

## ⚡ Performance

- Redis caching on popular queries (5–15 min TTL)
- PostgreSQL full-text search with GIN index + tsvector
- React Query with 5-min stale time + optimistic updates
- Nightly cron cleans expired refresh tokens
- Skeleton loaders to eliminate layout shift

---

## 🗂️ Database Schema

```sql
users              -- accounts, roles, OAuth support
refresh_tokens     -- revocable JWT refresh tokens  
categories         -- book genres/subjects with colors & icons
books              -- full metadata + S3 file references + tsvector
book_categories    -- many-to-many join table
shelves            -- user reading lists (reading/want_to_read/completed/dropped)
reading_progress   -- page position + percentage per user+book
reviews            -- ratings (1–5) + optional comment body
```

Key DB features:
- `uuid-ossp` for all primary keys
- Auto-updating `search_vector` trigger on books (title A, author B, description C, tags D)
- Auto-updated `updated_at` trigger on all mutable tables
- Cascading deletes: remove user → remove all their shelf/progress/review data

---

## 🔒 Security Features

- **JWT access tokens** (15-min) + **rolling refresh tokens** (7-day)
- Tokens stored in DB — can be individually revoked on logout
- **bcrypt** password hashing at cost factor 12
- **Helmet** HTTP security headers
- **CORS** with explicit origin allowlist
- **Rate limiting**: auth routes (10 req/15 min), API (200 req/15 min)
- **S3 private book files** served via signed URLs (1-hour expiry)
- Input validation via `express-validator` on all mutation routes

---

## 🧭 Development Roadmap (Next Steps)

1. **OAuth** — Google/GitHub login via `passport.js` or `next-auth`
2. **EPUB reader** — In-browser rendering with `epubjs`
3. **Annotations** — Highlights and notes stored per user+book+position
4. **Collections** — User-curated public/private book lists
5. **Admin analytics** — Read/download charts over time (recharts)
6. **Email notifications** — New book alerts, reading streaks (nodemailer)
7. **Search suggestions** — Typeahead powered by DB prefix queries
8. **Mobile app** — React Native frontend consuming the same API
