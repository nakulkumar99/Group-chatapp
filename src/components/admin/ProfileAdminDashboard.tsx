import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Menu,
  X,
  ArrowLeft,
  Shield,
  ClipboardList,
} from "lucide-react";
import { AdminDashboard } from "./AdminDashboard";
import { UserManagement } from "./UserManagement";
import { RoleManagement } from "./RoleManagement";
import { AuditLogs } from "./AuditLogs";
import { useAdminRole } from "@/hooks/useAdminRole";

type Tab = "dashboard" | "users" | "roles" | "audit";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function ProfileAdminDashboard() {
  const navigate = useNavigate();
  const { isSuperAdmin, isNakulYT } = useAdminRole();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const canManageRoles = isSuperAdmin || isNakulYT;

  const navItems = [
    { id: "dashboard" as Tab, icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", visible: true },
    { id: "users" as Tab, icon: <Users className="h-5 w-5" />, label: "Users", visible: true },
    { id: "roles" as Tab, icon: <Shield className="h-5 w-5" />, label: "Role Management", visible: canManageRoles },
    { id: "audit" as Tab, icon: <ClipboardList className="h-5 w-5" />, label: "Audit Logs", visible: true },
  ].filter((item) => item.visible);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard />;
      case "users":
        return <UserManagement />;
      case "roles":
        return <RoleManagement />;
      case "audit":
        return <AuditLogs />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Mobile top bar */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-1 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-4">
          <div className="mb-8 pt-12 md:pt-0">
            <div className="hidden md:flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm text-muted-foreground">Back to Home</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Admin Panel</h2>
            <p className="text-sm text-muted-foreground">Manage your platform</p>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
              />
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 pt-16 md:pt-6">
        {renderContent()}
      </main>
    </div>
  );
}
