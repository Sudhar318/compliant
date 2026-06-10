# SmartTrack TN 🚦 — AI-Powered Civic Complaint Resolution Platform

SmartTrack TN is a highly optimized, production-ready full-stack backend services suite built on Node.js 20, TypeScript, Express.js, and Prisma. The platform streamlines and automates emergency and citizen complaint resolution workflows across Tamil Nadu, India, using Google Gemini 1.5 Flash (via the modern `@google/genai` model SDK) to automatically classify, prioritize, and route reports to specific zonal officers.

---

## 🛠️ Tech Stack & Key Specifications

*   **Runtime Environment:** Node.js 20 + TypeScript + tsx
*   **Web Framework:** Express.js + CORS + Cookie-Parser + Multer
*   **Database Mapping:** Prisma ORM with SQLite (standard on workspaces for zero-configuration, seamless preview execution) and cross-compatible with PostgreSQL for production.
*   **Security & Encryption:** JWT (Access cookie + Rotating HTTPOnly Refresh pair) with custom in-memory token blacklisting for zero-dependency secure logout. Passwords salted and hashed via Pure-JS `bcryptjs`.
*   **Artificial Intelligence:** Gemini 1.5 Flash / Gemini 3.5 Flash via `@google/genai` for categorisation, sentiment assessment, summaries, and resolution timeline estimations.
*   **Asynchronous Processing:** Built-in Event-Driven Background Worker Queues (`aiQueue` & `notificationQueue`) operating concurrently to process Gemini API payloads offline without blocking active thread pools.
*   **Notifications Dispatcher:** Built-in support for Twilio SMS gateway integration and in-app system log trails.
*   **Testing Engine:** Vitest in-memory assertion engine.

---

## 📁 Workspace Structural Layout

```bash
├── server.ts                       # Unified Full-Stack Express Server (contains Vite SPA fallback integrations)
├── prisma/
│   ├── schema.prisma               # Prisma data schema containing 7 core relational tables
│   ├── seed.ts                     # Database Seeding (Loader for Admin, 3 Officers, and 5 Complaints)
│   └── dev.db                      # Local SQL database file compiled by Prisma CLI
├── src/
│   ├── config/
│   │   ├── env.ts                  # Zodvalidated environment settings
│   │   └── prisma.ts               # Singleton Prisma Client model mapper
│   ├── middleware/
│   │   ├── auth.ts                 # JWT extraction, Verification, and Role Guards (CITIZEN, OFFICER, ADMIN)
│   │   ├── errorHandler.ts         # Global exception and stack-trace catch handler
│   │   ├── rateLimiter.ts          # Custom multi-rate-limiters (Global: 100, Auth: 5, AI: 10 per min)
│   │   └── upload.ts               # Multer handler for image, audio, and video streams (10MB Cap)
│   ├── controllers/
│   │   ├── auth.controller.ts      # Enters Register, Login, Token Refresh, and phone Otp Verifications
│   │   ├── complaint.controller.ts # Complaint submissions, Media upload, Escalations, and Feedbacks
│   │   ├── admin.controller.ts     # Zonal complaints list, Officer registers, manual routing, and analytics
│   │   ├── ai.controller.ts        # Preview evaluations on-demand
│   │   └── notification.controller.ts # User alert feeds management
│   ├── routes/
│   │   ├── auth.routes.ts          # Authentication routes (mapped to rate limiters)
│   │   ├── complaint.routes.ts     # Public unauthenticated trackers and secure complaint endpoints
│   │   ├── admin.routes.ts         # Strictly guarded administrative metrics and routing hooks
│   │   ├── ai.routes.ts            # Fast preview analyses endpoint
│   │   └── notification.routes.ts  # Notification status routes
│   ├── services/
│   │   ├── gemini.service.ts       # Main Gemini SDK integrations mapping system prompts & JSON structures
│   │   ├── storage.service.ts      # Cloudinary storage handler with local static folders fallback
│   │   ├── officer.service.ts      # Auto-routing engine linking ward loads and dispatch targets
│   │   ├── notification.service.ts # Core DB notification logger and Twilio dispatcher
│   │   └── tracking.service.ts     # Uniqueness validator creating 'TN-XXXXX' formatted IDs
│   ├── queues/
│   │   ├── ai.queue.ts             # Non-blocking async worker queue executing Gemini content tasks
│   │   └── notification.queue.ts    # Async notification and SMS dispatcher loop
│   ├── validators/
│   │   ├── auth.schema.ts          # Zod validation schema for registers and logins
│   │   └── complaint.schema.ts     # Zod validated creation, status, and feedback payloads
│   ├── utils/
│   │   ├── apiResponse.ts          # Standard JSON wrappers { success: boolean, data?, error? }
│   │   ├── bcrypt.ts               # Password utilities
│   │   └── jwt.ts                  # Access/Refresh token generators
│   └── tests/
│       └── smarttrack.test.ts      # Vitest Integration and Unit test bundle (passes 100% green)
```

