# Car Inspection Management System - Serverless API

A **production-grade, enterprise-level** serverless API built with AWS Lambda, Serverless Framework, MongoDB, and Node.js. Features clean architecture, comprehensive error handling, and industry best practices.

## ✨ Key Features

- 🏗️ **Clean Architecture**: Layered architecture with separation of concerns (Handlers → Controllers → Services → Models)
- 🔐 **JWT-based Authentication**: Secure token-based authentication
- 👥 **Role-based Access Control**: Three roles (Admin, Inspector, User) with granular permissions
- 🗄️ **MongoDB Database**: Mongoose ODM with connection pooling and optimized queries
- 📝 **User Management**: Full CRUD operations (Create, Read, Update, Delete, Block)
- ✅ **Input Validation**: Comprehensive validation using Joi schemas
- 🧹 **Input Sanitization**: XSS and injection attack prevention
- 🛡️ **Security**: Password hashing, JWT tokens, RBAC, input sanitization
- 📊 **Structured Logging**: JSON-formatted logs with metadata for production
- ⚠️ **Error Handling**: Custom error classes with proper HTTP status codes
- 🔄 **Transaction Support**: Database transactions for data consistency
- 📦 **Production-ready**: Enterprise-level code quality and best practices

## Prerequisites

- Node.js 20.x or higher
- MongoDB 4.4 or higher (for local development) OR MongoDB Atlas account (for cloud)
- AWS CLI configured (for deployment)
- Serverless Framework installed globally: `npm install -g serverless`

## Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` file with your MongoDB connection string:
```env
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/car_inspection_db

# For MongoDB Atlas (Cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/car_inspection_db?retryWrites=true&w=majority

JWT_SECRET=your-super-secret-jwt-key
```

4. Start MongoDB (if running locally):
```bash
# macOS (using Homebrew):
brew services start mongodb-community

# Or using Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Database Setup

MongoDB creates collections automatically when you insert data. No manual table/collection creation is required. The database will be created automatically when you first register a user or create data through the API.

## API Endpoints

### Authentication (Public)

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### User Management

- `POST /api/users` - Create user (Admin only)
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user (Admin can update anyone, users can update themselves)
- `PUT /api/users/{id}/block` - Block user (Admin only)
- `DELETE /api/users/{id}` - Delete user (Admin only)

## Request/Response Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "user"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Create User (Admin only)
```bash
POST /api/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "inspector@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "inspector"
}
```

### Update User
```bash
PUT /api/users/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Updated Name",
  "phone": "+9876543210"
}
```

## User Roles

- **admin**: Full access to all endpoints
- **inspector**: Can perform inspections (to be implemented)
- **user**: Basic user access, can manage own profile

## Local Development

Run the serverless offline plugin for local development:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Deployment

Deploy to AWS Lambda:

```bash
# Deploy to dev environment
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

## Environment Variables

For production, set environment variables in your deployment pipeline or AWS Systems Manager Parameter Store.

## Project Structure

```
.
├── src/
│   ├── config/          # Configuration (database, constants)
│   ├── controllers/     # Request/response coordination
│   ├── handlers/        # Lambda function handlers (entry points)
│   ├── middleware/      # Authentication, validation
│   ├── models/          # Database models (Mongoose)
│   ├── services/        # Business logic layer
│   └── utils/           # Utilities (errors, logger, response, sanitize)
├── scripts/             # Utility scripts
├── serverless.yml       # Serverless Framework configuration
└── package.json         # Dependencies
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Security Notes

- Passwords are hashed using bcryptjs
- JWT tokens are used for authentication
- Role-based access control implemented
- Input validation on all endpoints
- CORS enabled for API Gateway

## License

ISC
