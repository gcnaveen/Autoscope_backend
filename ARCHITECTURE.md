# Architecture Documentation

## Overview

This is a production-grade serverless API built with AWS Lambda, following enterprise-level best practices and clean architecture principles.

## Architecture Pattern

The application follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         Lambda Handlers Layer           │  ← HTTP entry points
│      (Request/Response handling)        │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│        Controllers Layer                 │  ← HTTP request/response logic
│   (Coordinate between handlers/services)│
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         Services Layer                   │  ← Business logic
│    (Domain logic, transactions)          │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│         Models Layer                     │  ← Data access
│      (Database models/ORM)               │
└─────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── config/          # Configuration files (database, constants)
├── controllers/     # Request/response coordination
├── handlers/        # Lambda function handlers (entry points)
├── middleware/      # Authentication, validation middleware
├── models/          # Database models (Sequelize)
├── services/        # Business logic layer
└── utils/           # Utilities (errors, logger, response, sanitize)
```

## Key Components

### 1. Handlers (`src/handlers/`)
- **Purpose**: Lambda function entry points
- **Responsibilities**:
  - Initialize database connections
  - Extract request data (body, params, headers)
  - Call controllers
  - Use `asyncHandler` for error handling

### 2. Controllers (`src/controllers/`)
- **Purpose**: HTTP request/response coordination
- **Responsibilities**:
  - Call service layer methods
  - Format responses using response utilities
  - Handle HTTP-specific concerns

### 3. Services (`src/services/`)
- **Purpose**: Business logic layer
- **Responsibilities**:
  - Implement domain logic
  - Handle transactions
  - Throw domain-specific errors
  - Interact with models

### 4. Models (`src/models/`)
- **Purpose**: Data access layer
- **Responsibilities**:
  - Define database schema
  - Provide model methods
  - Handle data validation at model level

### 5. Middleware (`src/middleware/`)
- **Purpose**: Cross-cutting concerns
- **Components**:
  - **auth.js**: JWT authentication and authorization
  - **validator.js**: Request validation using Joi

### 6. Utilities (`src/utils/`)
- **errors.js**: Custom error classes
- **logger.js**: Structured logging
- **response.js**: Standardized API responses
- **sanitize.js**: Input sanitization
- **asyncHandler.js**: Error handling wrapper

## Design Principles

### 1. Separation of Concerns
Each layer has a single, well-defined responsibility.

### 2. Dependency Injection
Services are instantiated and exported as singletons, making them easily testable.

### 3. Error Handling
- Custom error classes for different error types
- Centralized error handling via `asyncHandler`
- Structured error responses

### 4. Transaction Management
Critical operations use database transactions for data consistency.

### 5. Input Validation & Sanitization
- Joi schemas for validation
- Input sanitization to prevent XSS and injection attacks
- Validation errors returned with clear messages

### 6. Security
- Password hashing with bcrypt
- JWT token-based authentication
- Role-based access control (RBAC)
- Input sanitization
- SQL injection protection via ORM

### 7. Logging
- Structured logging with metadata
- Different log levels (error, warn, info, debug)
- JSON format in production for log aggregation

### 8. Response Formatting
- Consistent API response structure
- Success/error response utilities
- Proper HTTP status codes

## Error Handling Flow

```
Handler → asyncHandler → Controller → Service → Model
                           ↓
                      Error thrown
                           ↓
                    asyncHandler catches
                           ↓
                   Error type identified
                           ↓
              Appropriate error response
```

## Authentication & Authorization

### Authentication Flow
1. User sends credentials (login/register)
2. Token generated and returned
3. Subsequent requests include token in `Authorization: Bearer <token>` header
4. Middleware verifies token and loads user

### Authorization
- Role-based access control (RBAC)
- Three roles: `admin`, `inspector`, `user`
- Middleware checks roles before allowing access

## Database Connection Management

- Connection pooling configured for optimal performance
- Warm start optimization: connections reused across Lambda invocations
- Transaction support for critical operations

## Code Quality Standards

1. **JSDoc Comments**: All functions have JSDoc documentation
2. **Consistent Naming**: Clear, descriptive names
3. **Error Handling**: Comprehensive error handling at all levels
4. **Type Safety**: Input validation ensures type safety
5. **Single Responsibility**: Each function has one clear purpose
6. **DRY Principle**: Reusable utilities and services
7. **SOLID Principles**: Especially Single Responsibility and Dependency Inversion

## Testing Strategy (Recommended)

1. **Unit Tests**: Service layer and utilities
2. **Integration Tests**: API endpoints with test database
3. **E2E Tests**: Full user flows

## Performance Considerations

1. **Database Connection Pooling**: Reuse connections
2. **Warm Start Optimization**: Cache database connections
3. **Transaction Management**: Minimize transaction scope
4. **Indexed Queries**: Database indexes on frequently queried fields
5. **Response Compression**: Can be enabled at API Gateway level

## Security Considerations

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Secure token generation and verification
3. **Input Sanitization**: Prevent XSS and injection attacks
4. **SQL Injection Protection**: ORM parameterized queries
5. **CORS Configuration**: Appropriate CORS headers
6. **Environment Variables**: Sensitive data in environment variables
7. **Error Messages**: No sensitive data in error responses

## Scalability

- Serverless architecture scales automatically
- Database connection pooling handles concurrent requests
- Stateless design allows horizontal scaling
- Consider RDS Proxy for production use with high concurrency
