"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { BookingStatus } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteBookingButton } from "@/components/bookings/delete-booking-button";
import { bookingStatusLabels, bookingTypeLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

type Booking = {
  id: string;
  bookingNumber: string;
  type: string;
  status: BookingStatus;
  startDate: Date;
  plannedReturnDate: Date;
  projectName: string | null;
  customer: { companyName: string } | null;
  contactName: string | null;
  items: { product: { name: string } }[];
};

export function BookingsList({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [list, setList] = useState(bookings);

  const filtered = useMemo(() => {
    return list.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.bookingNumber.toLowerCase().includes(q) ||
          b.projectName?.toLowerCase().includes(q) ||
          b.customer?.companyName.toLowerCase().includes(q) ||
          b.contactName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [list, search, statusFilter]);

  const statusVariant = (status: BookingStatus) => {
    if (["UEBERFAELLIG", "STORNIERT"].includes(status)) return "danger" as const;
    if (["AKTIV", "AUSGEGEBEN", "UNTERWEGS"].includes(status)) return "success" as const;
    if (["ENTWURF", "ANFRAGE"].includes(status)) return "secondary" as const;
    return "default" as const;
  };

  return (
    <div>
      <PageHeader
        title="Buchungen"
        description="Vermietungen, Demos und interne Einsätze"
        actions={[{ label: "Neue Buchung", href: "/buchungen/neu", icon: <Plus className="h-4 w-4" /> }]}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Buchungsnr., Kunde, Projekt…" className="w-64" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {(Object.keys(bookingStatusLabels) as BookingStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {bookingStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine Buchungen gefunden"
          actionLabel="Buchung anlegen"
          actionHref="/buchungen/neu"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Buchungsnr.</th>
                <th className="px-4 py-3 font-medium">Typ</th>
                <th className="px-4 py-3 font-medium">Kunde / Projekt</th>
                <th className="px-4 py-3 font-medium">Produkte</th>
                <th className="px-4 py-3 font-medium">Zeitraum</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  onClick={() => router.push(`/buchungen/${b.id}`)}
                >
                  <td className="px-4 py-3 font-mono font-medium text-flx-blue">{b.bookingNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {bookingTypeLabels[b.type as keyof typeof bookingTypeLabels]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.customer?.companyName ?? b.contactName ?? "—"}</div>
                    {b.projectName && <div className="text-xs text-gray-500">{b.projectName}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {b.items.map((i) => i.product.name).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(b.startDate)} – {formatDate(b.plannedReturnDate)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(b.status)}>{bookingStatusLabels[b.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" asChild title="Bearbeiten">
                        <Link href={`/buchungen/${b.id}/bearbeiten`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteBookingButton
                        bookingId={b.id}
                        bookingNumber={b.bookingNumber}
                        variant="ghost"
                        size="icon"
                        showLabel={false}
                        onDeleted={() => setList((prev) => prev.filter((item) => item.id !== b.id))}
                      />
                    </div>
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
