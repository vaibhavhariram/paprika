"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geocode, type GeocodeResult } from "@/lib/geocode";

export function AddressInput() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeocodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    if (!address.trim()) return;

    setLoading(true);
    try {
      const geocoded = await geocode(address);
      if (geocoded) {
        setResult(geocoded);
        console.log("Geocode result:", { lat: geocoded.lat, lng: geocoded.lng });
      } else {
        setError("Address not found. Try a different search.");
      }
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
        <div className="rounded-md border bg-muted/50 p-3 text-sm">
          <p className="font-medium text-muted-foreground">Coordinates</p>
          <p className="mt-1">
            <strong>Lat:</strong> {result.lat.toFixed(6)}{" "}
            <strong>Lng:</strong> {result.lng.toFixed(6)}
          </p>
          <p className="mt-1 text-muted-foreground">{result.display_name}</p>
        </div>
      )}
    </div>
  );
}
