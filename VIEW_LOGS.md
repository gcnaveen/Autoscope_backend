# How to View Lambda Logs

## Quick Commands

### View logs for specific function:
```bash
sls logs -f register --tail
sls logs -f login --tail
sls logs -f createUser --tail
sls logs -f getAllUsers --tail
```

### View all logs:
```bash
sls logs --tail
```

### View logs for specific stage:
```bash
sls logs --stage dev --tail
```

### View last 50 log entries:
```bash
sls logs -f register --tail 50
```

## Function Names (use with -f flag):
- `register`
- `login`
- `getAllUsers`
- `createUser`
- `getUserById`
- `updateUser`
- `blockUser`
- `deleteUser`

## Common Errors to Look For:
- **Database connection errors**: Check MongoDB connection string
- **Authentication errors**: Check JWT token validity
- **Validation errors**: Check request body format
- **Permission errors**: Check user roles

