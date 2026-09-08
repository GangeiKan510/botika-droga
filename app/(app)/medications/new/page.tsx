import Link from "next/link";

import { MedicationForm } from "@/components/MedicationForm";

export default function NewMedicationPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/medications" className="link link-primary text-sm">
          ← Medications
        </Link>
        <h1
          className="mt-2 text-3xl font-semibold text-teal-900"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Add medication
        </h1>
      </div>
      <div className="rounded-2xl border border-teal-100 bg-white/80 p-6">
        <MedicationForm />
      </div>
    </div>
  );
}
