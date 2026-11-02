import {
  ProductStatus,
  BookingType,
  BookingStatus,
  MaintenanceStatus,
  MaintenanceType,
  LocationType,
  EventType,
  EventStatus,
} from "@prisma/client";

export const productStatusLabels: Record<ProductStatus, string> = {
  VERFUEGBAR: "Verfügbar",
  RESERVIERT: "Reserviert",
  VORGEMERKT: "Vorgemerkt",
  IN_VORBEREITUNG: "In Vorbereitung",
  ABHOLBEREIT: "Abholbereit",
  UNTERWEGS: "Unterwegs",
  BEIM_KUNDEN: "Beim Kunden",
  AUF_MESSE: "Auf Messe",
  BEI_DEMO: "Bei Demo",
  INTERN_IM_EINSATZ: "Intern im Einsatz",
  RUECKGABE_AUSSTEHEND: "Rückgabe ausstehend",
  IN_PRUEFUNG: "In Prüfung",
  IN_WARTUNG: "In Wartung",
  IN_REPARATUR: "In Reparatur",
  BESCHAEDIGT: "Beschädigt",
  GESPERRT: "Gesperrt",
  AUSGEMUSTERT: "Ausgemustert",
};

export const productStatusColors: Record<ProductStatus, string> = {
  VERFUEGBAR: "bg-status-available/15 text-status-available border-status-available/30",
  RESERVIERT: "bg-status-reserved/15 text-status-reserved border-status-reserved/30",
  VORGEMERKT: "bg-status-reserved/15 text-status-reserved border-status-reserved/30",
  IN_VORBEREITUNG: "bg-status-reserved/15 text-status-reserved border-status-reserved/30",
  ABHOLBEREIT: "bg-status-reserved/15 text-status-reserved border-status-reserved/30",
  UNTERWEGS: "bg-status-transit/15 text-status-transit border-status-transit/30",
  BEIM_KUNDEN: "bg-status-transit/15 text-status-transit border-status-transit/30",
  AUF_MESSE: "bg-status-transit/15 text-status-transit border-status-transit/30",
  BEI_DEMO: "bg-status-demo/15 text-status-demo border-status-demo/30",
  INTERN_IM_EINSATZ: "bg-flx-blue/15 text-flx-blue border-flx-blue/30",
  RUECKGABE_AUSSTEHEND: "bg-status-transit/15 text-status-transit border-status-transit/30",
  IN_PRUEFUNG: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  IN_WARTUNG: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  IN_REPARATUR: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  BESCHAEDIGT: "bg-status-damage/15 text-status-damage border-status-damage/30",
  GESPERRT: "bg-status-maintenance/15 text-status-maintenance border-status-maintenance/30",
  AUSGEMUSTERT: "bg-gray-100 text-gray-500 border-gray-200",
};

export const bookingTypeLabels: Record<BookingType, string> = {
  KUNDENVERMIETUNG: "Kundenvermietung",
  MESSE: "Messe",
  PRODUKTDEMO: "Produktdemo",
  VORFUEHRUNG: "Vorführung beim Kunden",
  AUSSENDIENSTEINSATZ: "Außendiensteinsatz",
  INTERNER_EINSATZ: "Interner Einsatz",
  TRANSPORT: "Transport",
  WARTUNG: "Wartung",
  REPARATUR: "Reparatur",
  SPERZZEIT: "Sperrzeit",
};

export const bookingTypeColors: Record<BookingType, string> = {
  KUNDENVERMIETUNG: "#0066CC",
  MESSE: "#F97316",
  PRODUKTDEMO: "#8B5CF6",
  VORFUEHRUNG: "#8B5CF6",
  AUSSENDIENSTEINSATZ: "#0EA5E9",
  INTERNER_EINSATZ: "#64748B",
  TRANSPORT: "#F59E0B",
  WARTUNG: "#6B7280",
  REPARATUR: "#EF4444",
  SPERZZEIT: "#374151",
};

/** Sichtbare Einsatz-/Buchungstypen auf der Produkte-Seite und in der Planungslegende */
export const visibleProductBookingTypes: BookingType[] = [
  "KUNDENVERMIETUNG",
  "MESSE",
  "PRODUKTDEMO",
  "AUSSENDIENSTEINSATZ",
  "WARTUNG",
  "REPARATUR",
  "SPERZZEIT",
];

