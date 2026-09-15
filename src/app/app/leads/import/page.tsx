import { PageHeader } from "@/components/ui/page-header";
import { ImportCsvForm } from "@/components/leads/import-csv-form";

export default function ImportLeadsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Leads"
        title="Import contacts"
        description="Upload a CSV with company, name, and email columns. Reigna dedupes against your existing pipeline, checks suppression, and verifies every address before saving it."
      />
      <ImportCsvForm />
    </div>
  );
}
