import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SectionPageProps = {
  title: string;
  description: string;
  phase?: "mvp" | "api" | "ready";
  children?: React.ReactNode;
};

const phaseLabels = {
  mvp: "MVP scaffold",
  api: "Awaiting API",
  ready: "In progress",
} as const;

export function SectionPage({ title, description, phase = "mvp", children }: SectionPageProps) {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{description}</p>
        </div>
        <Badge variant="secondary">{phaseLabels[phase]}</Badge>
      </div>
      {children ?? (
        <Card>
          <CardHeader>
            <CardTitle>Coming next</CardTitle>
            <CardDescription>
              This route is wired in the admin shell. Data tables and actions will connect to
              platform admin APIs as they ship in the shared backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            See PRD §8 for full requirements for this section.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
