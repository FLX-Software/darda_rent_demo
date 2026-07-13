"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  addDays,
  addMonths,
  differenceInDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isWeekend,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  AlertTriangle,
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
import { ProductStatusBadge } from "@/components/products/product-status-badge";

type InteractionType = "move" | "resize-start" | "resize-end";

const ROW_HEIGHT = 76;
const DAY_WIDTH_MIN = 46;
const DAY_WIDTH_MAX = 56;

const HEADER_HEIGHT = 56;
const PRODUCT_COL_WIDTH = 300;
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

function parseBarId(barId: string) {
  const lastDash = barId.lastIndexOf("-");
  return {
    bookingId: barId.substring(0, lastDash),
    productId: barId.substring(lastDash + 1),
  };
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
  rowHeight,
  color,
  hasPending,
  isActive,
  preview,
  onSelect,
  onInteractionStart,
}: {
  bar: PlanningBookingBar;
  left: number;
  width: number;
  rowHeight: number;
  color: string;
  hasPending: boolean;
  isActive: boolean;
  preview: BarPreview | null;
  onSelect: () => void;
  onInteractionStart: (e: React.PointerEvent, type: InteractionType) => void;
}) {
  const showDetails = width >= 140;
  const showDates = width >= 200;
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
        bar.hasConflict && "ring-2 ring-status-damage"
      )}
      style={{
        left,
        width: Math.max(width, 24),
        height: barHeight,
        backgroundColor: color,
        zIndex: isActive ? 40 : bar.hasConflict ? 25 : 15,
      }}
      title={`${bar.bookingNumber}\n${bookingTypeLabels[bar.type as BookingType]}\n${bar.customerName ?? ""}\n${formatDate(start)} – ${formatDate(end)}`}
    >
      <div
        className="flex shrink-0 cursor-ew-resize items-center justify-center bg-black/30 hover:bg-black/50"
        style={{ width: HANDLE_WIDTH }}
        onPointerDown={(e) => onInteractionStart(e, "resize-start")}
      >
        <div className="h-5 w-0.5 rounded-full bg-white/80" />
      </div>

      <div
        className="flex min-w-0 flex-1 cursor-grab flex-col justify-center px-2 active:cursor-grabbing"
        onPointerDown={(e) => onInteractionStart(e, "move")}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <span className="truncate text-xs font-semibold leading-snug text-white">
          {label}
        </span>
        {showDates && (
          <span className="truncate text-[11px] leading-snug text-white/90">
            {format(start, "dd.MM.", { locale: de })} – {format(end, "dd.MM.yy", { locale: de })}
          </span>
        )}
        {!showDetails && (
          <span className="truncate text-[10px] text-white/85">{bar.bookingNumber}</span>
        )}
      </div>

      <div
        className="flex shrink-0 cursor-ew-resize items-center justify-center bg-black/30 hover:bg-black/50"
        style={{ width: HANDLE_WIDTH }}
        onPointerDown={(e) => onInteractionStart(e, "resize-end")}
      >
        <div className="h-5 w-0.5 rounded-full bg-white/80" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-50">
        <GripVertical className="h-3 w-3 text-white/80" />
      </div>
    </div>
  );
}

