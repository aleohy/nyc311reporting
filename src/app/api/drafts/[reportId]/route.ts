import { NextResponse } from "next/server";

import { getDraft, saveDraft } from "@/lib/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const draft = await getDraft(reportId);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  return NextResponse.json({ draft });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const draft = await getDraft(reportId);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    description?: string;
    issueFields?: Record<string, string>;
  };

  const nextDescription =
    body.description !== undefined ? body.description.trim() : draft.description.trim();

  if (!nextDescription) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  if (nextDescription.length > 2000) {
    return NextResponse.json(
      { error: "Description must be 2000 characters or fewer." },
      { status: 400 },
    );
  }

  const updated = {
    ...draft,
    description: nextDescription,
    issueFields:
      body.issueFields !== undefined
        ? { ...(draft.issueFields || {}), ...body.issueFields }
        : draft.issueFields,
  };

  await saveDraft(updated);

  return NextResponse.json({ draft: updated });
}
