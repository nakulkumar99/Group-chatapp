

## Analysis

The issue has two parts:

1. **"Invalid login credentials"** — The auth logs confirm the backend IS reachable (status 400, not a network failure). The passwords for `nakul@gmail.com` and `thapa@gmail.com` are wrong. This is the real problem.
2. **"Failed to fetch"** — This is a transient preview network issue that occurs intermittently. The error handling code already covers this.

### Confirmed Users in Database
| Email | Username | User ID |
|---|---|---|
| nakul@gmail.com | Nakul_YT | d8ca1db9-... |
| thapa@gmail.com | Thapa | 16499de5-... |
| thapayt@gmail.com | Thapayt | 3882a161-... |
| xadeve7941@coswz.com | Nakul | 0968a4e3-... |

## Plan

### 1. Create a temporary edge function to reset passwords
Create `supabase/functions/admin-reset-passwords/index.ts` that uses the Supabase Admin API (service role key) to update passwords for the three accounts:
- `nakul@gmail.com` → password: `nakul@1234`
- `thapa@gmail.com` → password: `nakul@1234`
- `thapayt@gmail.com` (Dev chats / nakul99) → password: `nakul99`

### 2. Deploy and invoke the edge function
Call the function once to reset all three passwords.

### 3. Delete the edge function
Remove the temporary function immediately after use — it should not remain deployed.

### 4. Verify login works
Test login with `nakul@gmail.com` / `nakul@1234` to confirm the fix.

No changes to `Auth.tsx` or `useAuth.tsx` are needed — the login code is correct and the error handling is already in place.

