import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { request } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    searchParams.get("reset") === "updated"
      ? "Your password has been updated. Sign in with the new password."
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleForgotPassword = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    try {
      setResettingPassword(true);
      const response = await request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          origin: window.location.origin,
        }),
      });
      if (!response.success) {
        throw new Error(response.error || "Could not send the reset email.");
      }
      setNotice("Check your email for a link to reset your password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset email.");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      // Wait for session before routing (avoids bounce back to /signin)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Sign in succeeded but no session was created. Try again.");
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

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
              <CardTitle className="text-2xl text-center">Pollean System Admin</CardTitle>
              <CardDescription className="text-center">
                Staff sign-in only. Requires a platform role of superadmin, ops, or support.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
                )}
                {notice && (
                  <p className="text-sm bg-secondary rounded-md p-3">{notice}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resettingPassword}
                      className="text-sm text-amber hover:underline font-medium disabled:opacity-50"
                    >
                      {resettingPassword ? "Sending…" : "Forgot password?"}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
