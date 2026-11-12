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
            You are signed in, but the portal could not verify your access right now. Try again later
            or sign in again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{message}</p>
          )}
          <Button onClick={handleBackToSignIn}>
            <LogIn className="h-4 w-4 mr-2" />
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
