# Project Folder Structure

This document describes the folder structure of the Car Inspection API (serverless) project.

---

## Root Directory

```
auto_scope_serverless/
├── src/                      # Application source code
├── scripts/                  # Helper scripts (e.g. DB init)
├── serverless.yml            # Serverless Framework config (Lambda, HTTP API)
├── package.json              # Dependencies and npm scripts
├── swagger.yaml              # OpenAPI 3 spec for API docs
├── swagger.html              # Swagger UI for browsing API
├── .gitignore
├── README.md
├── API_DOCUMENTATION.md      # Human-readable API reference
├── PROJECT_STRUCTURE.md     # This file
├── ARCHITECTURE.md           # High-level architecture notes
├── SETUP.md                  # Setup and run instructions
├── CREDENTIALS_SETUP.md      # Credentials / env setup
├── SWAGGER_README.md         # How to use Swagger
├── TEST_API.md               # How to test the API
├── VIEW_LOGS.md              # How to view logs
└── API_USERS_LIST.md         # API users / roles reference
```

---

## `src/` – Source Code

```
src/
├── config/                   # App configuration
├── controllers/              # HTTP request/response layer
├── handlers/                 # Lambda entrypoints (route → handler)
├── middleware/               # Auth, validation
├── models/                   # Mongoose schemas (MongoDB)
├── services/                 # Business logic
└── utils/                    # Shared utilities
```

---

### `src/config/`

| File | Purpose |
|------|---------|
| `constants.js` | App-wide constants (e.g. `USER_ROLES`, `USER_STATUS`, `INSPECTION_TYPES`, `CHECKLIST_STATUS`) |
| `database.js` | MongoDB connection (Mongoose); used by handlers on cold start |

---

### `src/controllers/`

HTTP-level logic: call services and return standardized responses. No route or Lambda details.

| File | Purpose |
|------|---------|
| `adminDashboardController.js` | Admin dashboard data |
| `authController.js` | Register, login, send-OTP, verify-OTP |
| `checklistController.js` | Templates (CRUD), active templates, inspections (CRUD) |
| `contactController.js` | Contact form submit, admin list contact submissions |
| `inspectionRequestController.js` | Create/read/update requests, list (user/admin/inspector), assign, approve, reject |
| `userController.js` | User CRUD, block/toggle status, list users, available inspectors, inspector update available status |

---

### `src/handlers/`

Lambda entrypoints: one “API” file per domain that maps `routeKey` to a handler. Handlers do: DB init, auth, validation, then call the right controller.

**API routers (single Lambda per group):**

| File | Routes | Purpose |
|------|--------|---------|
| `authApi.js` | `/api/auth/*` | Register, login, send-otp, verify-otp |
| `usersApi.js` | `/api/users/*`, `/api/inspectors/available`, `/api/inspectors/me/available-status` | Users, available inspectors, inspector profile |
| `checklistApi.js` | `/api/checklists/templates/*`, `/api/checklists/inspections/*` | Templates and inspections |
| `inspectionRequestApi.js` | `/api/inspection-requests/*` | Inspection requests (create, list, get, update, assign, approve, reject, admin all, inspector assigned) |
| `contactApi.js` | `/api/contact`, `/api/contact/admin` | Contact form, admin list |
| `statisticsApi.js` | `/api/admin/dashboard` | Admin dashboard |
| `swaggerApi.js` | `/api/docs`, `/api/docs/swagger.yaml` | Swagger UI and spec |

**Handler modules (per-domain logic):**

| File | Purpose |
|------|---------|
| `authHandler.js` | Auth: register, login, sendOtp, verifyOtp |
| `userHandler.js` | Users: CRUD, block, getAvailableInspectors, updateMyAvailableStatus |
| `checklistHandler.js` | Templates and inspections handlers |
| `inspectionRequestHandler.js` | Inspection request handlers (create, list, get, update, assign, approve, reject, admin all, inspector assigned) |
| `contactHandler.js` | Contact submit, admin list |
| `statisticsHandler.js` | Admin dashboard |
| `swaggerHandler.js` | Serve Swagger UI and YAML |

---

