import { NextResponse } from "next/server";

import {
  composeHandoffDescription,
  emptyFieldsForLeaf,
  getLeafDefinition,
  isComplaintLeafId,
  mergeAiIssueFieldsFromCatalog,
  pickAlternativeCandidates,
  candidatesFromIds,
} from "@/lib/311-catalog";
import { classifyStreetPhoto } from "@/lib/classify";
import { findNearbyRequests } from "@/lib/nyc-open-data";
import { getDraft, saveDraft } from "@/lib/storage";
import type { ReportDraft } from "@/types/report";

interface CategoryBody {
  leafId?: string;
  noneOfAbove?: boolean;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const draft = await getDraft(reportId);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  const body = (await request.json()) as CategoryBody;

  if (body.noneOfAbove) {
    const noneOfAboveCount = (draft.noneOfAboveCount || 0) + 1;
    const excluded = [
      ...(draft.excludedLeafIds || []),
      ...(draft.categoryCandidates?.map((candidate) => candidate.leafId) || []),
    ];
    const uniqueExcluded = [...new Set(excluded)];

    let candidates = candidatesFromIds(pickAlternativeCandidates(uniqueExcluded, 3));

    if (draft.photoDataUrl && noneOfAboveCount <= 2) {
      try {
        const classification = await classifyStreetPhoto(
          draft.photoDataUrl,
          draft.location,
          uniqueExcluded,
        );
        candidates = classification.candidates;
      } catch {
        // keep fallback candidates
      }
    }

    const updated: ReportDraft = {
      ...draft,
      categoryCandidates: candidates,
      noneOfAboveCount,
      excludedLeafIds: uniqueExcluded,
    };
    await saveDraft(updated);

    return NextResponse.json({
      candidates,
      noneOfAboveCount,
    });
  }

  if (!body.leafId || !isComplaintLeafId(body.leafId)) {
    return NextResponse.json({ error: "A valid leafId is required." }, { status: 400 });
  }

  const leafId = body.leafId;
  const leaf = getLeafDefinition(leafId);
  const fields = {
    ...emptyFieldsForLeaf(leafId),
    ...(draft.issueFields || {}),
    address: draft.address.label,
  };

  const { fields: mergedFields, prefilledKeys } = mergeAiIssueFieldsFromCatalog(
    leafId,
    draft.issueFields,
  );
  Object.assign(fields, mergedFields);

  const description = composeHandoffDescription(leafId, fields, draft.address.label);
  const nearby = await findNearbyRequests(draft.location, leafId);

  const updated: ReportDraft = {
    ...draft,
    leafId,
    issueType: leafId,
    categoryConfirmed: true,
    issueFields: fields,
    aiPrefilledFields: prefilledKeys.length ? prefilledKeys : draft.aiPrefilledFields,
    description,
    nearbyRequests: nearby,
    identificationVerification: undefined,
  };

  await saveDraft(updated);

  return NextResponse.json({
    leafId,
    label: leaf.label,
  });
}
