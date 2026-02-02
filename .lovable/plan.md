
# Profile Image Upload Fix Plan

## Problem Analysis

After reviewing the codebase, I found:

1. **Storage Configuration**: The `profile-images` bucket exists and is properly configured as public with correct RLS policies
2. **Authentication Issue**: Console logs show "Invalid Refresh Token: Refresh Token Not Found" - the user's session may have expired
3. **Code Logic**: The upload logic in `AvatarUploader.tsx` and `useProfileImages.ts` is correct
4. **Potential Issues**: 
   - The Profile page redirects to `/auth` when user is null, but doesn't wait for auth to initialize
   - The auth state may not be properly synchronized before rendering

## Implementation Steps

### Step 1: Fix Authentication State Loading in Profile Page
The Profile page currently redirects immediately if `user` is null, but should wait for auth to fully initialize first.

**Changes to `src/pages/Profile.tsx`:**
- Add auth loading state check from `useAuth`
- Show loading spinner while auth is initializing
- Only redirect after confirming user is truly not authenticated

### Step 2: Enhance useAuth Hook Error Handling
Improve the auth hook to better handle session refresh errors and provide loading state.

**Changes to `src/hooks/useAuth.ts`:**
- Add `initializing` state to distinguish between "loading" and "not authenticated"
- Handle refresh token errors gracefully by clearing invalid sessions
- Ensure proper session recovery

### Step 3: Add Error Boundary for Upload Failures
Add better error handling in the avatar uploader for network failures.

**Changes to `src/components/profile/AvatarUploader.tsx`:**
- Add retry logic for failed uploads
- Show more descriptive error messages
- Ensure preview is cleared on upload failure

### Step 4: Sync Gallery Upload Validation
Ensure the gallery accepts the same file types as the avatar uploader.

**Changes to `src/components/profile/ProfileImagesGallery.tsx`:**
- Change `accept` attribute to match AvatarUploader (remove webp, keep jpg/png/gif)
- Ensure consistent validation

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Profile.tsx` | Add auth loading check before redirect |
| `src/hooks/useAuth.ts` | Add initializing state, handle refresh errors |
| `src/components/profile/AvatarUploader.tsx` | Minor error handling improvements |
| `src/components/profile/ProfileImagesGallery.tsx` | Align file type acceptance |

## Technical Details

### Authentication Flow Fix
```text
Current Flow:
User visits /profile → useAuth returns null → Immediate redirect to /auth

Fixed Flow:
User visits /profile → Check if auth is initializing → Show loader → 
  If initialized & no user → Redirect to /auth
  If initialized & user exists → Show profile page
```

### File Validation (Consistent Across Components)
- Max size: 5MB
- Accepted types: JPG, PNG, GIF
- Circular display in 24x24 (96px) frame
- Cache-busting for immediate preview updates

## Expected Outcome
- Profile page waits for authentication to initialize before redirecting
- Users can upload profile images without session errors
- Images display immediately after upload with cache-busting
- Remove button deletes images from both storage and database
- Copy Profile Link works with 2-second toast notification
- All functionality works reliably across browsers