### `src/middleware/`

| File | Purpose |
|------|---------|
| `auth.js` | `authenticate(event)`, `authorize(role)(event)` – JWT verification and role check |
| `validator.js` | Joi schemas and `validate(schema)(event)` / `validateQuery(schema, query)` for body and query |

---

### `src/models/`

Mongoose models (MongoDB collections).

| File | Purpose |
|------|---------|
| `User.js` | User: email, name, role, status, password (optional), is_assigned, availableStatus, OTP fields |
| `InspectionRequest.js` | Inspection request: requestId, userId, vehicleInfo, status, assignedInspectorId, adminApprovedAt, cancelledAt, etc. |
| `ChecklistTemplate.js` | Checklist template (types, items) for inspections |
| `Inspection.js` | Inspection run (template, vehicleInfo, types/items, status, ratings) |
| `ContactSubmission.js` | Contact form submissions |
| `Counter.js` | Atomic counter for sequential IDs (e.g. Req-001) |

---

### `src/services/`

Business logic and data access. Used by controllers; no HTTP or Lambda details.

| File | Purpose |
|------|---------|
| `authService.js` | Register, login (password/OTP flow), token handling |
| `userService.js` | User CRUD, block/toggle, list users, getAvailableInspectors, updateMyAvailableStatus |
| `inspectionRequestService.js` | Request CRUD, list (user/admin/inspector), assign, approve, reject |
| `checklistService.js` | Template and inspection CRUD, active templates |
| `contactService.js` | Submit contact, list submissions (admin) |
| `adminDashboardService.js` | Dashboard stats and recent activity |
| `otpService.js` | OTP generation, storage, verification, email sending |

---

### `src/utils/`

| File | Purpose |
|------|---------|
| `errors.js` | Custom errors: `BadRequestError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`, `ConflictError`, `DatabaseError` |
| `response.js` | `success()`, `error()` – standard API response shape |
| `asyncHandler.js` | Wraps async handlers to catch and forward errors |
| `logger.js` | Logger used across services/handlers |
| `queryParams.js` | `parseQueryParams(event)` – query string to object |
| `validateQuery.js` | `validateQuery(schema, query)` – validate query with Joi |
| `sanitize.js` | `sanitizeObject()` for request body/query |
| `mailer.js` | Email sending (e.g. OTP) |
| `initializeCounter.js` | Optional script/helper for Counter collection |

---

## Request Flow (high level)

1. **API Gateway** receives HTTP request → invokes the Lambda for that path (e.g. `inspectionRequestApi`).
2. **API router** (`*Api.js`) matches `routeKey` (e.g. `PUT /api/inspection-requests/{id}/assign`) → calls the right **handler**.
3. **Handler** initializes DB (if needed), runs **auth** (authenticate/authorize), **validates** body/query, then calls **controller**.
4. **Controller** calls **service(s)** and returns a **response** via `success()` / `error()`.
5. **Service** uses **models** and **utils** (errors, logger) to implement business logic.

---

## File Naming Conventions

| Layer | Pattern | Example |
|-------|---------|--------|
| API router | `*Api.js` | `inspectionRequestApi.js` |
| Handler | `*Handler.js` | `inspectionRequestHandler.js` |
| Controller | `*Controller.js` | `inspectionRequestController.js` |
| Service | `*Service.js` | `inspectionRequestService.js` |
| Model | PascalCase (singular) | `User.js`, `InspectionRequest.js` |

---

## Scripts

| Path | Purpose |
|------|---------|
| `scripts/init-db.js` | Database initialization (e.g. indexes, seed data) if used |

---

## Quick Reference

| Folder | Contains | Purpose |
|--------|----------|---------|
| `src/config` | constants, database | Configuration |
| `src/controllers` | Controller modules | Map service results to HTTP responses |
| `src/handlers` | Api + Handler modules | Lambda entry, routing, auth, validation |
| `src/middleware` | auth, validator | Auth and validation |
| `src/models` | Mongoose models | Data shape and DB access |
| `src/services` | Service modules | Business logic |
| `src/utils` | errors, response, logger, etc. | Shared helpers |
