# @aarvay/pi-synthetic-provider

pi extension that registers [Synthetic](https://synthetic.new) as a custom model
provider.

## Getting Started

1. Get an API key from [Synthetic](https://synthetic.new).

2. Install the extension into your user settings:

   ```bash
   pi install npm:@aarvay/pi-synthetic-provider
   ```

   Or install into a project (`.pi/settings.json`):

   ```bash
   pi install -l npm:@aarvay/pi-synthetic-provider
   ```

   Or try it once without installing:

   ```bash
   pi -e npm:@aarvay/pi-synthetic-provider
   ```

3. Start pi and log in with your key:

   ```
   /login
   ```

   Select **Synthetic** and paste your API key when prompted. Headless
   alternative: set the `SYNTHETIC_API_KEY` environment variable instead.

4. Pick a model:

   ```
   /model
   ```

   The four `syn:*` aliases are listed immediately; the full live catalog
   (including direct `hf:*` models) appears after the first refresh.

## Features

- Registers the four stable `syn:*` aliases synchronously at startup — no
  network calls while pi loads, works fully offline
- Refreshes the full live catalog (aliases plus direct `hf:*` models) whenever
  pi refreshes model catalogs: background refresh at startup, opening the
  `/model` dialog, `/login`, or `pi update --models`
- Per-model thinking levels derived from Synthetic's advertised reasoning
  efforts, including `max` on models that support it
- Tracks per-token pricing for cost estimation
- Normalizes context overflow errors for automatic compaction and retry

## Authentication

Synthetic requires an API key for inference. The easiest way to provide it is
`/login` inside pi — select **Synthetic** and paste the key. pi resolves the
key in this priority order:

1. `~/.pi/agent/auth.json` entry (written by `/login`):
   ```json
   {
     "synthetic": {
       "type": "api_key",
       "key": "syn-..."
     }
   }
   ```
2. `SYNTHETIC_API_KEY` environment variable

## Models

The static aliases are always available:

- `syn:large:text` — Large text model (currently GLM-5.2)
- `syn:small:text` — Small text model (currently GLM-4.7-Flash)
- `syn:large:vision` — Large vision model (currently Kimi-K3)
- `syn:small:vision` — Small vision model (currently Qwen3.6-27B)

Aliases automatically route to Synthetic's latest recommended model per
category. After any model refresh, the full live catalog — including direct
`hf:*` models — appears alongside the aliases. Run `pi update --models` to
refresh on demand, or open `/model` in an interactive session.

Use `/model` in pi to select a model. If inference fails with an auth error,
run `/login` first (see Getting Started).

## Development

Test locally from the repo root without publishing:

```bash
pi -e ./packages/synthetic-provider
```

## Troubleshooting

**Models not updating:** The live catalog is fetched during pi's model
refresh, not at startup. Run `pi update --models`, or check your network:

```bash
curl https://api.synthetic.new/openai/v1/models
```

The four static aliases remain available even when the API is unreachable.

**API key errors:** Run `/login` and re-enter your Synthetic key, or verify
the environment variable with `echo $SYNTHETIC_API_KEY`.

## License

MIT
