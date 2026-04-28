"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import {
  PageHeader,
  SectionCard,
  Button,
  Input,
  Label,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Badge,
  Skeleton,
} from "@/components/ui";
import {
  User,
  Camera,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Upload,
  Edit,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  bio?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  permissions: string[];
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    bio: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<ProfileData> => {
      const response = await fetch(`/api/users/profile?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log("Updating profile with data:", data);
      const response = await fetch(`/api/users/profile?userId=${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          const responseText = await response.text();
          console.error("Response text:", responseText);
          throw new Error(`HTTP ${response.status}: ${responseText || response.statusText}`);
        }

        console.error("API error response:", errorData);
        const errorMessage = errorData?.details || errorData?.error || `HTTP ${response.status}: Update failed`;
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate with the same keys used in the query
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(errorMessage);
      console.error("Update error:", error);
    },
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("Uploading avatar file:", file.name);
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch(`/api/users/avatar?userId=${user?.id}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          const responseText = await response.text();
          console.error("Response text:", responseText);
          throw new Error(`HTTP ${response.status}: ${responseText || response.statusText}`);
        }

        console.error("Avatar upload error response:", errorData);
        const errorMessage = errorData?.details || errorData?.error || `HTTP ${response.status}: Upload failed`;
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate with the same keys used in the query
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setSelectedFile(null);
      setPreviewUrl(null);
      // Update the auth store with the new avatar
      if (user) {
        useAuthStore.getState().setUser({ ...user, avatar: data.avatar });
      }
      toast.success("Avatar updated successfully");
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload avatar";
      toast.error(errorMessage);
      console.error("Upload error:", error);
    },
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        address: profile.address || "",
        dateOfBirth: profile.dateOfBirth || "",
        bio: profile.bio || "",
      });
    }
  }, [profile]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = () => {
    if (!user?.id) {
      toast.error("User ID not available");
      console.error("Cannot save: user.id is missing");
      return;
    }
    console.log("Saving profile for user:", user.id);
    updateProfileMutation.mutate(formData);
  };

  const handleUploadAvatar = () => {
    console.log("handleUploadAvatar called");
    console.log("user:", user);
    console.log("user?.id:", user?.id);
    console.log("selectedFile:", selectedFile);

    if (selectedFile) {
      uploadAvatarMutation.mutate(selectedFile);
    } else {
      console.error("No file selected for upload");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      fullName: profile?.fullName || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      dateOfBirth: profile?.dateOfBirth || "",
      bio: profile?.bio || "",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" subtitle="Manage your account information" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SectionCard>
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </SectionCard>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title="Personal Information">
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" subtitle="Manage your account information" />
        <SectionCard>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load profile data</p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Manage your account information"
        actions={
          !isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateProfileMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="inline-flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <SectionCard>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={previewUrl || profile.avatar}
                    alt={profile.fullName || "Profile"}
                  />
                  <AvatarFallback className="text-2xl">
                    {(profile.fullName || profile.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold">{profile.fullName || "No name set"}</h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {profile.roles.map((role) => (
                    <Badge key={role.id} variant="secondary" className="text-xs">
                      {role.name.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedFile && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUploadAvatar}
                    disabled={uploadAvatarMutation.isPending}
                  >
                    {uploadAvatarMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Account Status */}
          <SectionCard title="Account Status" className="mt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant={profile.isActive ? "success" : "destructive"}>
                  {profile.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Member Since</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Updated</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(profile.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.fullName || "Not set"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.phone || "Not set"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                {isEditing ? (
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {profile.dateOfBirth
                        ? new Date(profile.dateOfBirth).toLocaleDateString()
                        : "Not set"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <Label htmlFor="address">Address</Label>
              {isEditing ? (
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your address"
                  rows={3}
                />
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/50">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{profile.address || "Not set"}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 mt-6">
              <Label htmlFor="bio">Bio</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              ) : (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <span>{profile.bio || "No bio added yet"}</span>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Roles & Permissions */}
          <SectionCard title="Roles & Permissions">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Roles</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.roles.map((role) => (
                    <Badge key={role.id} variant="outline" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {role.name.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Permissions</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.permissions.slice(0, 10).map((permission) => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                  {profile.permissions.length > 10 && (
                    <Badge variant="secondary" className="text-xs">
                      +{profile.permissions.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
