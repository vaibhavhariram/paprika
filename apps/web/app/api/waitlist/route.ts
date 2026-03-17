import { NextResponse } from "next/server";

function isValidEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 3 || e.length > 320) return false;
  // Pragmatic validation (avoids overfitting to RFC edge-cases).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: unknown; source?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const source = typeof body.source === "string" ? body.source.trim().slice(0, 64) : null;

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, code: "invalid_email", message: "Enter a valid email address." },
        { status: 400 }
      );
    }

    // UI-only mode: accept the signup and return a clean confirmation response.
    // This is intentionally a boundary that can be wired to storage later.
    // (We still parse `source` so the client contract remains stable.)
    void source;

    return NextResponse.json(
      { ok: true, code: "signed_up", message: "You’re in. We’ll keep you posted." },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "Invalid request." },
      { status: 400 }
    );
  }
}

