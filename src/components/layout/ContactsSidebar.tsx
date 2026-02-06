import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Settings, Menu, X, MessageCircle, LogOut, User, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupCard } from "@/components/GroupCard";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { useGroups } from "@/hooks/useGroups";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

interface ContactsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  selectedGroupId?: string;
  onSelectGroup: (groupId: string) => void;
  isMobile: boolean;
}

export function ContactsSidebar({
  isOpen,
  onClose,
  onOpenSettings,
  selectedGroupId,
  onSelectGroup,
  isMobile,
}: ContactsSidebarProps) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { groups, myGroups, loading, createGroup, joinGroup, leaveGroup } = useGroups();
  const { isAdmin: isGlobalAdmin } = useAdminRole();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyGroups = myGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const handleGroupSelect = (groupId: string) => {
    onSelectGroup(groupId);
    if (isMobile) {
      onClose();
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-card/95 backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">ChatSpace</h1>
          </div>
          <div className="flex items-center gap-1">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-accent rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/30">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {profile?.username ? getInitials(profile.username) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.username || "User"}
              </p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="hover:bg-accent rounded-full h-8 w-8"
            >
              <User className="w-4 h-4" />
            </Button>
            {isGlobalAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
                className="hover:bg-accent rounded-full h-8 w-8 text-primary"
                title="Admin Panel"
              >
                <ShieldCheck className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              className="hover:bg-accent rounded-full h-8 w-8"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-accent rounded-full h-8 w-8 text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search & Create */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="pl-9 h-10 rounded-full bg-accent/50 border-0 focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="icon"
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shrink-0"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Groups List */}
      <ScrollArea className="flex-1">
        <Tabs defaultValue="my-groups" className="w-full">
          <TabsList className="w-full bg-transparent border-b border-border rounded-none p-0 h-auto">
            <TabsTrigger
              value="my-groups"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              My Groups
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              Discover
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-groups" className="p-2 m-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Loading...
              </div>
            ) : filteredMyGroups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm mb-3">
                  No groups joined yet
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  size="sm"
                  className="rounded-full"
                >
                  Create Group
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMyGroups.map((group) => (
                  <motion.button
                    key={group.id}
                    onClick={() => handleGroupSelect(group.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                      selectedGroupId === group.id
                        ? "bg-primary/20 border border-primary/30"
                        : "hover:bg-accent/50"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {getInitials(group.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {group.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {group.description || `${group.member_count || 0} members`}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover" className="p-2 m-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Loading...
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No groups found
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      id={group.id}
                      name={group.name}
                      description={group.description}
                      memberCount={group.member_count || 0}
                      isMember={group.is_member || false}
                      onJoin={joinGroup}
                      onLeave={leaveGroup}
                      onOpen={handleGroupSelect}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateGroupModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={createGroup}
          />
        )}
      </AnimatePresence>
    </div>
  );

  // Mobile overlay
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-80 z-50 shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop always visible
  return (
    <aside className="w-80 border-r border-border shrink-0 hidden lg:block">
      {sidebarContent}
    </aside>
  );
}
