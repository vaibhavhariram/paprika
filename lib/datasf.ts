/**
 * DataSF (Socrata) integration for parcel, zoning, and height/bulk lookup by coordinates.
 * No API key required. Parcels (acdm-wktn) use geometry column "shape".
 */

import type { ZoningRule } from "@/lib/zoning-rules";

const DEBUG = true; // set to false once DataSF is verified

export interface ParcelInfo {
  blklot: string;
  block_num: string;
  lot_num: string;
  /** Zoning from parcel row when available (acdm-wktn has zoning_code, zoning_district). */
  zoning_code?: string;
  zoning_district?: string;
}

export interface ZoningInfo {
  zoning_code: string;
  zoning_name: string;
}

export interface HeightBulkInfo {
  height_limit: string;
  bulk_district: string;
}

/** Result from DataSF only (no rules lookup). */
export interface ParcelZoningResult {
  parcel: ParcelInfo | null;
  zoning: ZoningInfo | null;
  height_bulk: HeightBulkInfo | null;
}

/** Full lookup result including zoning rules from static JSON. */
export interface LookupResult extends ParcelZoningResult {
  zoning_rules: ZoningRule | null;
  zoning_rules_message?: string;
}

const PARCELS_URL = "https://data.sfgov.org/resource/acdm-wktn.json";
const ZONING_URL = "https://data.sfgov.org/resource/8br2-hhp3.json";
const HEIGHT_BULK_URL = "https://data.sfgov.org/resource/gc9v-7i5s.json";

/** Geometry column name per dataset (acdm-wktn uses "shape"). */
const GEOM_COLUMN: Record<string, string> = {
  parcels: "shape",
  zoning: "shape",
  height_bulk: "shape",
};

/** Build $where clause for point-in-polygon. SoQL uses POINT(longitude latitude). */
function wherePoint(lat: number, lng: number, geomColumn: string): string {
  return `intersects(${geomColumn}, 'POINT(${lng} ${lat})')`;
}

export async function getParcel(lat: number, lng: number): Promise<ParcelInfo | null> {
  const geomCol = GEOM_COLUMN.parcels;
  try {
    const params = new URLSearchParams({
      $where: wherePoint(lat, lng, geomCol),
      $limit: "1",
    });
    const url = `${PARCELS_URL}?${params.toString()}`;
    if (DEBUG) console.log("[DataSF parcels] URL:", url);
    const res = await fetch(url);
    if (DEBUG) console.log("[DataSF parcels] status:", res.status, res.statusText);
    const data = (await res.json()) as Array<{
      blklot?: string;
      block_num?: string;
      lot_num?: string;
      zoning_code?: string;
      zoning_district?: string;
    }>;
    if (DEBUG) console.log("[DataSF parcels] body length:", Array.isArray(data) ? data.length : "not array", "sample:", JSON.stringify(data?.[0])?.slice(0, 300));
    if (!res.ok) {
      if (DEBUG) console.log("[DataSF parcels] error body:", typeof data === "object" ? JSON.stringify(data).slice(0, 500) : data);
      return null;
    }
    if (!Array.isArray(data) || data.length === 0) return null;
    const row = data[0];
    if (row.blklot == null) return null;
    return {
      blklot: String(row.blklot),
      block_num: row.block_num != null ? String(row.block_num) : "",
      lot_num: row.lot_num != null ? String(row.lot_num) : "",
      zoning_code: row.zoning_code != null ? String(row.zoning_code) : undefined,
      zoning_district: row.zoning_district != null ? String(row.zoning_district) : undefined,
    };
  } catch (e) {
    if (DEBUG) console.log("[DataSF parcels] error:", e);
    return null;
  }
}

export async function getZoning(lat: number, lng: number): Promise<ZoningInfo | null> {
  const geomCol = GEOM_COLUMN.zoning;
  try {
    const params = new URLSearchParams({
      $where: wherePoint(lat, lng, geomCol),
      $limit: "1",
    });
    const url = `${ZONING_URL}?${params.toString()}`;
    if (DEBUG) console.log("[DataSF zoning] URL:", url);
    const res = await fetch(url);
    if (DEBUG) console.log("[DataSF zoning] status:", res.status, res.statusText);
    const data = (await res.json()) as Array<{
      zoning?: string;
      zoning_sim?: string;
      districtname?: string;
    }>;
    if (DEBUG) console.log("[DataSF zoning] body length:", Array.isArray(data) ? data.length : "not array", "sample:", JSON.stringify(data?.[0])?.slice(0, 300));
    if (!res.ok) {
      if (DEBUG) console.log("[DataSF zoning] error body:", typeof data === "object" ? JSON.stringify(data).slice(0, 500) : data);
      return null;
    }
    if (!Array.isArray(data) || data.length === 0) return null;
    const row = data[0];
    const code = row.zoning ?? row.zoning_sim ?? "";
    if (!code) return null;
    return {
      zoning_code: String(code),
      zoning_name: row.districtname != null ? String(row.districtname) : "",
    };
  } catch (e) {
    if (DEBUG) console.log("[DataSF zoning] error:", e);
    return null;
  }
}

export async function getHeightBulk(lat: number, lng: number): Promise<HeightBulkInfo | null> {
  const geomCol = GEOM_COLUMN.height_bulk;
  try {
    const params = new URLSearchParams({
      $where: wherePoint(lat, lng, geomCol),
      $limit: "1",
    });
    const url = `${HEIGHT_BULK_URL}?${params.toString()}`;
    if (DEBUG) console.log("[DataSF height_bulk] URL:", url);
    const res = await fetch(url);
    if (DEBUG) console.log("[DataSF height_bulk] status:", res.status, res.statusText);
    const data = (await res.json()) as Array<{
      heightlimit?: string;
      bulkdistrict?: string;
    }>;
    if (DEBUG) console.log("[DataSF height_bulk] body length:", Array.isArray(data) ? data.length : "not array", "sample:", JSON.stringify(data?.[0])?.slice(0, 300));
    if (!res.ok) {
      if (DEBUG) console.log("[DataSF height_bulk] error body:", typeof data === "object" ? JSON.stringify(data).slice(0, 500) : data);
      return null;
    }
    if (!Array.isArray(data) || data.length === 0) return null;
    const row = data[0];
    return {
      height_limit: row.heightlimit != null ? String(row.heightlimit) : "",
      bulk_district: row.bulkdistrict != null ? String(row.bulkdistrict) : "",
    };
  } catch (e) {
    if (DEBUG) console.log("[DataSF height_bulk] error:", e);
    return null;
  }
}

export async function getParcelZoning(lat: number, lng: number): Promise<LookupResult> {
  const [parcel, zoning, height_bulk] = await Promise.all([
    getParcel(lat, lng),
    getZoning(lat, lng),
    getHeightBulk(lat, lng),
  ]);
  // Use zoning from parcel response when zoning API returns nothing (e.g. different geometry column).
  const effectiveZoning: ZoningInfo | null =
    zoning ??
    (parcel?.zoning_code
      ? { zoning_code: parcel.zoning_code, zoning_name: parcel.zoning_district ?? "" }
      : null);
  return { parcel, zoning: effectiveZoning, height_bulk };
}
