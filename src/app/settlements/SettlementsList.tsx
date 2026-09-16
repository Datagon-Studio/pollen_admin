import { SectionPage } from "@/components/pages/SectionPage";

export default function SettlementsList() {
  return (
    <SectionPage
      title="Settlement requests"
      description="Ops queue: pending → successful or canceled. Distinct from settlement destination details."
      phase="api"
    />
  );
}
