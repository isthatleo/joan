"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useSearchParams } from "next/navigation";
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
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Volume2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatTimeForUser } from "@/lib/time-format";

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
    type?: string;
    callType?: "audio" | "video";
    durationSeconds?: number;
    missed?: boolean;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  type?: string;
  callType?: "audio" | "video";
  callStatus?: string;
  durationSeconds?: number;
  missed?: boolean;
  sender: User;
  receiver: User;
}

interface IncomingCallState {
  callId: string;
  callerId: string;
  callType: "audio" | "video";
  offer?: RTCSessionDescriptionInit;
}

type ActiveCallState =
  | { callId: string; status: "calling"; targetUserId: string; callType: "audio" | "video" }
  | { callId: string; status: "connected"; targetUserId: string; callType: "audio" | "video" }
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
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [remoteMediaReady, setRemoteMediaReady] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingActiveRef = useRef(false);
  const selectedChatRef = useRef<string | null>(userIdFromQuery);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const processedRemoteCandidateKeysRef = useRef<Set<string>>(new Set());

  const stopMediaTracks = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setIsMicrophoneMuted(false);
    setIsCameraEnabled(true);
    setRemoteMediaReady(false);
    setCallDurationSeconds(0);
  };

  const endCallCleanup = (emitSignal = false) => {
    if (emitSignal && activeCall?.callId) {
      void fetch(`/api/messages/calls/${activeCall.callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "end" }),
      }).catch(() => undefined);
    }
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    stopMediaTracks();
    processedRemoteCandidateKeysRef.current = new Set();
    setIncomingCall(null);
    setActiveCall(null);
    setCallError(null);
  };

  const { data: selfData } = useQuery({
    queryKey: ["messaging-self", user?.id],
    queryFn: async () => {
      const params = new URLSearchParams({ type: "self" });
      if (user?.id) params.set("userId", user.id);
      const response = await fetch(`/api/messages?${params.toString()}`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Failed to resolve messaging user");
      return response.json();
    },
    enabled: !!user?.email || !!user?.id,
  });

  const messagingUserId = selfData?.currentUser?.id ?? null;
  const messagingTenantId = selfData?.currentUser?.tenantId ?? null;

  const updateTypingState = async (receiverId: string, isTyping: boolean) => {
    await fetch("/api/messages/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ receiverId, isTyping }),
    });
  };

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    if (!messagingUserId) return;

    socket.auth = {
      userId: messagingUserId,
      tenantId: messagingTenantId,
    };
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      console.log("Connected to messaging socket");
    };

    const onMessageNew = ({ senderId, message }: { senderId: string; message: any }) => {
      const activeChatId = selectedChatRef.current;
      if (!activeChatId || senderId !== activeChatId || !message) return;
      queryClient.setQueryData(["chat", messagingUserId, activeChatId], (current: any) => {
        const existingMessages = Array.isArray(current?.messages) ? current.messages : [];
        if (existingMessages.some((entry: any) => entry.id === message.id)) return current;
        return {
          ...current,
          otherUser: current?.otherUser || message.sender || null,
          messages: [...existingMessages, message],
        };
      });
      queryClient.invalidateQueries({ queryKey: ["conversations", messagingUserId] });
    };

    const onMessageRead = ({ readerId }: { readerId: string }) => {
      if (!selectedChatRef.current || readerId !== selectedChatRef.current) return;
      queryClient.setQueryData(["chat", messagingUserId, selectedChatRef.current], (current: any) => ({
        ...current,
        messages: Array.isArray(current?.messages)
          ? current.messages.map((entry: Message) =>
              entry.sender.id === messagingUserId ? { ...entry, read: true } : entry
            )
          : [],
      }));
      queryClient.invalidateQueries({ queryKey: ["conversations", messagingUserId] });
    };

    const onNotification = (payload: any) => {
      if (payload.type === "message") {
        const activeChatId = selectedChatRef.current;
        if (payload.metadata?.message && payload.metadata?.senderId === activeChatId) {
          queryClient.setQueryData(["chat", messagingUserId, activeChatId], (current: any) => {
            const existingMessages = Array.isArray(current?.messages) ? current.messages : [];
            const incomingMessage = payload.metadata.message;
            if (existingMessages.some((entry: any) => entry.id === incomingMessage.id)) return current;
            return {
              ...current,
              otherUser: current?.otherUser || incomingMessage.sender || null,
              messages: [...existingMessages, incomingMessage],
            };
          });
        }
        queryClient.invalidateQueries({ queryKey: ["conversations", messagingUserId] });
        if (payload.metadata?.senderId === activeChatId) {
          queryClient.invalidateQueries({ queryKey: ["chat", messagingUserId, activeChatId] });
        }
      }
      if (payload.type === "message.read" && selectedChatRef.current && payload.metadata?.readerId === selectedChatRef.current) {
        queryClient.setQueryData(["chat", messagingUserId, selectedChatRef.current], (current: any) => ({
          ...current,
          messages: Array.isArray(current?.messages)
            ? current.messages.map((entry: Message) =>
                entry.sender.id === messagingUserId ? { ...entry, read: true } : entry
              )
            : [],
        }));
        queryClient.invalidateQueries({ queryKey: ["conversations", messagingUserId] });
      }
    };

    const onDisconnect = () => {
      setCallError(null);
    };

    socket.on("connect", onConnect);
    socket.on("message:new", onMessageNew);
    socket.on("message:read", onMessageRead);
    socket.on("notification", onNotification);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("message:new", onMessageNew);
      socket.off("message:read", onMessageRead);
      socket.off("notification", onNotification);
      socket.off("disconnect", onDisconnect);
      if (socket.connected) {
        socket.disconnect();
      }
      endCallCleanup(false);
    };
  }, [messagingTenantId, messagingUserId, queryClient]);

  const handleTyping = (nextValue: string) => {
    if (!selectedChat) return;

    if (!nextValue.trim()) {
      typingActiveRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      void updateTypingState(selectedChat, false).catch(() => undefined);
      return;
    }

    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      void updateTypingState(selectedChat, true).catch(() => undefined);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      void updateTypingState(selectedChat, false).catch(() => undefined);
    }, 3000);
  };

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-search", userSearchQuery, messagingUserId],
    queryFn: async () => {
      const response = await fetch(`/api/messages?type=available-users&search=${encodeURIComponent(userSearchQuery)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: newChatDialogOpen && !!messagingUserId,
  });

  const { data: conversationsData, isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations", messagingUserId],
    queryFn: async () => {
      const response = await fetch(`/api/messages?type=conversations`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
    enabled: !!messagingUserId,
    refetchOnWindowFocus: true,
    refetchInterval: messagingUserId ? 1500 : false,
    refetchIntervalInBackground: true,
  });

  const { data: chatData, isLoading: chatLoading, refetch: refetchChat } = useQuery({
    queryKey: ["chat", messagingUserId, selectedChat],
    queryFn: async () => {
      const response = await fetch(`/api/messages?type=chat&otherUserId=${selectedChat}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!messagingUserId && !!selectedChat,
    refetchOnWindowFocus: true,
    refetchInterval: messagingUserId && selectedChat ? 800 : false,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!messagingUserId) return;

    const sendHeartbeat = () =>
      fetch("/api/messages/presence", {
        method: "POST",
        cache: "no-store",
        keepalive: true,
      }).catch(() => undefined);

    void sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [messagingUserId]);

  const { data: presenceData } = useQuery({
    queryKey: ["messaging-presence", messagingUserId],
    queryFn: async () => {
      const response = await fetch("/api/messages/presence", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch presence");
      return response.json();
    },
    enabled: !!messagingUserId,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { data: typingData } = useQuery({
    queryKey: ["messaging-typing", messagingUserId, selectedChat],
    queryFn: async () => {
      const response = await fetch(`/api/messages/typing?otherUserId=${selectedChat}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch typing state");
      return response.json();
    },
    enabled: !!messagingUserId && !!selectedChat,
    refetchInterval: selectedChat ? 300 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { data: incomingCallData } = useQuery({
    queryKey: ["messaging-incoming-call", messagingUserId],
    queryFn: async () => {
      const response = await fetch("/api/messages/calls?type=incoming", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch incoming call");
      return response.json();
    },
    enabled: !!messagingUserId,
    refetchInterval: 1500,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const activePeerUserId = activeCall?.targetUserId ?? incomingCall?.callerId ?? selectedChat;
  const { data: activeCallData } = useQuery({
    queryKey: ["messaging-active-call", messagingUserId, activePeerUserId],
    queryFn: async () => {
      const response = await fetch(`/api/messages/calls?type=conversation&otherUserId=${activePeerUserId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch active call");
      return response.json();
    },
    enabled: !!messagingUserId && !!activePeerUserId,
    refetchInterval: activePeerUserId ? 1000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const conversations: Conversation[] = conversationsData?.conversations || [];
  const messages: Message[] = chatData?.messages || [];
  const availableUsers: User[] = usersData?.users || [];

  useEffect(() => {
    setOnlineUsers(new Set(presenceData?.onlineUserIds || []));
  }, [presenceData?.onlineUserIds]);

  useEffect(() => {
    setTypingUsers(new Set(typingData?.typingUserIds || []));
  }, [typingData?.typingUserIds]);

  useEffect(() => {
    const call = incomingCallData?.call;
    if (!call || activeCall) return;
    setIncomingCall((current) =>
      current?.callId === call.id
        ? current
        : {
            callId: call.id,
            callerId: call.callerId,
            callType: call.callType,
            offer: call.offer || undefined,
          }
    );
  }, [activeCall, incomingCallData?.call]);

  useEffect(() => {
    const call = activeCallData?.call;
    if (!call || !messagingUserId) return;

    if (activeCall?.callId === call.id && call.status === "ended") {
      toast.info("Call ended");
      endCallCleanup(false);
      return;
    }

    if (activeCall?.callId === call.id && call.status === "rejected") {
      toast.error("Call declined");
      endCallCleanup(false);
      return;
    }

    if (activeCall?.callId === call.id && call.answer && peerConnectionRef.current?.signalingState === "have-local-offer") {
      peerConnectionRef.current
        .setRemoteDescription(new RTCSessionDescription(call.answer))
        .then(() => setActiveCall((current) => (current ? { ...current, status: "connected" } : current)))
        .catch((error) => console.error("Failed to set remote answer", error));
    }

    const remoteCandidates =
      call.callerId === messagingUserId
        ? Array.isArray(call.calleeCandidates)
          ? call.calleeCandidates
          : []
        : Array.isArray(call.callerCandidates)
          ? call.callerCandidates
          : [];

    for (const candidate of remoteCandidates) {
      const key = JSON.stringify(candidate);
      if (processedRemoteCandidateKeysRef.current.has(key) || !peerConnectionRef.current) continue;
      processedRemoteCandidateKeysRef.current.add(key);
      peerConnectionRef.current
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch((error) => console.error("Failed to add ICE candidate", error));
    }
  }, [activeCall?.callId, activeCallData?.call, messagingUserId]);

  useEffect(() => {
    if (activeCall?.status !== "connected") {
      setCallDurationSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDurationSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall?.status]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conv: Conversation) => conv.user.id === selectedChat) ||
      (chatData?.otherUser ? { user: chatData.otherUser } : null),
    [chatData?.otherUser, conversations, selectedChat]
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(`/api/messages`, {
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
    onMutate: async (message) => {
      if (!selectedChat || !messagingUserId) return null;
      const optimisticId = `temp-${Date.now()}`;
      const previousChat = queryClient.getQueryData(["chat", messagingUserId, selectedChat]);
      queryClient.setQueryData(["chat", messagingUserId, selectedChat], (current: any) => {
        const existingMessages = Array.isArray(current?.messages) ? current.messages : [];
        return {
          ...current,
          otherUser: current?.otherUser || selectedConversation?.user || null,
          messages: [
            ...existingMessages,
            {
              id: optimisticId,
              message,
              createdAt: new Date().toISOString(),
              read: false,
              sender: {
                id: messagingUserId,
                fullName: user?.fullName,
                email: user?.email,
                avatar: user?.avatar || null,
              },
              receiver: selectedConversation?.user || { id: selectedChat, fullName: "", email: "", avatar: null },
            },
          ],
        };
      });
      setMessageInput("");
      typingActiveRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      void updateTypingState(selectedChat, false).catch(() => undefined);
      return { optimisticId, previousChat };
    },
    onSuccess: (payload, _message, context) => {
      const createdMessage = payload?.message;
      if (createdMessage && selectedChat) {
        socket.emit("message:new", { receiverId: selectedChat, message: createdMessage });
        queryClient.setQueryData(["chat", messagingUserId, selectedChat], (current: any) => {
          const existingMessages = Array.isArray(current?.messages) ? current.messages : [];
          const alreadyExists = existingMessages.some((entry: any) => entry.id === createdMessage.id);
          if (alreadyExists) return current;
          return {
            ...current,
            otherUser: current?.otherUser || selectedConversation?.user || null,
            messages: [
              ...existingMessages.filter((entry: any) => entry.id !== context?.optimisticId),
              {
                ...createdMessage,
                sender: {
                  id: messagingUserId,
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
      queryClient.invalidateQueries({ queryKey: ["chat", messagingUserId, selectedChat] });
      queryClient.invalidateQueries({ queryKey: ["conversations", messagingUserId] });
      void refetchChat();
      void refetchConversations();
    },
    onError: (error, _message, context) => {
      if (selectedChat && messagingUserId && context?.previousChat) {
        queryClient.setQueryData(["chat", messagingUserId, selectedChat], context.previousChat);
      }
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to delete message");
      return { messageId };
    },
    onSuccess: ({ messageId }) => {
      queryClient.setQueryData(["chat", messagingUserId, selectedChat], (current: any) => ({
        ...current,
        messages: Array.isArray(current?.messages)
          ? current.messages.filter((entry: Message) => entry.id !== messageId)
          : [],
      }));
      queryClient.invalidateQueries({ queryKey: ["conversations", messagingUserId] });
      toast.success("Message deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete message");
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChat) throw new Error("No conversation selected");
      const response = await fetch(`/api/messages/chat/${selectedChat}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to clear chat");
      return payload;
    },
    onSuccess: () => {
      queryClient.setQueryData(["chat", messagingUserId, selectedChat], (current: any) => ({
        ...current,
        messages: [],
      }));
      queryClient.invalidateQueries({ queryKey: ["conversations", messagingUserId] });
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
    if (!messagingUserId || !selectedChat || !Array.isArray(chatData?.messages)) return;
    const unreadIncoming = chatData.messages.filter(
      (entry: Message) => entry.sender.id === selectedChat && !entry.read
    );
    if (unreadIncoming.length === 0) return;

    const messageIds = unreadIncoming.map((entry: Message) => entry.id);
    void fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        otherUserId: selectedChat,
        messageIds,
      }),
    }).then(() => {
      queryClient.setQueryData(["chat", messagingUserId, selectedChat], (current: any) => ({
        ...current,
        messages: Array.isArray(current?.messages)
          ? current.messages.map((entry: Message) =>
              messageIds.includes(entry.id) ? { ...entry, read: true } : entry
            )
          : [],
      }));
      queryClient.invalidateQueries({ queryKey: ["conversations", messagingUserId] });
      void refetchChat();
      void refetchConversations();
    });
  }, [chatData?.messages, messagingUserId, queryClient, selectedChat]);

  useEffect(() => {
    if (userIdFromQuery) {
      setSelectedChat(userIdFromQuery);
    }
  }, [userIdFromQuery]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingActiveRef.current = false;
      if (selectedChatRef.current) {
        void updateTypingState(selectedChatRef.current, false).catch(() => undefined);
      }
    };
  }, []);

  const filteredConversations = conversations.filter((conv: Conversation) =>
    conv.user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRemoteUser = selectedConversation?.user || null;
  const activeCallerUser = incomingCall
    ? conversations.find((conv: Conversation) => conv.user.id === incomingCall.callerId)?.user ||
      availableUsers.find((entry: User) => entry.id === incomingCall.callerId) ||
      (chatData?.otherUser?.id === incomingCall.callerId ? chatData.otherUser : null)
    : null;

  const attachLocalStream = (stream: MediaStream) => {
    localStreamRef.current = stream;
    setIsMicrophoneMuted(!stream.getAudioTracks().some((track) => track.enabled));
    const hasVideoTrack = stream.getVideoTracks().length > 0;
    setIsCameraEnabled(hasVideoTrack ? stream.getVideoTracks().some((track) => track.enabled) : false);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      void localVideoRef.current.play().catch(() => undefined);
    }
  };

  const attachRemoteStream = (stream: MediaStream) => {
    remoteStreamRef.current = stream;
    setRemoteMediaReady(true);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      const sinkTarget = remoteVideoRef.current as HTMLVideoElement & { setSinkId?: (sinkId: string) => Promise<void> };
      if (typeof sinkTarget.setSinkId === "function") {
        void sinkTarget.setSinkId("default").catch(() => undefined);
      }
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1;
      void remoteVideoRef.current.play().catch(() => undefined);
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      const audioSinkTarget = remoteAudioRef.current as HTMLAudioElement & { setSinkId?: (sinkId: string) => Promise<void> };
      if (typeof audioSinkTarget.setSinkId === "function" && typeof window !== "undefined" && window.innerWidth >= 1024) {
        void audioSinkTarget.setSinkId("default").catch(() => undefined);
      }
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1;
      void remoteAudioRef.current.play().catch(() => undefined);
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      void localVideoRef.current.play().catch(() => undefined);
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1;
      void remoteVideoRef.current.play().catch(() => undefined);
    }
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1;
      void remoteAudioRef.current.play().catch(() => undefined);
    }
  }, [activeCall, incomingCall, remoteMediaReady]);

  const ensureMedia = async (callType: "audio" | "video") => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media devices are not available in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video:
        callType === "video"
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 30 },
              facingMode: "user",
            }
          : false,
    });
    attachLocalStream(stream);
    return stream;
  };

  const toggleMicrophone = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextMuted = !isMicrophoneMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMicrophoneMuted(nextMuted);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream || activeCall?.callType !== "video") return;

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return;

    const nextEnabled = !isCameraEnabled;
    videoTracks.forEach((track) => {
      track.enabled = nextEnabled;
    });
    setIsCameraEnabled(nextEnabled);
  };

  const sendCallCandidate = (callId: string, candidate: RTCIceCandidateInit) =>
    fetch(`/api/messages/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        action: "candidate",
        candidate,
      }),
    }).catch(() => undefined);

  const createPeerConnection = (
    targetUserId: string,
    callType: "audio" | "video",
    onLocalCandidate: (candidate: RTCIceCandidateInit) => void
  ) => {
    const peer = new RTCPeerConnection(rtcConfig);
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        onLocalCandidate(event.candidate.toJSON());
      }
    };
    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) attachRemoteStream(stream);
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setActiveCall((current) => (current ? { ...current, status: "connected", targetUserId, callType } : current));
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
      processedRemoteCandidateKeysRef.current = new Set();
      const stream = await ensureMedia(callType);
      let currentCallId: string | null = null;
      const pendingCandidates: RTCIceCandidateInit[] = [];
      const peer = createPeerConnection(selectedChat, callType, (candidate) => {
        if (!currentCallId) {
          pendingCandidates.push(candidate);
          return;
        }
        void sendCallCandidate(currentCallId, candidate);
      });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await fetch(`/api/messages/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          calleeId: selectedChat,
          callType,
          offer,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to start call");
      }
      const callId = payload.call.id as string;
      currentCallId = callId;
      for (const candidate of pendingCandidates) {
        void sendCallCandidate(callId, candidate);
      }
      setActiveCall({ callId, status: "calling", targetUserId: selectedChat, callType });
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
      processedRemoteCandidateKeysRef.current = new Set();
      const stream = await ensureMedia(incomingCall.callType);
      const peer = createPeerConnection(incomingCall.callerId, incomingCall.callType, (candidate) => {
        void sendCallCandidate(incomingCall.callId, candidate);
      });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      const response = await fetch(`/api/messages/calls/${incomingCall.callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "answer",
          answer,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to answer call");
      }
      setActiveCall({
        callId: incomingCall.callId,
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
    void fetch(`/api/messages/calls/${incomingCall.callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ action: "reject" }),
    }).catch(() => undefined);
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
      return formatTimeForUser(date);
    } else {
      return format(date, "MMM dd");
    }
  };

  const formatCallDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const renderCallLabel = (message: Message) => {
    const duration = message.durationSeconds ? formatCallDuration(message.durationSeconds) : null;
    return duration ? `${message.message} (${duration})` : message.message;
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
                          {conversation.lastMessage.type === "call_event"
                            ? renderCallLabel(conversation.lastMessage as unknown as Message)
                            : conversation.lastMessage.message}
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
                messages.map((message: Message) => {
                  const isOwnMessage = message.sender.id === messagingUserId;
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
                        {message.type === "call_event" ? (
                          <div className="flex items-center gap-2">
                            {message.callType === "video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                            <p className="text-sm font-medium">{renderCallLabel(message)}</p>
                          </div>
                        ) : (
                          <p className="text-sm">{message.message}</p>
                        )}
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
                      {isOwnMessage && message.type !== "call_event" && (
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
                    handleTyping(e.target.value);
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
              ) : availableUsers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  {userSearchQuery.trim().length === 0 ? "No available contacts found" : "No users found"}
                </p>
              ) : (
                availableUsers.map((u: any) => (
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
                        {[u.role ? String(u.role).replace(/_/g, " ") : null, u.email].filter(Boolean).join(" - ")}
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
        <DialogContent className="overflow-hidden border-border bg-gradient-to-br from-background via-background to-primary/5 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{incomingCall?.callType === "video" ? "Incoming video call" : "Incoming voice call"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {incomingCall?.callType === "video" ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
                </div>
                <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                  <AvatarImage src={activeCallerUser?.avatar || undefined} />
                  <AvatarFallback>{getInitial(activeCallerUser)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold">{getDisplayName(activeCallerUser)}</p>
                  <p className="text-sm text-muted-foreground">{activeCallerUser?.email}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {incomingCall?.callType === "video" ? "Camera + microphone" : "Microphone + speaker"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    Device permissions required
                  </Badge>
                </div>
                <p className="max-w-md text-sm text-muted-foreground">
                  {incomingCall?.callType === "video"
                    ? "Answer to start a live video consultation using this device camera, microphone, and default speaker output."
                    : "Answer to start a live voice consultation using this device microphone and default speaker output."}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="destructive" onClick={rejectCall} className="h-11">
                <PhoneOff className="mr-2 h-4 w-4" />
                Decline
              </Button>
              <Button onClick={acceptCall} className="h-11">
                {incomingCall?.callType === "video" ? <Video className="mr-2 h-4 w-4" /> : <Phone className="mr-2 h-4 w-4" />}
                Accept
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeCall} onOpenChange={(open) => !open && endCallCleanup(true)}>
        <DialogContent className={cn(
          "overflow-hidden border-border bg-[#0b1220] p-0 text-white",
          activeCall?.callType === "video" ? "sm:max-w-6xl" : "sm:max-w-2xl"
        )}>
          <DialogHeader>
            <DialogTitle className="sr-only">
              {activeCall?.callType === "video" ? "Video Call" : "Voice Call"} with {getDisplayName(activeRemoteUser)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-0">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-white/5 px-6 py-4">
              <div>
                <p className="text-lg font-semibold">{getDisplayName(activeRemoteUser)}</p>
                <p className="text-sm text-white/70">
                  {activeCall?.status === "calling"
                    ? "Waiting for the other participant to answer."
                    : `Connected · ${formatCallDuration(callDurationSeconds)}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                  {activeCall?.callType === "video" ? "Camera" : "Voice"}
                </Badge>
                <Badge className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                  {isMicrophoneMuted ? "Mic muted" : "Mic live"}
                </Badge>
                <Badge className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                  <Volume2 className="mr-2 h-3.5 w-3.5" />
                  Default speaker
                </Badge>
              </div>
            </div>
            {callError && (
              <div className="mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                {callError}
              </div>
            )}

            {activeCall?.callType === "video" ? (
              <div className="relative aspect-[16/9] bg-[#020617]">
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                {!remoteMediaReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#020617]">
                    <Avatar className="h-24 w-24 border border-white/10">
                      <AvatarImage src={activeRemoteUser?.avatar || undefined} />
                      <AvatarFallback className="bg-white/10 text-2xl text-white">{getInitial(activeRemoteUser)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{getDisplayName(activeRemoteUser)}</p>
                      <p className="text-sm text-white/60">
                        {activeCall?.status === "calling" ? "Ringing..." : "Waiting for remote video"}
                      </p>
                    </div>
                  </div>
                )}
                <div className="absolute right-6 top-6 w-48 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                  {isCameraEnabled ? (
                    <video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-slate-900 text-sm text-white/70">
                      Camera off
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-black/70 px-3 py-2 text-xs text-white/80">
                    <span>You</span>
                    <span>{isMicrophoneMuted ? "Muted" : "Live"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden px-6 py-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.14),_transparent_35%)]" />
                <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
                  <Avatar className="mx-auto h-24 w-24 border border-white/10">
                    <AvatarImage src={activeRemoteUser?.avatar || undefined} />
                    <AvatarFallback className="bg-white/10 text-2xl text-white">{getInitial(activeRemoteUser)}</AvatarFallback>
                  </Avatar>
                  <p className="mt-5 text-2xl font-semibold">{getDisplayName(activeRemoteUser)}</p>
                  <p className="mt-2 text-sm text-white/70">
                    Audio is using this device microphone and default speaker output.
                  </p>
                  <p className="mt-4 text-sm text-white/70">
                    {activeCall?.status === "calling" ? "Calling..." : "Connected"}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <Badge className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                      {isMicrophoneMuted ? "Mic muted" : "Mic live"}
                    </Badge>
                    <Badge className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                      <Volume2 className="mr-2 h-3.5 w-3.5" />
                      Speaker active
                    </Badge>
                  </div>
                </div>
                <p className="relative mt-4 text-center text-xs text-white/50">
                  {activeCall?.status === "calling" ? "Calling..." : "Connected"}
                </p>
                <div className="hidden">
                  <video ref={remoteVideoRef} autoPlay playsInline />
                  <video ref={localVideoRef} autoPlay muted playsInline />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-black/30 px-6 py-4">
              <Button
                variant="secondary"
                onClick={toggleMicrophone}
                className="h-11 min-w-36 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
              >
                {isMicrophoneMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {isMicrophoneMuted ? "Unmute" : "Mute"}
              </Button>
              {activeCall?.callType === "video" && (
                <Button
                  variant="secondary"
                  onClick={toggleCamera}
                  className="h-11 min-w-36 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
                >
                  {isCameraEnabled ? <Camera className="mr-2 h-4 w-4" /> : <CameraOff className="mr-2 h-4 w-4" />}
                  {isCameraEnabled ? "Stop camera" : "Start camera"}
                </Button>
              )}
              <Button variant="destructive" onClick={() => endCallCleanup(true)} className="h-11 min-w-40 rounded-full">
                {activeCall?.callType === "video" ? <VideoOff className="mr-2 h-4 w-4" /> : <PhoneOff className="mr-2 h-4 w-4" />}
                End Call
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}


