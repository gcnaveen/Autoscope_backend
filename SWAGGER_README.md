# Swagger API Documentation

This project includes a complete Swagger/OpenAPI 3.0 specification for all API endpoints.

## Files

- `swagger.yaml` - OpenAPI 3.0 specification file
- `swagger.html` - Standalone HTML file with Swagger UI (can be opened directly in browser)

## Viewing the Documentation

### Option 1: Online Swagger Editor (Easiest)
1. Go to https://editor.swagger.io/
2. Click "File" → "Import file"
3. Select `swagger.yaml`
4. View and interact with the API documentation

### Option 2: Local HTML File (Simple)
1. Open `swagger.html` directly in your browser
   - **Note**: Some browsers may block loading local YAML files due to CORS
   - If it doesn't work, use Option 3 or 4

### Option 3: Using npm script (Recommended for Local)
```bash
npm run swagger
```
This will start a local HTTP server on port 8080 and open the Swagger UI in your browser.

### Option 4: Using Redoc (Beautiful Documentation)
```bash
npm run swagger:serve
```
This will start Redoc on port 8080 with a beautiful, responsive documentation view.

### Option 5: Using Python HTTP Server
```bash
# Python 3
python3 -m http.server 8080

# Then open in browser:
# http://localhost:8080/swagger.html
```

### Option 6: Import into Postman
1. Open Postman
2. Click "Import" button
3. Select `swagger.yaml` file
4. All endpoints will be imported with examples

### Option 7: Using Docker (if you have Docker)
```bash
docker run -p 8080:8080 -e SWAGGER_JSON=/swagger.yaml -v $(pwd):/usr/share/nginx/html/swagger -t swaggerapi/swagger-ui
```

## What's Included

The Swagger specification includes:
- ✅ All authentication endpoints (register, login, send-otp, verify-otp)
- ✅ All user management endpoints
- ✅ All checklist template endpoints
- ✅ All inspection endpoints
- ✅ All inspection request endpoints
- ✅ Admin dashboard endpoint
- ✅ Complete request/response schemas
- ✅ Query parameters and path parameters
- ✅ Error responses
- ✅ Security definitions (JWT Bearer token)
- ✅ Examples for all endpoints

## Notes

- The API uses **OTP-only authentication** for all roles (no passwords)
- All endpoints except register/login require JWT Bearer token
- The specification is fully compatible with OpenAPI 3.0.3 standard
