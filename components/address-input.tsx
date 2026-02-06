"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geocode, type GeocodeResult } from "@/lib/geocode";
import type { LookupResult } from "@/lib/datasf";
import { ResultsCard } from "@/components/results-card";

export function AddressInput() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setError(null);
    setGeocodeResult(null);
    setLookup(null);
    if (!address.trim()) return;

    setLoading(true);
    try {
      const geocoded = await geocode(address);
      if (!geocoded) {
        setError("Address not found. Try a different search.");
        return;
      }
      setGeocodeResult(geocoded);
      console.log("Geocode result:", {
        lat: geocoded.lat,
        lng: geocoded.lng,
        display_name: geocoded.display_name,
      });

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

  const addressDisplay =
    (geocodeResult?.display_name ?? address.trim()) || "";

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
      {(loading || lookup !== null) && (
        <ResultsCard
          addressDisplay={addressDisplay}
          lookup={lookup}
          loading={loading}
        />
      )}
    </div>
  );
}
