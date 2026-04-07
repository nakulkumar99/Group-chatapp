

## Plan: Resolve All Security Scan Findings

### Current State Analysis

After verifying the actual database policies, most error-level findings are **already fixed** but appear as stale entries in the scanner. Here's the true status:

| Finding | Level | Actual Status |
|---------|-------|---------------|
| Message UPDATE group injection | error | **Already fixed** — WITH CHECK uses `is_member_of_group()` |
| Realtime channel authorization | error | **Cannot fix** — `realtime` is a reserved Supabase schema |
| Plaintext group passwords | error | **Already fixed** — bcrypt hashing in edge functions |
| Admin role self-escalation | error | **Already fixed** — WITH CHECK prevents non-super-admin escalation |
| Groups visible to all users | warn | **Intentional** — app has "Discover" tab for group browsing |
| Missing storage UPDATE policy | warn | **Needs fix** — no UPDATE policy on chat-attachments |
| Leaked Password Protection | warn | **Manual action** — platform-level setting |
| Group enumeration | warn | **Intentional** — same as groups visibility (Discover feature) |

### Changes

#### 1. Database Migration: Add UPDATE policy for chat-attachments storage bucket
- Add an owner-scoped UPDATE policy so file owners can update their own attachments:
```sql
CREATE POLICY "File owners can update chat attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### 2. Clean Up Stale/Resolved Security Findings
- **Delete** `msg_update_group_inject` — verified fixed in DB
- **Delete** `plaintext_group_pass` — verified bcrypt is used
- **Delete** `user_roles_admin_escalation` — verified WITH CHECK prevents escalation
- **Ignore** `groups_table_all_authenticated` — intentional for Discover tab
- **Ignore** `groups_all_authenticated_enumerate` — intentional for Discover tab
- **Ignore** `chat_attachments_missing_update_policy` — after adding the policy, delete this finding
- **Ignore** `SUPA_auth_leaked_password_protection` — requires manual dashboard toggle (Cloud → Users → Auth Settings → Email → Password HIBP Check)

### Files Modified
- 1 new database migration (storage UPDATE policy)
- Security finding management (cleanup stale entries)

### Manual Action Required
Enable **Leaked Password Protection** in Cloud → Users → Auth Settings → Email settings → activate the Password HIBP Check switch.

