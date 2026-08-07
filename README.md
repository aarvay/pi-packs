# pi-packs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/@aarvay/pi-synthetic-provider)](https://www.npmjs.com/package/@aarvay/pi-synthetic-provider)
[![CI](https://github.com/aarvay/pi-packs/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/aarvay/pi-packs/actions/workflows/ci.yml)

A monorepo of my [pi](https://pi.ai) packages — extensions, skills, and custom
model providers.

## Packages

| Package                                                          | Description                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| [`@aarvay/pi-synthetic-provider`](./packages/synthetic-provider) | pi custom provider for [Synthetic](https://synthetic.new) |

## Quick Start

### Try without installing

Load a package temporarily for the current run only:

```bash
pi -e npm:@aarvay/pi-synthetic-provider
```

### Install globally

Persist in your user settings (`~/.pi/agent/settings.json`):

```bash
pi install npm:@aarvay/pi-synthetic-provider
```

### Install in a project

Write to `.pi/settings.json` so your team gets it automatically on startup:

```bash
pi install -l npm:@aarvay/pi-synthetic-provider
```

## About pi Packages

pi packages bundle extensions, skills, prompt templates, and themes so you can
share them through npm or git. See the [pi packages
documentation](https://pi.dev/docs/packages) for details on creating,
installing, and managing packages.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
