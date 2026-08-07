/**
 * Synthetic Provider Extension for pi
 *
 * Registers a native pi-ai provider. The four stable `syn:*` aliases ship as
 * the static baseline — no network access while pi loads. When pi refreshes
 * model catalogs (background refresh at startup, /model dialog, /login,
 * `pi update --models`), pi-ai fetches the live model list from Synthetic's
 * public /models endpoint, merges it over the baseline, and persists the
 * catalog to models-store.json so later sessions restore it instantly, even
 * offline.
 *
 * Normalizes context overflow errors so pi can auto-compact and retry.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createProvider, envApiKeyAuth, type Model } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";

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
  pricing?: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
    input_cache_reads: string;
    input_cache_writes: string;
  };
  supported_features?: string[];
  reasoning_parameters?: {
    efforts?: string[];
  };
}

type SyntheticApi = "openai-completions";
type SyntheticModelConfig = Model<SyntheticApi>;

// =============================================================================
// Constants
// =============================================================================

const PROVIDER_ID = "synthetic";
const BASE_URL = "https://api.synthetic.new/openai/v1";

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

/**
 * Build a pi thinkingLevelMap from the model's advertised reasoning efforts
 * (e.g. ["none", "high", "max"]). Levels the model does not advertise are
 * null, which hides them in the UI. pi passes the mapped string through as
 * `reasoning_effort`, so provider-native values like "none" and "max" work
 * directly.
 *
 * Returns undefined when the model does not support reasoning.
 */
function buildThinkingLevelMap(
  model: SyntheticModel,
): SyntheticModelConfig["thinkingLevelMap"] | undefined {
  const reasoning = model.supported_features?.includes("reasoning") ?? false;
  if (!reasoning) return undefined;

  const supported = new Set(model.reasoning_parameters?.efforts ?? ["low", "medium", "high"]);

  return {
    off: supported.has("none") ? "none" : null,
    minimal: supported.has("minimal") ? "minimal" : null,
    low: supported.has("low") ? "low" : null,
    medium: supported.has("medium") ? "medium" : null,
    high: supported.has("high") ? "high" : null,
    xhigh: supported.has("xhigh") ? "xhigh" : null,
    max: supported.has("max") ? "max" : null,
  };
}

/** Convert a Synthetic API model entry into a pi-ai model. */
function toModel(model: SyntheticModel): SyntheticModelConfig {
  const reasoning = model.supported_features?.includes("reasoning") ?? false;

  return {
    id: model.id,
    name: model.name,
    api: "openai-completions",
    provider: PROVIDER_ID,
    baseUrl: BASE_URL,
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
    thinkingLevelMap: buildThinkingLevelMap(model),
  };
}

/** Fetch the live model list from Synthetic. */
async function fetchSyntheticModels(signal: AbortSignal): Promise<SyntheticModelConfig[]> {
  const response = await fetch(`${BASE_URL}/models`, { signal });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`Synthetic /models returned ${response.status}: ${text.slice(0, 200)}`);
  }

  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("Synthetic /models returned unexpected JSON shape");
  }

  const models = (payload as SyntheticModelResponse).data;
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error("Synthetic /models returned empty model list");
  }

  return models.map(toModel);
}

// =============================================================================
// Static baseline
//
// The four documented `syn:*` aliases, always registered so the provider works
// fully offline and pi startup never blocks on the network. Aliases auto-route
// to Synthetic's latest recommended model per category, so the IDs stay valid
// even as underlying models change. The dynamic catalog (aliases plus direct
// hf:* models) merges over this list on refresh and persists to
// models-store.json, correcting any stale metadata below.
//
// Snapshot of https://api.synthetic.new/openai/v1/models, 2026-06.
// =============================================================================

function staticModel(
  input: Pick<SyntheticModelConfig, "id" | "input" | "contextWindow"> & {
    cost: Pick<SyntheticModelConfig["cost"], "input" | "output" | "cacheRead">;
    efforts: {
      off: string | null;
      low: string | null;
      medium: string | null;
      high: string | null;
      max: string | null;
    };
  },
): SyntheticModelConfig {
  return {
    name: input.id,
    api: "openai-completions",
    provider: PROVIDER_ID,
    baseUrl: BASE_URL,
    reasoning: true,
    maxTokens: 65536,
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: true,
      thinkingFormat: "openai" as const,
    },
    thinkingLevelMap: {
      off: input.efforts.off,
      minimal: null,
      low: input.efforts.low,
      medium: input.efforts.medium,
      high: input.efforts.high,
      xhigh: null,
      max: input.efforts.max,
    },
    id: input.id,
    input: input.input,
    contextWindow: input.contextWindow,
    cost: { ...input.cost, cacheWrite: 0 },
  };
}

const STATIC_MODELS: SyntheticModelConfig[] = [
  staticModel({
    id: "syn:large:text",
    input: ["text"],
    contextWindow: 524288,
    cost: { input: 1.0, output: 3.0, cacheRead: 0.16 },
    efforts: { off: "none", low: null, medium: null, high: "high", max: "max" },
  }),
  staticModel({
    id: "syn:small:text",
    input: ["text"],
    contextWindow: 196608,
    cost: { input: 0.1, output: 0.5, cacheRead: 0.02 },
    efforts: { off: "none", low: "low", medium: "medium", high: "high", max: null },
  }),
  staticModel({
    id: "syn:large:vision",
    input: ["text", "image"],
    contextWindow: 524288,
    cost: { input: 3.0, output: 15.0, cacheRead: 0.45 },
    // No "none" effort: thinking cannot be disabled on this model.
    efforts: { off: null, low: "low", medium: null, high: "high", max: "max" },
  }),
  staticModel({
    id: "syn:small:vision",
    input: ["text", "image"],
    contextWindow: 262144,
    cost: { input: 0.45, output: 2.2, cacheRead: 0.09 },
    efforts: { off: "none", low: "low", medium: "medium", high: "high", max: null },
  }),
];

// =============================================================================
// Extension Entry Point
// =============================================================================

export default function (pi: ExtensionAPI) {
  pi.registerProvider(
    createProvider({
      id: PROVIDER_ID,
      name: "Synthetic",
      baseUrl: BASE_URL,
      auth: {
        // Stored auth.json key wins, then $SYNTHETIC_API_KEY; /login prompts.
        apiKey: envApiKeyAuth("Synthetic API key", ["SYNTHETIC_API_KEY"]),
      },
      models: STATIC_MODELS,
      // pi-ai owns the refresh lifecycle: restores the persisted catalog
      // during the offline phase, calls this when network access is allowed,
      // and persists the result to models-store.json.
      fetchModels: async ({ signal }) => fetchSyntheticModels(signal),
      api: openAICompletionsApi(),
    }),
  );

  pi.on("message_end", (event, ctx) => {
    const { message } = event;

    // Only intercept assistant messages that stopped with an error.
    if (message.role !== "assistant") return;
    if (message.stopReason !== "error") return;

    // Scope to the Synthetic provider only.
    if (message.provider !== PROVIDER_ID && ctx.model?.provider !== PROVIDER_ID) {
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
