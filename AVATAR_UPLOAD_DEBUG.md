# Avatar Upload Error Handling - Debugging Guide

## Recent Improvements

### 1. Enhanced Backend Error Handling (`/app/api/users/avatar/route.ts`)
- Added detailed logging with `[Avatar API]` prefix for easy tracking in console
- Implemented `createErrorResponse` helper function for consistent error responses
- Added try-catch blocks around all file system operations:
  - Form data parsing
  - Image tag validation
  - Directory creation
  - File writing
  - Database operations
- Every error path now returns proper JSON with both `error` and `details` fields

### 2. Improved Frontend Error Handling (`/app/(dashboard)/profile/page.tsx`)
- Added error response parsing fallback:
  - First tries to parse JSON
  - If JSON parsing fails, reads response text
  - Falls back to HTTP status code and text
- Better error messages displayed to users
- Comprehensive console logging for debugging

### 3. File System Safety
- Filename extension are sanitized to lowercase alphanumeric only
- userId in filename is sanitized to prevent special characters
- Invalid extensions default to 'jpg'

## Common Issues and Solutions

### Issue: "Avatar upload error response: {}"
**Cause:** API returned error status but empty JSON body

**Solutions:**
1. Check browser DevTools Network tab for the actual response
2. Look for `[Avatar API]` logs in server console
3. Verify userId is being passed correctly
4. Check file permissions on `/public/avatars/` directory

### Issue: "Database update failed to persist"
**Cause:** Avatar record was not saved to database

**Solutions:**
1. Verify database connection is working
2. Check database logs for errors
3. Ensure user exists in database
4. Check file was actually written before database update

### Issue: "Failed to save file"
**Cause:** File system operation failed

**Solutions:**
1. Check `/public/avatars/` directory permissions (should be writable)
2. Verify free disk space
3. Check if file path is too long (Windows has 260 char limit)
4. Ensure userId doesn't contain invalid characters

### Issue: "File must be an image"
**Solutions:**
1. Verify uploaded file has proper MIME type
2. Browser might not detect MIME correctly - check file extension
3. Some formats like WebP might not be in browser's supported types

## Debugging Steps

### Step 1: Check Browser Console
Look for `[Avatar API]` prefixed logs showing:
- Request started for userId
- File received with name and size
- User exists check result
- File saved successfully message
- Database update attempts

### Step 2: Check Server Console
Run `npm run dev` and watch for detailed logging showing each step

### Step 3: Check Network Tab
1. Open DevTools → Network
2. Upload avatar
3. Find request to `/api/users/avatar?userId=...`
4. Check:
   - Status code (should be 200 for success)
   - Response headers
   - Response body (should have `error` and `details` fields on errors)

### Step 4: Verify File Storage
Check if file exists in `/public/avatars/` directory after upload attempt

### Step 5: Test with Different Files
Try uploading:
- Small PNG file (< 1MB)
- Small JPG file
- Verify each works or see which fails

## Expected Success Flow

```
1. [Avatar API] Request started for userId: {uuid}
2. [Avatar API] File received: filename.jpg ({bytes} bytes)
3. [Avatar API] Checking if user exists...
4. [Avatar API] User exists check: true
5. [Avatar API] Generating filename...
6. [Avatar API] Saving file to: {path}
7. [Avatar API] File extension: jpg
8. [Avatar API] Creating/verifying avatars directory...
9. [Avatar API] Avatar directory created/verified
10. [Avatar API] Converting file to buffer...
11. [Avatar API] Writing file to disk...
12. [Avatar API] File saved successfully, size: {bytes} bytes
13. [Avatar API] Generated avatar URL: /avatars/{filename}
14. [Avatar API] Updating user avatar in database...
15. [Avatar API] Database update result: {result}
16. [Avatar API] Verifying update...
17. [Avatar API] User after update, avatar: /avatars/{filename}
18. [Avatar API] Avatar upload completed successfully
```

## Environmental Checks

### Windows Users
- Check `/public/avatars/` directory exists and has write permissions
- File paths are limited to 260 characters - watch for path errors
- Ensure no permission issues with `/public` folder

### Linux/Mac Users
- Check directory permissions: `chmod 755 public/avatars`
- Ensure running process has write access: `whoami`
- Check disk space: `df -h`

## Additional Debugging

### Enable Development Mode Errors
- Set `NODE_ENV=development` to see error stack traces
- Error responses will include `stack` field with full trace

### Check Database State
After upload attempt, verify:
```sql
SELECT id, email, avatar, updatedAt FROM users WHERE id = {userId};
```

Should show the `/avatars/{filename}` path if upload succeeded

### Direct API Test
Use curl or Postman to test manually:
```bash
curl -X POST "http://localhost:3000/api/users/avatar?userId={uuid}" \
  -F "avatar=@/path/to/image.jpg"
```

## Performance Notes

- Max file size: 5MB
- Supported formats: All image/* MIME types (JPG, PNG, WebP, GIF, etc.)
- File storage: Local file system (consider cloud storage for production)
- Database update: Immediate, no async queue

