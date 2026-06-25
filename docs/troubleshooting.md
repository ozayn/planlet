# Troubleshooting

## Node `DEP0205`: `module.register()` is deprecated

When running `next dev` or `next build`, the terminal may show:

```
(node:…) [DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
```

**Source:** This warning is emitted by **`@tailwindcss/node`** (Tailwind CSS v4 PostCSS integration), which Next.js loads during dev and production builds. It is not from Planlet application code.

**Trace example:**

```bash
node --trace-deprecation ./node_modules/.bin/next build
```

Typical stack frame:

```
at Object.<anonymous> (…/node_modules/@tailwindcss/node/dist/index.js:…)
```

**Action:** No app change is required. This warning is emitted by a dependency under the current Node/Next dev stack and does not block development. It should disappear when `@tailwindcss/node` adopts `module.registerHooks()`.

**Related:** See also `docs/CONSOLE_WARNINGS.md` (harmless server/dev warnings).
