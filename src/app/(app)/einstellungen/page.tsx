import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EinstellungenPage() {
  return (
    <div>
      <PageHeader
        title="Einstellungen"
        description="Systemkonfiguration und Unternehmensdaten"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unternehmen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Firmenname</Label>
              <Input id="company" defaultValue="Darda GmbH" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Hauptstandort</Label>
              <Input id="address" defaultValue="Darda-Straße 1, 78199 Bräunlingen" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Kontakt-E-Mail</Label>
              <Input id="email" type="email" defaultValue="info@darda.de" />
            </div>
            <Button>Speichern</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vermietung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prepDays">Standard-Vorbereitungstage</Label>
              <Input id="prepDays" type="number" defaultValue="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnDays">Standard-Nachbereitungstage</Label>
              <Input id="returnDays" type="number" defaultValue="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Währung</Label>
              <Input id="currency" defaultValue="EUR" disabled />
            </div>
            <Button>Speichern</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benachrichtigungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              "Ausgabe morgen",
              "Rückgabe morgen",
              "Überfällige Rückgabe",
              "Neue Buchung",
              "Buchungskonflikt",
              "Wartung fällig",
            ].map((n) => (
              <label key={n} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
                <span>{n}</span>
                <Badge variant="success">Aktiv</Badge>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span>FLX Rent 1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Datenbank</span>
              <Badge variant="success">Verbunden</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Letztes Backup</span>
              <span>—</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
