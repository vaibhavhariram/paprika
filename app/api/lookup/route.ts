import { NextResponse } from "next/server";
import { getParcelZoning } from "@/lib/datasf";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lat = typeof body.lat === "number" ? body.lat : parseFloat(body.lat);
    const lng = typeof body.lng === "number" ? body.lng : parseFloat(body.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: "Invalid lat or lng" },
        { status: 400 }
      );
    }

    const result = await getParcelZoning(lat, lng);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Lookup failed" },
      { status: 500 }
    );
  }
}
