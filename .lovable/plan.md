# Restore Data Visibility — Fix RLS Helper Function Grants

## Plain explanation

Your data is fine. All 3 users, 2 groups, 27 messages, and 3 admin roles still exist in the database.

The problem is that the database functions that RLS policies use to check "is this user a member of this group?" and "is this user an admin?" no longer have permission to run for logged-in users. So every read on `profiles`, `admin_roles`, `group_members`, `messages`, etc. fails with HTTP 403:

```
"permission denied for function is_member_of_group"
"permission denied for function is_global_admin"
```

I verified this directly against the database — `authenticated` and `anon` roles have `EXECUTE = false` on every helper function. A recent security migration revoked these grants without re-granting them.

The fix is one migration that grants `EXECUTE` on the helper functions back to `authenticated` (and `anon` where appropriate). No schema changes, no data changes, no code changes.

## What I will do

### Single SQL migration

Grant `EXECUTE` on the SECURITY DEFINER helper functions to the `authenticated` role:

- `public.is_member_of_group(uuid, uuid)`
- `public.is_global_admin(uuid)`
- `public.is_super_admin(uuid)`
- `public.is_group_admin(uuid, uuid)`
- `public.has_group_role(uuid, uuid, app_role)`
- `public.has_global_role(uuid, global_admin_role)`

These are `SECURITY DEFINER` with locked `search_path = public`, so granting EXECUTE is safe — they only read what they were designed to read.

### What I will NOT do

- No schema changes
- No RLS policy changes
- No data modification
- No frontend code changes (the queries in `useAdminRole`, `useGroups`, `useProfile`, etc. are correct — they just can't pass RLS right now)
- No new tables, no migrations to data

## Verification after applying

1. Sign in as `nakul@gmail.com`.
2. Confirm `GET /rest/v1/profiles?user_id=eq.<uid>` returns 200 with the profile row.
3. Confirm `GET /rest/v1/admin_roles?user_id=eq.<uid>` returns the `super_admin` row.
4. Confirm `GET /rest/v1/group_members?user_id=eq.<uid>` returns the 2 memberships.
5. Confirm groups list loads members and messages.
6. Confirm the Admin dashboard route is accessible.
