/**
 * Synthetic Provider Extension for pi
 *
 * Dynamically discovers available models from the Synthetic API
 * at startup. Models are fetched from the public /models endpoint
 * and registered with their actual pricing, context windows, and capabilities.
 *
 * Falls back to hardcoded documented models if the API is unreachable.
 * Normalizes context overflow errors so pi can auto-compact and retry.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// =============================================================================
// Types
// =============================================================================

interface SyntheticModelResponse {
  data: SyntheticModel[];
}

interface SyntheticModel {
  id: string;
  name: string;
  input_modalities: string[];
  output_modalities: string[];
  context_length: number;
  max_output_length: number;
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
    input_cache_reads: string;
    input_cache_writes: string;
  };
  supported_features?: string[];
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse a price string like "$0.000001" into dollars per million tokens.
 *
 * Returns 0 for missing, empty, or malformed input.
 */
function parsePrice(priceStr: string | undefined): number {
  if (typeof priceStr !== "string" || priceStr.length === 0) {
    return 0;
  }

  // Strict: optional $, then digits with at most one decimal point.
  const match = priceStr.match(/^\$?([0-9]+(?:\.[0-9]+)?)$/);
  if (!match || match[1] === undefined) {
    return 0;
  }

  const perToken = Number.parseFloat(match[1]);
  if (!Number.isFinite(perToken)) {
    return 0;
  }

  return perToken * 1_000_000;
}

/** Map input modalities to pi's input type array. */
function getInputTypes(modalities: string[]): ("text" | "image")[] {
  const input: ("text" | "image")[] = [];
  if (modalities.includes("text")) input.push("text");
  if (modalities.includes("image")) input.push("image");
  if (input.length === 0) input.push("text");
  return input;
}

/** Check if the model advertises reasoning support. */
function modelSupportsReasoning(features: string[] | undefined): boolean {
  return features?.includes("reasoning") ?? false;
}

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch with a hard deadline. The returned promise rejects if the deadline
 * expires before the response headers arrive.
 */
function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Fetch timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

/** Fetch the live model list from Synthetic. */
async function fetchModels(): Promise<SyntheticModel[]> {
  const response = await fetchWithTimeout(
    "https://api.synthetic.new/openai/v1/models",
    FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`Synthetic /models returned ${response.status}: ${text}`);
  }

  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("Synthetic /models returned unexpected JSON shape");
  }

  const models = (payload as SyntheticModelResponse).data;
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error("Synthetic /models returned empty model list");
  }

  return models;
}

// =============================================================================
// Hardcoded fallback models (from https://dev.synthetic.new/docs/api/overview)
// =============================================================================

const HARDCODED_MODELS: SyntheticModel[] = [
  {
    id: "syn:large:text",
    name: "Synthetic Large (Text)",
    input_modalities: ["text"],
    output_modalities: ["text"],
    context_length: 196608,
    max_output_length: 65536,
    pricing: {
      prompt: "$0.000001",
      completion: "$0.000003",
      image: "0",
      request: "0",
      input_cache_reads: "$0.000001",
      input_cache_writes: "0",
    },
    supported_features: ["tools", "json_mode", "structured_outputs", "reasoning"],
  },
  {
    id: "syn:small:text",
    name: "Synthetic Small (Text)",
    input_modalities: ["text"],
    output_modalities: ["text"],
    context_length: 196608,
    max_output_length: 65536,
    pricing: {
      prompt: "$0.0000001",
      completion: "$0.0000005",
      image: "0",
      request: "0",
      input_cache_reads: "$0.0000001",
      input_cache_writes: "0",
    },
    supported_features: ["tools", "json_mode", "structured_outputs", "reasoning"],
  },
  {
    id: "syn:large:vision",
    name: "Synthetic Large (Vision)",
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    context_length: 262144,
    max_output_length: 65536,
    pricing: {
      prompt: "$0.00000095",
      completion: "$0.000004",
      image: "0",
      request: "0",
      input_cache_reads: "$0.00000095",
      input_cache_writes: "0",
    },
    supported_features: ["tools", "json_mode", "structured_outputs", "reasoning"],
  },
  {
    id: "syn:small:vision",
    name: "Synthetic Small (Vision)",
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    context_length: 262144,
    max_output_length: 65536,
    pricing: {
      prompt: "$0.00000045",
      completion: "$0.0000036",
      image: "0",
      request: "0",
      input_cache_reads: "$0.00000045",
      input_cache_writes: "0",
    },
    supported_features: ["tools", "json_mode", "structured_outputs", "reasoning"],
  },
];

// =============================================================================
// Extension Entry Point
// =============================================================================

export default async function (pi: ExtensionAPI) {
  let syntheticModels: SyntheticModel[];
  try {
    syntheticModels = await fetchModels();
  } catch (err) {
    console.error("Synthetic provider: failed to fetch models, using hardcoded fallback:", err);
    syntheticModels = HARDCODED_MODELS;
  }

  const models = syntheticModels.map((model) => {
    const reasoning = modelSupportsReasoning(model.supported_features);

    return {
      id: model.id,
      name: model.name,
      reasoning,
      input: getInputTypes(model.input_modalities),
      cost: {
        input: parsePrice(model.pricing?.prompt),
        output: parsePrice(model.pricing?.completion),
        cacheRead: parsePrice(model.pricing?.input_cache_reads),
        cacheWrite: parsePrice(model.pricing?.input_cache_writes),
      },
      contextWindow: model.context_length ?? 128000,
      maxTokens: model.max_output_length ?? 16384,
      compat: {
        supportsDeveloperRole: false,
        supportsReasoningEffort: reasoning,
        thinkingFormat: "openai" as const,
      },
      thinkingLevelMap: reasoning
        ? {
            off: null,
            minimal: null,
            low: "low",
            medium: "medium",
            high: "high",
            xhigh: null,
          }
        : undefined,
    };
  });

  pi.registerProvider("synthetic", {
    name: "Synthetic",
    baseUrl: "https://api.synthetic.new/openai/v1",
    apiKey: "$SYNTHETIC_API_KEY",
    authHeader: true,
    api: "openai-completions",
    models,
  });

  pi.on("message_end", (event, ctx) => {
    const { message } = event;

    // Only intercept assistant messages that stopped with an error.
    if (message.role !== "assistant") return;
    if (message.stopReason !== "error") return;

    // Scope to the Synthetic provider only.
    if (message.provider !== "synthetic" && ctx.model?.provider !== "synthetic") {
      return;
    }

    const errorMessage = message.errorMessage ?? "";

    // Already normalised — nothing to do.
    if (errorMessage.includes("context_length_exceeded")) {
      return;
    }

    // Check for context-window-related error patterns.
    if (!/context window|too long|maximum context|token limit/i.test(errorMessage)) {
      return;
    }

    // Rewrite the error message so pi can recognise it and auto-compact.
    return {
      message: {
        ...message,
        errorMessage: `context_length_exceeded: ${errorMessage}`,
      },
    };
  });
}
