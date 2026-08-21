"use client";

import { useEffect, useState } from "react";

import type { GeoPoint } from "@/types/report";

interface GeolocationState {
  location?: GeoPoint;
  error?: string;
  loading: boolean;
}

const GPS_TIMEOUT_MS = 8000;

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({ loading: true });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        loading: false,
        error: "GPS unavailable — you can still upload. We'll use your photo location or let you set the pin next.",
      });
      return;
    }

    let settled = false;

    const finish = (next: GeolocationState) => {
      if (settled) return;
      settled = true;
      setState(next);
    };

    const timeoutId = window.setTimeout(() => {
      finish({
        loading: false,
        error:
          "GPS is taking too long — you can still upload. We'll use your photo's location or let you set the pin on the next screen.",
      });
    }, GPS_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeoutId);
        finish({
          loading: false,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
      },
      () => {
        window.clearTimeout(timeoutId);
        finish({
          loading: false,
          error:
            "Location permission denied — you can still upload. We'll use your photo's location or let you set the pin on the next screen.",
        });
      },
      {
        enableHighAccuracy: false,
        timeout: GPS_TIMEOUT_MS - 500,
        maximumAge: 60000,
      },
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return state;
}