---

## ⚡ Setup & Launch Instructions

### 1. Configure Local Environment Variables
Create a `.env` file at the root using the variables described in `.env.example`:
```env
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET="smarttrack_jwt_super_secret_key_123_456_789"
JWT_REFRESH_SECRET="smarttrack_jwt_refresh_super_secret_key_123_456_789"
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"  # Optional: logs fallbacks automatically if blank
VITE_API_URL="https://your-deployed-api.example.com" # Required for Capacitor/APK builds
```

For Android/Capacitor builds, `VITE_API_URL` must point to the deployed Node/Express backend that serves the `/api` routes. The APK only bundles the React frontend; it cannot run the Express server locally on the phone.

### 2. Install Workspace Dependencies
```bash
npm install
```

### 3. Build & Sync SQLite Tables
Verify data mappings, build schema structures, and map the DB Client:
```bash
npx prisma db push
```

### 4. Load High-Fidelity Dataset Seed
Populates the SQL schema with **1 Admin user, 3 Officers, 1 Citizen, 5 detailed complaints**, and **linked status logs**:
```bash
npx tsx prisma/seed.ts
```

### 5. Start Development Server
```bash
npm run dev
```
The console will boot Express on http://0.0.0.0:3000 with auto-reloads active.

### 6. Run Integrated Test Suites
Execute our testing suite containing security, hashing, JWT structures, trackingId, and adaptive categorisation:
```bash
npx vitest run
```

---

## 📑 Detailed REST Endpoint Documentation

