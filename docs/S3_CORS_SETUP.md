# S3 CORS setup for browser uploads

If you get **"Failed to fetch"** or **"ClientException"** when uploading to the presigned URL from a browser or mobile app, the S3 bucket must allow your origin via CORS.

## Apply CORS to your bucket

1. Open **AWS Console** → **S3** → bucket `autoscopedev` (or your `S3_BUCKET`).
2. Go to the **Permissions** tab.
3. Scroll to **Cross-origin resource sharing (CORS)** and edit.
4. Use a configuration like below (replace `https://your-app.com` with your front-end origin, or use `*` for testing only):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

For production, restrict origins, for example:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["https://your-app.com", "https://www.your-app.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Save. After a short delay, browser uploads to the presigned URL should work.

## Using AWS CLI

```bash
aws s3api put-bucket-cors --bucket autoscopedev --cors-configuration file://docs/s3-cors-config.json
```
