"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useParams, useSearchParams } from "next/navigation";
import { socket } from "@/lib/socket";
import {
  Button,
  Input,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Skeleton,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
  Plus,
  Trash2,
  PhoneOff,
  VideoOff,
  Loader2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface User {
  id: string;
  fullName?: string | null;
  email: string;
  role?: string;
  avatar?: string | null;
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

interface IncomingCallState {
  callerId: string;
  callType: "audio" | "video";
  offer?: RTCSessionDescriptionInit;
}

type ActiveCallState =
  | { status: "calling"; targetUserId: string; callType: "audio" | "video" }
  | { status: "connected"; targetUserId: string; callType: "audio" | "video" }
  | null;

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function getDisplayName(user?: User | null) {
  return user?.fullName || user?.email || "User";
}

function getInitial(user?: User | null) {
  return getDisplayName(user).charAt(0).toUpperCase();
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const params = useParams();
  const slug = params?.slug as string;
  const searchParams = useSearchParams();
  const userIdFromQuery = searchParams.get("userId");
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<string | null>(userIdFromQuery);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const stopMediaTracks = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const endCallCleanup = (emitSignal = false) => {
    if (emitSignal && activeCall?.targetUserId) {
      socket.emit("call:end", { receiverId: activeCall.targetUserId });
    }
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    stopMediaTracks();
    setIncomingCall(null);
    setActiveCall(null);
    setCallError(null);
  };

  useEffect(() => {
    if (!user?.id) return;

    socket.auth = {
      userId: user.id,
      tenantId: user.tenantId,
    };
    socket.connect();

    const onConnect = () => {
      console.log("Connected to messaging socket");
    };

    const onUserStatus = ({ userId, status }: { userId: string; status: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === "online") next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    const onUserTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    const onNotification = (payload: any) => {
      if (payload.type === "message") {
        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        if (payload.metadata?.senderId === selectedChat) {
          queryClient.invalidateQueries({ queryKey: ["chat", user.id, selectedChat] });
        }
      }
    };

    const onIncomingCall = ({ callerId, callType }: { callerId: string; callType: "audio" | "video" }) => {
      setIncomingCall((current) =>
        current?.callerId === callerId ? { ...current, callType } : { callerId, callType }
      );
    };

    const onCallOffer = ({ callerId, offer, callType }: { callerId: string; offer: RTCSessionDescriptionInit; callType: "audio" | "video" }) => {
      setIncomingCall({ callerId, offer, callType });
    };

    const onCallAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setActiveCall((current) => (current ? { ...current, status: "connected" } : current));
    };

    const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!peerConnectionRef.current || !candidate) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    };

    const onCallReject = () => {
      toast.error("Call declined");
      endCallCleanup();
    };

    const onCallEnd = () => {
      toast.info("Call ended");
      endCallCleanup();
    };

    socket.on("connect", onConnect);
    socket.on("user-status", onUserStatus);
    socket.on("user-typing", onUserTyping);
    socket.on("notification", onNotification);
    socket.on("call:incoming", onIncomingCall);
    socket.on("call:offer", onCallOffer);
    socket.on("call:answer", onCallAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:reject", onCallReject);
    socket.on("call:end", onCallEnd);

    return () => {
      socket.off("connect", onConnect);
      socket.off("user-status", onUserStatus);
      socket.off("user-typing", onUserTyping);
      socket.off("notification", onNotification);
      socket.off("call:incoming", onIncomingCall);
      socket.off("call:offer", onCallOffer);
      socket.off("call:answer", onCallAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:reject", onCallReject);
      socket.off("call:end", onCallEnd);
      socket.disconnect();
      endCallCleanup(false);
    };
  }, [queryClient, selectedChat, user?.id, user?.tenantId]);

  const handleTyping = () => {
    if (!selectedChat) return;

    socket.emit("typing", { receiverId: selectedChat, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { receiverId: selectedChat, isTyping: false });
    }, 3000);
  };

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-search", userSearchQuery, user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tenant/${slug}/messages?type=available-users&search=${encodeURIComponent(userSearchQuery)}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: newChatDialogOpen && !!user?.id,
  });

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tenant/${slug}/messages?type=conversations`);
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ["chat", user?.id, selectedChat],
    queryFn: async () => {
      const response = await fetch(`/api/tenant/${slug}/messages?type=chat&otherUserId=${selectedChat}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!user?.id && !!selectedChat,
  });

  const conversations = conversationsData?.conversations || [];
  const messages = chatData?.messages || [];

  const selectedConversation = useMemo(
    () =>
      conversations.find((conv: Conversation) => conv.user.id === selectedChat) ||
      (chatData?.otherUser ? { user: chatData.otherUser } : null),
    [chatData?.otherUser, conversations, selectedChat]
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(`/api/tenant/${slug}/messages`, {
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
    onSuccess: (payload) => {
      const createdMessage = payload?.message;
      if (createdMessage && selectedChat) {
        queryClient.setQueryData(["chat", user?.id, selectedChat], (current: any) => {
          const existingMessages = Array.isArray(current?.messages) ? current.messages : [];
          const alreadyExists = existingMessages.some((entry: any) => entry.id === createdMessage.id);
          if (alreadyExists) return current;
          return {
            ...current,
            otherUser: current?.otherUser || selectedConversation?.user || null,
            messages: [
              ...existingMessages,
              {
                ...createdMessage,
                sender: {
                  id: user?.id,
                  fullName: user?.fullName,
                  email: user?.email,
                  avatar: user?.avatar || null,
                },
                receiver: selectedConversation?.user || { id: selectedChat, fullName: "", email: "", avatar: null },
              },
            ],
          };
        });
      }
      setMessageInput("");
      socket.emit("typing", { receiverId: selectedChat, isTyping: false });
      queryClient.invalidateQueries({ queryKey: ["chat", user?.id, selectedChat] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`/api/tenant/${slug}/messages/${messageId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to delete message");
      return { messageId };
    },
    onSuccess: ({ messageId }) => {
      queryClient.setQueryData(["chat", user?.id, selectedChat], (current: any) => ({
        ...current,
        messages: Array.isArray(current?.messages)
          ? current.messages.filter((entry: Message) => entry.id !== messageId)
          : [],
      }));
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      toast.success("Message deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete message");
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChat) throw new Error("No conversation selected");
      const response = await fetch(`/api/tenant/${slug}/messages/chat/${selectedChat}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to clear chat");
      return payload;
    },
    onSuccess: () => {
      queryClient.setQueryData(["chat", user?.id, selectedChat], (current: any) => ({
        ...current,
        messages: [],
      }));
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      setProfileDialogOpen(false);
      toast.success("Chat cleared");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to clear chat");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatData?.messages]);

  useEffect(() => {
    if (userIdFromQuery) {
      setSelectedChat(userIdFromQuery);
    }
  }, [userIdFromQuery]);

  const filteredConversations = conversations.filter(conv =>
    conv.user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRemoteUser = selectedConversation?.user || null;
  const activeCallerUser = incomingCall
    ? conversations.find((conv: Conversation) => conv.user.id === incomingCall.callerId)?.user ||
      usersData?.find((entry: User) => entry.id === incomingCall.callerId) ||
      (chatData?.otherUser?.id === incomingCall.callerId ? chatData.otherUser : null)
    : null;

  const attachLocalStream = (stream: MediaStream) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  const attachRemoteStream = (stream: MediaStream) => {
    remoteStreamRef.current = stream;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  };

  const ensureMedia = async (callType: "audio" | "video") => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media devices are not available in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
    attachLocalStream(stream);
    return stream;
  };

  const createPeerConnection = (targetUserId: string, callType: "audio" | "video") => {
    const peer = new RTCPeerConnection(rtcConfig);
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call:ice-candidate", {
          receiverId: targetUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };
    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) attachRemoteStream(stream);
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setActiveCall({ status: "connected", targetUserId, callType });
      }
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
        endCallCleanup(false);
      }
    };
    peerConnectionRef.current = peer;
    return peer;
  };

  const startCall = async (callType: "audio" | "video") => {
    if (!selectedChat) return;

    try {
      setCallError(null);
      const stream = await ensureMedia(callType);
      const peer = createPeerConnection(selectedChat, callType);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      socket.emit("call:start", { receiverId: selectedChat, callType });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("call:offer", {
        receiverId: selectedChat,
        offer,
        callType,
      });
      setActiveCall({ status: "calling", targetUserId: selectedChat, callType });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start call";
      setCallError(message);
      toast.error(message);
      endCallCleanup(false);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    if (!incomingCall.offer) {
      toast.error("Call setup is still in progress. Try again.");
      return;
    }

    try {
      setCallError(null);
      const stream = await ensureMedia(incomingCall.callType);
      const peer = createPeerConnection(incomingCall.callerId, incomingCall.callType);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("call:answer", {
        receiverId: incomingCall.callerId,
        answer,
      });
      setActiveCall({
        status: "connected",
        targetUserId: incomingCall.callerId,
        callType: incomingCall.callType,
      });
      setIncomingCall(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to answer call";
      setCallError(message);
      toast.error(message);
      endCallCleanup(false);
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    socket.emit("call:reject", { receiverId: incomingCall.callerId });
    setIncomingCall(null);
  };

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
              {filteredConversations.map((conversation) => (
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
                        <AvatarImage src={conversation.user.avatar || undefined} />
                        <AvatarFallback>{getInitial(conversation.user)}</AvatarFallback>
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
                  <AvatarImage src={activeRemoteUser?.avatar || undefined} />
                  <AvatarFallback>{getInitial(activeRemoteUser)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {getDisplayName(activeRemoteUser)}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => startCall("audio")}
                  disabled={!!activeCall || !!incomingCall}
                  title="Start voice call"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => startCall("video")}
                  disabled={!!activeCall || !!incomingCall}
                  title="Start video call"
                >
                  <Video className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setProfileDialogOpen(true)}
                  title="Open chat profile"
                >
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
                      className={cn("group flex items-end gap-2", isOwnMessage ? "justify-end" : "justify-start")}
                    >
                      {!isOwnMessage && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.sender.avatar || undefined} />
                          <AvatarFallback>{getInitial(message.sender)}</AvatarFallback>
                        </Avatar>
                      )}
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
                      {isOwnMessage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                          title="Delete message"
                          onClick={() => deleteMessageMutation.mutate(message.id)}
                          disabled={deleteMessageMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
                  onKeyDown={handleKeyPress}
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
                  {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
                      <AvatarImage src={u.avatar || undefined} />
                      <AvatarFallback>{getInitial(u)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">{getDisplayName(u)}</p>
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

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={activeRemoteUser?.avatar || undefined} />
                <AvatarFallback>{getInitial(activeRemoteUser)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{getDisplayName(activeRemoteUser)}</p>
                <p className="text-sm text-muted-foreground">{activeRemoteUser?.email}</p>
                {activeRemoteUser?.role && (
                  <p className="text-sm capitalize text-muted-foreground">
                    {String(activeRemoteUser.role).replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium">Conversation actions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Clear this chat to remove the current conversation history.
              </p>
              <Button
                variant="destructive"
                className="mt-4"
                onClick={() => {
                  if (window.confirm("Clear this chat? This removes the current conversation history.")) {
                    clearChatMutation.mutate();
                  }
                }}
                disabled={clearChatMutation.isPending}
              >
                {clearChatMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Clear Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!incomingCall} onOpenChange={(open) => !open && rejectCall()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{incomingCall?.callType === "video" ? "Incoming video call" : "Incoming voice call"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            <Avatar className="mx-auto h-20 w-20">
              <AvatarImage src={activeCallerUser?.avatar || undefined} />
              <AvatarFallback>{getInitial(activeCallerUser)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{getDisplayName(activeCallerUser)}</p>
              <p className="text-sm text-muted-foreground">{activeCallerUser?.email}</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="destructive" onClick={rejectCall}>
                <PhoneOff className="mr-2 h-4 w-4" />
                Decline
              </Button>
              <Button onClick={acceptCall}>
                {incomingCall?.callType === "video" ? <Video className="mr-2 h-4 w-4" /> : <Phone className="mr-2 h-4 w-4" />}
                Accept
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeCall} onOpenChange={(open) => !open && endCallCleanup(true)}>
        <DialogContent className={cn(activeCall?.callType === "video" ? "sm:max-w-5xl" : "sm:max-w-md")}>
          <DialogHeader>
            <DialogTitle>
              {activeCall?.callType === "video" ? "Video Call" : "Voice Call"} with {getDisplayName(activeRemoteUser)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {callError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {callError}
              </div>
            )}

            {activeCall?.callType === "video" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-border bg-black/90">
                  <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video w-full object-cover" />
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-black/90">
                  <video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
                <Avatar className="mx-auto h-20 w-20">
                  <AvatarImage src={activeRemoteUser?.avatar || undefined} />
                  <AvatarFallback>{getInitial(activeRemoteUser)}</AvatarFallback>
                </Avatar>
                <p className="mt-4 text-lg font-semibold">{getDisplayName(activeRemoteUser)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeCall?.status === "calling" ? "Calling..." : "Connected"}
                </p>
                <div className="hidden">
                  <video ref={remoteVideoRef} autoPlay playsInline />
                  <video ref={localVideoRef} autoPlay muted playsInline />
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button variant="destructive" onClick={() => endCallCleanup(true)}>
                {activeCall?.callType === "video" ? <VideoOff className="mr-2 h-4 w-4" /> : <PhoneOff className="mr-2 h-4 w-4" />}
                End Call
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

