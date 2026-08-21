import { buildCopyPacket, getLeafDefinition } from "@/lib/311-catalog";
import { resolveDraftLeafId } from "@/lib/issue-fields";
import type { ReportDraft, SubmitResult } from "@/types/report";

async function submitViaPartnerApi(draft: ReportDraft): Promise<SubmitResult | null> {
  const partnerKey = process.env.NYC_311_PARTNER_API_KEY;
  if (!partnerKey) {
    return null;
  }

  const leafId = resolveDraftLeafId(draft);
  if (!leafId) {
    return null;
  }

  const leaf = getLeafDefinition(leafId);
  const endpoint = process.env.NYC_311_PARTNER_SUBMIT_URL;
  if (!endpoint) {
    return null;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": partnerKey,
    },
    body: JSON.stringify({
      service_code: leafId,
      address_string: draft.address.label,
      lat: draft.location.lat,
      long: draft.location.lng,
      description: draft.description,
      media_url: draft.photoDataUrl,
    }),
  });

  if (!response.ok) {
    throw new Error("Partner API submission failed.");
  }

  const payload = (await response.json()) as { service_request_id?: string };
  const serviceRequestNumber = payload.service_request_id;
  const { summary, pages } = buildCopyPacket(
    leafId,
    draft.issueFields || {},
    draft.address.label,
    draft.location,
    draft.description,
  );

  return {
    mode: "partner",
    reportId: draft.id,
    serviceRequestNumber,
    handoffUrl: leaf.formUrl,
    summary,
    packetPages: pages,
    message: serviceRequestNumber
      ? `Report filed with NYC 311. Your service request number is ${serviceRequestNumber}.`
      : "Report submitted through the NYC 311 partner API.",
  };
}

/** Phase 1: build copy/paste packet and official form deep link. */
export async function createHandoffPacket(draft: ReportDraft): Promise<SubmitResult> {
  const partnerResult = await submitViaPartnerApi(draft);
  if (partnerResult) {
    return partnerResult;
  }

  const leafId = resolveDraftLeafId(draft);
  if (!leafId) {
    throw new Error("Complaint category is required before filing.");
  }

  const leaf = getLeafDefinition(leafId);
  const { summary, pages } = buildCopyPacket(
    leafId,
    draft.issueFields || {},
    draft.address.label,
    draft.location,
    draft.description,
  );

  return {
    mode: "handoff",
    reportId: draft.id,
    handoffUrl: leaf.formUrl,
    summary,
    packetPages: pages,
    message:
      "Open NYC311, paste your description into the Description field, then complete the rest on their site.",
  };
}

export async function lookupServiceRequest(srNumber: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.NYC_311_API_KEY;
  if (!apiKey) {
    return null;
  }

  const endpoint = process.env.NYC_311_LOOKUP_URL || "https://api.nyc.gov/public/api/GetServiceRequest";
  const response = await fetch(`${endpoint}?srnumber=${encodeURIComponent(srNumber)}`, {
    headers: {
      Accept: "application/json",
      "Ocp-Apim-Subscription-Key": apiKey,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as Record<string, unknown>;
}
