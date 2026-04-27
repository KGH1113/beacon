"use client";

import type { DockerContainerDto } from "@beacon/shared";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DockerContainersRealtimeEventDtoSchema,
  DockerExecOutputDtoSchema,
  DockerLogEventDtoSchema,
} from "./docker.schema";
import { useDockerStore } from "./docker.store";

export type DockerStreamStatus =
  | "connecting"
  | "fallback"
  | "live"
  | "reconnecting";

export type DockerLogLineEntry = {
  id: string;
  line: string;
};

export function useDockerContainersStream(
  initialContainers: DockerContainerDto[],
  isFallback: boolean,
  daemonBaseUrl: string,
) {
  const [containers, setContainers] = useState(initialContainers);
  const [status, setStatus] = useState<DockerStreamStatus>(
    isFallback ? "fallback" : "connecting",
  );

  useEffect(() => {
    setContainers(initialContainers);
  }, [initialContainers]);

  useEffect(() => {
    if (isFallback) {
      setStatus("fallback");
      return;
    }

    const eventSource = new EventSource(
      new URL("/api/v1/docker/containers/stream", daemonBaseUrl),
    );

    eventSource.addEventListener("docker.containers.snapshot", (event) => {
      const parsed = DockerContainersRealtimeEventDtoSchema.parse(
        JSON.parse(event.data),
      );

      setContainers(parsed.payload.containers);
      setStatus("live");
    });

    eventSource.onerror = () => {
      setStatus((current) => (current === "live" ? "reconnecting" : current));
    };

    return () => eventSource.close();
  }, [daemonBaseUrl, isFallback]);

  return {
    containers,
    status,
  };
}

export function useDockerLogs(
  containerId: string | null,
  initialLines: string[],
  enabled: boolean,
  daemonBaseUrl: string,
) {
  const [lines, setLines] = useState<DockerLogLineEntry[]>(
    toLogEntries(initialLines),
  );
  const [isStreaming, setStreaming] = useState(false);

  useEffect(() => {
    setLines(toLogEntries(initialLines));
  }, [initialLines]);

  useEffect(() => {
    if (!enabled || !containerId) {
      setStreaming(false);
      return;
    }

    const eventSource = new EventSource(
      new URL(
        `/api/v1/docker/containers/${encodeURIComponent(containerId)}/logs/stream`,
        daemonBaseUrl,
      ),
    );

    eventSource.addEventListener("docker.log", (event) => {
      const parsed = DockerLogEventDtoSchema.parse(JSON.parse(event.data));

      setLines((current) =>
        [...current, toLogEntry(parsed.payload.line)]
          .filter((line) => Boolean(line.line))
          .slice(-300),
      );
      setStreaming(true);
    });

    eventSource.onerror = () => {
      setStreaming(false);
    };

    return () => eventSource.close();
  }, [containerId, daemonBaseUrl, enabled]);

  return {
    isStreaming,
    lines,
  };
}

export function useDockerExecSession(
  container: DockerContainerDto | null,
  daemonBaseUrl: string,
  enabled: boolean,
) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const setShellConnected = useDockerStore((state) => state.setShellConnected);
  const [connected, setConnected] = useState(false);
  const [terminalElement, setTerminalElement] = useState<HTMLDivElement | null>(
    null,
  );

  const websocketUrl = useMemo(() => {
    if (!container) {
      return null;
    }

    return toWebSocketUrl(
      daemonBaseUrl,
      `/api/v1/docker/containers/${encodeURIComponent(container.id)}/exec`,
    );
  }, [container, daemonBaseUrl]);

  useEffect(() => {
    if (!enabled || !container || !terminalElement || !websocketUrl) {
      setConnected(false);
      setShellConnected(false);
      return;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      rows: 18,
      theme: {
        background: "#00000000",
        cursor: "#f5f5f5",
        foreground: "#f5f5f5",
      },
    });
    const fitAddon = new FitAddon();
    const socket = new WebSocket(websocketUrl);
    let inputBuffer = "";

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    socketRef.current = socket;
    terminal.loadAddon(fitAddon);
    terminal.open(terminalElement);
    fitAddon.fit();
    terminal.writeln(`Connecting to ${container.name}...`);
    terminal.writeln(
      `docker exec -i ${container.name} ${container.defaultShell}`,
    );

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalElement);

    socket.onopen = () => {
      setConnected(true);
      setShellConnected(true);
    };

    socket.onmessage = (event) => {
      const parsed = DockerExecOutputDtoSchema.parse(JSON.parse(event.data));

      terminal.write(
        formatDockerExecOutput(parsed.payload.data, container.name),
      );
    };

    socket.onerror = () => {
      terminal.writeln("\r\nDocker exec websocket failed.");
      setConnected(false);
      setShellConnected(false);
    };

    socket.onclose = () => {
      setConnected(false);
      setShellConnected(false);
    };

    const disposable = terminal.onData((data) => {
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (data === "\r") {
        terminal.write("\r\n");
        socket.send(
          JSON.stringify({
            type: "docker.exec.input",
            payload: { data: `${inputBuffer}\n` },
          }),
        );
        inputBuffer = "";
        return;
      }

      if (data === "\u007F") {
        if (inputBuffer.length === 0) {
          return;
        }

        inputBuffer = inputBuffer.slice(0, -1);
        terminal.write("\b \b");
        return;
      }

      inputBuffer += data;
      terminal.write(data);
    });

    return () => {
      disposable.dispose();
      resizeObserver.disconnect();
      socket.close();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      socketRef.current = null;
      setConnected(false);
      setShellConnected(false);
    };
  }, [container, enabled, setShellConnected, terminalElement, websocketUrl]);

  return {
    connected,
    terminalRef: setTerminalElement,
  };
}

function toWebSocketUrl(baseUrl: string, path: string) {
  const url = new URL(path, baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  return url.toString();
}

function formatDockerExecOutput(data: string, containerName: string) {
  return data
    .replaceAll("__BEACON_READY__\n", `Connected.\r\n${containerName}:/$ `)
    .replaceAll("\n__BEACON_PROMPT__\n", `\r\n${containerName}:/$ `)
    .replaceAll("__BEACON_PROMPT__\n", `${containerName}:/$ `);
}

function toLogEntries(lines: string[]): DockerLogLineEntry[] {
  return lines.map((line) => toLogEntry(line));
}

function toLogEntry(line: string): DockerLogLineEntry {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36),
    line,
  };
}
