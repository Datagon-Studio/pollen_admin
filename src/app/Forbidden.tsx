import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useStaffRole } from "@/hooks/useStaffRole";

export default function Forbidden() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { profile, role, isStaff } = useStaffRole();
  const platformRole =
    (location.state as { platformRole?: string } | null)?.platformRole ?? profile?.role;

  const handleBackToSignIn = async () => {
    await logout();
    queryClient.clear();
    navigate("/signin", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <ShieldOff className="h-5 w-5" />
            <CardTitle>Not authorized</CardTitle>
          </div>
          <CardDescription>
            {profile && !role
              ? `Signed in as ${profile.email} with platform role "${platformRole}". Staff portal requires superadmin, ops, or support — group manager is "admin", which is different.`
              : "You do not have permission to view this page."}
          </CardDescription>
          {profile && !role && platformRole === "admin" && (
            <p className="text-xs text-muted-foreground mt-2">
              Run in Supabase:{" "}
              <code className="bg-muted px-1 rounded">
                UPDATE users SET role = &apos;superadmin&apos; WHERE email = &apos;{profile.email}&apos;;
              </code>
            </p>
          )}
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleBackToSignIn} className="w-full sm:w-auto">
            <LogIn className="h-4 w-4 mr-2" />
            Back to sign in
          </Button>
          {isStaff && role && (
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/")}>
              Go to dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
