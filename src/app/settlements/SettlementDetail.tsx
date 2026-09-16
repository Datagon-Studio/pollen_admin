import { useParams, Link } from "react-router-dom";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";

export default function SettlementDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <SectionPage
      title="Settlement request"
      description={`Request ${id} — mark successful or cancel with required note.`}
      phase="api"
    >
      <Button asChild variant="outline" size="sm">
        <Link to="/settlements">← All settlements</Link>
      </Button>
    </SectionPage>
  );
}
