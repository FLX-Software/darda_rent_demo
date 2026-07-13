import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductByQrCode } from "@/lib/actions/products";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { productConditionLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";
import { MapPin, Package, Wrench } from "lucide-react";

export default async function QrProductPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const decodedCode = decodeURIComponent(code);
  const product = await getProductByQrCode(decodedCode);

  if (!product) notFound();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-flx-blue">FLX Rent</p>
          <h1 className="text-xl font-bold text-flx-navy">{product.name}</h1>
          <p className="font-mono text-sm text-gray-400">{product.inventoryNumber}</p>
        </div>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <ProductStatusBadge status={product.status} />
            <Badge variant="outline">{productConditionLabels[product.condition]}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Produktdetails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span>{product.model} · {product.category.name}</span>
            </div>
            {product.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{product.location.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gray-400" />
              <span>Tagessatz: {formatCurrency(product.dailyRateCents)}</span>
            </div>
            {product.serialNumber && (
              <p className="text-gray-500">SN: {product.serialNumber}</p>
            )}
          </CardContent>
        </Card>

        {product.accessories.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Zubehör</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {product.accessories.map((a) => (
                  <li key={a.id} className="flex justify-between">
                    <span>{a.accessory.name}</span>
                    <span className="text-gray-400">{a.quantity}×</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="w-full">
            <Link href={`/produkte/${product.id}`}>Details</Link>
          </Button>
          <Button asChild className="w-full">
            <Link href={`/buchungen/neu?productId=${product.id}`}>Buchen</Link>
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Gescannt: {decodedCode}
        </p>
      </div>
    </div>
  );
}
