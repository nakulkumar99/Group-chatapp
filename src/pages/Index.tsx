import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Plus, LogOut, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { GroupCard } from "@/components/GroupCard";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { groups, myGroups, loading: groupsLoading, createGroup, joinGroup, leaveGroup } = useGroups();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyGroups = myGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">ChatSpace</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-accent">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Search & Create */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="pl-10 h-12 bg-secondary border-border focus:border-primary"
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="h-12 btn-twitter px-4">
            <Plus className="w-5 h-5 mr-2" />
            New Group
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-groups" className="w-full">
          <TabsList className="w-full bg-secondary mb-6">
            <TabsTrigger value="my-groups" className="flex-1">My Groups</TabsTrigger>
            <TabsTrigger value="discover" className="flex-1">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="my-groups">
            {groupsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredMyGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't joined any groups yet</p>
                <Button onClick={() => setShowCreateModal(true)} className="btn-twitter">
                  Create your first group
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredMyGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      id={group.id}
                      name={group.name}
                      description={group.description}
                      memberCount={group.member_count || 0}
                      isMember={true}
                      onJoin={joinGroup}
                      onLeave={leaveGroup}
                      onOpen={(id) => navigate(`/chat/${id}`)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover">
            {groupsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No groups found</div>
            ) : (
              <div className="space-y-4">
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
                      onOpen={(id) => navigate(`/chat/${id}`)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

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
}
