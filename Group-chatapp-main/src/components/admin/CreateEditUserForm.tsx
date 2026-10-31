import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserSchema, type CreateUserInput } from "@/lib/validations";
import { AdminAvatarUploader } from "./AdminAvatarUploader";
import { Loader2 } from "lucide-react";

type UserStatus = "active" | "inactive" | "suspended";
type GlobalAdminRole = "super_admin" | "admin" | "moderator";

interface UserData {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  phone_number: string | null;
  status: UserStatus;
  role: GlobalAdminRole | null;
}

interface CreateEditUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSubmit: (data: CreateUserInput & { avatar_url?: string; role?: GlobalAdminRole | null }) => Promise<{ success: boolean; errors?: Record<string, string[]> }>;
  loading?: boolean;
}

export function CreateEditUserForm({
  open,
  onOpenChange,
  user,
  onSubmit,
  loading = false,
}: CreateEditUserFormProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<GlobalAdminRole | "user">("user");
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});

  const isEdit = !!user;

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      phone_number: "",
      username: "",
      bio: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        phone_number: user.phone_number || "",
        username: user.username,
        bio: user.bio || "",
        status: user.status,
      });
      setAvatarUrl(user.avatar_url);
      setSelectedRole(user.role || "user");
    } else {
      form.reset({
        phone_number: "",
        username: "",
        bio: "",
        status: "active",
      });
      setAvatarUrl(null);
      setSelectedRole("user");
    }
    setServerErrors({});
  }, [user, form, open]);

  const handleSubmit = async (data: CreateUserInput) => {
    setServerErrors({});
    const result = await onSubmit({
      ...data,
      avatar_url: avatarUrl || undefined,
      role: selectedRole === "user" ? null : selectedRole,
    });

    if (!result.success && result.errors) {
      setServerErrors(result.errors);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create User"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="flex justify-center mb-4">
              <AdminAvatarUploader
                currentUrl={avatarUrl}
                onUpload={setAvatarUrl}
                userId={user?.user_id}
              />
            </div>

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="phone_number">Phone Number (E.164)</FormLabel>
                  <FormControl>
                    <Input
                      id="phone_number"
                      placeholder="+1234567890"
                      {...field}
                      aria-describedby="phone_number-error"
                    />
                  </FormControl>
                  <FormMessage />
                  {serverErrors.phone_number?.map((error, i) => (
                    <p key={i} className="text-sm text-destructive">{error}</p>
                  ))}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="username">Username</FormLabel>
                  <FormControl>
                    <Input
                      id="username"
                      placeholder="johndoe"
                      {...field}
                      aria-describedby="username-error"
                    />
                  </FormControl>
                  <FormMessage />
                  {serverErrors.username?.map((error, i) => (
                    <p key={i} className="text-sm text-destructive">{error}</p>
                  ))}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="bio">Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about this user..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="status">Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel htmlFor="role">Role</FormLabel>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as GlobalAdminRole | "user")}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
