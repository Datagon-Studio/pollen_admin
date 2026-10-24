import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function getAuthErrorFromUrl(searchParams: URLSearchParams): string | null {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const error =
    searchParams.get("error") ||
    searchParams.get("error_code") ||
    hashParams.get("error") ||
    hashParams.get("error_code");
  const description =
    searchParams.get("error_description") || hashParams.get("error_description");

  if (!error && !description) return null;

  const normalized = `${error || ""} ${description || ""}`.toLowerCase();
  if (normalized.includes("otp_expired") || normalized.includes("expired")) {
    return "This reset link has expired or was already used. Request a new one from the sign-in page.";
  }
  if (normalized.includes("access_denied")) {
    return description?.replace(/\+/g, " ") || "This reset link is no longer valid.";
  }
  return description?.replace(/\+/g, " ") || "Unable to open this reset link.";
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [awaitingRecovery, setAwaitingRecovery] = useState(() => {
    const hash = window.location.hash;
    return hash.includes("type=recovery") || hash.includes("access_token");
  });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const tokenHash = searchParams.get("token_hash");
  const recoveryType = searchParams.get("type") || "recovery";

  useEffect(() => {
    const urlError = getAuthErrorFromUrl(searchParams);
    if (urlError) {
      setError(urlError);
      setAwaitingRecovery(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setError("");
        setTokenReady(true);
        setAwaitingRecovery(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setTokenReady(true);
      setAwaitingRecovery(false);
      return;
    }
    const hash = window.location.hash;
    if (!hash.includes("access_token") && !hash.includes("type=recovery")) {
      setAwaitingRecovery(false);
    }
  }, [authLoading, user]);

  const handleContinueWithToken = async () => {
    if (!tokenHash) return;

    setVerifyingToken(true);
    setError("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: recoveryType === "invite" ? "invite" : "recovery",
      });

      if (verifyError) {
        const message = verifyError.message?.toLowerCase() || "";
        if (message.includes("expired") || message.includes("otp") || message.includes("invalid")) {
          throw new Error(
            "This reset link has expired or was already used. Request a new one from the sign-in page."
          );
        }
        throw verifyError;
      }

      setTokenReady(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to verify this reset link.");
    } finally {
      setVerifyingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      navigate("/signin?reset=updated", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update the password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (awaitingRecovery && !tokenReady && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  const canSetPassword = Boolean(user) || tokenReady;
  const hasResetToken = Boolean(tokenHash) && !canSetPassword;

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="grid lg:grid-cols-2 h-full">
        <div className="hidden lg:block relative overflow-hidden">
          <img
            src="/images/admin-login.jpg"
            alt="Workspace with a laptop, coffee, and notes"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex items-center justify-center p-4 h-full overflow-y-auto">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Reset password</CardTitle>
              <CardDescription className="text-center">
                {canSetPassword
                  ? "Choose a new password for your staff account."
                  : hasResetToken
                    ? "Confirm below to continue. This keeps email scanners from using the link."
                    : "Open the reset link from your email to choose a new password."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canSetPassword ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      minLength={8}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Updating…" : "Update password"}
                  </Button>
                </form>
              ) : hasResetToken ? (
                <div className="space-y-4">
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
                  )}
                  <Button className="w-full" onClick={handleContinueWithToken} disabled={verifyingToken}>
                    {verifyingToken ? "Verifying…" : "Continue"}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/signin")}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {error ? (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      Check your email and open the reset link to continue.
                    </p>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => navigate("/signin")}>
                    Back to sign in
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
