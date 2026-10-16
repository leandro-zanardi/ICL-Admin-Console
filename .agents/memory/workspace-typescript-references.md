---
name: Workspace TypeScript references
description: Handling stale declaration output from referenced workspace packages during app typechecks
---
When a frontend typecheck reports missing fields that are present in a shared package's generated TypeScript source, rebuild that referenced package before changing API contracts or frontend code.

**Why:** project references can resolve emitted declaration files under `dist` rather than the up-to-date source, so stale output can produce misleading type errors.

**How to apply:** check the shared package's source and emitted declarations; rebuild its TypeScript project reference, then rerun the consumer typecheck.
