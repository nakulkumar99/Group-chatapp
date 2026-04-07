

## Plan: Fix Key Icon Visibility, Clean Stale Finding, Enable HIBP

### Problem Analysis

1. **Key icon not visible**: The "DEV Chats" group has `has_password: true` and the super admin exists, but the group has **zero members**. The key icon in `GroupCard.tsx` is rendered inside the `isMember` conditional block (line 123), so it never appears for non-members — including super admins.

2. **"Group passwords stored in plaintext" finding**: This is a stale scanner entry. Passwords are already hashed via bcrypt in the `set-group-password` and `join-group-with-password` edge functions. The finding needs to be deleted.

3. **Leaked Password Protection (HIBP)**: This is a platform-level toggle. You need to manually enable it: go to **Cloud → Users → Auth Settings (gear icon) → Email settings → activate Password HIBP Check**.

### Changes

#### 1. Update `src/components/GroupCard.tsx`
Move the key icon button outside the `isMember` conditional so super admins can see and use it on any password-protected group, whether they are a member or not.

Current structure:
```
{isMember ? (
  <div>
    {isSuperAdmin && hasPassword && <KeyRound button />}
    <Joined badge>
    <Leave button>
  </div>
) : (
  <Join button>
)}
```

New structure:
```
<div className="flex items-center gap-2">
  {isSuperAdmin && hasPassword && <KeyRound button />}
  {isMember ? (
    <>
      <Joined badge>
      <Leave button>
    </>
  ) : (
    <Join button>
  )}
</div>
```

#### 2. Delete stale security finding
Delete `plaintext_group_pass` — already resolved via bcrypt hashing in edge functions.

#### 3. Manual action: Enable HIBP
Navigate to **Cloud → Users → Auth Settings → Email → Password HIBP Check** and activate it.

### Files Modified
- `src/components/GroupCard.tsx` (move key icon outside membership check)

