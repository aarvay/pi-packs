# @aarvay/pi-synthetic-provider

pi extension that registers [Synthetic](https://synthetic.new) as a custom model
provider.

## Installation

Try it once without installing:

```bash
pi -e npm:@aarvay/pi-synthetic-provider
```

Install permanently into your user settings:

```bash
pi install npm:@aarvay/pi-synthetic-provider
```

Or install into a project (`.pi/settings.json`):

```bash
pi install -l npm:@aarvay/pi-synthetic-provider
```

## Features

- Dynamically discovers available models from Synthetic's public `/models`
  endpoint at startup
- Falls back to hardcoded documented models if the fetch fails
- Supports text and image input models
- Tracks per-token pricing for cost estimation
- Handles reasoning/thinking levels
- Normalizes context overflow errors for automatic compaction and retry

## Authentication

Synthetic requires an API key for inference. pi resolves the key in this priority order:

1. `~/.pi/agent/auth.json` entry:
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

The extension exposes all models returned by Synthetic's API. The documented
aliases are:

- `syn:large:text` — Large text model (GLM-5.1)
- `syn:small:text` — Small text model (GLM-4.7-Flash)
- `syn:large:vision` — Large vision model (Kimi-K2.6)
- `syn:small:vision` — Small vision model (Qwen3.6-27B)

Use `/model` in pi to select a model.

## Development

Test locally from the repo root without publishing:

```bash
pi -e ./packages/synthetic-provider
```

## Troubleshooting

**Models not loading:** If the Synthetic API is unreachable at startup, the
extension falls back to hardcoded models. Check your network connection with:

```bash
curl https://api.synthetic.new/openai/v1/models
```

**API key errors:** Verify your key is set via `echo $SYNTHETIC_API_KEY` or
configured in `~/.pi/agent/auth.json`.

## License

MIT
