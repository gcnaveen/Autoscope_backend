# AWS Credentials Setup Guide

## Quick Setup (Using Environment Variables)

Set these environment variables in your terminal:

```bash
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
export AWS_DEFAULT_REGION=ap-south-1
```

Then deploy:
```bash
sls deploy
```

## Permanent Setup (Using AWS Credentials File)

### Step 1: Create AWS credentials directory
```bash
mkdir -p ~/.aws
```

### Step 2: Create credentials file
```bash
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF
```

### Step 3: Create config file
```bash
cat > ~/.aws/config << EOF
[default]
region = ap-south-1
output = json
EOF
```

### Step 4: Set proper permissions
```bash
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config
```

## Getting AWS Credentials

1. Log in to AWS Console
2. Go to IAM (Identity and Access Management)
3. Click "Users" → Your user → "Security credentials" tab
4. Click "Create access key"
5. Choose "Command Line Interface (CLI)"
6. Copy the Access Key ID and Secret Access Key

**⚠️ Important Security Notes:**
- Never commit credentials to Git
- Never share credentials publicly
- Use IAM users with minimal required permissions
- Rotate credentials regularly
- Consider using AWS IAM roles for production

## Verify Credentials

Test your credentials:
```bash
aws sts get-caller-identity
```

This should return your AWS account information if credentials are set up correctly.
