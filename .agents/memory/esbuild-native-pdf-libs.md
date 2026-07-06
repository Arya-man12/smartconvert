---
name: esbuild bundling breaks pdf-parse/pdfjs-dist
description: Node/esbuild API server bundling PDF or native-ish compression libs causes cryptic runtime errors unless externalized.
---

When esbuild bundles `pdf-parse` (which itself dynamically imports `pdfjs-dist/legacy/build/pdf.mjs`), the resulting
bundled call graph produces a `this.doc.destroy is not a function` runtime error on `parser.destroy()`, even though
the exact same code works fine when run unbundled via plain `node`/`tsx`. The bug only appears in the bundled
`dist/index.mjs`, not in isolated repro scripts — always test against the actual built bundle, not just an ad hoc
script, when debugging bundler-only failures.

**Why:** esbuild's bundling of packages that do their own dynamic/relative-path module loading (AMD-style requires,
internal instanceof checks across module boundaries, worker/wasm loading) silently produces subtly broken objects
instead of a load-time error. Symptoms are deep runtime errors far from the actual cause.

**How to apply:** For any Node/Express API server built with esbuild in this monorepo, add packages like `pdf-parse`,
`pdfjs-dist`, `compressjs`, `amdefine`, `lzma`, `zstd-codec`, `lz4js`, `snappyjs` to the `external` array in
`build.mjs` rather than letting esbuild bundle them. If a bundled build produces a working `typecheck` but a broken
runtime behavior only for specific code paths (e.g. PDF text extraction), suspect esbuild bundling of a
native/dynamic-loading dependency before suspecting application logic.
