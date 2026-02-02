# Get All Users API Documentation

## Endpoint
`GET /api/users`

## Description
Retrieves a paginated list of all users with search and filtering capabilities. **Admin only**.

## Authentication
Requires Bearer token with `admin` role.

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number (minimum: 1) |
| `limit` | number | No | 10 | Number of items per page (min: 1, max: 100) |
| `search` | string | No | - | Search query to filter by email, firstName, lastName, or phone |
| `role` | string | No | - | Filter by role: `admin`, `inspector`, or `user` |
| `status` | string | No | - | Filter by status: `active`, `blocked`, or `inactive` |
| `sortBy` | string | No | `id` | Sort field: `id`, `email`, `firstName`, `lastName`, `role`, `status`, or `createdAt` |
| `sortOrder` | string | No | `DESC` | Sort order: `ASC` or `DESC` |

## Request Example

```bash
curl -X GET "https://YOUR_API_URL/api/users?page=1&limit=20&search=john&role=user&status=active&sortBy=createdAt&sortOrder=DESC" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Response Structure

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "user",
        "status": "active",
        "phone": "+1234567890",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
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
      "role": "user",
      "status": "active",
      "sortBy": "createdAt",
      "sortOrder": "DESC"
    }
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

#### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Query parameter validation failed",
  "errors": [
    {
      "field": "limit",
      "message": "Limit cannot exceed 100"
    }
  ]
}
```

## Usage Examples

### Basic List (Default)
```bash
GET /api/users
```
Returns first 10 users, sorted by ID descending.

### With Pagination
```bash
GET /api/users?page=2&limit=25
```
Returns page 2 with 25 users per page.

### With Search
```bash
GET /api/users?search=john
```
Searches for users with "john" in email, firstName, lastName, or phone.

### With Filters
```bash
GET /api/users?role=inspector&status=active
```
Filters users by role and status.

### Combined Filters
```bash
GET /api/users?page=1&limit=20&search=admin&role=admin&status=active&sortBy=email&sortOrder=ASC
```
Combines pagination, search, filters, and sorting.

## Features

✅ **Pagination**: Efficient offset-based pagination
✅ **Search**: Multi-field search (email, firstName, lastName, phone)
✅ **Filtering**: Filter by role and status
✅ **Sorting**: Sort by multiple fields in ASC/DESC order
✅ **Security**: Admin-only access, passwords excluded from results
✅ **Validation**: Comprehensive query parameter validation
✅ **Performance**: Optimized database queries using Sequelize
✅ **Metadata**: Complete pagination metadata (currentPage, totalPages, hasNextPage, etc.)

## Implementation Details

- **Service Layer**: Business logic in `src/services/userService.js`
- **Controller Layer**: HTTP coordination in `src/controllers/userController.js`
- **Handler Layer**: Lambda handler in `src/handlers/userHandler.js`
- **Validation**: Joi schema validation in `src/middleware/validator.js`
- **Query Parsing**: Utility in `src/utils/queryParams.js`
- **Error Handling**: Custom error classes with proper HTTP status codes
- **Security**: Passwords automatically excluded from results

