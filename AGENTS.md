This repository is a [Bun](https://bun.sh) workspaces monorepo.
Packages live under `packages/`. Use `bun run <script>` from the root to run commands across workspaces.

For the human contributor workflow, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Tooling

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## CI/CD

This repo's primary forge is **GitHub**. CI workflows live exclusively in
`.github/workflows/`:

- `ci.yml` — format/lint/typecheck/changeset checks on PRs and pushes to `main`
- `version.yml` — opens/updates the "version packages" PR when changesets land
  on `main`
- `publish.yml` — publishes to npm via OIDC trusted publishing (no stored
  tokens), pushes signed tags, and creates GitHub Releases

`main` is protected: PRs are required, the `CI` check must pass, and merges
are squash-only. There is no `.forgejo/` directory. Do not assume
Forgejo/Codeberg Actions or recommend Forgejo-specific workflows.

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
