

## Analysis

The console logs and network requests show that all authentication requests (sign in and sign up) to the backend are failing with `"Failed to fetch"` errors. This is a **network connectivity issue** -- the backend service appears to be temporarily unreachable or paused. The code itself is structurally correct.

However, the current error handling can be improved to give users a clearer message when network failures occur, instead of the generic "An unexpected error occurred."

## Root Cause

The requests to `https://ngllrhdgxtknqgwsvmaq.supabase.co/auth/v1/token` and `/auth/v1/signup` are failing at the browser's `fetch()` level, meaning the server is not responding. This is **not a code bug** -- it is a backend availability issue.

## Plan

### 1. Improve network error handling in `src/hooks/useAuth.tsx`
- Wrap `signUp` and `signIn` calls in try/catch blocks
- Detect `TypeError: Failed to fetch` and return a user-friendly error message like "Network error. Please check your connection and try again."
- Return `{ error }` instead of letting the exception propagate

### 2. Improve error display in `src/pages/Auth.tsx`
- Update the catch block to detect network-related errors specifically
- Show a distinct toast message for network failures vs other unexpected errors

These changes will ensure the user sees a clear, actionable error message instead of a generic one when the backend is unreachable.

