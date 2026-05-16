import { NextResponse } from "next/server";

/**
 * Messages API temporarily disabled because Firebase has been unlinked.
 * This stub keeps the build working while preventing any runtime Firebase calls.
 */

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Messages API is currently disabled because Firebase is not configured on this deployment.",
    },
    { status: 503 }
  );
}
