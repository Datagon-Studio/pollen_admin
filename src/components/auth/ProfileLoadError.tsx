import { useNavigate } from "react-router-dom";
import { AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export function ProfileLoadError({ message }: { message: string }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleBackToSignIn = async () => {
    await logout();
    navigate("/signin", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Could not load staff profile</CardTitle>
          </div>
          <CardDescription>
            You are signed in, but the portal could not verify your platform role with the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{message}</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Production calls <code className="text-xs">https://app.pollean.com/api/v1</code>. A relative <code className="text-xs">/api</code> on this host returns this page.</li>
            <li>In local dev, leave <code className="text-xs">VITE_API_URL</code> unset so Vite proxies <code className="text-xs">/api</code> to port 3001.</li>
            <li>Confirm <code className="text-xs">users.role = superadmin</code> in Supabase (group admin is <code className="text-xs">admin</code>, not staff).</li>
          </ul>
          <Button onClick={handleBackToSignIn}>
            <LogIn className="h-4 w-4 mr-2" />
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
