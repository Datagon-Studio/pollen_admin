import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useStaffRole } from "@/hooks/useStaffRole";

export default function Forbidden() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { role, isStaff } = useStaffRole();

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
          <CardDescription>You do not have permission to view this page.</CardDescription>
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
