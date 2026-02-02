# Quick Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Database

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=car_inspection_db
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

## 3. Create MySQL Database

```bash
mysql -u root -p
CREATE DATABASE car_inspection_db;
```

## 4. Initialize Database Tables

```bash
npm run init-db
```

This will create all necessary tables (users table).

## 5. Run Locally (Optional)

```bash
npm run dev
```

## 6. Deploy to AWS

```bash
npm run deploy:dev
```

## API Endpoints Summary

### Public Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Protected Endpoints (Require Bearer Token)
- `POST /api/users` - Create user (Admin only)
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user
- `PUT /api/users/{id}/block` - Block user (Admin only)
- `DELETE /api/users/{id}` - Delete user (Admin only)

## Testing with cURL

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Create User (Admin)
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "email": "inspector@example.com",
    "password": "password123",
    "firstName": "Inspector",
    "lastName": "User",
    "role": "inspector"
  }'
```

## User Roles

- **admin**: Full access to all endpoints
- **inspector**: Can perform inspections (to be implemented)
- **user**: Basic user access, can manage own profile
