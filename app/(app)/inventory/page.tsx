import { InventoryCatalog } from "@/components/InventoryCatalog";
import { getInventoryRows } from "@/lib/queries";

export default async function InventoryPage() {
  const rows = await getInventoryRows();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-teal-900">Inventory</h1>
        <p className="mt-2 text-teal-800/70">
          Quantity on hand by medication and batch. Near-expiry lots are listed
          for FEFO dispensing.
        </p>
      </div>

      <InventoryCatalog rows={rows} />
    </div>
  );
}
