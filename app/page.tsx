import { AddressInput } from "@/components/address-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Paprika</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter an address to get coordinates (Phase 1 — geocoding).
            </p>
          </CardHeader>
          <CardContent>
            <AddressInput />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
