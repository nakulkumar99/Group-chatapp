import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Trash2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { useAdminMessages } from "@/hooks/useAdminMessages";
import { useContentReports } from "@/hooks/useContentReports";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content: string;
  user_id: string;
  group_id: string;
  created_at: string;
  file_url: string | null;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
  groups?: {
    name: string;
  };
}

interface ContentReport {
  id: string;
  reporter_id: string;
  message_id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  reporter_profile?: {
    username: string;
  };
  message?: {
    content: string;
    sender_profile?: {
      username: string;
    };
    group?: {
      name: string;
    };
  };
}

interface Group {
  id: string;
  name: string;
}

export function ContentModeration() {
  const { fetchMessages, deleteMessage, deleteMessages, loading: messagesLoading } = useAdminMessages();
  const { fetchReports, updateReportStatus, loading: reportsLoading } = useContentReports();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [reportsTotal, setReportsTotal] = useState(0);

  const [messagePage, setMessagePage] = useState(0);
  const [reportPage, setReportPage] = useState(0);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [reportStatus, setReportStatus] = useState<string>("pending");

  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"single" | "bulk">("single");
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const pageSize = 20;

  const loadMessages = useCallback(async () => {
    const groupArg = groupFilter === "all" ? undefined : groupFilter;
    const { messages: fetched, total } = await fetchMessages(
      messagePage,
      pageSize,
      search || undefined,
      groupArg
    );
    setMessages(fetched);
    setMessagesTotal(total);
  }, [fetchMessages, messagePage, search, groupFilter]);

  const loadReports = useCallback(async () => {
    const statusArg = reportStatus === "all" ? undefined : (reportStatus as "pending" | "reviewed" | "dismissed");
    const { reports: fetched, total } = await fetchReports(reportPage, pageSize, statusArg);
    setReports(fetched);
    setReportsTotal(total);
  }, [fetchReports, reportPage, reportStatus]);

  const loadGroups = useCallback(async () => {
    const { data } = await supabase.from("groups").select("id, name");
    setGroups(data || []);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleDeleteSingle = async () => {
    if (!singleDeleteId) return;

    const { error } = await deleteMessage(singleDeleteId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Message deleted" });
      loadMessages();
    }
    setDeleteModalOpen(false);
    setSingleDeleteId(null);
  };

  const handleDeleteBulk = async () => {
    const ids = Array.from(selectedMessages);
    const { error } = await deleteMessages(ids);
    if (error) {
      toast({ title: "Error", description: "Failed to delete messages", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${ids.length} messages deleted` });
      setSelectedMessages(new Set());
      loadMessages();
    }
    setDeleteModalOpen(false);
  };

  const handleReportAction = async (reportId: string, status: "reviewed" | "dismissed") => {
    const { error } = await updateReportStatus(reportId, status);
    if (error) {
      toast({ title: "Error", description: "Failed to update report", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Report ${status}` });
      loadReports();
    }
  };

  const toggleMessageSelection = (id: string) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMessages(newSelection);
  };

  const toggleAllMessages = () => {
    if (selectedMessages.size === messages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(messages.map((m) => m.id)));
    }
  };

  const messagesTotalPages = Math.ceil(messagesTotal / pageSize);
  const reportsTotalPages = Math.ceil(reportsTotal / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Content Moderation</h1>
        <p className="text-muted-foreground">Review and manage messages and reports</p>
      </div>

      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="reports">
            Reports
            {reportsTotal > 0 && (
              <Badge variant="destructive" className="ml-2">
                {reportsTotal}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setMessagePage(0);
                }}
                className="pl-9"
              />
            </div>

            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedMessages.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteTarget("bulk");
                  setDeleteModalOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedMessages.size})
              </Button>
            )}
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedMessages.size === messages.length && messages.length > 0}
                      onCheckedChange={toggleAllMessages}
                    />
                  </TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messagesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No messages found
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMessages.has(message.id)}
                          onCheckedChange={() => toggleMessageSelection(message.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {message.profiles?.username || "Unknown"}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {message.content}
                      </TableCell>
                      <TableCell>{message.groups?.name || "Unknown"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(message.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSingleDeleteId(message.id);
                            setDeleteTarget("single");
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {messages.length} of {messagesTotal} messages
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMessagePage((p) => Math.max(0, p - 1))}
                disabled={messagePage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {messagePage + 1} of {messagesTotalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMessagePage((p) => p + 1)}
                disabled={messagePage >= messagesTotalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Select value={reportStatus} onValueChange={setReportStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.reporter_profile?.username || "Unknown"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{report.reason}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {report.message?.content || "Deleted"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            report.status === "pending"
                              ? "destructive"
                              : report.status === "reviewed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(report.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        {report.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500 hover:text-green-600"
                              onClick={() => handleReportAction(report.id, "reviewed")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => handleReportAction(report.id, "dismissed")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {reports.length} of {reportsTotal} reports
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setReportPage((p) => Math.max(0, p - 1))}
                disabled={reportPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {reportPage + 1} of {reportsTotalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setReportPage((p) => p + 1)}
                disabled={reportPage >= reportsTotalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={deleteTarget === "single" ? handleDeleteSingle : handleDeleteBulk}
        title="Delete Message(s)"
        description={
          deleteTarget === "single"
            ? "Are you sure you want to delete this message? This action cannot be undone."
            : `Are you sure you want to delete ${selectedMessages.size} message(s)? This action cannot be undone.`
        }
      />
    </div>
  );
}
