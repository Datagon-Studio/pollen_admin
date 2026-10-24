import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStaffRole } from "@/hooks/useStaffRole";
import { staffRoleLabel } from "@/lib/staff-roles";
import { userApi } from "@/services/user.api";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { profile, role, loading, error } = useStaffRole();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile || hydrated) return;
    setName(profile.full_name ?? "");
    setPhone(profile.phone_number ?? "");
    setHydrated(true);
  }, [profile, hydrated]);

  const mutation = useMutation({
    mutationFn: () =>
      userApi.updateProfile({
        full_name: name.trim(),
        phone_number: phone.trim() || null,
      }),
    onSuccess: async () => {
      setFormError(null);
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["staff-profile"] });
    },
    onError: (mutationError) => {
      setSaved(false);
      setFormError(
        mutationError instanceof Error ? mutationError.message : "Could not save profile"
      );
    },
  });

  const unchanged =
    name.trim() === (profile?.full_name ?? "").trim() &&
    phone.trim() === (profile?.phone_number ?? "").trim();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    if (!name.trim()) {
      setFormError("Enter your name.");
      return;
    }
    setFormError(null);
    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Your name is shown in the header and on actions you take, such as approving or disbursing a settlement.
        </p>
      </div>
      {loading && <p className="text-muted-foreground">Loading profile...</p>}
      {error && (
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Unable to load profile"}
        </p>
      )}

      {profile && (
        <form onSubmit={onSubmit} className="max-w-xl rounded-lg border bg-card p-5 space-y-5">
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium break-all">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium">{role ? staffRoleLabel(role) : profile.role}</dd>
            </div>
          </dl>

          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
              maxLength={255}
              autoComplete="name"
              placeholder="Your name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setSaved(false);
              }}
              maxLength={30}
              autoComplete="tel"
              placeholder="Optional"
            />
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          {saved && !formError && (
            <p className="text-sm text-success">Profile saved.</p>
          )}

          <Button type="submit" disabled={mutation.isPending || !hydrated || unchanged}>
            {mutation.isPending ? "Saving..." : "Save profile"}
          </Button>
        </form>
      )}
    </div>
  );
}
