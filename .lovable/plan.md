

## Plan: Fix "Failed to fetch memberships" — Recursive RLS on `group_members`

### Root Cause

The `group_members` SELECT RLS policy references the `group_members` table itself in a subquery:

```sql
USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()))
```

This creates **recursive RLS evaluation** in PostgreSQL — the subquery on `group_members` also triggers the same policy, causing the query to fail. This also cascades to `messages`, `message_reads`, `message_reactions`, and `pinned_messages` tables whose policies reference `group_members` via subqueries (those subqueries are also subject to `group_members` RLS).

### Fix

#### 1. Database Migration

Create a `SECURITY DEFINER` function that checks group membership without going through RLS:

```sql
CREATE OR REPLACE FUNCTION public.is_member_of_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;
```

Then replace the self-referencing `group_members` SELECT policy:

```sql
DROP POLICY "Members can view their own groups members" ON public.group_members;

CREATE POLICY "Members can view their own groups members"
ON public.group_members FOR SELECT TO authenticated
USING (public.is_member_of_group(auth.uid(), group_id));
```

#### 2. No frontend code changes needed

The hooks (`useGroups`, `useMessages`, `useGroupMembers`, etc.) are correct. The issue is entirely at the database RLS level.

### Files Modified
- 1 new database migration (SQL only)

