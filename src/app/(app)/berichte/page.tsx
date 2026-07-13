import { getReportData } from "@/lib/actions/reports";
import { ReportsClient } from "./reports-client";

export default async function BerichtePage() {
  const data = await getReportData();
  return (
    <ReportsClient
      monthlyRevenue={data.monthlyRevenue}
      damages={data.damages}
      utilization={data.utilization}
    />
  );
}
