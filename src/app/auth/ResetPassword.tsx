import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const tokenHash = searchParams.get("token_hash");
  const recoveryType = searchParams.get("type") === "invite" ? "invite" : "recovery";

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const description =
      searchParams.get("error_description") || hashParams.get("error_description");
    const urlError = searchParams.get("error") || hashParams.get("error");
    if (urlError || description) {
      setError(
        description?.replace(/\+/g, " ") ||
          "This password setup link is no longer valid. Ask a super admin to invite you again."
      );
    }
  }, [searchParams]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setTokenReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) setTokenReady(true);
  }, [user]);

  const continueWithToken = async () => {
    if (!tokenHash) return;
    setVerifying(true);
    setError("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: recoveryType,
      });
      if (verifyError) {
        throw new Error(
          "This password setup link has expired or was already used. Ask a super admin to invite you again."
        );
      }
      setTokenReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify this password setup link.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use a password of at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      navigate("/signin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the password.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const canSetPassword = Boolean(user) || tokenReady;
  const hasInviteToken = Boolean(tokenHash) && !canSetPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <EmptyState
            illustration={canSetPassword ? "secure-password" : "forgot-password"}
            size="auth"
          />
          <CardTitle>Set a password</CardTitle>
          <CardDescription>
            {canSetPassword
              ? "Choose a password, then sign in to the admin portal."
              : hasInviteToken
                ? "Confirm below before the invite link is used."
                : "Open the password setup link from your email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canSetPassword ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Save password"}
              </Button>
            </form>
          ) : hasInviteToken ? (
            <div className="space-y-4">
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Confirm you want to set your password. This keeps an email scanner from using the
                link first.
              </p>
              <Button type="button" className="w-full" onClick={continueWithToken} disabled={verifying}>
                {verifying ? "Verifying…" : "Continue"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/signin")}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Check your email and open the password setup link.
                </p>
              )}
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/signin")}>
                Back to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
