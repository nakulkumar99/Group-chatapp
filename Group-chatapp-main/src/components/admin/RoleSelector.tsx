import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type GlobalAdminRole = "super_admin" | "admin" | "moderator";

interface RoleSelectorProps {
  currentRole: GlobalAdminRole | null;
  onRoleChange: (role: GlobalAdminRole | null) => void;
}

const roleLabels: Record<GlobalAdminRole | "user", string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
  user: "User",
};

const roleColors: Record<GlobalAdminRole | "user", "destructive" | "default" | "secondary" | "outline"> = {
  super_admin: "destructive",
  admin: "default",
  moderator: "secondary",
  user: "outline",
};

export function RoleSelector({ currentRole, onRoleChange }: RoleSelectorProps) {
  const displayRole = currentRole || "user";

  return (
    <Select
      value={displayRole}
      onValueChange={(value) => {
        if (value === "user") {
          onRoleChange(null);
        } else {
          onRoleChange(value as GlobalAdminRole);
        }
      }}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          <Badge variant={roleColors[displayRole]}>{roleLabels[displayRole]}</Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="super_admin">
          <Badge variant="destructive">Super Admin</Badge>
        </SelectItem>
        <SelectItem value="admin">
          <Badge variant="default">Admin</Badge>
        </SelectItem>
        <SelectItem value="moderator">
          <Badge variant="secondary">Moderator</Badge>
        </SelectItem>
        <SelectItem value="user">
          <Badge variant="outline">User</Badge>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
