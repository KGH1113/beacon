"use client";

import type { DockerContainerDto } from "@beacon/shared";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";

import { mockDockerContainers, mockDockerLogs } from "./docker.lib";
import { useDockerStore } from "./docker.store";

export function useDockerContainers() {
  return {
    data: mockDockerContainers,
    isLoading: false,
    error: null,
  };
}

export function useDockerLogs(containerId?: string | null) {
  const container = mockDockerContainers.find(
    (item) => item.id === containerId,
  );

  return {
    lines: container?.recentLogs ?? mockDockerLogs,
    isStreaming: Boolean(container),
  };
}

export function useDockerExecSession(
  container: DockerContainerDto | null,
  enabled = true,
) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const setShellConnected = useDockerStore((state) => state.setShellConnected);
  const [connected, setConnected] = useState(false);
  const [terminalElement, setTerminalElement] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    if (!enabled || !container || !terminalElement) {
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
        foreground: "#f5f5f5",
        cursor: "#f5f5f5",
      },
    });
    const fitAddon = new FitAddon();
    let promptBuffer = "";

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);
    terminal.open(terminalElement);
    fitAddon.fit();

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalElement);

    terminal.writeln(`Connecting to ${container.name}...`);
    terminal.writeln(
      `docker exec -it ${container.name} ${container.defaultShell}`,
    );
    terminal.writeln(
      "Mock shell connected. Daemon websocket is not wired yet.",
    );
    terminal.write(`\r\n${container.name}:/$ `);

    setConnected(true);
    setShellConnected(true);

    const disposable = terminal.onData((data) => {
      if (data === "\r") {
        terminal.write(
          `\r\nmock: ${promptBuffer || "command received"}\r\n${container.name}:/$ `,
        );
        promptBuffer = "";
        return;
      }

      if (data === "\u007F") {
        if (promptBuffer.length > 0) {
          promptBuffer = promptBuffer.slice(0, -1);
          terminal.write("\b \b");
        }
        return;
      }

      promptBuffer += data;
      terminal.write(data);
    });

    return () => {
      disposable.dispose();
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      setConnected(false);
      setShellConnected(false);
    };
  }, [container, enabled, setShellConnected, terminalElement]);

  return {
    connected,
    terminalRef: setTerminalElement,
  };
}
