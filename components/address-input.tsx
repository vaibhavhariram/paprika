"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geocode, type GeocodeResult } from "@/lib/geocode";
import type { LookupResult } from "@/lib/datasf";

export function AddressInput() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeocodeResult | null>(null);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    setLookup(null);
    if (!address.trim()) return;

    setLoading(true);
    try {
      const geocoded = await geocode(address);
      if (!geocoded) {
        setError("Address not found. Try a different search.");
        return;
      }
      setResult(geocoded);
      console.log("Geocode result:", { lat: geocoded.lat, lng: geocoded.lng });

      const lookupRes = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: geocoded.lat, lng: geocoded.lng }),
      });
      if (!lookupRes.ok) {
        setError("Could not load parcel and zoning data.");
        return;
      }
      const lookupData: LookupResult = await lookupRes.json();
      setLookup(lookupData);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter an address (e.g. 350 Mission Street, San Francisco)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing…" : "Analyze"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <p className="font-medium text-muted-foreground">Coordinates</p>
            <p className="mt-1">
              <strong>Lat:</strong> {result.lat.toFixed(6)}{" "}
              <strong>Lng:</strong> {result.lng.toFixed(6)}
            </p>
            <p className="mt-1 text-muted-foreground">{result.display_name}</p>
          </div>
          {lookup && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-2">
              <p className="font-medium text-muted-foreground">Parcel & Zoning (DataSF)</p>
              {lookup.parcel ? (
                <p>
                  <strong>Parcel (blklot):</strong> {lookup.parcel.blklot}
                  {lookup.parcel.block_num || lookup.parcel.lot_num
                    ? ` — Block ${lookup.parcel.block_num}, Lot ${lookup.parcel.lot_num}`
                    : ""}
                </p>
              ) : (
                <p className="text-muted-foreground">No parcel found (e.g. outside SF)</p>
              )}
              {lookup.zoning ? (
                <p>
                  <strong>Zoning:</strong> {lookup.zoning.zoning_code}
                  {lookup.zoning.zoning_name ? ` — ${lookup.zoning.zoning_name}` : ""}
                </p>
              ) : (
                <p className="text-muted-foreground">No zoning district found</p>
              )}
              {lookup.height_bulk ? (
                <p>
                  <strong>Height / bulk:</strong>{" "}
                  {[lookup.height_bulk.height_limit, lookup.height_bulk.bulk_district]
                    .filter(Boolean)
                    .join(" — ") || "—"}
                </p>
              ) : (
                <p className="text-muted-foreground">No height/bulk district found</p>
              )}
              <div className="border-t pt-2 mt-2">
                <p className="font-medium text-muted-foreground">Zoning rules</p>
                {lookup.zoning_rules ? (
                  <div className="mt-1 space-y-1 text-sm">
                    <p>
                      <strong>{lookup.zoning_rules.zone_code}</strong> — {lookup.zoning_rules.name}
                    </p>
                    {lookup.zoning_rules.description && (
                      <p className="text-muted-foreground">{lookup.zoning_rules.description}</p>
                    )}
                    {lookup.zoning_rules.permitted_uses && lookup.zoning_rules.permitted_uses.length > 0 && (
                      <p>
                        <strong>Permitted uses:</strong>{" "}
                        {lookup.zoning_rules.permitted_uses.join(", ")}
                      </p>
                    )}
                    {lookup.zoning_rules.conditional_uses && lookup.zoning_rules.conditional_uses.length > 0 && (
                      <p>
                        <strong>Conditional uses:</strong>{" "}
                        {lookup.zoning_rules.conditional_uses.join(", ")}
                      </p>
                    )}
                    {lookup.zoning_rules.max_height_note && (
                      <p className="text-muted-foreground">{lookup.zoning_rules.max_height_note}</p>
                    )}
                    {lookup.zoning_rules.bulk_note && (
                      <p className="text-muted-foreground">{lookup.zoning_rules.bulk_note}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">
                    {lookup.zoning_rules_message ?? "No zoning rules available."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
