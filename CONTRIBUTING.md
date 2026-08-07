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

## Pull Request Checklist

- [ ] `bun run lint` passes
- [ ] `bun run fmt:check` passes
- [ ] `bun run typecheck` passes (if your package has a typecheck script)
- [ ] Documentation is updated (README, root package table)

## Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

1. After making package changes, run `bun run changeset`
2. Select affected packages and bump type (`patch`, `minor`, or `major`)
3. Write a changeset summary describing the change
4. Commit the generated `.changeset/*.md` file with your PR
5. On merge to `main`, the GitHub Actions workflow will:
   - Bump package versions and update changelogs
   - Commit the version bump to `main`
   - Publish to npm
   - Create git tags

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.
