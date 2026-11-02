"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  addDays,
  addMonths,
  addYears,
  differenceInDays,
  differenceInMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  isWeekend,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  AlertTriangle,
  Trash2,
  X,
  Filter,
  GripVertical,
} from "lucide-react";
import { BookingType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/shared/search-input";
import { bookingTypeLabels, bookingTypeColors, visibleProductBookingTypes } from "@/lib/labels";
import { formatDate, cn } from "@/lib/utils";
import {
  updateBookingDates,
  getPlanningData,
  type PlanningProductRow,
  type PlanningBookingBar,
} from "@/lib/actions/planning";
import { ProductBookingTypeBadge } from "@/components/products/product-booking-type-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelBooking } from "@/lib/actions/bookings";

type ViewMode = "month" | "year";
type InteractionType = "move" | "resize-start" | "resize-end";

const ROW_HEIGHT = 76;
const HEADER_HEIGHT = 56;
const PRODUCT_COL_WIDTH = 260;
const SIDEBAR_WIDTH = 320;
const HANDLE_WIDTH = 10;
const MIN_BAR_DAYS = 1;

interface PlanningBoardProps {
  initialProducts: PlanningProductRow[];
  initialBookings: PlanningBookingBar[];
  categories: { id: string; name: string }[];
}

interface PendingChange {
  barId: string;
  bookingId: string;
  productId: string;
  startDate: Date;
  endDate: Date;
}

interface InteractionState {
  type: InteractionType;
  barId: string;
  startX: number;
  origStart: Date;
  origEnd: Date;
}

interface BarPreview {
  startDate: Date;
  endDate: Date;
}

function getMonthDays(month: Date): Date[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  return eachDayOfInterval({ start, end });
}

function getYearMonths(year: Date): Date[] {
  return eachMonthOfInterval({
    start: startOfYear(year),
    end: endOfYear(year),
  });
}

function parseBarId(barId: string) {
  const lastDash = barId.lastIndexOf("-");
  return {
    bookingId: barId.substring(0, lastDash),
    productId: barId.substring(lastDash + 1),
  };
}

/** Priorität, wenn am selben Tag mehrere Belegungen liegen */
const DAY_STATUS_PRIORITY: BookingType[] = [
  "SPERZZEIT",
  "REPARATUR",
  "WARTUNG",
  "MESSE",
  "PRODUKTDEMO",
  "VORFUEHRUNG",
  "AUSSENDIENSTEINSATZ",
  "KUNDENVERMIETUNG",
  "INTERNER_EINSATZ",
  "TRANSPORT",
];

function barCoversDay(
  start: Date,
  end: Date,
  day: Date
): boolean {
  const dayStart = startOfDay(day);
  const rangeStart = startOfDay(start);
  const rangeEnd = startOfDay(end);
  if (rangeEnd < rangeStart) return false;
  return isWithinInterval(dayStart, { start: rangeStart, end: rangeEnd });
}

function resolvePlanningDayStatus(
  productId: string,
  bars: PlanningBookingBar[],
  getDates: (bar: PlanningBookingBar) => { start: Date; end: Date },
  day: Date
): BookingType | null {
  const covering = bars
    .filter((bar) => bar.productId === productId)
    .filter((bar) => {
      const dates = getDates(bar);
      return barCoversDay(dates.start, dates.end, day);
    });

  if (covering.length === 0) return null;

  covering.sort((a, b) => {
    const ai = DAY_STATUS_PRIORITY.indexOf(a.type as BookingType);
    const bi = DAY_STATUS_PRIORITY.indexOf(b.type as BookingType);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return covering[0].type as BookingType;
}

function getBarLabel(bar: PlanningBookingBar, showDetails: boolean): string {
  const type = bookingTypeLabels[bar.type as BookingType];
  if (!showDetails) return type;
  const who = bar.customerName || bar.projectName;
  return who ? `${who} · ${type}` : `${bar.bookingNumber} · ${type}`;
}

function BookingBar({
  bar,
  left,
  width,
  leftPct,
  widthPct,
  rowHeight,
  color,
  hasPending,
  isActive,
  preview,
  readOnly = false,
  onSelect,
  onInteractionStart,
}: {
  bar: PlanningBookingBar;
  left?: number;
  width?: number;
  leftPct?: number;
  widthPct?: number;
  rowHeight: number;
  color: string;
  hasPending: boolean;
  isActive: boolean;
  preview: BarPreview | null;
  readOnly?: boolean;
  onSelect: () => void;
  onInteractionStart: (e: React.PointerEvent, type: InteractionType) => void;
}) {
  const usePercent = leftPct !== undefined && widthPct !== undefined;
  const pixelWidth = width ?? 0;
  const showDetails = usePercent ? widthPct >= 8 : pixelWidth >= 140;
  const showDates = usePercent ? widthPct >= 12 : pixelWidth >= 200;
  const label = getBarLabel(bar, showDetails);
  const start = preview?.startDate ?? new Date(bar.startDate);
  const end = preview?.endDate ?? new Date(bar.endDate);
  const barHeight = rowHeight - 14;

  return (
    <div
      className={cn(
        "group absolute top-[7px] flex overflow-hidden rounded-md border border-white/30 shadow-sm",
        hasPending && "ring-2 ring-amber-400 ring-offset-1",
        isActive && "z-40 shadow-lg ring-2 ring-flx-blue ring-offset-1",
        bar.hasConflict && "ring-2 ring-status-damage",
        readOnly && "cursor-pointer"
      )}
      style={{
        ...(usePercent
          ? { left: `${leftPct}%`, width: `${Math.max(widthPct, 100 / 31)}%` }
          : { left, width: Math.max(pixelWidth, 24) }),
        height: barHeight,
        backgroundColor: color,
        zIndex: isActive ? 40 : bar.hasConflict ? 25 : 15,
      }}
      title={`${bar.bookingNumber}\n${bookingTypeLabels[bar.type as BookingType]}\n${bar.customerName ?? ""}\n${formatDate(start)} – ${formatDate(end)}`}
      onClick={(e) => {
        if (readOnly) {
          e.stopPropagation();
          onSelect();
        }
      }}
    >
      {!readOnly && (
        <div
          className="flex shrink-0 cursor-ew-resize items-center justify-center bg-black/30 hover:bg-black/50"
          style={{ width: HANDLE_WIDTH }}
          onPointerDown={(e) => onInteractionStart(e, "resize-start")}
        >
          <div className="h-5 w-0.5 rounded-full bg-white/80" />
        </div>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col justify-center px-2",
          readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        )}
        onPointerDown={readOnly ? undefined : (e) => onInteractionStart(e, "move")}
        onClick={(e) => {
          if (!readOnly) {
            e.stopPropagation();
          }
          onSelect();
        }}
      >
        {showDetails && (
          <span className="truncate text-xs font-semibold leading-snug text-white">
            {label}
          </span>
        )}
        {showDates && (
          <span className="truncate text-[11px] leading-snug text-white/90">
            {format(start, "dd.MM.", { locale: de })} – {format(end, "dd.MM.yy", { locale: de })}
          </span>
        )}
        {!showDetails && !readOnly && (
          <span className="truncate text-[10px] text-white/85">{bar.bookingNumber}</span>
        )}
      </div>

      {!readOnly && (
        <div
          className="flex shrink-0 cursor-ew-resize items-center justify-center bg-black/30 hover:bg-black/50"
          style={{ width: HANDLE_WIDTH }}
          onPointerDown={(e) => onInteractionStart(e, "resize-end")}
        >
          <div className="h-5 w-0.5 rounded-full bg-white/80" />
        </div>
      )}

      {!readOnly && (
        <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-50">
          <GripVertical className="h-3 w-3 text-white/80" />
        </div>
      )}
    </div>
  );
}

export function PlanningBoard({
  initialProducts,
  initialBookings,
  categories,
}: PlanningBoardProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [bookings, setBookings] = useState(initialBookings);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [selectedBar, setSelectedBar] = useState<PlanningBookingBar | null>(null);
  const [barPreviews, setBarPreviews] = useState<Record<string, BarPreview>>({});
  const [activeBarId, setActiveBarId] = useState<string | null>(null);
  const [interactionHint, setInteractionHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const interactionRef = useRef<InteractionState | null>(null);
  const previewRef = useRef<BarPreview | null>(null);
  const didDragRef = useRef(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const skipInitialFetch = useRef(true);

  const days = useMemo(() => getMonthDays(currentMonth), [currentMonth]);
  const months = useMemo(() => getYearMonths(currentMonth), [currentMonth]);
  const rowHeight = ROW_HEIGHT;
  const rangeStart = viewMode === "month" ? days[0] : startOfYear(currentMonth);
  const today = startOfDay(new Date());
  const timelineUnits = viewMode === "month" ? days.length : months.length;

  const getUnitWidth = useCallback(() => {
    const width = timelineRef.current?.clientWidth ?? 0;
    return timelineUnits > 0 ? width / timelineUnits : 1;
  }, [timelineUnits]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    let cancelled = false;
    setLoadingData(true);

    const start =
      viewMode === "month" ? startOfMonth(currentMonth) : startOfYear(currentMonth);
    const end = viewMode === "month" ? endOfMonth(currentMonth) : endOfYear(currentMonth);

    getPlanningData(start, end)
      .then((data) => {
        if (!cancelled) setBookings(data.bookings);
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentMonth, viewMode]);

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.inventoryNumber.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [initialProducts, categoryFilter, search]);

  const getBarPosition = useCallback(
    (start: Date, end: Date) => {
      if (viewMode === "year") {
        const yearStart = startOfYear(currentMonth);
        const startMonth = differenceInMonths(startOfMonth(start), yearStart);
        const endMonth = differenceInMonths(startOfMonth(end), yearStart);

        const visibleStart = Math.max(0, startMonth);
        const visibleEnd = Math.min(months.length - 1, endMonth);

        if (visibleEnd < 0 || visibleStart > months.length - 1) {
          return { leftPct: 0, widthPct: 0, visible: false };
        }

        const leftPct = (visibleStart / months.length) * 100;
        const widthPct = ((visibleEnd - visibleStart + 1) / months.length) * 100;
        return { leftPct, widthPct, visible: true };
      }

      const startDay = differenceInDays(startOfDay(start), rangeStart);
      const endDay = differenceInDays(startOfDay(end), rangeStart);

      const visibleStartDay = Math.max(0, startDay);
      const visibleEndDay = Math.min(days.length - 1, endDay);

      if (visibleEndDay < 0 || visibleStartDay > days.length - 1) {
        return { leftPct: 0, widthPct: 0, visible: false };
      }

      const leftPct = (visibleStartDay / days.length) * 100;
      const widthPct = Math.max(
        (MIN_BAR_DAYS / days.length) * 100,
        ((visibleEndDay - visibleStartDay + 1) / days.length) * 100
      );
      return { leftPct, widthPct, visible: true };
    },
    [viewMode, currentMonth, rangeStart, days.length, months.length]
  );

  const getBarDates = useCallback(
    (bar: PlanningBookingBar) => {
      const preview = barPreviews[bar.id];
      return {
        start: preview?.startDate ?? new Date(bar.startDate),
        end: preview?.endDate ?? new Date(bar.endDate),
      };
    },
    [barPreviews]
  );

  const applyBarChange = useCallback((barId: string, newStart: Date, newEnd: Date) => {
    const { bookingId, productId } = parseBarId(barId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === barId
          ? { ...b, startDate: newStart.toISOString(), endDate: newEnd.toISOString() }
          : b
      )
    );
    setPendingChanges((prev) => {
      const filtered = prev.filter((p) => p.barId !== barId);
      return [
        ...filtered,
        { barId, bookingId, productId, startDate: newStart, endDate: newEnd },
      ];
    });
  }, []);

  const calcDatesFromDelta = useCallback(
    (type: InteractionType, origStart: Date, origEnd: Date, deltaDays: number) => {
      if (type === "move") {
        return { start: addDays(origStart, deltaDays), end: addDays(origEnd, deltaDays) };
      }
      if (type === "resize-start") {
        const newStart = addDays(origStart, deltaDays);
        if (newStart > origEnd) return null;
        return { start: newStart, end: origEnd };
      }
      const newEnd = addDays(origEnd, deltaDays);
      if (newEnd < origStart) return null;
      return { start: origStart, end: newEnd };
    },
    []
  );

  const startInteraction = useCallback(
    (e: React.PointerEvent, barId: string, type: InteractionType) => {
      if (viewMode === "year") return;
      e.stopPropagation();
      e.preventDefault();
      const bar = bookings.find((b) => b.id === barId);
      if (!bar) return;

      const dates = getBarDates(bar);
      interactionRef.current = {
        type,
        barId,
        startX: e.clientX,
        origStart: dates.start,
        origEnd: dates.end,
      };
      setActiveBarId(barId);
      didDragRef.current = false;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [bookings, getBarDates, viewMode]
  );

  useEffect(() => {
    if (viewMode === "year") return;

    const onPointerMove = (e: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      const unitWidth = getUnitWidth();
      const deltaDays = Math.round((e.clientX - interaction.startX) / unitWidth);
      if (deltaDays === 0 && !didDragRef.current) return;

      didDragRef.current = true;
      const result = calcDatesFromDelta(
        interaction.type,
        interaction.origStart,
        interaction.origEnd,
        deltaDays
      );
      if (!result) return;

      previewRef.current = { startDate: result.start, endDate: result.end };
      setBarPreviews((prev) => ({
        ...prev,
        [interaction.barId]: previewRef.current!,
      }));

      const typeLabel =
        interaction.type === "move"
          ? "Verschieben"
          : interaction.type === "resize-start"
            ? "Start anpassen"
            : "Ende anpassen";
      setInteractionHint(
        `${typeLabel}: ${format(result.start, "dd.MM.yyyy", { locale: de })} – ${format(result.end, "dd.MM.yyyy", { locale: de })} (${differenceInDays(result.end, result.start) + 1} Tage)`
      );
    };

    const onPointerUp = () => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      if (didDragRef.current && previewRef.current) {
        applyBarChange(
          interaction.barId,
          previewRef.current.startDate,
          previewRef.current.endDate
        );
      }

      interactionRef.current = null;
      previewRef.current = null;
      setActiveBarId(null);
      setInteractionHint(null);
      setBarPreviews((prev) => {
        const next = { ...prev };
        delete next[interaction.barId];
        return next;
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [viewMode, getUnitWidth, calcDatesFromDelta, applyBarChange]);

  const handleSave = async () => {
    if (pendingChanges.length === 0) return;
    setSaving(true);
    setSaveMessage(null);
    const remaining: PendingChange[] = [];
    let saved = 0;
    let firstError = "";
    for (const change of pendingChanges) {
      const result = await updateBookingDates(
        change.bookingId,
        change.productId,
        change.startDate.toISOString(),
        change.endDate.toISOString()
      );
      if (!result.success) {
        remaining.push(change);
        if (!firstError) firstError = result.error ?? "Konflikt – Verschiebung nicht gespeichert";
        continue;
      }
      saved += 1;
    }
    setPendingChanges(remaining);
    setSaving(false);
    if (firstError) {
      setSaveMessage(
        remaining.length === pendingChanges.length
          ? firstError
          : `${saved} gespeichert, ${remaining.length} wegen Konflikt übersprungen: ${firstError}`
      );
    } else {
      setSaveMessage("Änderungen erfolgreich gespeichert");
    }
  };

  const navigate = (dir: -1 | 1) => {
    if (viewMode === "month") {
      setCurrentMonth((m) => startOfMonth(addMonths(m, dir)));
    } else {
      setCurrentMonth((m) => startOfMonth(addYears(m, dir)));
    }
    setSelectedBar(null);
  };

  const goToToday = () => {
    setCurrentMonth(startOfMonth(new Date()));
    setSelectedBar(null);
  };

  const openMonth = (month: Date) => {
    setViewMode("month");
    setCurrentMonth(startOfMonth(month));
    setSelectedBar(null);
  };

  const handleDeleteBooking = async () => {
    if (!selectedBar) return;

    const { bookingId } = parseBarId(selectedBar.id);
    setDeleting(true);
    setSaveMessage(null);

    const result = await cancelBooking(bookingId);

    setDeleting(false);

    if (result.success) {
      setBookings((prev) =>
        prev.filter((bar) => parseBarId(bar.id).bookingId !== bookingId)
      );
      setPendingChanges((prev) => prev.filter((change) => change.bookingId !== bookingId));
      setSelectedBar(null);
      setDeleteDialogOpen(false);
      setSaveMessage("Buchung wurde gelöscht");
      return;
    }

    setSaveMessage(result.error ?? "Buchung konnte nicht gelöscht werden");
  };

  const todayIndex = viewMode === "month" ? days.findIndex((d) => isSameDay(d, today)) : -1;
  const todayMonthIndex =
    viewMode === "year" ? months.findIndex((m) => isSameMonth(m, today)) : -1;
  const periodLabel =
    viewMode === "month"
      ? format(currentMonth, "MMMM yyyy", { locale: de })
      : format(currentMonth, "yyyy", { locale: de });
  const isCurrentPeriod =
    viewMode === "month"
      ? isSameMonth(currentMonth, new Date())
      : isSameYear(currentMonth, new Date());

  const legendTypes = visibleProductBookingTypes;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <Tabs
          value={viewMode}
          onValueChange={(v) => {
            setViewMode(v as ViewMode);
            setSelectedBar(null);
            setBarPreviews({});
          }}
        >
          <TabsList>
            <TabsTrigger value="month">Monat</TabsTrigger>
            <TabsTrigger value="year">Jahr</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            title={viewMode === "month" ? "Vorheriger Monat" : "Vorheriges Jahr"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="min-w-[160px] font-semibold capitalize"
            onClick={goToToday}
          >
            {periodLabel}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(1)}
            title={viewMode === "month" ? "Nächster Monat" : "Nächstes Jahr"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentPeriod && (
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Heute
            </Button>
          )}
        </div>

        {loadingData && (
          <span className="text-xs text-gray-400">Lade Buchungen…</span>
        )}

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Produkt suchen…"
          className="w-52"
        />

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <Filter className="mr-2 h-4 w-4" />
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

        <div className="ml-auto flex items-center gap-2">
          {pendingChanges.length > 0 && (
            <>
              <Badge variant="warning">{pendingChanges.length} ungespeichert</Badge>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Speichern…" : "Speichern"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Legende */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2">
        <span className="text-xs font-medium text-gray-500">Legende:</span>
        {legendTypes.map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="h-3 w-5 rounded-sm"
              style={{ backgroundColor: bookingTypeColors[type] }}
            />
            <span className="text-xs text-gray-600">{bookingTypeLabels[type]}</span>
          </div>
        ))}
        <span className="ml-2 text-xs text-gray-400">
          {viewMode === "month"
            ? "· Mitte ziehen = verschieben · Ränder = Zeitraum anpassen"
            : "· Monat anklicken für Detailansicht · Balken anklicken für Details"}
        </span>
      </div>

      {saveMessage && (
        <div
          className={cn(
            "shrink-0 rounded-md px-4 py-2 text-sm",
            saveMessage.includes("Konflikt")
              ? "bg-status-transit/10 text-status-transit"
              : "bg-status-available/10 text-status-available"
          )}
        >
          {saveMessage}
        </div>
      )}

      {interactionHint && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-flx-navy px-5 py-2.5 text-sm font-medium text-white shadow-xl">
          {interactionHint}
        </div>
      )}

      {/* Hauptbereich: Gantt + optionale Sidebar */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Nur vertikal scrollen – alle Tage/Monate passen in die Breite */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex min-w-0 flex-col">
            {/* Kopfzeile */}
            <div
              className="sticky top-0 z-30 flex border-b border-gray-200 bg-gray-100"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                className="sticky left-0 z-40 flex shrink-0 items-center border-r border-gray-300 bg-gray-100 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]"
                style={{ width: PRODUCT_COL_WIDTH, height: HEADER_HEIGHT }}
              >
                Produkt
              </div>

              <div ref={timelineRef} className="flex min-w-0 flex-1">
                {viewMode === "month"
                  ? days.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "flex min-w-0 flex-1 flex-col items-center justify-center border-r border-gray-200/60 last:border-r-0",
                          isWeekend(day) && "bg-gray-100/70",
                          isSameDay(day, today) && "bg-flx-blue/15 font-bold text-flx-blue"
                        )}
                        style={{ height: HEADER_HEIGHT }}
                      >
                        <div className="truncate text-[9px] uppercase text-gray-500 sm:text-[10px]">
                          {format(day, "EEEEE", { locale: de })}
                        </div>
                        <div className="text-xs font-semibold sm:text-sm">{format(day, "d", { locale: de })}</div>
                      </div>
                    ))
                  : months.map((month) => (
                      <button
                        key={month.toISOString()}
                        type="button"
                        onClick={() => openMonth(month)}
                        className={cn(
                          "flex min-w-0 flex-1 flex-col items-center justify-center border-r border-gray-200/60 transition-colors last:border-r-0 hover:bg-flx-blue/10",
                          isSameMonth(month, today) && "bg-flx-blue/15 font-bold text-flx-blue"
                        )}
                        style={{ height: HEADER_HEIGHT }}
                        title={`${format(month, "MMMM yyyy", { locale: de })} öffnen`}
                      >
                        <div className="truncate text-[10px] uppercase text-gray-500">
                          {format(month, "MMM", { locale: de })}
                        </div>
                        {isSameMonth(month, today) && (
                          <div className="mt-0.5 h-1 w-1 rounded-full bg-flx-blue" />
                        )}
                      </button>
                    ))}
              </div>
            </div>

            {/* Produktzeilen */}
            {filteredProducts.map((product) => {
              const productBars = bookings.filter((b) => b.productId === product.id);
              const dayStatus = resolvePlanningDayStatus(
                product.id,
                productBars,
                getBarDates,
                today
              );
              return (
                <div
                  key={product.id}
                  className="flex border-b border-gray-100"
                  style={{ height: rowHeight }}
                >
                  <div
                    className="sticky left-0 z-20 flex shrink-0 flex-col justify-center border-r border-gray-200 bg-white px-4 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]"
                    style={{ width: PRODUCT_COL_WIDTH, height: rowHeight }}
                  >
                    <div className="line-clamp-1 text-sm font-semibold leading-tight text-flx-navy">
                      {product.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-gray-500">
                      {product.inventoryNumber}
                    </div>
                    <div className="mt-1.5">
                      <ProductBookingTypeBadge type={dayStatus} />
                    </div>
                  </div>

                  <div
                    className="relative min-w-0 flex-1 overflow-hidden bg-white"
                    style={{ height: rowHeight }}
                  >
                    {viewMode === "month" && todayIndex >= 0 && (
                      <div
                        className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-flx-blue"
                        style={{ left: `${((todayIndex + 0.5) / days.length) * 100}%` }}
                      />
                    )}
                    {viewMode === "year" && todayMonthIndex >= 0 && (
                      <div
                        className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-flx-blue"
                        style={{ left: `${((todayMonthIndex + 0.5) / months.length) * 100}%` }}
                      />
                    )}

                    {productBars.map((bar) => {
                      const dates = getBarDates(bar);
                      const pos = getBarPosition(dates.start, dates.end);
                      if (!pos.visible) return null;

                      const color = bookingTypeColors[bar.type as BookingType];
                      const hasPending = pendingChanges.some((p) => p.barId === bar.id);

                      return (
                        <BookingBar
                          key={bar.id}
                          bar={bar}
                          leftPct={pos.leftPct}
                          widthPct={pos.widthPct}
                          rowHeight={rowHeight}
                          color={color}
                          hasPending={hasPending}
                          isActive={activeBarId === bar.id}
                          preview={barPreviews[bar.id] ?? null}
                          readOnly={viewMode === "year"}
                          onSelect={() => setSelectedBar(bar)}
                          onInteractionStart={(e, type) => startInteraction(e, bar.id, type)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail-Sidebar als Overlay */}
        {selectedBar && (
          <div
            className="absolute right-0 top-0 z-50 h-full overflow-y-auto border-l border-gray-200 bg-gray-50 p-5 shadow-xl"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-flx-navy">Buchungsdetails</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedBar(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Buchungsnummer</dt>
                <dd className="mt-1 font-mono font-semibold">{selectedBar.bookingNumber}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Typ</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: bookingTypeColors[selectedBar.type as BookingType] }}
                  />
                  {bookingTypeLabels[selectedBar.type as BookingType]}
                </dd>
              </div>
              {selectedBar.customerName && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Kunde</dt>
                  <dd className="mt-1 font-medium">{selectedBar.customerName}</dd>
                </div>
              )}
              {selectedBar.projectName && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Projekt</dt>
                  <dd className="mt-1">{selectedBar.projectName}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Zeitraum</dt>
                <dd className="mt-1 font-medium">
                  {formatDate(getBarDates(selectedBar).start)} – {formatDate(getBarDates(selectedBar).end)}
                </dd>
                <dd className="text-xs text-gray-500">
                  {differenceInDays(getBarDates(selectedBar).end, getBarDates(selectedBar).start) + 1} Tage
                </dd>
              </div>
            </dl>
            {selectedBar.hasConflict && (
              <div className="mt-5 flex items-start gap-2 rounded-md bg-status-damage/10 p-3 text-sm text-status-damage">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Konflikt mit anderer Buchung erkannt</span>
              </div>
            )}
            <Button asChild className="mt-5 w-full" variant="outline">
              <Link href={`/buchungen/${parseBarId(selectedBar.id).bookingId}`}>
                Buchung öffnen
              </Link>
            </Button>
            <Button
              className="mt-3 w-full"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          </div>
        )}

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buchung löschen?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Möchten Sie die Buchung{" "}
              <span className="font-semibold text-flx-navy">{selectedBar?.bookingNumber}</span>{" "}
              wirklich löschen? Sie wird aus der Liste und Planung entfernt.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDeleteBooking} disabled={deleting}>
                {deleting ? "Löschen…" : "Löschen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
