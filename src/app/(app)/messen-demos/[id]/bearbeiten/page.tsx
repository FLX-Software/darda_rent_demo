import { notFound } from "next/navigation";
import { getEvent } from "@/lib/actions/events";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { EventForm } from "../../event-form";

export default async function EventBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = unwrapActionOrNull(await getEvent(id));
  if (!event) notFound();

  return (
    <EventForm
      mode="edit"
      initial={{
        id: event.id,
        name: event.name,
        type: event.type,
        status: event.status,
        venue: event.venue,
        street: event.street,
        city: event.city,
        zip: event.zip,
        eventStartDate: event.eventStartDate,
        eventEndDate: event.eventEndDate,
        setupStartDate: event.setupStartDate,
        setupEndDate: event.setupEndDate,
        teardownStartDate: event.teardownStartDate,
        teardownEndDate: event.teardownEndDate,
        transportNotes: event.transportNotes,
        carrier: event.carrier,
        hotelInfo: event.hotelInfo,
        contactOnSite: event.contactOnSite,
        contactPhone: event.contactPhone,
        notes: event.notes,
        budgetCents: event.budgetCents,
      }}
    />
  );
}
