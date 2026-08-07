# @aarvay/pi-synthetic-provider

## 1.1.0

### Minor Changes

- 111a9f0: Rework model discovery: register the four stable `syn:*` aliases synchronously
  (no HTTP fetch on extension load) and use pi-ai's `fetchModels` provider hook
  for live discovery. The live catalog updates during pi's model refresh cycle —
  background refresh at startup, `/model`, `/login`, `pi update --models` — and
  persists to models-store.json for instant offline restore. The extension now
  imports `createProvider`/`envApiKeyAuth`/`openAICompletionsApi` from
  `@earendil-works/pi-ai` (new devDependency; the host supplies it at runtime).

  Also updates stale model metadata (context windows up to 524288, current
  pricing) and derives per-model thinking levels from Synthetic's advertised
  `reasoning_parameters.efforts`, exposing `max` where supported and hiding levels
  a model doesn't advertise.

## 1.0.1

### Patch Changes

- f3929ce: Initial release of @aarvay/pi-synthetic-provider

  First release of the pi-packs monorepo, shipping a pi custom model provider for
  Synthetic. The extension dynamically discovers available models from
  Synthetic's API at startup (with hardcoded fallback), registers them with
  accurate pricing and capabilities, and supports text and vision inputs,
  reasoning/thinking levels, and per-token cost estimation.
