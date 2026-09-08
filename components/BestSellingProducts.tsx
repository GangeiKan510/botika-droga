import Link from "next/link";

import {
  formatMoney,
  medicationDisplayName,
  type BestSeller,
} from "@/lib/inventory";

export function BestSellingProducts({
  items,
  year,
}: {
  items: BestSeller[];
  year: number;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-teal-100 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-teal-900">
          Best Selling Products
        </h2>
        <span className="text-xs text-teal-800/55">{year}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-teal-800/60">
          No dispensed sales yet this year.
        </p>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-teal-50">
          {items.map((item) => (
            <li key={item.medication_id} className="py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-teal-950">
                  {medicationDisplayName({
                    generic_name: item.generic_name,
                    brand_name: item.brand_name,
                    strength: item.strength,
                    dosage_form: item.dosage_form,
                  })}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-teal-700">
                  {formatMoney(item.revenue)}
                </p>
                <p className="text-xs text-teal-800/55">
                  {item.units_sold} {item.units_sold === 1 ? "Sale" : "Sales"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-teal-50 pt-3">
        <Link href="/sales" className="link link-primary text-sm">
          View sales report
        </Link>
      </div>
    </section>
  );
}
