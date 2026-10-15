---
name: Backoffice vs app production DB
description: Rules for the app production DB (APP_DATABASE_URL) used by the ICL backoffice
---
The app prod DB lacks columns/tables present in the app source (denuncia_andamentos, user_id/client_id/lat/lng on denuncias). The backoffice detects capabilities at runtime and treats missing data as neutral antifraud factors.

**Why:** user chose to read the real production DB; the DB role has full privileges, so restraint is on us.
**How to apply:** never run DDL there. Writes allowed only: denuncias.status, denuncia_andamentos inserts (if table exists), recompensas. Test any app-DB write inside a transaction with ROLLBACK; the 3 existing denuncias are real. Posto-role responses must never include reporter identity/contact or antifraude score.