const productStatusToBookingType: Partial<Record<ProductStatus, BookingType>> = {
  BEIM_KUNDEN: "KUNDENVERMIETUNG",
  UNTERWEGS: "KUNDENVERMIETUNG",
  RESERVIERT: "KUNDENVERMIETUNG",
  VORGEMERKT: "KUNDENVERMIETUNG",
  IN_VORBEREITUNG: "KUNDENVERMIETUNG",
  ABHOLBEREIT: "KUNDENVERMIETUNG",
  AUF_MESSE: "MESSE",
  BEI_DEMO: "PRODUKTDEMO",
  IN_WARTUNG: "WARTUNG",
  IN_REPARATUR: "REPARATUR",
  GESPERRT: "SPERZZEIT",
};

export function resolveProductDisplayBookingType(
  status: ProductStatus,
  activeBookingType?: BookingType | null
): BookingType | null {
  if (activeBookingType && visibleProductBookingTypes.includes(activeBookingType)) {
    return activeBookingType;
  }
  return productStatusToBookingType[status] ?? null;
}

export const bookingStatusLabels: Record<BookingStatus, string> = {
  ENTWURF: "Entwurf",
  ANFRAGE: "Anfrage",
  VORGEMERKT: "Vorgemerkt",
  BESTAETIGT: "Bestätigt",
  IN_VORBEREITUNG: "In Vorbereitung",
  ABHOLBEREIT: "Abholbereit",
  AUSGEGEBEN: "Ausgegeben",
  UNTERWEGS: "Unterwegs",
  AKTIV: "Aktiv",
  RUECKGABE_FAELLIG: "Rückgabe fällig",
  UEBERFAELLIG: "Überfällig",
  ZURUECKGEGEBEN: "Zurückgegeben",
  IN_PRUEFUNG: "In Prüfung",
  ABGESCHLOSSEN: "Abgeschlossen",
  STORNIERT: "Storniert",
};

export const maintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  GEPLANT: "Geplant",
  FAELLIG: "Fällig",
  UEBERFAELLIG: "Überfällig",
  IN_BEARBEITUNG: "In Bearbeitung",
  ABGESCHLOSSEN: "Abgeschlossen",
};

export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  ROUTINE: "Routine-Wartung",
  SICHERHEITSPRUEFUNG: "Sicherheitsprüfung",
  INSPEKTION: "Inspektion",
  REPARATUR: "Reparatur",
  KALIBRIERUNG: "Kalibrierung",
};

export const locationTypeLabels: Record<LocationType, string> = {
  HAUPTLAGER: "Hauptlager",
  AUSSENLAGER: "Außenlager",
  NIEDERLASSUNG: "Darda-Niederlassung",
  KUNDE: "Kunde",
  MESSE: "Messe",
  DEMO: "Demo",
  AUSSENDIENSTFAHRZEUG: "Außendienstfahrzeug",
  SPEDITION: "Spedition",
  WERKSTATT: "Werkstatt",
  REPARATURDIENSTLEISTER: "Reparaturdienstleister",
  UNTERWEGS: "Unterwegs",
};

export const eventTypeLabels: Record<EventType, string> = {
  MESSE: "Messe",
  KUNDENVORFUEHRUNG: "Kundenvorführung",
  INTERNE_SCHULUNG: "Interne Schulung",
  HAENDLERSCHULUNG: "Händlerschulung",
  PRODUKTTEST: "Produkttest",
  AUSSENDIENST_DEMO: "Außendienst-Demo",
};

export const eventStatusLabels: Record<EventStatus, string> = {
  GEPLANT: "Geplant",
  VORBEREITUNG: "Vorbereitung",
  LAUFEND: "Laufend",
  ABBAU: "Abbau",
  ABGESCHLOSSEN: "Abgeschlossen",
  STORNIERT: "Storniert",
};

export const productConditionLabels: Record<string, string> = {
  NEU: "Neu",
  SEHR_GUT: "Sehr gut",
  GUT: "Gut",
  BEFRIEDIGEND: "Befriedigend",
  MAENGELHAFT: "Mängelhaft",
  BESCHAEDIGT: "Beschädigt",
};
