import { getReportData } from "@/lib/actions/reports";
import { ReportsClient } from "./reports-client";

interface BerichtePageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function BerichtePage({ searchParams }: BerichtePageProps) {
  const params = await searchParams;
  const parsedYear = params.year ? Number.parseInt(params.year, 10) : NaN;
  const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
  const data = await getReportData(year);

  return (
    <ReportsClient
      year={data.year}
      monthlyRevenue={data.monthlyRevenue}
      productRevenueByMonth={data.productRevenueByMonth}
      damages={data.damages}
      utilization={data.utilization}
    />
  );
}
