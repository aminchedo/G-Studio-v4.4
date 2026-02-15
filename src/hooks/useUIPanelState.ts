import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "gstudio-ui-panels";

function readStored(): Partial<{
  chatVisible: boolean;
  sidebarVisible: boolean;
  inspectorVisible: boolean;
  previewVisible: boolean;
  monitorVisible: boolean;
}> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      chatVisible:
        typeof parsed.chatVisible === "boolean"
          ? parsed.chatVisible
          : undefined,
      sidebarVisible:
        typeof parsed.sidebarVisible === "boolean"
          ? parsed.sidebarVisible
          : undefined,
      inspectorVisible:
        typeof parsed.inspectorVisible === "boolean"
          ? parsed.inspectorVisible
          : undefined,
      previewVisible:
        typeof parsed.previewVisible === "boolean"
          ? parsed.previewVisible
          : undefined,
      monitorVisible:
        typeof parsed.monitorVisible === "boolean"
          ? parsed.monitorVisible
          : undefined,
    };
  } catch {
    return {};
  }
}

function writeStored(state: {
  chatVisible: boolean;
  sidebarVisible: boolean;
  inspectorVisible: boolean;
  previewVisible: boolean;
  monitorVisible: boolean;
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useUIPanelState() {
  const stored = readStored();
  const [chatVisible, setChatVisibleState] = useState(
    stored.chatVisible ?? true,
  );
  // Default to expanded so the new enhanced chat is visible by default
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisibleState] = useState(
    stored.sidebarVisible ?? true,
  );
  const [inspectorVisible, setInspectorVisibleState] = useState(
    stored.inspectorVisible ?? false,
  );
  const [previewVisible, setPreviewVisibleState] = useState(
    stored.previewVisible ?? false,
  );
  const [monitorVisible, setMonitorVisibleState] = useState(
    stored.monitorVisible ?? false,
  );
  const [vcodeVisible, setVcodeVisibleState] = useState(false);
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [editorVisible, setEditorVisible] = useState(true);

  // Persist to localStorage when visibility changes
  useEffect(() => {
    writeStored({
      chatVisible,
      sidebarVisible,
      inspectorVisible,
      previewVisible,
      monitorVisible,
    });
  }, [
    chatVisible,
    sidebarVisible,
    inspectorVisible,
    previewVisible,
    monitorVisible,
  ]);

  const setChatVisible = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setChatVisibleState((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    },
    [],
  );
  const setSidebarVisible = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setSidebarVisibleState((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    },
    [],
  );
  const setInspectorVisible = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setInspectorVisibleState((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    },
    [],
  );
  const setPreviewVisible = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setPreviewVisibleState((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    },
    [],
  );
  const setMonitorVisible = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setMonitorVisibleState((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    },
    [],
  );
  const setVcodeVisible = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setVcodeVisibleState((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    },
    [],
  );

  return {
    chatVisible,
    setChatVisible,
    chatCollapsed,
    setChatCollapsed,
    sidebarVisible,
    setSidebarVisible,
    inspectorVisible,
    setInspectorVisible,
    previewVisible,
    setPreviewVisible,
    monitorVisible,
    setMonitorVisible,
    vcodeVisible,
    setVcodeVisible,
    minimapEnabled,
    setMinimapEnabled,
    editorVisible,
    setEditorVisible,
  };
}
