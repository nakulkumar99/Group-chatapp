import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ContactsSidebar } from "@/components/layout/ContactsSidebar";
import { ChatArea } from "@/components/layout/ChatArea";
import { MembersPanel } from "@/components/layout/MembersPanel";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { QuickAvatarUploader } from "@/components/QuickAvatarUploader";
import { useProfile } from "@/hooks/useProfile";

function ChatLayoutContent() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { profile, updateProfile } = useProfile();
  const isMobile = useIsMobile();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groupId || null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAvatarUploader, setShowAvatarUploader] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (groupId) {
      setSelectedGroupId(groupId);
    }
  }, [groupId]);

  const handleSelectGroup = (id: string) => {
    setSelectedGroupId(id);
    navigate(`/chat/${id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-background theme-transition">
      {/* Contacts Sidebar */}
      <ContactsSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onOpenSettings={() => setShowSettings(true)}
        selectedGroupId={selectedGroupId || undefined}
        onSelectGroup={handleSelectGroup}
        isMobile={isMobile}
      />

      {/* Main Chat Area */}
      <ChatArea
        groupId={selectedGroupId}
        onOpenSidebar={() => setShowSidebar(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenMembers={() => setShowMembers(!showMembers)}
        showMembersPanel={showMembers}
        isMobile={isMobile}
      />

      {/* Members Panel */}
      <MembersPanel
        groupId={selectedGroupId}
        isOpen={showMembers}
        onClose={() => setShowMembers(false)}
        currentUserId={user.id}
        isMobile={isMobile}
      />

      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} groupId={selectedGroupId} />

      {/* Avatar Uploader */}
      {user && (
        <QuickAvatarUploader
          isOpen={showAvatarUploader}
          onClose={() => setShowAvatarUploader(false)}
          userId={user.id}
          currentAvatar={profile?.avatar_url || null}
          username={profile?.username || "User"}
          onAvatarChange={async (url) => {
            await updateProfile({ avatar_url: url });
          }}
        />
      )}
    </div>
  );
}

export default function ChatLayout() {
  return (
    <ThemeProvider>
      <ChatLayoutContent />
    </ThemeProvider>
  );
}
