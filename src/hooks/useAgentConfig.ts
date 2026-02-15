import { useState, useEffect } from "react";
import { SecureStorage } from "@/services/secureStorage";
import {
  isLikelyGeminiApiKey,
  normalizeGeminiApiKey,
} from "../utils/geminiApiKey";

export function useAgentConfig() {
  type AgentConfigState = {
    apiKey: string;
    voice: string;
    persona: string;
    language?: string;
  };

  const sanitize = (input: any): AgentConfigState => {
    const apiKeyRaw = typeof input?.apiKey === "string" ? input.apiKey : "";
    const apiKeyNorm = normalizeGeminiApiKey(apiKeyRaw);
    const safeApiKey =
      apiKeyNorm && isLikelyGeminiApiKey(apiKeyNorm) ? apiKeyNorm : "";

    return {
      apiKey: safeApiKey,
      voice: typeof input?.voice === "string" ? input.voice : "Kore",
      persona:
        typeof input?.persona === "string" ? input.persona : "Professional",
      language: typeof input?.language === "string" ? input.language : "fa-IR",
    };
  };

  const [agentConfig, setAgentConfigInternal] = useState<AgentConfigState>({
    apiKey: "",
    voice: "Kore",
    persona: "Professional",
    language: "fa-IR",
  });
  const [loading, setLoading] = useState(true);

  // Wrap setter to prevent accidental non-key text being persisted as apiKey
  const setAgentConfig = (
    next: AgentConfigState | ((prev: AgentConfigState) => AgentConfigState),
  ) => {
    setAgentConfigInternal((prev) =>
      sanitize(typeof next === "function" ? next(prev) : next),
    );
  };

  // Load from SecureStorage on mount, then hydrate from other sources if needed (single source of truth)
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStorage.getItem<AgentConfigState>(
          "gstudio_agent_config",
        );
        if (saved?.apiKey) {
          setAgentConfigInternal(sanitize(saved));
          setLoading(false);
          return;
        }
        // No key in SecureStorage: hydrate from gstudio_ai_config or gstudio_api_key (AISettingsHub / config.ts)
        let apiKey = saved?.apiKey || "";
        if (!apiKey) {
          try {
            const aiConfigRaw = localStorage.getItem("gstudio_ai_config");
            if (aiConfigRaw) {
              const aiConfig = JSON.parse(aiConfigRaw);
              if (
                typeof aiConfig?.apiKey === "string" &&
                aiConfig.apiKey.trim()
              ) {
                apiKey = aiConfig.apiKey.trim();
              }
            }
          } catch {
            /* ignore */
          }
        }
        if (!apiKey) {
          try {
            const storedKey = localStorage.getItem("gstudio_api_key");
            if (typeof storedKey === "string" && storedKey.trim())
              apiKey = storedKey.trim();
          } catch {
            /* ignore */
          }
        }
        if (saved || apiKey) {
          setAgentConfigInternal(
            sanitize({
              ...(saved || {}),
              apiKey: apiKey || (saved?.apiKey ?? ""),
              voice: saved?.voice ?? "Kore",
              persona: saved?.persona ?? "Professional",
              language: saved?.language ?? "fa-IR",
            }),
          );
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Save to SecureStorage whenever agentConfig changes (with debounce)
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        const safeToPersist = sanitize(agentConfig);
        SecureStorage.setItem("gstudio_agent_config", safeToPersist).catch(
          (error: any) => {
            console.error("[useAgentConfig] Failed to save agent config:", {
              error: error.message,
              name: error.name,
              code: error.code,
              config: {
                hasApiKey: !!safeToPersist.apiKey,
                voice: safeToPersist.voice,
                persona: safeToPersist.persona,
              },
            });

            // If it's a quota error, try to clear storage and retry
            if (error.name === "QuotaExceededError" || error.code === 22) {
              console.warn(
                "[useAgentConfig] Quota exceeded, attempting cleanup...",
              );
              try {
                // Clear non-essential localStorage items
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (
                    key &&
                    !key.includes("api") &&
                    !key.includes("config") &&
                    !key.includes("settings")
                  ) {
                    keysToRemove.push(key);
                  }
                }
                keysToRemove.forEach((k) => localStorage.removeItem(k));
                console.log(
                  `[useAgentConfig] Cleared ${keysToRemove.length} non-essential items`,
                );

                // Retry save
                SecureStorage.setItem(
                  "gstudio_agent_config",
                  safeToPersist,
                ).catch((retryError: any) => {
                  console.error(
                    "[useAgentConfig] Retry save also failed:",
                    retryError,
                  );
                });
              } catch (cleanupError) {
                console.error("[useAgentConfig] Cleanup failed:", cleanupError);
              }
            }
          },
        );
      }, 500); // Debounce 500ms to avoid excessive writes

      return () => clearTimeout(timer);
    }
  }, [agentConfig, loading]);

  return {
    agentConfig,
    setAgentConfig,
    loading,
  };
}
