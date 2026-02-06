/**
 * Zoning rules lookup from static JSON.
 * Match is flexible: strip parenthetical suffixes, case-insensitive.
 */

import rulesData from "@/data/zoning-rules.json";

export interface ZoningRule {
  zone_code: string;
  name: string;
  description?: string;
  permitted_uses?: string[];
  conditional_uses?: string[];
  prohibited_uses?: string[];
  max_height_note?: string;
  bulk_note?: string;
}

interface ZoningRulesData {
  rules: Array<{
    zone_code: string;
    name: string;
    description?: string;
    permitted_uses?: string[];
    conditional_uses?: string[];
    prohibited_uses?: string[];
    max_height_note?: string;
    bulk_note?: string;
  }>;
}

/** Normalize zone code for matching: strip parenthetical suffix, trim, lower case. */
function normalizeZoneCode(code: string): string {
  return code
    .replace(/\s*\([^)]*\)\s*$/i, "")
    .trim()
    .toLowerCase();
}

/**
 * Look up zoning rules by zone code. Returns the rule and no message on success;
 * returns null and an optional message when not found.
 */
export function getZoningRulesForCode(
  zoneCode: string | null | undefined
): { rules: ZoningRule | null; message?: string } {
  if (zoneCode == null || String(zoneCode).trim() === "") {
    return { rules: null, message: "No zoning district found." };
  }

  const normalized = normalizeZoneCode(zoneCode);
  const data = rulesData as ZoningRulesData;
  if (!data?.rules || !Array.isArray(data.rules)) {
    return { rules: null, message: "No rules data available." };
  }

  const rule = data.rules.find(
    (r) => normalizeZoneCode(r.zone_code) === normalized
  );

  if (!rule) {
    return {
      rules: null,
      message: `No rules found for zone "${zoneCode}".`,
    };
  }

  return {
    rules: {
      zone_code: rule.zone_code,
      name: rule.name,
      description: rule.description,
      permitted_uses: rule.permitted_uses,
      conditional_uses: rule.conditional_uses,
      prohibited_uses: rule.prohibited_uses,
      max_height_note: rule.max_height_note,
      bulk_note: rule.bulk_note,
    },
  };
}
