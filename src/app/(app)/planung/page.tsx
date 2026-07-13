import { endOfMonth, startOfMonth } from "date-fns";
import { getPlanningData, getPlanningCategories } from "@/lib/actions/planning";
import { PlanningBoard } from "@/components/planning/planning-board";
import { PageHeader } from "@/components/shared/page-header";

export default async function PlanungPage() {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());

  const [{ products, bookings }, categories] = await Promise.all([
    getPlanningData(start, end),
    getPlanningCategories(),
  ]);

  return (
    <div className="-mx-6 -mb-6 flex h-[calc(100vh-4rem)] flex-col px-6">
      <PageHeader
        title="Planung"
        description="Gantt-Ansicht für Produktbelegung und Buchungsplanung"
      />
      <div className="min-h-0 flex-1 pb-6">
        <PlanningBoard
          initialProducts={products}
          initialBookings={bookings}
          categories={categories}
        />
      </div>
    </div>
  );
}
