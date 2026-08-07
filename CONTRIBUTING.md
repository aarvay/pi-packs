# Contributing to pi-packs

## Getting Started

```bash
bun install
```

## Development Workflow

This monorepo uses [Bun](https://bun.sh) workspaces.

```bash
# Lint all packages
bun run lint

# Fix lint issues
bun run lint:fix

# Format all files
bun run fmt

# Check formatting
bun run fmt:check
```

## Adding a New Package

1. Create a new directory under `packages/`
2. Add a `package.json` with:
   - The `pi-package` keyword
   - A `pi` manifest declaring resources (e.g. `"pi": { "extensions": ["./index.ts"] }`)
   - `repository`, `homepage`, `license`, and `author` fields
3. Add a `README.md` documenting installation, features, and usage
4. Update the root `README.md` package table

## Pull Requests

All changes go through a pull request — direct pushes to `main` are blocked by
branch protection, and the `CI` check must pass before merging. This applies
to maintainers too. PRs are squash-merged; head branches are deleted
automatically after merge.

First-time contributors' workflow runs require maintainer approval (GitHub
default).

## Pull Request Checklist

- [ ] `bun run lint` passes
- [ ] `bun run fmt:check` passes
- [ ] `bun run typecheck` passes (if your package has a typecheck script)
- [ ] A changeset exists if you touched `packages/` (see below)
- [ ] Documentation is updated (README, root package table)

## Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) for
versioning and publishing.

1. After making package changes, run `bun run changeset`
2. Select affected packages and bump type (`patch`, `minor`, or `major`)
3. Write a changeset summary describing the change
4. Commit the generated `.changeset/*.md` file with your PR
5. When a PR with changesets merges to `main`, the **Publish** workflow's
   `version` job opens (or updates) a "chore: update versions" PR containing
   the version bumps and generated changelogs. That PR runs CI like any
   other.
6. When a maintainer merges the version PR, the **Publish** workflow's
   `pack` + `publish` jobs:
   - Publishes to npm via [OIDC trusted
     publishing](https://docs.npmjs.com/trusted-publishers) — no npm tokens
     are stored anywhere; each publish uses a short-lived credential bound to
     the workflow run, with SLSA provenance attestation
   - Pushes signed git tags
   - Creates a GitHub Release per published package, with its changelog entry
     as the release notes

New packages must be configured for trusted publishing on npmjs.com (repo
`aarvay/pi-packs`, workflow `publish.yml`) before their first automated
release; the very first publish of a brand-new package must be done manually.

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.
