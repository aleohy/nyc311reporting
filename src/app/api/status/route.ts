import { NextResponse } from "next/server";

import { lookupServiceRequest } from "@/lib/nyc311/submit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const srNumber = searchParams.get("srNumber");

  if (!srNumber) {
    return NextResponse.json({ error: "srNumber is required." }, { status: 400 });
  }

  const result = await lookupServiceRequest(srNumber);
  if (!result) {
    return NextResponse.json(
      {
        error:
          "Status lookup unavailable. Add NYC_311_API_KEY to enable live 311 status checks.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ result });
}
