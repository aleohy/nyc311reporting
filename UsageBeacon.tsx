"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SKIP_PREFIXES = ["/admin", "/volunteer", "/api"];

export function UsageBeacon() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }

    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "page_view", path: pathname }),
      keepalive: true,
    }).catch(() => {
      // Usage tracking should never interrupt the visitor.
    });
  }, [pathname]);

  return null;
}
