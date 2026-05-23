"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { socket } from "@/lib/socket";
import {
  PageHeader,
  SectionCard,
  Button,
  Input,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  Info,
  Users,
  Megaphone,
  ArrowLeft,
  Check,
  CheckCheck,
  Circle,
  Plus,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  fullName?: string;
  email: string;
  role?: string;
}

interface Conversation {
  user: User;
  lastMessage: {
    id: string;
    message: string;
    createdAt: string;
    read: boolean;
    senderId: string;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  sender: User;
  receiver: User;
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const userIdFromQuery = searchParams.get("userId");
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<string | null>(userIdFromQuery);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    target: "",
    message: "",
  });
  
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user's role to determine features
  const userRole = user?.role || "patient";
  const canBroadcast = ["super_admin", "hospital_admin"].includes(userRole);

  // WebSocket Integration
  useEffect(() => {
    if (!user?.id) return;

    // Connect and authenticate
    socket.auth = { 
      userId: user.id,
      tenantId: user.hospitalId,
    };
    socket.connect();

    socket.on("connect", () => {
      console.log("Connected to messaging socket");
    });

    socket.on("user-status", ({ userId, status }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (status === "online") next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    socket.on("user-typing", ({ userId, isTyping }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    socket.on("notification", (payload) => {
      if (payload.type === "message") {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        if (payload.metadata?.senderId === selectedChat) {
          queryClient.invalidateQueries({ queryKey: ["chat"] });
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, selectedChat, queryClient]);

  // Handle typing status
  const handleTyping = () => {
    if (!selectedChat) return;
    
    socket.emit("typing", { receiverId: selectedChat, isTyping: true });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { receiverId: selectedChat, isTyping: false });
    }, 3000);
  };

  // Fetch users for new chat
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-search", userSearchQuery, user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/messages?type=available-users&search=${encodeURIComponent(userSearchQuery)}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: newChatDialogOpen && !!user?.id,
  });

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/messages?userId=${user?.id}&type=conversations`);
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Fallback refetch
  });

  // Fetch chat messages
  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ["chat", user?.id, selectedChat],
    queryFn: async () => {
      const response = await fetch(`/api/messages?userId=${user?.id}&otherUserId=${selectedChat}&type=chat`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!user?.id && !!selectedChat,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?.id,
          receiverId: selectedChat,
          message,
        }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setMessageInput("");
      socket.emit("typing", { receiverId: selectedChat, isTyping: false });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Send broadcast mutation
  const sendBroadcastMutation = useMutation({
    mutationFn: async (data: typeof broadcastData) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?.id,
          message: data.message,
          type: "broadcast",
          ...(data.target === "role" ? { roleTarget: "doctor" } : { tenantTarget: true }),
        }),
      });
      if (!response.ok) throw new Error("Failed to send broadcast");
      return response.json();
    },
    onSuccess: () => {
      setBroadcastDialogOpen(false);
      setBroadcastData({ target: "", message: "" });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatData?.messages]);

  // Handle userId from query parameter
  useEffect(() => {
    if (userIdFromQuery) {
      setSelectedChat(userIdFromQuery);
    }
  }, [userIdFromQuery]);

  const conversations = conversationsData?.conversations || [];
  const messages = chatData?.messages || [];

  const filteredConversations = conversations.filter((conv: Conversation) =>
    conv.user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = conversations.find((conv: Conversation) => conv.user.id === selectedChat) ||
    (chatData?.otherUser ? { user: chatData.otherUser } : null);

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedChat) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, "HH:mm");
    } else {
      return format(date, "MMM dd");
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Please log in to access messages</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-4">
      {/* Conversations Sidebar - Styled as a Vertical Card */}
      <div className="w-80 flex flex-col bg-card border border-border shadow-sm rounded-[2rem] overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setNewChatDialogOpen(true)}
                title="Start New Chat"
                className="rounded-full"
              >
                <Plus className="h-4 w-4" />
              </Button>
              {canBroadcast && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setBroadcastDialogOpen(true)}
                  title="Broadcast"
                  className="rounded-full"
                >
                  <Megaphone className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-muted/50 border-none focus-visible:ring-1"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversationsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a conversation to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conversation: Conversation) => (
                <button
                  key={conversation.user.id}
                  onClick={() => setSelectedChat(conversation.user.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-all duration-200",
                    selectedChat === conversation.user.id 
                      ? "bg-primary/10 border-r-4 border-primary" 
                      : "hover:bg-muted/50 border-r-4 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {(conversation.user.fullName || conversation.user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {onlineUsers.has(conversation.user.id) && (
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {conversation.user.fullName || conversation.user.email}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(conversation.lastMessage.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage.message}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area - Styled as a Card */}
      <div className="flex-1 flex flex-col bg-card border border-border shadow-sm rounded-[2rem] overflow-hidden">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {(selectedConversation?.user.fullName || selectedConversation?.user.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedConversation?.user.fullName || selectedConversation?.user.email || "New Conversation"}
                  </p>
                  <div className="flex items-center gap-2">
                    {onlineUsers.has(selectedChat) ? (
                      <span className="text-xs text-green-500 font-medium">Online</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Offline</span>
                    )}
                    {typingUsers.has(selectedChat) && (
                      <span className="text-xs text-primary animate-pulse italic">typing...</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {chatLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                      <Skeleton className="h-12 w-48" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4" />
                  <p>No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender.id === user.id;
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-xs lg:max-w-md px-6 py-3 rounded-[2rem]",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted rounded-tl-none"
                        )}
                      >
                        <p className="text-sm">{message.message}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-70">
                            {formatMessageTime(message.createdAt)}
                          </span>
                          {isOwnMessage && (
                            message.read ? (
                              <CheckCheck className="h-3 w-3 opacity-70" />
                            ) : (
                              <Check className="h-3 w-3 opacity-70" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-border bg-muted/10">
              <div className="flex items-end gap-2">
                <Textarea
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="min-h-[44px] max-h-32 resize-none rounded-[1.5rem] bg-background py-3 px-4"
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  size="sm"
                  className="h-10 w-10 p-0 rounded-full"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
            <p>Choose a conversation from the sidebar to start messaging</p>
            <Button 
              className="mt-4"
              onClick={() => setNewChatDialogOpen(true)}
            >
              Start New Chat
            </Button>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, role, or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : usersData?.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  {userSearchQuery.trim().length === 0 ? "No available contacts found" : "No users found"}
                </p>
              ) : (
                usersData?.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedChat(u.id);
                      setNewChatDialogOpen(false);
                      setUserSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{(u.fullName || u.email).charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">{u.fullName || u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {[u.role ? String(u.role).replace(/_/g, " ") : null, u.email].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Broadcast Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Audience</label>
              <Select
                value={broadcastData.target}
                onValueChange={(value) => setBroadcastData({ ...broadcastData, target: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target audience" />
                </SelectTrigger>
                <SelectContent>
                  {userRole === "super_admin" ? (
                    <>
                      <SelectItem value="all">Every user in the system</SelectItem>
                      <SelectItem value="hospital_admins">All Hospital Admins</SelectItem>
                    </>
                  ) : userRole === "hospital_admin" ? (
                    <>
                      <SelectItem value="tenant">All hospital employees</SelectItem>
                      <SelectItem value="role:doctor">All doctors</SelectItem>
                      <SelectItem value="role:nurse">All nurses</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="tenant">My organization</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={broadcastData.message}
                onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                placeholder="Enter your broadcast message..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sendBroadcastMutation.mutate(broadcastData)}
              disabled={!broadcastData.target || !broadcastData.message.trim() || sendBroadcastMutation.isPending}
            >
              {sendBroadcastMutation.isPending ? "Sending..." : "Send Broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
