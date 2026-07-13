"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Customer = {
  id: string;
  customerNumber: string;
  companyName: string;
  billingCity: string;
  email: string | null;
  phone: string | null;
  _count: { bookings: number };
};

export function CustomersList({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.customerNumber.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div>
      <PageHeader
        title="Kunden"
        description="Kundenstamm und Ansprechpartner verwalten"
        actions={[{ label: "Neuer Kunde", href: "/kunden/neu", icon: <Plus className="h-4 w-4" /> }]}
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Firma, Kundennr., E-Mail…" className="w-64" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Keine Kunden gefunden" actionLabel="Kunde anlegen" actionHref="/kunden/neu" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/kunden/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-1 font-mono text-xs text-gray-400">{c.customerNumber}</div>
                  <h3 className="font-semibold text-flx-navy">{c.companyName}</h3>
                  <p className="text-sm text-gray-500">{c.billingCity}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary">{c._count.bookings} Buchungen</Badge>
                    {c.email && <span className="truncate text-xs text-gray-400">{c.email}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
