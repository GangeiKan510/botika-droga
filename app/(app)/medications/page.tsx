import Link from "next/link";

import { MedicationsCatalog } from "@/components/MedicationsCatalog";
import { getMedications } from "@/lib/queries";

export default async function MedicationsPage() {
  const medications = await getMedications(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-semibold text-teal-900"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Medications
          </h1>
          <p className="mt-2 text-teal-800/70">
            Master catalog — names, variants, prices, and reorder points.
          </p>
        </div>
        <Link href="/medications/new" className="btn btn-primary">
          Add medication
        </Link>
      </div>

      <MedicationsCatalog medications={medications} />
    </div>
  );
}
