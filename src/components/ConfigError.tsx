import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ConfigError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Configuration required</CardTitle>
          <CardDescription>The admin portal cannot start without Supabase credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">{message}</p>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`cd pollen_admin
cp .env.example .env.local
# Paste VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# from pollen_frontend/frontend/.env.local
npm run dev`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
