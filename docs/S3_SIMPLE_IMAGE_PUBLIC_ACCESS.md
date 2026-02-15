# S3 Simple Image Upload – Public Read (Fix GET 403)

Upload (PUT) works because we don’t use ACLs. **GET** on the file URL returns **403 Access Denied** until the bucket allows public read for that path.

Example URL that returns 403 without this policy:
`https://autoscopedev.s3.ap-south-1.amazonaws.com/uploads/images/...`

---

## Step 1: Add bucket policy

1. Open **AWS Console → S3 → bucket `autoscopedev`**.
2. Go to **Permissions**.
3. In **Bucket policy**, click **Edit**.
4. If there is existing JSON, add the new `Statement` inside the existing `"Statement": [ ... ]` array (don’t remove other statements). If the policy is empty, use the full policy below.

**Policy** – public read for both `uploads/inspections/*` and `uploads/images/*`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadInspectionMedia",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::autoscopedev/uploads/inspections/*"
    },
    {
      "Sid": "PublicReadSimpleImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::autoscopedev/uploads/images/*"
    }
  ]
}
```

5. Click **Save changes**.

---

## Step 2: Allow the policy (if Block Public Access is on)

1. On the same **Permissions** tab, find **Block public access (bucket settings)**.
2. Click **Edit**.
3. Uncheck: **Block public and cross-account access to buckets and objects through *any public bucket or access point policies***.
4. Save and confirm.

Only this one checkbox needs to be off so the bucket policy can grant public read. Other block options can stay on.

---

## Step 3: Test

Open this URL in a browser (or use the `fileUrl` from your upload response):

`https://autoscopedev.s3.ap-south-1.amazonaws.com/uploads/images/6dc85c83-1c55-4235-8be5-54c0ee477410-1770848991792_damages_1770848991791.png`

It should load the image instead of 403.
