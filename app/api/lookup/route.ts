import { NextResponse } from "next/server";
import { getParcelZoning } from "@/lib/datasf";
import { getZoningRulesForCode } from "@/lib/zoning-rules";

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
    const zoneCode = result.zoning?.zoning_code ?? result.parcel?.zoning_code;
    const { rules: zoning_rules, message: zoning_rules_message } =
      getZoningRulesForCode(zoneCode);

    return NextResponse.json({
      ...result,
      zoning_rules: zoning_rules ?? null,
      ...(zoning_rules_message != null && zoning_rules_message !== ""
        ? { zoning_rules_message }
        : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Lookup failed" },
      { status: 500 }
    );
  }
}
