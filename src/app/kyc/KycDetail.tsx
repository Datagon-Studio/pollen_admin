import { useParams, Link } from "react-router-dom";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";

export default function KycDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <SectionPage
      title="KYC submission"
      description={`Review documents for submission ${id}. Approve/reject available to ops and super admin.`}
      phase="ready"
    >
      <Button asChild variant="outline" size="sm">
        <Link to="/kyc">← KYC queue</Link>
      </Button>
    </SectionPage>
  );
}
