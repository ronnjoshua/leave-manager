"use client";

import { useState } from "react";
import { Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProfileValues {
  name?: string | null;
  image?: string | null;
  email?: string | null;
}

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: ProfileValues;
  onSaved: (values: ProfileValues) => void;
}

export function ProfileDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: ProfileDialogProps) {
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.image ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function selectAvatar(file: File | undefined) {
    if (!file) return;
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  }

  async function saveProfile() {
    setSaving(true);
    setError("");
    try {
      const nameResponse = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const nameData = (await nameResponse.json()) as { error?: string; name?: string | null };
      if (!nameResponse.ok) throw new Error(nameData.error ?? "Unable to save profile");

      let image = user?.image ?? null;
      if (avatar) {
        const formData = new FormData();
        formData.append("avatar", avatar);
        const avatarResponse = await fetch("/api/profile/avatar", {
          method: "POST",
          body: formData,
        });
        const avatarData = (await avatarResponse.json()) as { error?: string; image?: string };
        if (!avatarResponse.ok) throw new Error(avatarData.error ?? "Unable to upload avatar");
        image = avatarData.image ?? image;
      }

      onSaved({ name: nameData.name ?? null, image });
      onOpenChange(false);
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Customize how your name and profile picture appear in Leave Tracker.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center gap-4">
            {preview ? (
              <img
                src={preview}
                alt="Profile preview"
                className="size-16 rounded-full object-cover ring-2 ring-border"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <User className="size-7 text-primary" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="profile-avatar">Profile picture</Label>
              <Input
                id="profile-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => selectAvatar(event.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">JPG, PNG, or WebP up to 2 MB.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-display-name">Display name</Label>
            <Input
              id="profile-display-name"
              value={displayName}
              maxLength={100}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
