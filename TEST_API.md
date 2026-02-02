# API Testing Guide

## Base URL
```
https://6k651yup6b.execute-api.ap-south-1.amazonaws.com
```

## Test Your Deployed API

### 1. Register a New User
```bash
curl -X POST https://6k651yup6b.execute-api.ap-south-1.amazonaws.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### 2. Login
```bash
curl -X POST https://6k651yup6b.execute-api.ap-south-1.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

Save the token from the login response to use in the next requests.

### 3. Create User (Admin only)
```bash
curl -X POST https://6k651yup6b.execute-api.ap-south-1.amazonaws.com/api/users \
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

### 4. Get User by ID
```bash
curl -X GET https://6k651yup6b.execute-api.ap-south-1.amazonaws.com/api/users/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Update User
```bash
curl -X PUT https://6k651yup6b.execute-api.ap-south-1.amazonaws.com/api/users/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "firstName": "Updated Name",
    "phone": "+1234567890"
  }'
```

### 6. Block User (Admin only)
```bash
curl -X PUT https://6k651yup6b.execute-api.ap-south-1.amazonaws.com/api/users/2/block \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

### 7. Delete User (Admin only)
```bash
curl -X DELETE https://6k651yup6b.execute-api.ap-south-1.amazonaws.com/api/users/2 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
```

## Note on Database

⚠️ **Important**: Your Lambda functions are deployed, but they need to connect to a database. The database configuration in your `serverless.yml` currently points to localhost, which won't work in AWS Lambda.

For production, you'll need to:
1. Set up an AWS RDS MySQL database
2. Update environment variables in `serverless.yml` or use AWS Systems Manager Parameter Store
3. Configure VPC settings if the database is in a VPC
4. Update security groups to allow Lambda to connect to RDS

## Quick Database Setup Options

### Option 1: Update Environment Variables
Set database connection details in AWS Systems Manager Parameter Store or update serverless.yml with RDS endpoint.

### Option 2: Use AWS RDS
Create an RDS MySQL instance and update the DB_HOST environment variable to point to the RDS endpoint.

## View Logs

Check CloudWatch logs for your functions:
```bash
sls logs -f register --tail
sls logs -f login --tail
```
