#!/bin/bash
set -euo pipefail

# Merges may update package manifests without including the generated lockfile.
# Reconcile it first, then install deterministically from the resulting lock.
pnpm install --lockfile-only --no-frozen-lockfile
pnpm install --frozen-lockfile
pnpm --filter db push
