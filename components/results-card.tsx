"use client";

import type { LookupResult } from "@/lib/datasf";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ResultsCardProps {
  /** Display address (e.g. from geocode display_name) */
  addressDisplay: string;
  /** Lookup result from API; null when no data or not yet loaded */
  lookup: LookupResult | null;
  loading: boolean;
}

export function ResultsCard({
  addressDisplay,
  lookup,
  loading,
}: ResultsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Loading…</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fetching parcel and zoning data…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!lookup) {
    return null;
  }

  const inSF = lookup.parcel != null || lookup.zoning != null;
  if (!inSF) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{addressDisplay}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive font-medium">
            Address not in San Francisco.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Paprika currently supports zoning lookup for San Francisco only.
          </p>
        </CardContent>
      </Card>
    );
  }

  const parcelId = lookup.parcel?.blklot
    ? [lookup.parcel.blklot, lookup.parcel.block_num, lookup.parcel.lot_num]
        .filter(Boolean)
        .join(" / ")
    : null;
  const zoneCode = lookup.zoning?.zoning_code ?? null;
  const zoneName = lookup.zoning?.zoning_name ?? lookup.zoning_rules?.name ?? "";
  const heightDisplay =
    lookup.height_bulk?.height_limit?.trim() ||
    lookup.zoning_rules?.max_height_note ||
    "Height limit not available";
  const farDisplay =
    lookup.zoning_rules?.far ?? "—";
  const hasDetailedRules = lookup.zoning_rules != null;
  const codeSections = lookup.zoning_rules?.code_sections;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold leading-tight">
          {addressDisplay}
        </CardTitle>
        {parcelId && (
          <p className="text-sm text-muted-foreground">
            Parcel: {parcelId}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Primary info: Zoning, Height, FAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Zoning
            </p>
            <p className="font-semibold mt-0.5">{zoneCode ?? "—"}</p>
            {zoneName && (
              <p className="text-sm text-muted-foreground truncate" title={zoneName}>
                {zoneName}
              </p>
            )}
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Height
            </p>
            <p className="font-semibold mt-0.5 text-sm">{heightDisplay}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              FAR
            </p>
            <p className="font-semibold mt-0.5">{farDisplay}</p>
          </div>
        </div>

        {/* Uses: Permitted vs Conditional */}
        {(hasDetailedRules &&
          (lookup.zoning_rules!.permitted_uses?.length ||
            lookup.zoning_rules!.conditional_uses?.length)) ? (
          <div className="space-y-3">
            {lookup.zoning_rules!.permitted_uses &&
              lookup.zoning_rules!.permitted_uses.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Permitted uses
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {lookup.zoning_rules!.permitted_uses.map((use) => (
                      <Badge key={use} variant="success">
                        {use}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            {lookup.zoning_rules!.conditional_uses &&
              lookup.zoning_rules!.conditional_uses.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Conditional uses
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {lookup.zoning_rules!.conditional_uses.map((use) => (
                      <Badge key={use} variant="warning">
                        {use}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {lookup.zoning_rules_message ??
                "Detailed rules not available for this zone."}
            </p>
          </div>
        )}

        {/* Summary: description from rules */}
        {hasDetailedRules && lookup.zoning_rules!.description && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              Summary
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {lookup.zoning_rules!.description}
            </p>
          </div>
        )}
      </CardContent>
      {codeSections && codeSections.length > 0 && (
        <CardFooter className="border-t bg-muted/30 py-3">
          <p className="text-xs text-muted-foreground">
            Planning Code: {codeSections.join(", ")}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
