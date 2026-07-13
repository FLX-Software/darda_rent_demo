"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Plus } from "lucide-react";
import { BookingType } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductBookingTypeBadge } from "@/components/products/product-booking-type-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookingTypeLabels, visibleProductBookingTypes } from "@/lib/labels";
import { formatCurrency, cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  model: string;
  inventoryNumber: string;
  dailyRateCents: number;
  displayBookingType: BookingType | null;
  category: { id: string; name: string };
  location: { name: string } | null;
};

interface ProductsListProps {
  products: Product[];
  categories: { id: string; name: string }[];
}

export function ProductsList({ products, categories }: ProductsListProps) {
  const [view, setView] = useState<"table" | "cards">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== "all" && p.displayBookingType !== statusFilter) return false;
      if (categoryFilter !== "all" && p.category.id !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.inventoryNumber.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, statusFilter, categoryFilter]);

  return (
    <div>
      <PageHeader
        title="Produkte"
        description="Werkzeuge und Geräte im Vermietbestand verwalten"
        actions={[{ label: "Neues Produkt", href: "/produkte/neu", icon: <Plus className="h-4 w-4" /> }]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Name, Inventarnr., Modell…" className="w-64" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {visibleProductBookingTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {bookingTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1">
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "cards" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine Produkte gefunden"
          description="Passen Sie die Filter an oder legen Sie ein neues Produkt an."
          actionLabel="Produkt anlegen"
          actionHref="/produkte/neu"
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Inventarnr.</th>
                <th className="px-4 py-3 font-medium">Produkt</th>
                <th className="px-4 py-3 font-medium">Modell</th>
                <th className="px-4 py-3 font-medium">Kategorie</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Standort</th>
                <th className="px-4 py-3 font-medium">Tagessatz</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/produkte/${p.id}`} className="font-mono text-flx-blue hover:underline">
                      {p.inventoryNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.model}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category.name}</td>
                  <td className="px-4 py-3">
                    <ProductBookingTypeBadge type={p.displayBookingType} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.location?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatCurrency(p.dailyRateCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <Link key={p.id} href={`/produkte/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="font-mono text-xs text-gray-400">{p.inventoryNumber}</span>
                    <ProductBookingTypeBadge type={p.displayBookingType} />
                  </div>
                  <h3 className="font-semibold text-flx-navy">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.model}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-400">{p.category.name}</span>
                    <span className="font-medium">{formatCurrency(p.dailyRateCents)}/Tag</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className={cn("mt-4 text-sm text-gray-500")}>{filtered.length} von {products.length} Produkten</p>
    </div>
  );
}
