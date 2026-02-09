# Car Inspection API Documentation

## Base URL
- **Local Development**: `http://localhost:3000`
- **Production**: `https://your-api-gateway-url.amazonaws.com`

## Authentication
All endpoints (except register/login) require JWT authentication.

**Header:**
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Authentication APIs

**Login by role:**
- **Admin & Inspector**: Email + password. Register and create user with password (min 8 characters). No OTP.
- **User**: OTP-only. Register with email only; OTP sent to email; verify OTP to get JWT. No password.

### 1.1 Register User
**POST** `/api/auth/register`

**Admin/Inspector (email + password):**
```json
{
  "email": "admin@example.com",
  "firstName": "Admin",
  "lastName": "User",
  "phone": "+1234567890",
  "role": "admin",
  "password": "SecurePass123"
}
```
- **Response (201):** Returns `user`, `token` (JWT), `otpRequired: false`. Account is active; use token for API calls.

**User (OTP-only, no password):**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "user"
}
```
- **Response (201):** Returns `user`, `token: null`, `otpRequired: true`. OTP sent to email; call **Verify OTP** to get JWT.

---

### 1.2 Login
**POST** `/api/auth/login`

**Admin/Inspector (email + password):**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123"
}
```
- **Response (200):** Returns `user`, `token` (JWT), `otpRequired: false`.

**User (email only → OTP flow):**
```json
{
  "email": "user@example.com"
}
```
- **Response (200):** Returns `user`, `token: null`, `otpRequired: true`. OTP sent to email; call **Verify OTP** to get JWT.

---

### 1.3 Send OTP
**POST** `/api/auth/send-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Note:** **User role only.** Admin and inspector accounts use password login; calling send-otp for them returns 400.

---

### 1.4 Verify OTP
**POST** `/api/auth/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Note:** **User role only.** Admin/inspector must use email+password login. OTP valid 10 minutes. Returns JWT on success.

---

## 1.5 Contact Us (Public)

**POST** `/api/contact`

No authentication required. Submit a contact form. **Either email or number is required** (user can enter any one). Message is optional.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "number": "",
  "message": "I would like to know more about your services."
}
```

| Field   | Type   | Required | Notes                                      |
|--------|--------|----------|--------------------------------------------|
| name   | string | Yes      | 2–100 characters                           |
| email  | string | One of email/number | Valid email (optional if number provided) |
| number | string | One of email/number | Up to 20 chars (optional if email provided) |
| message| string | No       | Optional, max 2000 characters               |

**Response (201):**
```json
{
  "success": true,
  "message": "Thank you for contacting us. We will get back to you soon.",
  "data": {
    "submission": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "number": null,
      "message": "I would like to know more about your services."
    }
  }
}
```

### 1.5.1 Get All Contact Submissions (Admin Only)

**GET** `/api/contact/admin?page=1&limit=10&search=&sortBy=createdAt&sortOrder=DESC`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
| Parameter | Type   | Default   | Description |
|-----------|--------|-----------|-------------|
| page      | number | 1         | Page number |
| limit     | number | 10 (max 100) | Items per page |
| search    | string | -         | Search in name, email, number, message |
| sortBy    | string | createdAt | Sort field: `createdAt`, `name`, `email` |
| sortOrder | string | DESC      | Sort order: `ASC`, `DESC` |

**Response (200):**
```json
{
  "success": true,
  "message": "Contact submissions retrieved successfully",
  "data": {
    "submissions": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "number": null,
        "message": "I would like to know more.",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "limit": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "search": null,
      "sortBy": "createdAt",
      "sortOrder": "DESC"
    }
  }
}
```

---

## 2. User Management APIs (Admin Only)

### 2.1 Create User
**POST** `/api/users`

**Headers:** `Authorization: Bearer <admin-token>`

**Admin/Inspector (password required):**
```json
{
  "email": "inspector@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "role": "inspector",
  "password": "SecurePass123"
}
```
- Account is **active**; they sign in with email + password.

**User (no password):**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "user"
}
```
- Account is **inactive** until they complete OTP verification on first login.

---

### 2.2 Get All Users
**GET** `/api/users?page=1&limit=10&search=john&role=inspector&status=active&sortBy=createdAt&sortOrder=DESC`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10, max: 100) - Items per page
- `search` (optional) - Search in email, firstName, lastName, phone
- `role` (optional) - Filter by role: `admin`, `inspector`, `user`
  - **Note:** By default, admin users are excluded from results. To see admin users, explicitly filter by `role=admin`.
- `status` (optional) - Filter by status: `active`, `blocked`, `inactive`
- `sortBy` (optional, default: `id`) - Sort field: `id`, `email`, `firstName`, `lastName`, `role`, `status`, `createdAt`
- `sortOrder` (optional, default: `DESC`) - Sort order: `ASC`, `DESC`

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "user",
        "status": "active"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "limit": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "search": "john",
      "role": "inspector",
      "status": "active",
      "sortBy": "createdAt",
      "sortOrder": "DESC"
    }
  }
}
```

---

### 2.3 Get User by ID
**GET** `/api/users/{id}`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "status": "active"
    }
  }
}
```

---