export function PlanningBoard({
  initialProducts,
  initialBookings,
  categories,
}: PlanningBoardProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
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
  const [boardWidth, setBoardWidth] = useState(0);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const interactionRef = useRef<InteractionState | null>(null);
  const previewRef = useRef<BarPreview | null>(null);
  const didDragRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const skipInitialFetch = useRef(true);

  const days = useMemo(() => getMonthDays(currentMonth), [currentMonth]);
  const rowHeight = ROW_HEIGHT;
  const rangeStart = days[0];
  const today = startOfDay(new Date());

  const sidebarOpen = !!selectedBar;
  const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH : 0;

  const dayWidth = useMemo(() => {
    const available = boardWidth - PRODUCT_COL_WIDTH - sidebarWidth;
    if (available <= 0 || days.length === 0) return DAY_WIDTH_MIN;

    const fitW = available / days.length;
    if (fitW >= DAY_WIDTH_MIN) {
      return Math.min(DAY_WIDTH_MAX, fitW);
    }
    return DAY_WIDTH_MIN;
  }, [boardWidth, days.length, sidebarWidth]);

  const timelineWidth = days.length * dayWidth;
  const needsHorizontalScroll = timelineWidth > boardWidth - PRODUCT_COL_WIDTH - sidebarWidth;

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setBoardWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    setBoardWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    let cancelled = false;
    setLoadingMonth(true);

    getPlanningData(startOfMonth(currentMonth), endOfMonth(currentMonth))
      .then((data) => {
        if (!cancelled) setBookings(data.bookings);
      })
      .finally(() => {
        if (!cancelled) setLoadingMonth(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentMonth]);

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
      const startDay = differenceInDays(startOfDay(start), rangeStart);
      const endDay = differenceInDays(startOfDay(end), rangeStart);

      const visibleStartDay = Math.max(0, startDay);
      const visibleEndDay = Math.min(days.length - 1, endDay);

      if (visibleEndDay < 0 || visibleStartDay > days.length - 1) {
        return { left: 0, width: 0, visible: false };
      }

      const left = visibleStartDay * dayWidth;
      const width = Math.max(
        dayWidth * MIN_BAR_DAYS,
        (visibleEndDay - visibleStartDay + 1) * dayWidth
      );
      return { left, width, visible: true };
    },
    [rangeStart, dayWidth, days.length]
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
    [bookings, getBarDates]
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      const deltaDays = Math.round((e.clientX - interaction.startX) / dayWidth);
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
  }, [dayWidth, calcDatesFromDelta, applyBarChange]);

  const handleSave = async () => {
    if (pendingChanges.length === 0) return;
    setSaving(true);
    setSaveMessage(null);
    let totalConflicts = 0;
    for (const change of pendingChanges) {
      const result = await updateBookingDates(
        change.bookingId,
        change.productId,
        change.startDate.toISOString(),
        change.endDate.toISOString()
      );
      if (result.conflicts) totalConflicts += result.conflicts;
    }
    setPendingChanges([]);
    setSaving(false);
    setSaveMessage(
      totalConflicts > 0
        ? `Gespeichert mit ${totalConflicts} möglichen Konflikt(en)`
        : "Änderungen erfolgreich gespeichert"
    );
  };

  const navigateMonth = (dir: -1 | 1) => {
    setCurrentMonth((m) => startOfMonth(addMonths(m, dir)));
    setSelectedBar(null);
  };

  const goToToday = () => {
    setCurrentMonth(startOfMonth(new Date()));
    setSelectedBar(null);
  };

  const todayIndex = days.findIndex((d) => isSameDay(d, today));
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: de });

  const legendTypes = visibleProductBookingTypes;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} title="Vorheriger Monat">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="min-w-[160px] font-semibold capitalize"
            onClick={goToToday}
          >
            {monthLabel}
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} title="Nächster Monat">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isSameMonth(currentMonth, new Date()) && (
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Heute
            </Button>
          )}
        </div>

        {loadingMonth && (
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
          · Mitte ziehen = verschieben · Ränder = Zeitraum anpassen
          {needsHorizontalScroll && " · Horizontal scrollen für alle Tage"}
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
      <div ref={boardRef} className="relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Einheitlicher Scroll-Container */}
        <div className="min-h-0 flex-1 overflow-auto">
          <div style={{ minWidth: PRODUCT_COL_WIDTH + timelineWidth }}>
            {/* Kopfzeile */}
            <div
              className="sticky top-0 z-30 flex border-b border-gray-200 bg-gray-100"
              style={{ height: HEADER_HEIGHT }}
            >
              {/* Produkt-Header – fixiert links */}
              <div
                className="sticky left-0 z-40 flex shrink-0 items-center border-r border-gray-300 bg-gray-100 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]"
                style={{ width: PRODUCT_COL_WIDTH, height: HEADER_HEIGHT }}
              >
                Produkt
              </div>

              {/* Tages-Header */}
              <div className="flex shrink-0" style={{ width: timelineWidth }}>
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex shrink-0 flex-col items-center justify-center",
                      isWeekend(day) && "bg-gray-100/70",
                      isSameDay(day, today) && "rounded-sm bg-flx-blue/15 font-bold text-flx-blue"
                    )}
                    style={{ width: dayWidth, height: HEADER_HEIGHT }}
                  >
                    <div className="text-[10px] uppercase text-gray-500">
                      {format(day, "EEE", { locale: de })}
                    </div>
                    <div className="text-sm font-semibold">{format(day, "d", { locale: de })}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Produktzeilen */}
            {filteredProducts.map((product) => {
              const productBars = bookings.filter((b) => b.productId === product.id);
              return (
                <div
                  key={product.id}
                  className="flex border-b border-gray-100"
                  style={{ height: rowHeight }}
                >
                  {/* Produktzelle – fixiert links */}
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
                      <ProductStatusBadge status={product.status} />
                    </div>
                  </div>

                  {/* Zeitachse – Balken nur hier, overflow hidden */}
                  <div
                    className="relative shrink-0 overflow-hidden bg-white"
                    style={{ width: timelineWidth, height: rowHeight }}
                  >
                    {todayIndex >= 0 && (
                      <div
                        className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-flx-blue"
                        style={{ left: todayIndex * dayWidth + dayWidth / 2 }}
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
                          left={pos.left}
                          width={pos.width}
                          rowHeight={rowHeight}
                          color={color}
                          hasPending={hasPending}
                          isActive={activeBarId === bar.id}
                          preview={barPreviews[bar.id] ?? null}
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

        {/* Detail-Sidebar – außerhalb des Scrollbereichs */}
        {selectedBar && (
          <div
            className="shrink-0 overflow-y-auto border-l border-gray-200 bg-gray-50 p-5"
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
          </div>
        )}
      </div>
    </div>
  );
}