### Unified Response Structure
SmartTrack TN standardizes all endpoints to reply with a uniform payload:
```json
// Success Response
{
  "success": true,
  "data": { ... }
}

// Error Response
{
  "success": false,
  "error": {
    "message": "Error description here",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

---

### 🔑 1. Authentication Router (`/api/auth`)

*   **POST `/register`** - Registers a new profile.
    *   **Payload:**
        ```json
        {
          "name": "Arun Kumar",
          "phone": "+919876543210",
          "email": "arun@gmail.com",
          "password": "password123",
          "role": "CITIZEN", // Options: "CITIZEN" | "OFFICER" | "ADMIN"
          "ward": "Ward A",
          "district": "Chennai"
        }
        ```
*   **POST `/login`** - Authenticates credentials, returning short-lived tokens and setting dynamic HTTPOnly cookies.
*   **POST `/refresh`** - Performs secure token rotation using standard credentials cookies.
*   **POST `/logout`** - Safely revokes active sessions and prunes access keys.
*   **POST `/send-otp`** - Dispatches a 6-digit telephone verification SMS (via Twilio when active).
*   **POST `/verify-otp`** - Checks matching codes and updates Aadhaar phone check indicators in SQLite profiles.
*   **GET `/me`** - Retrieves currently verified user parameters (Guarded by JWT Auth).

---

### 📋 2. Complaints Router (`/api/complaints`)

*   **GET `/track/:trackingId`** - **[Public Endpoint - No Authentication Required]**
    *   Tracks live complaint resolution statuses and audit timelines publicly using tracking codes like `TN-12345` safely filtering out sensitive citizen personal details.
*   **POST `/`** - Citizens submit complaints. Returns IMMEDIATELY with a `trackingId`, and queues categorisation.
    *   **Payload:**
        ```json
        {
          "title": "Low hanging power cable blinking sparks",
          "description": "Electricity wires have sagged within reach on G.S.T Road close to post office.",
          "category": "ELECTRICITY",
          "priority": "HIGH",
          "latitude": 12.9801,
          "longitude": 80.2012,
          "address": "G.S.T Road near Post Office, Chennai"
        }
        ```
*   **GET `/`** - Lists current citizen's reports (with pagination details, search queries, and filter parameters).
*   **GET `/:id`** - Retrieves detailed case profile containing linked timeline updates and attached multimedia files.
*   **PATCH `/:id/status`** - Zonal Officers or Admins change complaint status. Updates active workloads and logs timestamps.
    *   **Payload:**
        ```json
        {
          "status": "IN_PROGRESS", // OPEN | PENDING | IN_PROGRESS | RESOLVED | CLOSED | ESCALATED
          "note": "Assigned technician unit dispatched to location."
        }
        ```
*   **POST `/:id/media`** - Citizen uploads JPEG, WebP, mp4, or wav attachments up to 10MB as proof.
*   **POST `/:id/escalate`** - Citizens trigger high-priority alerts to District Headquarters if complaints remain open for over 72h.
*   **POST `/:id/feedback`** - Citizens log grading reviews (1-5), closing resolution cycles.

---

### 💻 3. Admin Control Router (`/api/admin`)

*   **GET `/complaints`** - Paged listing of files across departments with status queries.
*   **GET `/officers`** - Checks active roster loads and resolution trends of officers.
*   **PATCH `/complaints/:id/assign`** - Manually override routing assignment and redistribute loads.
*   **POST `/officers`** - registers and provisions a new Government Officer profile immediately.
*   **GET `/analytics/summary`** - Computes total tallies, resolution speeds, and escalation quotients.
*   **GET `/analytics/trends`** - Month-on-month charts inputs representing filed vs resolved quotients.
*   **GET `/analytics/by-department`** - Visualizes categories tallies.
*   **GET `/analytics/by-ward`** - Aggregates geographically.

---

### 🤖 4. Gemini Automation & Auto Routing Service

SmartTrack TN integrates closely with standard Gemini classification. The pipeline functions asynchronously as described:

1.  **Submission:** The citizen posts a complaint. The server validates properties and generates a unique ID (e.g. `TN-98563`) and returns instantly to prevent user page loading freezes.
2.  **Queueing:** A background task is scheduled in the Event-Driven worker `aiQueue`.
3.  **Gemini Call:** The background worker compiles a specialized prompt containing Tamil Nadu departments, and instructs `@google/genai` to return exact JSON with:
    *   `category` (ROADS, ELECTRICITY, etc.)
    *   `department` (e.g., "TANGEDCO")
    *   `priority` (CRITICAL, HIGH, etc.)
    *   `sentiment` (Concerned, Emergency, etc.)
    *   `aiSummary` (One sentence digest in English)
    *   `estimatedResolutionHours`
4.  **Auto-Assignment:** Based on the parsed department and ward fields, the database is queried to select the **active officer** with the lowest current workload score (`activeAssignments`).
5.  **Audit & Notify:** The complaint status changes to `PENDING`. Status logs are registered, and SMS/push alerts are fired to the officer.

If no `GEMINI_API_KEY` is present, the service automatically implements a high-performance rule-based keyword analyzer mapping local departments, preserving full system operational viability during sandbox development phases.
