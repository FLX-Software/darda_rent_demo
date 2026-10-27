import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
import { getDamages } from "@/lib/actions/damages";
import { unwrapAction } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  damageCategoryLabels,
  damageSeverityLabels,
  damageStatusLabels,
} from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export default async function SchaedenPage() {
  const reports = unwrapAction(await getDamages(), []);

  return (
    <div>
      <PageHeader
        title="Schäden"
        description="Schadensmeldungen erfassen und Reparaturen verfolgen"
        actions={[{ label: "Schaden melden", href: "/schaeden/neu", icon: <Plus className="h-4 w-4" /> }]}
      />

      {reports.length === 0 ? (
        <EmptyState
          title="Keine Schadensmeldungen"
          actionLabel="Schaden melden"
          actionHref="/schaeden/neu"
          icon={<AlertTriangle className="h-8 w-8" />}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Schadensnr.</th>
                <th className="px-4 py-3 font-medium">Produkt</th>
                <th className="px-4 py-3 font-medium">Kategorie</th>
                <th className="px-4 py-3 font-medium">Schwere</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Gemeldet</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-0">
                    <Link
                      href={`/schaeden/${r.id}`}
                      className="block px-4 py-3 font-mono text-flx-blue hover:underline"
                    >
                      {r.damageNumber}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/schaeden/${r.id}`} className="block px-4 py-3 font-medium text-gray-900">
                      {r.product.name}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/schaeden/${r.id}`} className="block px-4 py-3 text-gray-500">
                      {damageCategoryLabels[r.category]}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/schaeden/${r.id}`} className="block px-4 py-3">
                      <Badge
                        variant={
                          r.severity === "SICHERHEITSRELEVANT" || r.severity === "SCHWER"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {damageSeverityLabels[r.severity]}
                      </Badge>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/schaeden/${r.id}`} className="block px-4 py-3">
                      <Badge variant="secondary">{damageStatusLabels[r.status]}</Badge>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/schaeden/${r.id}`} className="block px-4 py-3 text-gray-500">
                      {formatDate(r.reportedAt)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