### 2.4 Update User
**PUT** `/api/users/{id}`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "phone": "+9876543210"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John Updated",
      "lastName": "Doe Updated",
      "phone": "+9876543210"
    }
  }
}
```

---

### 2.5 Toggle User Status
**PUT** `/api/users/{id}/block`

Toggles user status between active and inactive. If user is **active** → set to **inactive**. If user is **inactive** or **blocked** → set to **active**.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "status": "inactive"
    }
  }
}
```
When toggling from inactive to active, `message` is `"User activated successfully"` and `user.status` is `"active"`.

---

### 2.6 Delete User
**DELETE** `/api/users/{id}`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "User deleted successfully"
}
```

---

### 2.7 Get Available Inspectors (Admin Only)
**GET** `/api/inspectors/available?page=1&limit=50&availableStatus=...`

Lists inspectors who are **available for assignment**: role=inspector, status=active, **is_assigned=false**. Use this before assigning an inspector to an inspection request.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 50, max: 100) - Items per page
- `availableStatus` (optional) - Filter by inspector's available status string

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Available inspectors retrieved successfully",
  "data": {
    "inspectors": [
      {
        "id": "507f1f77bcf86cd799439012",
        "firstName": "Jane",
        "lastName": "Inspector",
        "email": "jane@example.com",
        "phone": "+1234567890",
        "availableStatus": "available",
        "is_assigned": false,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 5,
      "limit": 50,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

**Errors:**
- **401** – Unauthorized.
- **403** – Forbidden (admin only).

---

### 2.8 Update Inspector's Available Status (Inspector Only)
**PUT** `/api/inspectors/me/available-status`

Update the **current inspector's** `availableStatus` (e.g. "available", "busy", "on leave"). Max 50 characters. Inspector-only.

**Headers:**
```
Authorization: Bearer <inspector-token>
```

**Request Body:**
```json
{
  "availableStatus": "available"
}
```

| Field | Type | Notes |
|-------|------|-------|
| availableStatus | string | Optional. Max 50 chars. Use empty string or omit to clear. |

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Available status updated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Inspector",
      "role": "inspector",
      "status": "active",
      "phone": "+1234567890",
      "availableStatus": "available",
      "is_assigned": false,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-20T12:00:00.000Z"
    }
  }
}
```

**Errors:**
- **401** – Unauthorized.
- **403** – Forbidden (inspector only).

---

## 3. Checklist Template APIs (Admin Only)

