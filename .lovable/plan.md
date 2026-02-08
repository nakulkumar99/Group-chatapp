

## Add Nakul as Super Admin

### Summary
Create admin privileges for user **Nakul** (nakul@gmail.com) by inserting a record into the `admin_roles` table.

### User Details Found
| Field | Value |
|-------|-------|
| Email | nakul@gmail.com |
| Username | Nakul |
| User ID | abab238a-8f86-4de3-b049-01a03f1fab1b |

### Implementation

**Database Migration:**
Insert a new record into the `admin_roles` table with role `super_admin`:

```sql
INSERT INTO admin_roles (user_id, role)
VALUES ('abab238a-8f86-4de3-b049-01a03f1fab1b', 'super_admin');
```

### Result
After this migration, Nakul will have full super admin privileges including:
- Access to the Admin Dashboard (`/admin`)
- Ability to manage all users
- Ability to manage all groups
- Ability to moderate content
- Ability to assign admin roles to other users
- Full audit log access

### File Changes
- Add: `supabase/migrations/<timestamp>_add_nakul_super_admin.sql`

