import { getLocationsList } from "@/lib/actions/locations";
import { LocationsClient } from "./locations-client";

export default async function StandortePage() {
  const locations = await getLocationsList();
  return <LocationsClient locations={locations} />;
}
