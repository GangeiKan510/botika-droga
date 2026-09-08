import Link from "next/link";
import { notFound } from "next/navigation";

import { deactivateMedication } from "@/app/actions/medications";
import { MedicationForm } from "@/components/MedicationForm";
import { getMedication } from "@/lib/queries";

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const medication = await getMedication(id);
  if (!medication) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/medications" className="link link-primary text-sm">
            ← Medications
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-teal-900">
            Edit medication
          </h1>
        </div>
        {medication.is_active ? (
          <form
            action={async () => {
              "use server";
              await deactivateMedication(id);
            }}
          >
            <button type="submit" className="btn btn-outline btn-error btn-sm">
              Deactivate
            </button>
          </form>
        ) : null}
      </div>
      <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <MedicationForm medication={medication} />
      </div>
    </div>
  );
}
