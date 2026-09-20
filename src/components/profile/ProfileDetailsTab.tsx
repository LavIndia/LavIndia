"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldStackStyle } from "@/components/profile/profile.styles";
import { css } from "styled-system/css";

/** The account's own details, and the one thing on this screen that is editable. */

const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

const rowStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  alignItems: { base: "flex-start", sm: "center" },
  gap: "6",
});
const stackStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const iconStyle = css({ h: "4", w: "4" });

export interface ProfileDetailsTabProps {
  user: Session["user"];
  profilePicture: string | null;
  onPictureChange: (picture: string | null) => void;
}

export function ProfileDetailsTab({
  user,
  profilePicture,
  onPictureChange,
}: ProfileDetailsTabProps) {
  const [uploading, setUploading] = useState(false);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PICTURE_BYTES) {
      toast.error("File size must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/user/profile-picture", { method: "POST", body });
      if (!response.ok) throw new Error("Upload failed");

      const { profilePicture: uploaded } = await response.json();
      onPictureChange(uploaded);
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    try {
      const response = await fetch("/api/user/profile-picture", { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      onPictureChange(null);
      toast.success("Profile picture removed");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to remove profile picture");
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Manage your account details and profile picture
        </CardDescription>
      </CardHeader>
      <CardContent className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
        <div className={rowStyle}>
          <Avatar className={css({ h: "24", w: "24" })}>
            <AvatarImage src={profilePicture || undefined} alt={user.name || "User"} />
            <AvatarFallback
              className={css({
                fontSize: "2xl",
                background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
                color: "fg.onGold",
              })}
            >
              {user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className={stackStyle}>
            <label htmlFor="profile-picture-upload">
              <Button asChild variant="outline" disabled={uploading}>
                <span className={css({ cursor: "pointer" })}>
                  {uploading ? (
                    <>
                      <Loader2 className={css({ h: "4", w: "4", animation: "spin" })} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className={iconStyle} />
                      Upload Photo
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="profile-picture-upload"
              type="file"
              accept="image/*"
              onChange={upload}
              className={css({ srOnly: true })}
            />
            {profilePicture && (
              <Button variant="ghost" size="sm" onClick={remove}>
                <Trash2 className={iconStyle} />
                Remove
              </Button>
            )}
            <p className={css({ fontSize: "sm", color: "fg.muted" })}>Max file size: 5MB</p>
          </div>
        </div>

        <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
          <div className={fieldStackStyle}>
            <Label>Name</Label>
            <Input value={user.name || ""} disabled />
          </div>
          <div className={fieldStackStyle}>
            <Label>Username</Label>
            <Input value={user.username || ""} disabled />
          </div>
          <div className={fieldStackStyle}>
            <Label>Email</Label>
            <Input value={user.email || ""} disabled />
          </div>
          {/* Mobile is optional on an account, and a labelled empty box reads
              as a fault rather than as "not provided". */}
          {user.mobile && (
            <div className={fieldStackStyle}>
              <Label>Mobile</Label>
              <Input value={user.mobile} disabled />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
