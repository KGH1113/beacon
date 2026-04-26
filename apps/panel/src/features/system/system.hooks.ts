"use client";

import {
  type SystemOverviewDto,
  SystemOverviewRealtimeEventDtoSchema,
} from "@beacon/shared";
import { useEffect, useState } from "react";

import { mockSystemOverview } from "./system.lib";

export type SystemOverviewStreamStatus =
  | "mock"
  | "connecting"
  | "live"
  | "reconnecting";

export function useSystemOverview() {
  return {
    data: mockSystemOverview,
    isLoading: false,
    error: null,
  };
}

export function useSystemOverviewStream(
  initialOverview: SystemOverviewDto | undefined,
  isFallback: boolean,
  daemonStreamBaseUrl: string,
) {
  const [overview, setOverview] = useState<SystemOverviewDto>(
    initialOverview ?? mockSystemOverview,
  );
  const [status, setStatus] = useState<SystemOverviewStreamStatus>(
    isFallback ? "mock" : "connecting",
  );

  useEffect(() => {
    setOverview(initialOverview ?? mockSystemOverview);
  }, [initialOverview]);

  useEffect(() => {
    if (isFallback) {
      setStatus("mock");
      return;
    }

    const url = new URL("/api/v1/system/overview/stream", daemonStreamBaseUrl);
    const eventSource = new EventSource(url);

    setStatus("connecting");

    eventSource.onopen = () => {
      setStatus("live");
    };

    eventSource.onerror = () => {
      setStatus("reconnecting");
    };

    eventSource.addEventListener("system.overview", (event) => {
      const payload = parseSseJson(event.data);
      const parsed = SystemOverviewRealtimeEventDtoSchema.safeParse(payload);

      if (!parsed.success) {
        setStatus("reconnecting");
        return;
      }

      setOverview(parsed.data.payload);
      setStatus("live");
    });

    return () => {
      eventSource.close();
    };
  }, [daemonStreamBaseUrl, isFallback]);

  return {
    overview,
    status,
  };
}

function parseSseJson(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}
