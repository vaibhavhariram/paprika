/**
 * Geocode an address using Nominatim (OpenStreetMap).
 * No API key required. Respect 1 req/sec for fair use.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocode(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: "json",
    limit: "1",
    addressdetails: "1",
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "Paprika/1.0",
      },
    });

    if (!res.ok) {
      console.error("Nominatim error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;

    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    const lat = first.lat != null ? parseFloat(first.lat) : NaN;
    const lng = first.lon != null ? parseFloat(first.lon) : NaN;

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return {
      lat,
      lng,
      display_name: first.display_name ?? `${lat}, ${lng}`,
    };
  } catch (err) {
    console.error("Geocode error:", err);
    return null;
  }
}
