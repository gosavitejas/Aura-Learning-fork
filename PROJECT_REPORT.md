# Aura LMS — Comprehensive Project Report

---

## Table of Contents

1. [Abstract](#abstract)
2. [Project Overview](#project-overview)
3. [Objectives](#objectives)
4. [System Architecture](#system-architecture)
5. [Feature Inventory](#feature-inventory)
6. [Tech Stack & Dependencies](#tech-stack--dependencies)
7. [Database Schema Design](#database-schema-design)
8. [API Endpoint Reference](#api-endpoint-reference)
9. [Authentication & Authorization Flow](#authentication--authorization-flow)
10. [AI / RAG Pipeline](#ai--rag-pipeline)
11. [Payment Flow](#payment-flow)
12. [Frontend Architecture](#frontend-architecture)
13. [Data Flow Diagrams](#data-flow-diagrams)
14. [Deployment & Setup Instructions](#deployment--setup-instructions)
15. [Limitations & Future Scope](#limitations--future-scope)
16. [Conclusion](#conclusion)

---

## Abstract

**Aura LMS** (Learning Management System) is a full-stack, AI-powered educational platform designed to bridge the gap between traditional online course delivery and intelligent, personalised tutoring. The platform enables three categories of users — students, instructors, and administrators — to interact within a structured learning ecosystem.

Students can browse a course catalogue, enrol in free or paid courses, watch video lessons, take AI-generated quizzes, leave timestamped notes, and participate in threaded discussions. Each enrolled student has access to a contextually aware AI assistant ("Ask Aura") that answers questions strictly from the course's own uploaded PDF materials using a Retrieval-Augmented Generation (RAG) pipeline built on LangChain and OpenAI's GPT-4o-mini.

Instructors can build multi-module courses, upload PDF reference materials for AI ingestion, publish or archive courses, and manage their content through a dedicated dashboard. Administrators oversee the entire platform — approving or rejecting instructor applications, viewing real-time platform metrics, and moderating course statuses.

The system is architected as a **React 19 + TypeScript** single-page application on the frontend and a **FastAPI (Python)** REST API on the backend, with **Clerk** handling authentication, **PostgreSQL** as the relational database, **Qdrant** as the vector database, **MinIO** as the object store, **Redis + RQ** as the background task queue, and **Razorpay** as the payment gateway.

---

## Project Overview

| Attribute        | Value                                      |
|------------------|--------------------------------------------|
| Project Name     | Aura LMS — AI-Powered Learning Platform    |
| Type             | Full-Stack Web Application                 |
| Domain           | Education Technology (EdTech)              |
| Frontend         | React 19 + TypeScript + Vite               |
| Backend          | FastAPI (Python 3.11+)                     |
| AI Engine        | LangChain + OpenAI GPT-4o-mini + Qdrant   |
| Auth Provider    | Clerk                                      |
| Payments         | Razorpay                                   |
| Database         | PostgreSQL (relational) + Qdrant (vector)  |
| Object Storage   | MinIO (S3-compatible)                      |
| Task Queue       | Redis + RQ                                 |
| Deployment Mode  | Docker Compose (infrastructure services)   |

---

## Objectives

1. **Deliver structured learning** — Organise courses into modules and lessons with support for video playback and curriculum navigation.
2. **AI-powered tutoring** — Provide every enrolled student a contextually locked AI assistant that answers questions strictly from the course's own PDF materials.
3. **AI quiz generation** — Automatically generate multiple-choice quizzes from course PDFs so students can self-assess without instructor effort.
4. **Role-based access control (RBAC)** — Enforce strict permissions across three roles: `student`, `instructor`, and `admin`.
5. **Instructor onboarding pipeline** — Allow any student to apply to become an instructor; admins review and approve applications.
6. **Monetisation** — Integrate a complete payment gateway (Razorpay) for paid course enrolment with cryptographic payment verification.
7. **Student telemetry** — Track video watch time and quiz scores to populate a personalised learning dashboard with a "Pick Up Where You Left Off" feature.
8. **Social learning** — Enable threaded lesson-level discussions with likes, moderated comments, and personal timestamped notes.
9. **Asynchronous PDF ingestion** — Offload heavy AI indexing work to a background worker so the API stays responsive.
10. **Enterprise-grade security** — Use JWT-based Clerk authentication, HMAC payment signature verification, and SQL-level constraints to prevent common attack vectors.

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER'S BROWSER                         │
│                                                                 │
│   React 19 + TypeScript SPA (Vite dev server / static bundle)   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Clerk (Auth UI)  │  Axios (API calls)  │  Framer Motion │   │
│   └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP (JWT Bearer Token)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND (:8000)                    │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Clerk   │  │  API Routes  │  │  Webhook Handler (Svix)  │  │
│  │  Guard   │  │  /api/v1/*   │  │  /api/v1/webhooks/clerk  │  │
│  └──────────┘  └──────┬───────┘  └──────────────────────────┘  │
│                        │                                        │
│         ┌──────────────┼──────────────────┐                     │
│         ▼              ▼                  ▼                     │
│    PostgreSQL      MinIO (S3)         Razorpay API              │
│    (metadata)     (PDFs/thumbs)       (payments)               │
│                        │                                        │
│                        ▼                                        │
│                   Redis Queue                                   │
│                        │                                        │
│                        ▼ (background job)                       │
│               ┌──────────────────┐                              │
│               │   RQ Worker      │                              │
│               │  (PDF Ingestion) │                              │
│               └────────┬─────────┘                              │
│                        │ LangChain → OpenAI Embeddings           │
│                        ▼                                        │
│                  Qdrant (Vector DB)                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ AI Query (RAG)
                               ▼
                    OpenAI GPT-4o-mini (LLM)
```

### Component Responsibilities

| Component         | Responsibility                                                                      |
|-------------------|-------------------------------------------------------------------------------------|
| **React SPA**     | Renders all UI views; manages application state; calls backend via Axios             |
| **Clerk**         | User registration, login, session management, JWT issuance, webhook events           |
| **FastAPI**       | REST API server; business logic; RBAC enforcement; DB operations via SQLAlchemy      |
| **PostgreSQL**    | Stores all relational data: users, courses, enrollments, orders, progress, notes     |
| **MinIO**         | Stores course PDFs (AI training data) and course thumbnail images                   |
| **Qdrant**        | Stores text embeddings (1536-dimension vectors) for semantic search / RAG            |
| **Redis + RQ**    | Queues and processes PDF ingestion jobs asynchronously                               |
| **OpenAI API**    | Provides text-embedding-3-small (embeddings) and GPT-4o-mini (LLM for answers/quizzes)|
| **Razorpay**      | Creates payment orders; verifies cryptographic payment signatures                   |

---

## Feature Inventory

### Student Features

| Feature                        | Description                                                                           |
|--------------------------------|---------------------------------------------------------------------------------------|
| **Landing Page**               | Animated landing with feature highlights and a call to action                         |
| **Authentication**             | Sign-up / sign-in powered by Clerk (email, OAuth, etc.)                               |
| **Course Catalogue**           | Browse all published courses with thumbnails, category filters, and pricing           |
| **Course Details Page**        | View full curriculum (modules + lessons), pricing, and enrol/purchase action          |
| **Free Enrolment**             | Instantly enrol in free (₹0) courses                                                  |
| **Paid Enrolment**             | Initiate Razorpay checkout for paid courses; access granted after payment verification|
| **Student Dashboard**          | Personalised view of enrolled courses, learning statistics, and "Resume" CTA          |
| **Learning Mode**              | Full-screen lesson player with sidebar curriculum, AI quiz, notes, and discussion tabs|
| **Video Player**               | Custom video player (`AuraVideoPlayer`) built with `react-player`                     |
| **Watch-Time Telemetry**       | Heartbeat every 15 s reports progress; drives "total hours learned" metric            |
| **AI Quiz Generation**         | Generate a 10-question multiple-choice quiz from course PDF at any time               |
| **Quiz Score Logging**         | Quiz attempts are persisted and averaged to form a lifetime quiz score                |
| **Timestamped Notes**          | Create, view, and delete personal notes per lesson                                    |
| **Threaded Discussion**        | Post comments, reply to comments (1 level deep), like/unlike, see reply counts        |
| **Aura AI Chat**               | Floating chat widget for AI-assisted queries; context-aware or general-purpose        |
| **Context Switching**          | Select any enrolled course as the AI chat context from a dropdown                     |
| **Teach / Become Instructor**  | Submit an instructor application form (name, expertise, portfolio, motivation)        |
| **Application Status Banner**  | Non-intrusive notification banner showing approval/rejection result                   |
| **"Pick Up Where You Left Off"**| Dashboard card that deep-links to the exact last-watched lesson                      |

### Instructor Features

| Feature                        | Description                                                                           |
|--------------------------------|---------------------------------------------------------------------------------------|
| **Instructor Dashboard**       | View own courses with status badges, earnings indicator, and course management        |
| **Course Builder (Step 1)**    | Create course identity: title, description, category, price, thumbnail image          |
| **Course Builder (Step 2)**    | Build curriculum: add/remove modules and lessons, set video URLs and durations        |
| **PDF Upload for AI Training** | Upload a PDF; triggers async ingestion job that embeds PDF chunks into Qdrant         |
| **Publish / Unpublish Course** | Toggle course visibility (Draft → Published → Archived)                              |
| **Soft Delete (Archive)**      | Hide a course from the catalogue without losing student data                          |
| **Hard Delete**                | Permanently delete a course (blocked if any students are enrolled — Safety Lock)      |
| **Quiz AI Access**             | Instructors can also run the AI quiz on their own courses                             |
| **AI Chat (Tutor Mode)**       | Instructors can chat with Aura about their own course's PDF                           |

### Admin Features

| Feature                        | Description                                                                           |
|--------------------------------|---------------------------------------------------------------------------------------|
| **Admin Dashboard**            | God-Mode view with platform-wide metrics                                              |
| **Platform Metrics**           | Total users, total instructors, active courses, pending applications                  |
| **Instructor Applications**    | Review pending applications with full applicant details                               |
| **Approve/Reject Application** | Update application status; approved applicants have their DB role changed to instructor|
| **Ban Course**                 | Set course status to `"Banned"` to prevent instructor from modifying it               |
| **Admin Safety Guard**         | Admins cannot accidentally downgrade their own role via application approval          |
| **Access Control**             | All admin endpoints are protected by `require_admin` dependency; 403 on any other role|

---

## Tech Stack & Dependencies

### Frontend (`aura-frontend/`)

| Library / Tool              | Version    | Purpose                                               |
|-----------------------------|------------|-------------------------------------------------------|
| **React**                   | 19.2.0     | Core UI framework                                     |
| **TypeScript**              | 5.9.3      | Static typing                                         |
| **Vite**                    | 7.3.1      | Build tool and dev server                             |
| **TailwindCSS**             | 4.2.0      | Utility-first CSS framework                           |
| **Framer Motion**           | 12.34.3    | Animation library (page transitions, micro-animations)|
| **@clerk/clerk-react**      | 5.61.0     | Authentication SDK (sign-in/sign-up, token management)|
| **Axios**                   | 1.13.5     | HTTP client for API calls                             |
| **react-player**            | 3.4.0      | Video playback component                              |
| **react-router-dom**        | 7.13.0     | Routing (used for navigation structure)               |
| **lucide-react**            | 0.575.0    | Icon library                                          |
| **screenfull**              | 6.0.2      | Fullscreen API wrapper for video player               |
| **class-variance-authority**| 0.7.1      | Component variant management                          |
| **clsx + tailwind-merge**   | latest     | Conditional class merging utilities                   |

### Backend (`aura-ai-backend/`)

| Library / Tool              | Version    | Purpose                                               |
|-----------------------------|------------|-------------------------------------------------------|
| **FastAPI**                 | latest     | Async REST API framework                              |
| **Uvicorn**                 | latest     | ASGI web server                                       |
| **SQLAlchemy**              | latest     | ORM for PostgreSQL                                    |
| **Pydantic / pydantic-settings** | latest | Data validation and settings management             |
| **psycopg2-binary**         | latest     | PostgreSQL driver                                     |
| **LangChain**               | latest     | AI/LLM orchestration framework                        |
| **langchain-openai**        | latest     | OpenAI integration (GPT-4o-mini + embeddings)         |
| **langchain-qdrant**        | latest     | Qdrant vector store integration for LangChain         |
| **langchain-classic**       | latest     | Classic chain patterns (retrieval chain)              |
| **langchain-community**     | latest     | Community loaders (PyPDFLoader)                       |
| **langchain-text-splitters**| latest     | Recursive text splitting for chunking                 |
| **OpenAI**                  | latest     | GPT-4o-mini LLM and text-embedding-3-small            |
| **qdrant-client**           | latest     | Qdrant vector database Python client                  |
| **minio**                   | latest     | MinIO / S3-compatible object storage client           |
| **redis + rq**              | latest     | Redis connection + job queue for async PDF ingestion  |
| **svix**                    | latest     | Clerk webhook signature verification                  |
| **fastapi-clerk-auth**      | latest     | FastAPI dependency for validating Clerk JWTs          |
| **razorpay**                | latest     | Official Razorpay Python client                       |
| **pypdf + tiktoken**        | latest     | PDF parsing and tokenisation for LangChain            |
| **python-dotenv**           | latest     | Loading `.env` configuration files                    |
| **python-multipart**        | latest     | Multipart file upload support for FastAPI             |

### Infrastructure (Docker Compose)

| Service      | Image              | Port(s)       | Purpose                         |
|--------------|--------------------|---------------|---------------------------------|
| `postgres`   | `postgres:15`      | 5432          | Relational database             |
| `minio`      | `minio/minio`      | 9000, 9001    | Object storage (PDF, thumbnails)|
| `qdrant`     | `qdrant/qdrant`    | 6333, 6334    | Vector database                 |
| `redis`      | `redis:latest`     | 6379          | Task queue broker               |

---

## Database Schema Design

All tables are managed by SQLAlchemy's ORM and auto-created via `Base.metadata.create_all()` on server startup.

### Entity Relationship Overview

```
users ──< courses (instructor_id)
users ──< enrollments (student_id)
courses ──< enrollments (course_id)
courses ──< modules (course_id)
modules ──< lessons (module_id)
users ──< instructor_applications (user_id)
users ──< orders (student_id)
courses ──< orders (course_id)
users ──< lesson_progress (student_id)
courses ──< lesson_progress (course_id)
lessons ──< lesson_progress (lesson_id)
users ──< quiz_attempts (student_id)
courses ──< quiz_attempts (course_id)
users ──< notes (student_id)
lessons ──< notes (lesson_id)
lessons ──< comments (lesson_id)
users ──< comments (user_id)
comments ──< comments (parent_id, self-reference)
comments ──< comment_likes (comment_id)
users ──< comment_likes (user_id)
```

### Table Definitions

#### `users`

| Column       | Type        | Constraints               | Description                      |
|--------------|-------------|---------------------------|----------------------------------|
| `id`         | String (PK) | Primary Key               | Clerk user ID (`user_xxx`)       |
| `name`       | String      | NOT NULL                  | Display name                     |
| `email`      | String      | UNIQUE, NOT NULL          | Email address                    |
| `role`       | String      | DEFAULT `"student"`       | `student` / `instructor` / `admin`|
| `created_at` | DateTime    | server_default=now()      | Registration timestamp           |

#### `courses`

| Column          | Type        | Constraints            | Description                        |
|-----------------|-------------|------------------------|------------------------------------|
| `id`            | String (PK) | Primary Key            | Custom slug (e.g. `python-101`)    |
| `title`         | String      | NOT NULL               | Course title                       |
| `description`   | String      |                        | Course description                 |
| `instructor_id` | String (FK) | → `users.id`           | Course owner                       |
| `price`         | Integer     | DEFAULT 0              | Price in Indian Rupees (₹)         |
| `category`      | String      | DEFAULT `"General"`    | AI / Development / Design / etc.   |
| `thumbnail_url` | String      | NULLABLE               | MinIO-hosted image URL             |
| `status`        | String      | DEFAULT `"Draft"`      | `Draft` / `Published` / `Archived` / `Banned` |
| `created_at`    | DateTime    | server_default=now()   | Creation timestamp                 |

#### `modules`

| Column        | Type         | Constraints            | Description             |
|---------------|--------------|------------------------|-------------------------|
| `id`          | Integer (PK) | Auto-increment PK      | Module ID               |
| `course_id`   | String (FK)  | → `courses.id` CASCADE | Parent course           |
| `title`       | String       | NOT NULL               | Module heading          |
| `order_index` | Integer      | DEFAULT 0              | Display order           |
| `created_at`  | DateTime     | server_default=now()   |                         |

#### `lessons`

| Column        | Type         | Constraints           | Description              |
|---------------|--------------|-----------------------|--------------------------|
| `id`          | Integer (PK) | Auto-increment PK     | Lesson ID                |
| `module_id`   | Integer (FK) | → `modules.id` CASCADE| Parent module            |
| `title`       | String       | NOT NULL              | Lesson title             |
| `video_url`   | String       | NULLABLE              | YouTube / hosted URL     |
| `duration`    | String       | DEFAULT `"0:00"`      | Display duration string  |
| `order_index` | Integer      | DEFAULT 0             | Display order            |
| `created_at`  | DateTime     | server_default=now()  |                          |

#### `enrollments`

| Column        | Type         | Constraints                  | Description            |
|---------------|--------------|------------------------------|------------------------|
| `id`          | Integer (PK) | Auto-increment PK            | Enrollment ID          |
| `student_id`  | String (FK)  | → `users.id` CASCADE, INDEX  | Enrolled student       |
| `course_id`   | String (FK)  | → `courses.id` CASCADE, INDEX| Enrolled course        |
| `enrolled_at` | DateTime     | server_default=now()         | Enrolment timestamp    |

#### `instructor_applications`

| Column          | Type         | Constraints          | Description                       |
|-----------------|--------------|----------------------|-----------------------------------|
| `id`            | Integer (PK) | Auto-increment PK    |                                   |
| `user_id`       | String (FK)  | → `users.id`         | Applicant                         |
| `full_name`     | String       | NOT NULL             | Applicant's full name             |
| `expertise`     | String       | NOT NULL             | Subject expertise                 |
| `portfolio_url` | String       | NULLABLE             | Link to portfolio / work samples  |
| `motivation`    | Text         | NOT NULL             | Reason for applying               |
| `status`        | String       | DEFAULT `"pending"`  | `pending` / `approved` / `rejected` / `archived` |
| `created_at`    | DateTime     | server_default=now() |                                   |

#### `orders`

| Column                  | Type         | Constraints              | Description                  |
|-------------------------|--------------|--------------------------|------------------------------|
| `id`                    | String (PK)  | UUID default             | Internal order ID            |
| `student_id`            | String (FK)  | → `users.id`             | Buyer                        |
| `course_id`             | String (FK)  | → `courses.id`           | Product being purchased      |
| `amount`                | Integer      | NOT NULL                 | Amount in **paise** (₹ × 100)|
| `razorpay_order_id`     | String       | UNIQUE, INDEX, NULLABLE  | Razorpay order reference     |
| `razorpay_payment_id`   | String       | NULLABLE                 | Filled after successful pay  |
| `razorpay_signature`    | String       | NULLABLE                 | HMAC signature from Razorpay |
| `status`                | String       | DEFAULT `"created"`      | `created` / `paid` / `failed`|
| `created_at`            | DateTime     | server_default=now()     |                              |

#### `lesson_progress`

| Column                      | Type         | Constraints                              | Description                        |
|-----------------------------|--------------|------------------------------------------|------------------------------------|
| `id`                        | Integer (PK) | Auto-increment PK                        |                                    |
| `student_id`                | String (FK)  | → `users.id` CASCADE, INDEX, NOT NULL    |                                    |
| `course_id`                 | String (FK)  | → `courses.id` CASCADE, INDEX, NOT NULL  |                                    |
| `lesson_id`                 | Integer (FK) | → `lessons.id` CASCADE, INDEX, NOT NULL  |                                    |
| `is_completed`              | Boolean      | DEFAULT False                            | Lesson completion flag             |
| `watch_time_seconds`        | Integer      | DEFAULT 0                                | Total seconds watched              |
| `last_accessed_at`          | DateTime     | server_default=now(), onupdate=now()     | Auto-updates on every upsert       |
| **UNIQUE** `uix_student_lesson` | —        | (`student_id`, `lesson_id`)              | Prevents duplicate rows            |

#### `quiz_attempts`

| Column            | Type         | Constraints                              | Description             |
|-------------------|--------------|------------------------------------------|-------------------------|
| `id`              | Integer (PK) | Auto-increment PK                        |                         |
| `student_id`      | String (FK)  | → `users.id` CASCADE, INDEX, NOT NULL    |                         |
| `course_id`       | String (FK)  | → `courses.id` CASCADE, INDEX, NOT NULL  |                         |
| `score`           | Integer      | NOT NULL                                 | Correct answers count   |
| `total_questions` | Integer      | NOT NULL                                 | Total questions in quiz |
| `created_at`      | DateTime     | server_default=now()                     |                         |
| **CHECK** `chk_valid_quiz` | —   | `total_questions > 0`                    | Prevents division by zero |

#### `notes`

| Column       | Type         | Constraints                             | Description               |
|--------------|--------------|-----------------------------------------|---------------------------|
| `id`         | Integer (PK) | Auto-increment PK                       |                           |
| `student_id` | String (FK)  | → `users.id` CASCADE, NOT NULL          |                           |
| `course_id`  | String (FK)  | → `courses.id` CASCADE, NOT NULL        |                           |
| `lesson_id`  | Integer (FK) | → `lessons.id` CASCADE, NOT NULL        | Tied to specific lesson   |
| `content`    | Text         | NOT NULL                                | Note text                 |
| `created_at` | DateTime     | server_default=now()                    |                           |

#### `comments`

| Column            | Type         | Constraints                             | Description                                 |
|-------------------|--------------|-----------------------------------------|---------------------------------------------|
| `id`              | Integer (PK) | Auto-increment PK                       |                                             |
| `course_id`       | String (FK)  | → `courses.id` CASCADE, NOT NULL        |                                             |
| `lesson_id`       | Integer (FK) | → `lessons.id` CASCADE, NOT NULL        |                                             |
| `user_id`         | String (FK)  | → `users.id` CASCADE, NOT NULL          |                                             |
| `parent_id`       | Integer (FK) | → `comments.id` CASCADE, NULLABLE      | NULL = top-level; set = reply              |
| `target_username` | String       | NULLABLE                                | `@username` context for flat reply display  |
| `content`         | Text         | NOT NULL                                | Comment body                                |
| `likes_count`     | Integer      | DEFAULT 0                               | Denormalized like counter                   |
| `is_deleted`      | Boolean      | DEFAULT False                           | Soft-delete for moderation                  |
| `created_at`      | DateTime     | server_default=now()                    |                                             |

#### `comment_likes`

| Column       | Type         | Constraints                        | Description             |
|--------------|--------------|------------------------------------|-------------------------|
| `id`         | Integer (PK) | Auto-increment PK                  |                         |
| `comment_id` | Integer (FK) | → `comments.id` CASCADE, NOT NULL  |                         |
| `user_id`    | String (FK)  | → `users.id` CASCADE, NOT NULL     |                         |
| **UNIQUE** `uix_comment_user_like` | — | (`comment_id`, `user_id`) | One like per user per comment |

---

## API Endpoint Reference

All endpoints are under the prefix `/api/v1`.  
Authentication is via `Authorization: Bearer <clerk_jwt>`.  
Legend: 🔓 Public (any authenticated user) | 👨‍🏫 Instructor+ | 👑 Admin only

### Course Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/courses` | 👨‍🏫 | Create a new course (with optional thumbnail upload) |
| `GET` | `/courses` | 🔓 | List all courses with user-specific enrolment flag |
| `GET` | `/courses/{course_id}` | 🔓 | Get full course details including modules and lessons |
| `PUT` | `/courses/{course_id}/publish` | 👨‍🏫 | Publish a draft course to the public catalogue |
| `PUT` | `/dashboard/instructor/courses/{course_id}/status` | 👨‍🏫 | Toggle course status (Publish / Archive) |
| `DELETE` | `/dashboard/instructor/courses/{course_id}` | 👨‍🏫 | Hard delete (blocked if students enrolled) |

### Curriculum Builder

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/courses/{course_id}/modules` | 👨‍🏫 | Add a module to a course |
| `POST` | `/modules/{module_id}/lessons` | 👨‍🏫 | Add a lesson to a module |

### AI / RAG

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/upload-course` | 👨‍🏫 | Upload a PDF for async AI ingestion into Qdrant |
| `POST` | `/ask-aura` | 🔓 | Query the AI (tutor mode if enrolled, sales mode otherwise) |
| `GET` | `/chat/contexts` | 🔓 | Fetch all enrolled/created course contexts for the chat dropdown |
| `POST` | `/courses/{course_id}/generate-quiz` | 🔓 | Generate a 10-question AI quiz from course materials |

### Enrolment & Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/enroll` | 🔓 | Enrol in a free course (blocks paid courses) |
| `POST` | `/payments/create-order` | 🔓 | Create a Razorpay payment order (server-side price lookup) |
| `POST` | `/payments/verify` | 🔓 | Verify HMAC signature and grant enrolment on success |

### User / Identity

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/me` | 🔓 | Get the current user's profile and database role |

### Instructor Applications (RBAC)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/teach/apply` | 🔓 | Submit an instructor application |
| `GET` | `/teach/status` | 🔓 | Check own application status |
| `PUT` | `/teach/dismiss/{app_id}` | 🔓 | Archive / dismiss notification banner |
| `GET` | `/admin/applications` | 👑 | List all pending applications |
| `PUT` | `/admin/applications/{app_id}/status` | 👑 | Approve or reject an application |
| `GET` | `/admin/metrics` | 👑 | Platform-wide statistics |

### Telemetry

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/telemetry/heartbeat` | 🔓 | Upsert video watch time (15-second intervals) |
| `POST` | `/telemetry/quiz` | 🔓 | Log a quiz attempt with score |
| `GET` | `/dashboard/student/metrics` | 🔓 | Fetch aggregated student dashboard data |

### Notes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/courses/{course_id}/lessons/{lesson_id}/notes` | 🔓 | Fetch notes for current lesson |
| `POST` | `/courses/{course_id}/lessons/{lesson_id}/notes` | 🔓 | Create a new note |
| `DELETE` | `/notes/{note_id}` | 🔓 | Delete own note |

### Discussion / Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/courses/{course_id}/lessons/{lesson_id}/comments` | 🔓 | Fetch threaded comments |
| `POST` | `/courses/{course_id}/lessons/{lesson_id}/comments` | 🔓 | Post a comment or reply |
| `DELETE` | `/comments/{comment_id}` | 🔓 | Soft-delete own comment (admin can delete any) |
| `POST` | `/comments/{comment_id}/like` | 🔓 | Toggle like on a comment |

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/webhooks/clerk` | Svix signature | Sync new Clerk users to PostgreSQL on `user.created` |

---

## Authentication & Authorization Flow

### Registration & Login

```
User → Clerk UI (Sign Up / Sign In)
         │
         │ Clerk creates user record; fires "user.created" webhook
         ▼
Svix Webhook Verification (HMAC signature check)
         │
         │ Webhook verified → FastAPI upserts User row in PostgreSQL
         │   id   = Clerk user ID ("user_xxx")
         │   role = "student" (default)
         ▼
PostgreSQL `users` table now has the new user
```

### Authenticated API Calls

```
React Frontend → Clerk SDK (getToken())
                  │
                  │ Returns short-lived JWT (signed by Clerk's RSA private key)
                  ▼
Axios interceptor injects: Authorization: Bearer <jwt>
                  │
                  ▼
FastAPI dependency: `get_current_user`
  1. ClerkHTTPBearer validates the JWT against Clerk's JWKS endpoint
  2. Extracts `sub` claim (= Clerk user ID)
  3. Queries PostgreSQL for the User row
  4. Returns User object (with real database role)
```

### Role-Based Access Control

```
Every protected endpoint uses one of three FastAPI dependencies:

  get_current_user  → Any authenticated user (student / instructor / admin)
  require_instructor → role must be "instructor" OR "admin"
  require_admin      → role must be "admin" only
```

### Ghost Session Detection

If a user's Clerk session exists but their ID is not found in PostgreSQL (edge case: user deleted from DB but still has a Clerk session), the frontend detects the 404 response from `/users/me` and automatically calls `signOut()` to force re-authentication.

---

## AI / RAG Pipeline

### PDF Ingestion Pipeline (Async)

```
Instructor uploads PDF via UI
         │
         ▼ POST /upload-course (multipart form)
FastAPI saves file to disk (temp_uploads/)
         │
         ▼ MinIO.fput_object("course-pdfs", ...)
PDF stored in MinIO object storage
         │
         ▼ Redis Queue (ingestion_queue.enqueue)
Job added to "pdf_ingestion_queue"
         │
         ▼ (RQ Worker process - worker.py)
ingest_course_pdf(file_path, course_id, minio_url)
  │
  ├─ 1. PyPDFLoader → Extract text + page numbers
  │
  ├─ 2. RecursiveCharacterTextSplitter
  │       chunk_size=1000, overlap=150
  │
  ├─ 3. Metadata injection per chunk:
  │       { course_id: "xxx", source_url: "minio://..." }
  │
  ├─ 4. OpenAI text-embedding-3-small → 1536-dimension vectors
  │
  └─ 5. QdrantVectorStore.from_documents() → Stored in "aura_embeddings" collection
```

### Tutor Query Pipeline (Sync — for enrolled students)

```
User: "What is gradient descent?"
         │
         ▼ POST /ask-aura { query, current_course_id }
         │
         ├─ Qdrant filter: metadata.course_id == current_course_id
         ├─ Similarity search: top k=4 chunks
         │
         ├─ System prompt:
         │   "Answer ONLY from this context. If not found, direct to comments."
         │
         ├─ LangChain retrieval_chain.invoke({ input: query })
         │   GPT-4o-mini generates grounded answer
         │
         └─ Response includes:
             { answer: "...", citations: [{ page, source_url }], is_upsell: false }
```

### Sales Advisor Pipeline (for unenrolled users)

```
User: "I want to learn machine learning"
         │
         ▼ POST /ask-aura { query, current_course_id: null }
         │
         ├─ Fetch all Published courses from PostgreSQL
         │
         ├─ System prompt includes live course catalogue
         │   "You are an advisor. Recommend from this list."
         │
         └─ Response: { answer: "...", citations: [], is_upsell: true }
```

### AI Quiz Generation Pipeline

```
POST /courses/{course_id}/generate-quiz
         │
         ├─ Qdrant filter: metadata.course_id == course_id
         ├─ k=12 diverse chunks from broad query
         │
         ├─ quiz_llm (temperature=0.7, response_format: json_object)
         │   Prompt forces strict JSON schema with 10 MCQ questions
         │
         └─ JSON parsed and returned:
             { questions: [{ id, question, options[4], correct }] }
```

### Vector Database Configuration

| Parameter         | Value                                          |
|-------------------|------------------------------------------------|
| Collection name   | `aura_embeddings`                              |
| Vector size       | 1536 (OpenAI text-embedding-3-small)           |
| Distance metric   | Cosine similarity                              |
| Context lock      | Qdrant filter on `metadata.course_id`          |

---

## Payment Flow

The payment integration uses Razorpay with HMAC signature verification to prevent payment fraud.

```
1. Student clicks "Enrol Now" on a paid course
         │
         ▼ POST /payments/create-order { course_id }
         │
         ├─ Backend: price looked up from DB (never trusts frontend price)
         ├─ Backend: checks student not already enrolled
         ├─ Backend: creates Razorpay order (INR, in paise = ₹ × 100)
         ├─ Backend: saves pending Order row in PostgreSQL
         └─ Returns: { order_id, amount, currency, key_id }

2. Frontend receives order details
         │
         ▼ Razorpay checkout modal opens in browser
         │
         └─ Student completes payment (card / UPI / netbanking)

3. Razorpay sends back to frontend:
   { razorpay_payment_id, razorpay_order_id, razorpay_signature }
         │
         ▼ POST /payments/verify
         │
         ├─ Backend: verifies HMAC-SHA256 signature:
         │   expected = HMAC(order_id + "|" + payment_id, secret_key)
         ├─ Match → order.status = "paid", create Enrollment row
         └─ Mismatch → order.status = "failed", raise 400
```

**Security mitigations implemented:**
- Backend price lookup (prevents Price Spoofer attack)
- Server-side HMAC signature verification (prevents Fake VIP attack)
- Idempotent verification (if already paid, returns success)
- Order ownership check (student can only verify their own orders)

---

## Frontend Architecture

### Application Structure

```
aura-frontend/
├── public/                      # Static assets
└── src/
    ├── App.tsx                  # Root component: routing, auth state, view management
    ├── main.tsx                 # React entry point (ClerkProvider wraps app)
    ├── index.css                # Global styles
    ├── hooks/
    │   ├── useApi.ts            # Axios instance with Clerk JWT interceptor
    │   ├── use-mobile.ts        # Responsive breakpoint hook
    │   └── use-toast.ts         # Toast notification hook
    ├── contexts/
    │   └── NotificationContext.tsx  # Global notification banner state
    └── components/
        ├── aura/                # Feature-level page components
        │   ├── landing-page.tsx         # Public landing page
        │   ├── auth-page.tsx            # Clerk sign-in/sign-up page
        │   ├── dashboard-view.tsx       # Student/instructor dashboard
        │   ├── catalog-view.tsx         # Course catalogue browser
        │   ├── course-details-view.tsx  # Course info & enrol/purchase page
        │   ├── learning-mode-view.tsx   # Full learning environment
        │   ├── aura-video-player.tsx    # Custom video player component
        │   ├── aura-chat.tsx            # Floating AI chat widget
        │   ├── instructor-course-builder-view.tsx  # 2-step course creation wizard
        │   ├── teach-view.tsx           # Instructor application form
        │   ├── admin-dashboard-view.tsx # Admin control panel
        │   ├── application-success-view.tsx # Post-application success screen
        │   ├── floating-navbar.tsx      # Top navigation bar
        │   ├── notification-banner.tsx  # Application status notification
        │   ├── spatial-background.tsx   # Animated canvas background
        │   └── legal-view.tsx           # Terms / About pages
        └── ui/                  # Reusable Radix-based primitive components
            (50+ components: Button, Card, Dialog, Input, Select, etc.)
```

### State Management

The application uses **local React state** (`useState`, `useEffect`) with no external state management library (no Redux / Zustand). The primary top-level state in `App.tsx` manages:
- `role` — the authenticated user's database role
- authentication sync/loading guards
- globally mounted shell behavior (navbar/notifications/chat visibility rules)

### Routing Strategy

The application uses **URL-based routing** via `react-router-dom` (e.g., `/dashboard`, `/catalog`, `/courses/:courseId`, `/learn/:courseId`, `/legal/:page`). Route guards in `App.tsx` handle authentication and role-based access control, and `AnimatePresence` from Framer Motion handles page transition animations.

### API Communication

All API calls go through the `useApi()` hook, which provides a memoized Axios instance. An interceptor automatically attaches the Clerk JWT to every request's `Authorization` header, eliminating the need to manually pass tokens.

---

## Data Flow Diagrams

### Student Enrolment Flow (Free Course)

```
Student Browser          FastAPI             PostgreSQL
     │                     │                     │
     │── POST /enroll ─────>│                     │
     │                     ├── Query Course ─────>│
     │                     │<── course (price=0) ─┤
     │                     ├── Check enrollment ─>│
     │                     │<── not enrolled ─────┤
     │                     ├── INSERT enrollment ─>│
     │                     │<── OK ───────────────┤
     │<── "Enrollment OK" ─┤                     │
```

### Video Heartbeat Flow

```
Student Browser          FastAPI             PostgreSQL
     │                     │                     │
     │─(every 15 sec)──────│                     │
     │── POST /telemetry/heartbeat ──────────────>│
     │                     │  INSERT ... ON CONFLICT DO UPDATE  │
     │                     │  watch_time += 15, last_accessed = now() │
     │<── { status: "success" } ─────────────────┤
```

### AI Query Flow (Enrolled Student)

```
Student Browser      FastAPI        Qdrant           OpenAI
     │                 │               │                │
     │── POST /ask-aura (query, course_id) ─────────────│
     │                 │               │                │
     │                 ├── Search vectors (filter: course_id) ──>│
     │                 │<── Top 4 relevant chunks ───────┤        │
     │                 │                                │        │
     │                 ├── [chunks + query] ────────────────────>│
     │                 │<── Grounded answer ─────────────────────┤
     │<── { answer, citations } ─────────────────────────────────┤
```

---

## Deployment & Setup Instructions

### Prerequisites

- **Docker & Docker Compose** (for infrastructure services)
- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`
- **Clerk account** (free tier) — for authentication
- **OpenAI API key** — for embeddings and LLM
- **Razorpay account** (test mode) — for payments

### Step 1: Clone the Repository

```bash
git clone https://github.com/gosavitejas/Aura-Learning-fork.git
cd Aura-Learning-fork
```

### Step 2: Start Infrastructure Services

```bash
cd aura-ai-backend
docker-compose up -d
```

This starts PostgreSQL (:5432), MinIO (:9000/:9001), Qdrant (:6333), and Redis (:6379).

### Step 3: Configure the Backend

Create `aura-ai-backend/.env`:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# PostgreSQL
POSTGRES_URL=postgresql://aura_user:aura_password@localhost:5432/aura_db

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=password123
MINIO_SECURE=false

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Redis
REDIS_URL=redis://localhost:6379

# Clerk
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
CLERK_WEBHOOK_SECRET=whsec_...

# Razorpay (use test keys)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

### Step 4: Install Backend Dependencies

```bash
cd aura-ai-backend
pip install -r requirements.txt
```

### Step 5: Start the FastAPI Server

```bash
uvicorn app.main:app --reload --port 8000
```

The server auto-creates all PostgreSQL tables and initialises Qdrant and MinIO buckets on startup.

### Step 6: Start the RQ Worker

In a **separate terminal**:

```bash
cd aura-ai-backend
python worker.py
```

This worker processes PDF ingestion jobs from the Redis queue.

### Step 7: Configure and Start the Frontend

Create `aura-frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Then:

```bash
cd aura-frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Step 8: Configure Clerk Webhooks

In the Clerk dashboard:
1. Go to **Webhooks** → **Add Endpoint**
2. URL: `http://localhost:8000/api/v1/webhooks/clerk` (use `ngrok` for local exposure)
3. Subscribe to event: `user.created`
4. Copy the **Signing Secret** and set it as `CLERK_WEBHOOK_SECRET` in `.env`

---

## Limitations & Future Scope

### Current Limitations

| Limitation | Description |
|------------|-------------|
| **Single-level threading** | Discussion replies are limited to 1 level deep; nested sub-replies are not supported |
| **No real-time features** | Comments, likes, and notifications require a page refresh; no WebSocket / SSE support |
| **No video hosting** | Videos are stored as external URLs (YouTube, Vimeo); no native video upload to MinIO |
| **AI context is PDF-only** | The AI tutor can only answer based on uploaded PDFs; it cannot parse video transcripts |
| **No search** | There is no full-text or semantic search across the course catalogue or lesson content |
| **Single-currency payments** | Payments are hardcoded to INR (Razorpay); multi-currency is not supported |
| **No email notifications** | The platform has no email service; notifications are only in-app banners |
| **No admin ban notifications** | When an admin bans a course, the instructor receives no in-app or email notification |
| **Hardcoded localhost URLs** | MinIO URLs and CORS origin are hardcoded to `localhost`; production deployment requires environment-aware configuration |
| **No pagination on API responses** | Endpoints like `/courses` and `/admin/applications` return all records without cursor- or page-based pagination |
| **Single AI model** | Only GPT-4o-mini is used; there is no model-switching or fine-tuning support |
| **No course ratings / reviews** | Students cannot rate courses or leave reviews; there is no public feedback mechanism |

### Future Scope

| Enhancement | Description |
|-------------|-------------|
| **Video transcript ingestion** | Automatically transcribe uploaded video files (Whisper API) and index them into Qdrant alongside PDFs |
| **Real-time collaboration** | Add WebSocket support (Socket.io / FastAPI WebSockets) for live comment updates and presence indicators |
| **Certificate generation** | Auto-generate PDF certificates upon course completion based on watch-time and quiz scores |
| **Recommendation engine** | Use Qdrant's semantic similarity to suggest related courses based on enrolment history |
| **Multi-language support** | Add i18n (internationalisation) for course content and UI to serve non-English learners |
| **Live cohort classes** | Integrate a live video conferencing API (Jitsi / Zoom SDK) for instructor-led sessions |
| **Instructor analytics** | Provide instructors with per-lesson drop-off rates, quiz performance heatmaps, and revenue reports |
| **Mobile application** | Build a React Native (Expo) mobile app reusing the same FastAPI backend |
| **Course bundles & coupons** | Allow instructors to create discount codes and bundle multiple courses into learning paths |
| **LMS integrations** | Export SCORM/xAPI learning records to integrate with enterprise LMS platforms |
| **Advanced RBAC** | Add department-level roles (e.g., `teaching_assistant`) with granular permissions per course |
| **Offline support** | Add a service worker (PWA) to cache lessons for offline viewing |

---

## Conclusion

Aura LMS is a fully functional, production-grade Learning Management System that demonstrates the integration of modern web development technologies with state-of-the-art AI capabilities.

**Key technical achievements include:**

1. **RAG-powered, course-locked AI tutoring** — Using LangChain, OpenAI embeddings, and Qdrant with strict metadata filtering ensures the AI assistant only answers from a course's own materials, preventing hallucination and maintaining academic integrity.

2. **Asynchronous AI ingestion** — The Redis + RQ job queue decouples the slow PDF-parsing and embedding process from the main API, ensuring the server remains fast and responsive even when processing large documents.

3. **Enterprise-grade security** — The combination of Clerk JWT validation, Svix webhook verification, HMAC payment signature verification, SQL-level uniqueness constraints, and backend-side RBAC guards the platform against common attack vectors.

4. **Rich, animated UI** — Framer Motion page transitions, a floating AI chat widget, custom video player, and a consistent design system built on TailwindCSS v4 deliver a polished, app-like user experience.

5. **Comprehensive role system** — Three well-defined roles (student, instructor, admin) with a formal application and approval pipeline provide a scalable governance model for platform growth.

The system is structured for extensibility — each concern (auth, AI, payments, media, async work) is handled by a dedicated, swappable service, making it straightforward to upgrade or replace individual components as the platform scales.

---

*Report generated from source code analysis of the Aura LMS repository.*  
*Repository: [gosavitejas/Aura-Learning-fork](https://github.com/gosavitejas/Aura-Learning-fork)*