### 3.1 Create Checklist Template
**POST** `/api/checklists/templates`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "name": "Standard Car Inspection Template",
  "description": "Comprehensive inspection template for all vehicle types",
  "types": [
    {
      "typeName": "Exterior",
      "checklistItems": [
        {
          "position": 1,
          "label": "Paint Condition",
          "description": "Check for scratches, dents, and paint quality",
          "isRequired": true
        },
        {
          "position": 2,
          "label": "Body Panels",
          "description": "Inspect all body panels for damage",
          "isRequired": true
        },
        {
          "position": 3,
          "label": "Windows and Mirrors",
          "description": "Check for cracks or damage",
          "isRequired": true
        }
      ],
      "allowOverallRemarks": true,
      "allowOverallPhotos": true,
      "allowVideos": true,
      "maxVideos": 2
    },
    {
      "typeName": "Interior",
      "checklistItems": [
        {
          "position": 1,
          "label": "Seat Condition",
          "description": "Check seats for wear and tear",
          "isRequired": true
        },
        {
          "position": 2,
          "label": "Dashboard",
          "description": "Inspect dashboard for damage",
          "isRequired": true
        }
      ],
      "allowOverallRemarks": true,
      "allowOverallPhotos": true,
      "allowVideos": true,
      "maxVideos": 2
    },
    {
      "typeName": "Engine",
      "checklistItems": [
        {
          "position": 1,
          "label": "Engine Oil Level",
          "description": "Check engine oil level and quality",
          "isRequired": true
        },
        {
          "position": 2,
          "label": "Coolant Level",
          "description": "Inspect coolant level",
          "isRequired": true
        }
      ],
      "allowOverallRemarks": true,
      "allowOverallPhotos": true,
      "allowVideos": false,
      "maxVideos": 0
    }
  ]
}
```

**Available Type Names:**
- `Exterior`
- `Light Conditions and Operations`
- `Interior`
- `Engine`
- `Transmission and Drivetrain`
- `Chasis`
- `Tyre and Breaks`
- `Overall Safety Feature`
- `Entertainment`
- `Drive and Passenger Experience`

**Note:** `allowVideos` can only be `true` for `Interior` and `Exterior` types.

**Response (201):**
```json
{
  "statusCode": 201,
  "message": "Checklist template created successfully",
  "data": {
    "template": {
      "id": "507f1f77bcf86cd799439020",
      "name": "Standard Car Inspection Template",
      "description": "Comprehensive inspection template for all vehicle types",
      "types": [...],
      "isActive": true,
      "version": 1,
      "createdBy": "507f1f77bcf86cd799439010",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### 3.2 Get All Templates
**GET** `/api/checklists/templates?page=1&limit=10&search=standard&isActive=true&sortBy=createdAt&sortOrder=DESC`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10, max: 100) - Items per page
- `search` (optional) - Search in name and description
- `isActive` (optional) - Filter by active status: `true`, `false`
- `sortBy` (optional, default: `createdAt`) - Sort field: `id`, `name`, `createdAt`, `updatedAt`
- `sortOrder` (optional, default: `DESC`) - Sort order: `ASC`, `DESC`

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Templates retrieved successfully",
  "data": {
    "templates": [
      {
        "id": "507f1f77bcf86cd799439020",
        "name": "Standard Car Inspection Template",
        "description": "Comprehensive inspection template",
        "isActive": true,
        "version": 1,
        "createdBy": {
          "id": "507f1f77bcf86cd799439010",
          "firstName": "Admin",
          "lastName": "User",
          "email": "admin@example.com"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 25,
      "limit": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "search": "standard",
      "isActive": true,
      "sortBy": "createdAt",
      "sortOrder": "DESC"
    }
  }
}
```

---

### 3.3 Get Template by ID
**GET** `/api/checklists/templates/{id}`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Template retrieved successfully",
  "data": {
    "template": {
      "id": "507f1f77bcf86cd799439020",
      "name": "Standard Car Inspection Template",
      "description": "Comprehensive inspection template",
      "types": [
        {
          "typeName": "Exterior",
          "checklistItems": [
            {
              "position": 1,
              "label": "Paint Condition",
              "description": "Check for scratches, dents, and paint quality",
              "isRequired": true
            }
          ],
          "allowOverallRemarks": true,
          "allowOverallPhotos": true,
          "allowVideos": true,
          "maxVideos": 2
        }
      ],
      "isActive": true,
      "version": 1,
      "createdBy": {
        "id": "507f1f77bcf86cd799439010",
        "firstName": "Admin",
        "lastName": "User"
      }
    }
  }
}
```

**Note:** Inspectors will only see active templates.

---

### 3.4 Update Template
**PUT** `/api/checklists/templates/{id}`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "isActive": false
}
```

**Or update types:**
```json
{
  "types": [
    {
      "typeName": "Exterior",
      "checklistItems": [
        {
          "position": 1,
          "label": "Updated Label",
          "description": "Updated description",
          "isRequired": true
        }
      ],
      "allowOverallRemarks": true,
      "allowOverallPhotos": true,
      "allowVideos": true,
      "maxVideos": 2
    }
  ]
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Template updated successfully",
  "data": {
    "template": {
      "id": "507f1f77bcf86cd799439020",
      "name": "Updated Template Name",
      "version": 2,
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

**Note:** Version automatically increments when types are updated.

---

### 3.5 Delete Template
**DELETE** `/api/checklists/templates/{id}`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Template deleted successfully"
}
```

**Note:** Cannot delete templates that have been used in inspections. Deactivate them instead.

---

### 3.6 Get Active Templates (Inspector)
**GET** `/api/checklists/templates/active`

**Headers:**
```
Authorization: Bearer <inspector-token>
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Active templates retrieved successfully",
  "data": {
    "templates": [
      {
        "id": "507f1f77bcf86cd799439020",
        "name": "Standard Car Inspection Template",
        "description": "Comprehensive inspection template",
        "types": [
          {
            "typeName": "Exterior",
            "checklistItems": [
              {
                "position": 1,
                "label": "Paint Condition",
                "description": "Check for scratches, dents, and paint quality",
                "isRequired": true
              }
            ]
          }
        ],
        "version": 1,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## 4. Inspection APIs

### 4.1 Create Inspection
**POST** `/api/checklists/inspections`

**Headers:**
```
Authorization: Bearer <inspector-token>
```

**Request Body:**
```json
{
  "checklistTemplateId": "507f1f77bcf86cd799439020",
  "vehicleInfo": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "vin": "4T1BF1FK5EU123456",
    "licensePlate": "ABC123",
    "mileage": 50000,
    "color": "Silver"
  },
  "types": [
    {
      "typeName": "Exterior",
      "checklistItems": [
        {
          "position": 1,
          "label": "Paint Condition",
          "status": "Excellent",
          "rating": 4,
          "remarks": "Paint is in perfect condition with no scratches",
          "photos": [
            "https://example.com/photos/paint1.jpg",
            "https://example.com/photos/paint2.jpg"
          ]
        },
        {
          "position": 2,
          "label": "Body Panels",
          "status": "Good",
          "rating": 3,
          "remarks": "Minor dents on rear bumper",
          "photos": [
            "https://example.com/photos/body1.jpg"
          ]
        },
        {
          "position": 3,
          "label": "Windows and Mirrors",
          "status": "Excellent",
          "rating": 4,
          "remarks": "All windows and mirrors are in perfect condition",
          "photos": []
        }
      ],
      "overallRemarks": "Exterior is in excellent condition overall with minor cosmetic issues",
      "overallPhotos": [
        "https://example.com/photos/exterior1.jpg",
        "https://example.com/photos/exterior2.jpg"
      ],
      "videos": [
        "https://example.com/videos/exterior1.mp4",
        "https://example.com/videos/exterior2.mp4"
      ],
      "averageRating": 3.67
    },
    {
      "typeName": "Interior",
      "checklistItems": [
        {
          "position": 1,
          "label": "Seat Condition",
          "status": "Good",
          "rating": 3,
          "remarks": "Seats show minor wear",
          "photos": [
            "https://example.com/photos/seat1.jpg"
          ]
        },
        {
          "position": 2,
          "label": "Dashboard",
          "status": "Excellent",
          "rating": 4,
          "remarks": "Dashboard is clean and functional",
          "photos": []
        }
      ],
      "overallRemarks": "Interior is well maintained",
      "overallPhotos": [
        "https://example.com/photos/interior1.jpg"
      ],
      "videos": [
        "https://example.com/videos/interior1.mp4"
      ],
      "averageRating": 3.5
    },
    {
      "typeName": "Engine",
      "checklistItems": [
        {
          "position": 1,
          "label": "Engine Oil Level",
          "status": "Good",
          "rating": 3,
          "remarks": "Oil level is adequate",
          "photos": [
            "https://example.com/photos/oil1.jpg"
          ]
        },
        {
          "position": 2,
          "label": "Coolant Level",
          "status": "Excellent",
          "rating": 4,
          "remarks": "Coolant level is perfect",
          "photos": []
        }
      ],
      "overallRemarks": "Engine is in good working condition",
      "overallPhotos": [
        "https://example.com/photos/engine1.jpg"
      ],
      "videos": [],
      "averageRating": 3.5
    }
  ],
  "status": "completed",
  "inspectionDate": "2024-01-15T10:00:00.000Z",
  "notes": "Overall vehicle is in excellent condition"
}
```

**Status Values:**
- `Excellent` → rating: `4`
- `Good` → rating: `3`
- `Average` → rating: `2`
- `Poor` → rating: `1`

**Important Notes:**
1. **Rating must match status**: `Excellent=4`, `Good=3`, `Average=2`, `Poor=1`
2. **Videos only for Interior/Exterior**: Maximum 2 videos per type
3. **All types from template must be included**
4. **All checklist items from template must be included**
5. **averageRating** is auto-calculated (you can include it, but it will be recalculated)

**Response (201):**
```json
{
  "statusCode": 201,
  "message": "Inspection created successfully",
  "data": {
    "inspection": {
      "id": "507f1f77bcf86cd799439030",
      "checklistTemplateId": "507f1f77bcf86cd799439020",
      "inspectorId": "507f1f77bcf86cd799439015",
      "vehicleInfo": {
        "make": "Toyota",
        "model": "Camry",
        "year": 2020,
        "vin": "4T1BF1FK5EU123456",
        "licensePlate": "ABC123",
        "mileage": 50000,
        "color": "Silver"
      },
      "types": [
        {
          "typeName": "Exterior",
          "checklistItems": [...],
          "overallRemarks": "Exterior is in excellent condition overall",
          "overallPhotos": [...],
          "videos": [...],
          "averageRating": 3.67
        }
      ],
      "overallRating": 3.56,
      "status": "completed",
      "inspectionDate": "2024-01-15T10:00:00.000Z",
      "completedAt": "2024-01-15T10:30:00.000Z",
      "notes": "Overall vehicle is in excellent condition",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### 4.2 Get All Inspections
**GET** `/api/checklists/inspections?page=1&limit=10&status=completed&templateId=507f1f77bcf86cd799439020&sortBy=inspectionDate&sortOrder=DESC`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10, max: 100) - Items per page
- `status` (optional) - Filter by status: `draft`, `completed`, `submitted`
- `templateId` (optional) - Filter by template ID
- `sortBy` (optional, default: `inspectionDate`) - Sort field: `id`, `inspectionDate`, `createdAt`, `overallRating`
- `sortOrder` (optional, default: `DESC`) - Sort order: `ASC`, `DESC`

**Note:** Inspectors can only see their own inspections. Admins can see all.

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Inspections retrieved successfully",
  "data": {
    "inspections": [
      {
        "id": "507f1f77bcf86cd799439030",
        "checklistTemplateId": {
          "id": "507f1f77bcf86cd799439020",
          "name": "Standard Car Inspection Template",
          "version": 1
        },
        "inspectorId": {
          "id": "507f1f77bcf86cd799439015",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "inspector@example.com"
        },
        "vehicleInfo": {
          "make": "Toyota",
          "model": "Camry",
          "year": 2020
        },
        "overallRating": 3.56,
        "status": "completed",
        "inspectionDate": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "limit": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "status": "completed",
      "templateId": "507f1f77bcf86cd799439020",
      "sortBy": "inspectionDate",
      "sortOrder": "DESC"
    }
  }
}
```

---

### 4.3 Get Inspection by ID
**GET** `/api/checklists/inspections/{id}`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Inspection retrieved successfully",
  "data": {
    "inspection": {
      "id": "507f1f77bcf86cd799439030",
      "checklistTemplateId": {
        "id": "507f1f77bcf86cd799439020",
        "name": "Standard Car Inspection Template",
        "description": "Comprehensive inspection template",
        "version": 1
      },
      "inspectorId": {
        "id": "507f1f77bcf86cd799439015",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "inspector@example.com"
      },
      "vehicleInfo": {
        "make": "Toyota",
        "model": "Camry",
        "year": 2020,
        "vin": "4T1BF1FK5EU123456",
        "licensePlate": "ABC123",
        "mileage": 50000,
        "color": "Silver"
      },
      "types": [
        {
          "typeName": "Exterior",
          "checklistItems": [
            {
              "position": 1,
              "label": "Paint Condition",
              "status": "Excellent",
              "rating": 4,
              "remarks": "Paint is in perfect condition",
              "photos": ["https://example.com/photos/paint1.jpg"]
            }
          ],
          "overallRemarks": "Exterior is in excellent condition",
          "overallPhotos": ["https://example.com/photos/exterior1.jpg"],
          "videos": ["https://example.com/videos/exterior1.mp4"],
          "averageRating": 3.67
        }
      ],
      "overallRating": 3.56,
      "status": "completed",
      "inspectionDate": "2024-01-15T10:00:00.000Z",
      "completedAt": "2024-01-15T10:30:00.000Z",
      "notes": "Overall vehicle is in excellent condition"
    }
  }
}
```

**Note:** Only the inspector who created it or an admin can view the inspection.

---

### 4.4 Update Inspection
**PUT** `/api/checklists/inspections/{id}`

**Headers:**
```
Authorization: Bearer <inspector-token>
```

**Request Body:**
```json
{
  "types": [
    {
      "typeName": "Exterior",
      "checklistItems": [
        {
          "position": 1,
          "label": "Paint Condition",
          "status": "Good",
          "rating": 3,
          "remarks": "Updated remarks",
          "photos": ["https://example.com/photos/paint1.jpg"]
        }
      ],
      "overallRemarks": "Updated overall remarks",
      "overallPhotos": ["https://example.com/photos/exterior1.jpg"],
      "videos": ["https://example.com/videos/exterior1.mp4"]
    }
  ],
  "status": "submitted",
  "notes": "Updated notes"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Inspection updated successfully",
  "data": {
    "inspection": {
      "id": "507f1f77bcf86cd799439030",
      "overallRating": 3.5,
      "status": "submitted",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

**Note:** Only draft inspections can be updated. Only the inspector who created it can update.

---

### 4.5 Delete Inspection
**DELETE** `/api/checklists/inspections/{id}`

**Headers:**
```
Authorization: Bearer <inspector-token>
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Inspection deleted successfully"
}
```

**Note:** Only draft inspections can be deleted. Only the inspector who created it can delete.

---

## 5. Inspection Request APIs

### 5.1 Create Inspection Request (Public - No Auth Required)
**POST** `/api/inspection-requests`

**Note:** This is a **public endpoint** - no authentication required. Users can create inspection requests without logging in.

**Auto-User Creation Logic:**
- If the email exists in the database → Request is mapped to that user
- If the email doesn't exist → A new user is automatically created with:
  - Role: `user`
  - Status: `inactive` (until OTP verification)
  - Email: provided email
  - firstName/lastName/phone: from request if provided, otherwise defaults to "Guest User"

**User Updates:**
- If user exists but firstName/lastName/phone are missing, they will be updated from the request data

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "requestType": "car inspection",
  "vehicleInfo": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "vin": "4T1BF1FK5EU123456",
    "licensePlate": "ABC123",
    "mileage": 50000,
    "color": "Silver"
  },
  "preferredDate": "2024-01-20T10:00:00.000Z",
  "preferredTime": "10:00 AM",
  "location": {
    "address": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "notes": "Please inspect the vehicle thoroughly"
}
```

**Required Fields:**
- `email` (string, valid email) - Required
- `vehicleInfo` (object) - Required
  - `make` (string) - Required
  - `model` (string) - Required
  - `year` (number) - Required

**Optional Fields:**
- `firstName` (string) - Used for new user creation or updating existing user
- `lastName` (string) - Used for new user creation or updating existing user
- `phone` (string) - Used for new user creation or updating existing user
- `requestType` (string) - Default: "car inspection"
- `preferredDate` (date-time)
- `preferredTime` (string)
- `location` (object)
- `notes` (string)

**Request Type Values:**
- `"car inspection"` (default)
- `"car valuation"`

**Response (201):**
```json
{
  "statusCode": 201,
  "message": "Inspection request created successfully",
  "data": {
    "request": {
      "id": "507f1f77bcf86cd799439040",
      "userId": "507f1f77bcf86cd799439011",
      "requestType": "car inspection",
      "vehicleInfo": {
        "make": "Toyota",
        "model": "Camry",
        "year": 2020,
        "vin": "4T1BF1FK5EU123456",
        "licensePlate": "ABC123",
        "mileage": 50000,
        "color": "Silver"
      },
      "preferredDate": "2024-01-20T10:00:00.000Z",
      "preferredTime": "10:00 AM",
      "location": {
        "address": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001"
      },
      "status": "pending",
      "notes": "Please inspect the vehicle thoroughly",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

---

### 5.2 Get User's Inspection Requests
**GET** `/api/inspection-requests`  
**GET** `/api/inspection-requests/me` *(logged-in user's requests)*

Use either path. **GET /api/inspection-requests/me** explicitly returns the **logged-in user's** inspection requests (same response shape and query params).

**Example:** `GET /api/inspection-requests/me?page=1&limit=10&status=pending&sortBy=createdAt&sortOrder=DESC`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10, max: 100) - Items per page
- `status` (optional) - Filter by status: `pending`, `assigned`, `in_progress`, `completed`, `cancelled`
- `sortBy` (optional, default: `createdAt`) - Sort field: `id`, `createdAt`, `preferredDate`, `status`
- `sortOrder` (optional, default: `DESC`) - Sort order: `ASC`, `DESC`

**Note:** 
- Users see only their own requests; admins see all when using GET /api/inspection-requests
- GET /api/inspection-requests/me always returns the current user's requests (same for users and admins — "my requests")

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Inspection requests retrieved successfully",
  "data": {
    "requests": [
      {
        "id": "507f1f77bcf86cd799439040",
        "requestType": "car inspection",
        "vehicleInfo": {
          "make": "Toyota",
          "model": "Camry",
          "year": 2020
        },
        "location": {
          "address": "123 Main Street",
          "city": "New York",
          "state": "NY"
        },
        "status": "pending",
        "assignedInspectorId": null,
        "preferredDate": "2024-01-20T10:00:00.000Z",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "limit": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "status": "pending",
      "sortBy": "createdAt",
      "sortOrder": "DESC"
    }
  }
}
```

---

### 5.3 Get Inspection Request by ID
**GET** `/api/inspection-requests/{id}`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Inspection request retrieved successfully",
  "data": {
    "request": {
      "id": "507f1f77bcf86cd799439040",
      "userId": {
        "id": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "Doe",
        "email": "user@example.com"
      },
      "requestType": "car inspection",
      "vehicleInfo": {
        "make": "Toyota",
        "model": "Camry",
        "year": 2020,
        "vin": "4T1BF1FK5EU123456",
        "licensePlate": "ABC123",
        "mileage": 50000,
        "color": "Silver"
      },
      "preferredDate": "2024-01-20T10:00:00.000Z",
      "preferredTime": "10:00 AM",
      "location": {
        "address": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001"
      },
      "status": "pending",
      "assignedInspectorId": null,
      "notes": "Please inspect the vehicle thoroughly",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Note:** Users can only view their own requests. Admins can view all requests.

---

### 5.3.1 Update Inspection Request (Edit Own Request)
**PUT** `/api/inspection-requests/{id}`

User can **edit their own** inspection request **only when status is pending**. Admin can edit any request when pending. Send at least one field to update.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (all fields optional; at least one required):**
```json
{
  "requestType": "car valuation",
  "vehicleInfo": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2021,
    "mileage": 45000
  },
  "preferredDate": "2024-02-01T10:00:00.000Z",
  "preferredTime": "2:00 PM",
  "location": {
    "address": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90001"
  },
  "notes": "Updated notes"
}
```

| Field | Type | Notes |
|-------|------|-------|
| requestType | string | `car inspection` or `car valuation` |
| vehicleInfo | object | Partial update (make, model, year, vin, licensePlate, mileage, color) |
| preferredDate | date | ISO date or null |
| preferredTime | string | Max 20 chars |
| location | object | address, city, state, zipCode (partial) |
| notes | string | Max 1000 chars |

**Response (200):** Same shape as Get by ID; returns the updated request.

**Errors:**
- **400** – Request can only be edited when status is pending (or validation failed).
- **403** – You can only edit your own inspection requests.
- **404** – Inspection request not found.

---

### 5.3.2 Assign Inspector to Request (Admin Only)
**PUT** `/api/inspection-requests/{id}/assign`

Assigns an inspector to a **pending** inspection request. Inspector must exist, have role=inspector, be active, and **is_assigned=false**. On success, request status becomes **assigned** and the inspector's **is_assigned** is set to true. Use **GET /api/inspectors/available** to list available inspectors first.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "inspectorId": "507f1f77bcf86cd799439012"
}
```

| Field | Type | Notes |
|-------|------|-------|
| inspectorId | string | Required. MongoDB ObjectId of the inspector (from available inspectors list). |

**Response (200):**
Same shape as Get inspection request by ID; returns the updated request with `status: "assigned"`, `assignedInspectorId`, and `assignedAt` set.

**Errors:**
- **400** – Inspector can only be assigned when request is pending; or inspector is already assigned / not active; or validation failed.
- **401** – Unauthorized.
- **403** – Only admins can assign inspectors.
- **404** – Inspection request or inspector not found.

---

### 5.3.3 Get Assigned Requests (Inspector Only)
**GET** `/api/inspection-requests/inspector/assigned?page=1&limit=10&status=assigned&sortBy=createdAt&sortOrder=DESC`

Get paginated list of inspection requests **assigned to the current inspector**. Inspector-only.

**Headers:**
```
Authorization: Bearer <inspector-token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10, max: 100) - Items per page
- `status` (optional) - Filter by status: `pending`, `assigned`, `in_progress`, `completed`, `cancelled`
- `sortBy` (optional, default: `createdAt`) - Sort field: `id`, `createdAt`, `preferredDate`, `status`
- `sortOrder` (optional, default: `DESC`) - Sort order: `ASC`, `DESC`

**Response (200):** Same shape as GET /api/inspection-requests (requests, pagination, filters).

**Errors:**
- **401** – Unauthorized.
- **403** – Forbidden (inspector only).

---

### 5.3.4 Approve Inspection Request (Admin Only)
**PUT** `/api/inspection-requests/{id}/approve`

Approve a **pending** inspection request. Sets `adminApprovedAt`. Request must be pending. Admin only.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):** Same shape as Get inspection request by ID; returns the updated request with `adminApprovedAt` set.

**Errors:**
- **400** – Request can only be approved when status is pending.
- **401** – Unauthorized.
- **403** – Only admins can approve requests.
- **404** – Inspection request not found.

---

### 5.3.5 Reject Inspection Request (Admin Only)
**PUT** `/api/inspection-requests/{id}/reject`

Reject an inspection request. Sets status to **cancelled**, `cancelledAt`, and optional `cancelledReason`. If an inspector was assigned, they are unassigned (`is_assigned=false`). Admin only.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body (optional):**
```json
{
  "reason": "Customer requested cancellation"
}
```

| Field | Type | Notes |
|-------|------|-------|
| reason | string | Optional. Max 500 chars. Cancellation reason. |

**Response (200):** Same shape as Get inspection request by ID; returns the updated request with `status: "cancelled"`, `cancelledAt`, `cancelledReason`.

**Errors:**
- **400** – Request is already cancelled.
- **401** – Unauthorized.
- **403** – Only admins can reject requests.
- **404** – Inspection request not found.

---

### 5.4 Get All Inspection Requests (Admin Only)
**GET** `/api/inspection-requests/admin/all?page=1&limit=10&status=pending&sortBy=createdAt&sortOrder=DESC`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10, max: 100) - Items per page
- `status` (optional) - Filter by status: `pending`, `assigned`, `in_progress`, `completed`, `cancelled`
- `sortBy` (optional, default: `createdAt`) - Sort field: `id`, `createdAt`, `preferredDate`, `status`
- `sortOrder` (optional, default: `DESC`) - Sort order: `ASC`, `DESC`

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Inspection requests retrieved successfully",
  "data": {
    "requests": [...],
    "statistics": {
      "total": 500,
      "pending": 45,
      "assigned": 30,
      "inProgress": 15,
      "completed": 400,
      "cancelled": 10
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 50,
      "totalCount": 500,
      "limit": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "status": "pending",
      "sortBy": "createdAt",
      "sortOrder": "DESC"
    }
  }
}
```

---

### 5.5 Upload – Inspection images and videos (S3 bucket: autoscopedev)

Inspection **photos** and **videos** are stored in the S3 bucket **autoscopedev** in **folders by inspection type** (Interior, Exterior, Engine, etc.) so media is organized as:

`uploads/inspections/{inspectionId}/{typeName}/photos/` or `.../videos/`

- **Photos and short videos:** use **presigned PUT** (single request). For videos we use a longer expiry (up to 4h) so 10+ min uploads have time.
- **Long videos (10+ min):** use **multipart upload** so the client uploads in chunks; the API only issues URLs and completes the upload. No large payload through Lambda, so it stays fast.

All upload endpoints require **Inspector or Admin**.

---

#### Get presigned upload URL (single PUT – photos or small videos)
**POST** `/api/upload/presigned-url`

Returns a presigned **PUT** URL and the **file URL**. Use for photos and small videos. Key path: `uploads/inspections/{inspectionId}/{typeName}/photos|videos/{uuid}-{fileName}`.

**Headers:** `Authorization: Bearer <inspector-or-admin-token>`

**Request Body:**
```json
{
  "inspectionId": "507f1f77bcf86cd799439011",
  "typeName": "Exterior",
  "fileName": "exterior-photo.jpg",
  "contentType": "image/jpeg",
  "mediaType": "photos",
  "expiresIn": 7200
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| inspectionId | string | Yes | Inspection document ID (max 50 chars) |
| typeName | string | Yes | One of: Exterior, Interior, Engine, Light Conditions and Operations, Transmission and Drivetrain, Chasis, Tyre and Breaks, Overall Safety Feature, Entertainment, Drive and Passenger Experience |
| fileName | string | Yes | Original filename (max 255 chars) |
| contentType | string | Yes | image/jpeg, image/png, image/gif, image/webp; or video/mp4, video/quicktime, video/webm |
| mediaType | string | No | `photos` or `videos`; default derived from contentType |
| expiresIn | number | No | 60–14400 sec. Default: 15 min (photos), 2 h (videos) |

**Response (200):** `data.uploadUrl`, `data.fileUrl`, `data.key`. PUT file to `uploadUrl`, then use `fileUrl` in inspection `photos`/`overallPhotos`/`videos`.

**Errors:** 400 (validation/typeName), 401, 403.

---

#### Multipart upload for large videos (10+ min)

Use multipart so the client uploads chunks directly to S3; the API only returns URLs and completes the upload. Saves time and avoids large payloads through Lambda.

**1. Init multipart upload**  
**POST** `/api/upload/multipart/init`

**Body:** `inspectionId`, `typeName`, `fileName`, `contentType` (video/mp4 | video/quicktime | video/webm).

**Response (200):** `data.uploadId`, `data.key`, `data.fileUrl`. Store `uploadId` and `key` for the next steps.

**2. Get part URL(s)**  
**POST** `/api/upload/multipart/part-urls`

**Body:** `key`, `uploadId`, `partNumbers` (e.g. `[1, 2, 3]`), optional `expiresIn`.

**Response (200):** `data.parts`: `[{ partNumber, uploadUrl }, ...]`. Client PUTs each part (5MB–5GB per part, except last). Capture the **ETag** from each part response.

**3. Complete multipart upload**  
**POST** `/api/upload/multipart/complete`

**Body:** `key`, `uploadId`, `parts`: `[{ partNumber, etag }]` (etag from step 2).

**Response (200):** `data.fileUrl` – use this in the inspection `videos` array.

**4. Abort (optional)**  
**POST** `/api/upload/multipart/abort`  
**Body:** `key`, `uploadId`. Call if the client cancels the upload.

**5. Delete image or video from S3**  
**POST** `/api/upload/delete`  

Remove a file from the bucket (Inspector or Admin). Send **either** the S3 **key** or the **fileUrl** (the URL stored in the inspection):

- **key** – S3 object key (e.g. `uploads/inspections/507f.../Exterior/photos/uuid-photo.jpg`)
- **fileUrl** – Full URL (e.g. `https://autoscopedev.s3.ap-south-1.amazonaws.com/uploads/inspections/.../photo.jpg`)

Only keys under `uploads/inspections/` can be deleted. After deleting from S3, update the inspection (PUT) and remove that URL from the relevant `photos`, `overallPhotos`, or `videos` array so the report no longer references it.

**Bucket:** S3_BUCKET env (default `autoscopedev`). Folders by type: `uploads/inspections/{inspectionId}/{typeName}/videos/`.

---

## 6. Admin Dashboard API

### 6.1 Get Admin Dashboard Data
**GET** `/api/admin/dashboard`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Admin dashboard data retrieved successfully",
  "data": {
    "total_users": 150,
    "total_inspectors": 25,
    "total_checklist_templates": 10,
    "user_role_stats": {
      "admin": 5,
      "inspector": 25,
      "user": 120
    },
    "inspection_requests": {
      "total_requests": 500,
      "open_requests": 45,
      "latest_requests": [
        {
          "request_id": "507f1f77bcf86cd799439040",
          "request_type": "car inspection",
          "request_location": "123 Main Street, New York, NY",
          "request_status": "Pending"
        },
        {
          "request_id": "507f1f77bcf86cd799439041",
          "request_type": "car valuation",
          "request_location": "456 Oak Ave, Los Angeles, CA",
          "request_status": "Assigned"
        }
      ]
    },
    "recent_activities": [
      {
        "action": "user_registered",
        "description": "John Doe (john@example.com) registered as user"
      },
      {
        "action": "inspection_request_created",
        "description": "New car inspection request created"
      },
      {
        "action": "inspection_completed",
        "description": "Jane Smith completed inspection for Toyota Camry"
      },
      {
        "action": "template_created",
        "description": "Admin User created checklist template: Standard Inspection"
      }
    ]
  }
}
```

**Response Fields:**
- `total_users`: Total number of users (excluding admin users)
- `total_inspectors`: Total number of inspectors
- `total_checklist_templates`: Total number of checklist templates
- `user_role_stats`: User count per role (`admin`, `inspector`, `user`)
- `inspection_requests.total_requests`: Total number of inspection requests
- `inspection_requests.open_requests`: Number of open requests (pending + assigned + in_progress)
- `inspection_requests.latest_requests`: Latest 10 requests with formatted data
- `recent_activities`: Up to 20 activities from the **last 24 hours** (user registrations, inspection requests, inspections completed, templates created), most recent first

**Request Status Values:**
- `Pending` - Request created, awaiting assignment
- `Assigned` - Request assigned to an inspector
- `In Progress` - Inspection in progress
- `Completed` - Inspection completed
- `Cancelled` - Request cancelled

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden - Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Resource already exists"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## Status Code Reference

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `500` - Internal Server Error

---

## Notes

1. **OTP Authentication (All Roles)**: 
   - All roles (`admin`, `inspector`, `user`) use **OTP-only authentication** (no password anywhere)
   - OTP is sent via email and is valid for 10 minutes
   - Use `POST /api/auth/login` (or `POST /api/auth/send-otp`) to receive an OTP, then `POST /api/auth/verify-otp` to get the JWT token

2. **Photo/Video URLs**: Currently, the API expects URLs/paths. You'll need to integrate with S3 or your storage service to upload files and get URLs.

3. **Rating Calculation**: Ratings are automatically calculated:
   - Per-type average: Average of all checklist item ratings in that type
   - Overall rating: Average of all type ratings

4. **Video Restrictions**: Videos are only allowed for `Interior` and `Exterior` types, maximum 2 per type.

5. **Status Values**: 
   - `Excellent` = 4
   - `Good` = 3
   - `Average` = 2
   - `Poor` = 1

6. **Inspection Status**:
   - `draft` - Can be updated/deleted
   - `completed` - Inspection is complete
   - `submitted` - Inspection has been submitted (final)

7. **Inspection Request Status**:
   - `pending` - Request created, awaiting assignment
   - `assigned` - Request assigned to an inspector
   - `in_progress` - Inspection in progress
   - `completed` - Inspection completed
   - `cancelled` - Request cancelled

8. **Request Types**:
   - `car inspection` - Standard car inspection request
   - `car valuation` - Car valuation request

9. **User List Filtering**: 
   - Admin users are excluded from GET `/api/users` by default
   - To see admin users, explicitly filter by `role=admin`

10. **Template Versioning**: Template version automatically increments when types are updated.
