# Reality-Check Review — Architecture Spine

**Project:** 思政打卡 App (IdeoTrack)  
**Review date:** 2026-06-22  
**Reviewer:** Architecture reality-check agent  
**Verdict:** ❌ **needs-fix**

The architecture spine contains multiple version commitments that are already outdated relative to the current ecosystem (June 2026). Several core-version choices were asserted rather than reality-checked, and some would put the project on end-of-life or unsupported tracks before V1 ships.

---

## Executive Summary

The spine pins the mobile stack to **Expo SDK 51 / React Native 0.74** and the backend runtime to **Node.js 20 LTS**. As of this review date, those releases are already end-of-life or no longer the current supported line. The navigation library (**React Navigation 6.x**) and web framework (**Express 4.x**) choices are also behind the current stable major versions. In addition, the database baseline (**Supabase PostgreSQL 15+**) and container tooling baseline (**Docker 24+ / Docker Compose 2.x**) lag behind the versions Supabase and Docker currently ship by default.

**Top-line recommendation:** update the spine to a June-2026 baseline before implementation begins, or the first sprints will inherit a deprecated stack.

---

## Findings

| # | Item | Spine says | Current reality (2026-06-22) | Severity |
|---|------|------------|------------------------------|----------|
| 1 | **React Native / Expo** | RN 0.74+ via Expo SDK 51 | Expo SDK 56 beta is current (May/June 2026); RN 0.85 is the paired baseline. SDK 51 is ~two years old and no longer supported in Expo Go. | 🔴 High |
| 2 | **Node.js runtime** | Node.js 20 LTS | Node 20 reached EOL on **2026-04-30**. Active LTS is **Node 24**; Node 22 is in Maintenance LTS. | 🔴 High |
| 3 | **React Navigation** | 6.x | React Navigation **7.0** shipped Nov 2024 and is the current stable major. v8 is in pre-release. v6 will not align with RN 0.85 / Expo SDK 56. | 🔴 High |
| 4 | **Express.js** | 4.x | Express **5.2** shipped Dec 2025 and is the Express TC’s endorsed production release. v4 is the next line to move toward end-of-life. | 🟡 Medium-High |
| 5 | **TypeScript** | 5.x | TypeScript **6.0.3** is latest (Mar 2026). 5.x still compiles but is no longer the current major; new projects should target 5.9+ or 6.x. | 🟡 Medium |
| 6 | **Supabase PostgreSQL** | Managed (15+) | Supabase platform now defaults to **PostgreSQL 17**; self-hosted default flipped to PG 17 the week of 2026-06-15. PG 15 support is being phased out. | 🟡 Medium-High |
| 7 | **Docker / Docker Compose** | Docker 24+ / Compose 2.x | Docker Engine **29.6.0** is current (June 2026). Compose v1 was removed in April 2025; the current Compose plugin is **v2.40+** (also a v5 SDK exists). | 🟡 Medium |
| 8 | **PDF/Excel stack** | `pdfkit` / `exceljs` or `puppeteer` | `pdfkit` 0.19.1 (req. Node 20+), `exceljs` 4.4.0, `puppeteer` 25.1.0 (ESM-only, Node 22+). No versions are pinned in the spine. | 🟡 Medium |
| 9 | **DeepSeek API** | Via adapter (swappable) | DeepSeek **V4** released Apr 2026. Legacy aliases `deepseek-chat` / `deepseek-reasoner` retire **2026-07-24**. Spine must name current model IDs. | 🟡 Medium |
| 10 | **Supabase JS client** | 2.x | Still accurate; latest is 2.108.x. ✅ | 🟢 OK |
| 11 | **jsonwebtoken** | 9.x | Still accurate; latest is 9.0.3. ✅ | 🟢 OK |
| 12 | **AsyncStorage / local state** | AsyncStorage | Still exists but newer Expo/RN stacks lean toward `expo-secure-store`/`mmkv` for secure/tokens. Worth confirming, not a blocker. | 🟢 OK |

---

## Detailed Findings

### 1. Expo SDK 51 / React Native 0.74 are end-of-support for a new project

- Expo SDK 51 was released in **mid-2024** and targeted React Native 0.74/0.75.
- Expo SDK 52 (RN 0.76/0.77), SDK 53 (RN 0.79), SDK 54, SDK 55, and SDK 56 (RN 0.85) have since shipped.
- **Expo Go only supports the latest SDK version**; older SDKs are no longer supported.
- The Expo SDK reference table dated June 2026 lists SDK 56.0.0 as current, with Android `targetSdkVersion` 36 and iOS 16.4+ / Xcode 26.4+.

**Implication:** Choosing SDK 51 today means the team cannot use Expo Go for development, will miss the New Architecture default, and will accumulate upgrade debt before the first release.

**Fix:** Pin mobile baseline to **Expo SDK 56** and **React Native 0.85**, or at minimum SDK 55 / RN 0.83 if SDK 56 is still in beta at implementation kickoff.

### 2. Node.js 20 LTS is already end-of-life

- Node.js 20 (Iron) reached **End-of-Life on 2026-04-30** per the official Node.js release schedule.
- Current support status:
  - **Node 26** — Current release.
  - **Node 24** — Active LTS (Krypton).
  - **Node 22** — Maintenance LTS (Jod).
- `supabase-js` dropped Node 18 in v2.79.0; Node 20 is now EOL and should not be the target runtime for a new backend.

**Fix:** Target **Node.js 24 LTS** (or Node 22 Maintenance LTS as a conservative fallback). Update CI images, Docker base images, and `engines` fields accordingly.

### 3. React Navigation 6.x is no longer the current major

- React Navigation **7.0** shipped on **2024-11-06** with a new static API, preloading, `popTo`, and breaking route/path syntax changes.
- React Navigation **8** is in pre-release as of the documentation updates seen in 2025.
- React Navigation 6 will not be validated against RN 0.85 / Expo SDK 56 and will require compatibility exclusions that may break.

**Fix:** Move to **React Navigation 7.x** (current stable) and update route definitions to the new static/typed API.

### 4. Express 4.x is no longer the production-recommended release

- Express **5.2.0** shipped **2025-12-01** and is described by the Express Technical Committee as the endorsed production release.
- Express 4 is the next line to move toward end-of-life; new CVEs against v4 will not receive upstream fixes indefinitely.
- Express 5 requires **Node.js 18+** and introduces breaking path-syntax changes (e.g. `/*splat` wildcards, pluralized methods, `req.query` as getter, async error forwarding).

**Fix:** For a greenfield API, baseline on **Express 5.2.x** and write route patterns in v5 syntax from day one.

### 5. TypeScript 5.x is no longer the latest major

- TypeScript **6.0.3** is the latest stable release as of April 2026.
- TS 5.x still works but is not the current major; Expo SDK 56 / RN 0.85 tooling will expect newer TypeScript features (e.g. `es2025` lib, `#/` subpath imports, improved inference).

**Fix:** Pin to **TypeScript 5.9+ or 6.0.x** and verify compiler compatibility with the chosen Expo/RN versions.

### 6. Supabase PostgreSQL 15+ is being superseded by PG 17

- Supabase announced the self-hosted default `db` image will move from Postgres 15 to **Postgres 17** the week of **2026-06-15**.
- Supabase platform projects now default to PG 17; PG 14 support ends **2026-07-01** and PG 15 is in the deprecation window.
- Some extensions (`timescaledb`, `plv8`, etc.) are not included in PG 17 Supabase images.

**Fix:** Update the spine to **PostgreSQL 17** and validate required extensions against the Supabase PG 17 image.

### 7. Docker / Docker Compose baselines are too old

- Docker Engine **29.6.0** is current as of June 2026; Docker Engine 24 reached EOL in 2024.
- Docker Compose **v1** (`docker-compose` binary) was **removed in April 2025**.
- The current Compose plugin is **v2.40+**; the `version:` field in compose files is now ignored and `compose.yaml` is the canonical filename.
- Docker Desktop 4.78 (June 2026) ships Engine 29.5.3 and Buildx 0.34.1.

**Fix:** Baseline on **Docker Engine 29+**, **Compose plugin 2.40+**, rename `docker-compose.yml` to `compose.yaml`, and drop the `version:` key.

### 8. PDF/Excel libraries need pinned, Node-compatible versions

- `pdfkit` **0.19.1** (June 2026) requires **Node 20+**.
- `exceljs` **4.4.0** is current.
- `puppeteer` **25.1.0** (May 2026) is **ESM-only** and requires **Node 22+**.
- Because the spine targets Node 20, `puppeteer` 25 would not install/run. The spine also lists these options without choosing one.

**Fix:** Decide on one PDF strategy (recommend `pdfkit` + `exceljs` for server-side reports, or `puppeteer` only if the runtime is Node 24+ and ESM is configured). Pin exact versions.

### 9. DeepSeek model names must be current before V1 launch

- DeepSeek **V4** was released **2026-04-24**.
- New model IDs are `deepseek-v4-pro` and `deepseek-v4-flash`.
- Legacy IDs `deepseek-chat` and `deepseek-reasoner` will be **retired 2026-07-24**.

**Implication:** If the project enters production after July 2026 using legacy model names, the LLM adapter will fail.

**Fix:** Specify `deepseek-v4-pro` / `deepseek-v4-flash` in the adapter config and keep the swappable `LLMProvider` interface.

### 10. Supabase JS client and jsonwebtoken versions remain valid

- `@supabase/supabase-js` is still on the v2 line; latest release at time of review is **2.108.x**. ✅
- `jsonwebtoken` latest is **9.0.3**; the spine’s `9.x` pin is fine. ✅

No changes needed here, but consider pinning minor versions (`^2.108.0`, `^9.0.3`) to avoid surprise deprecations.

---

## Recommendations

1. **Freeze a June-2026 baseline** before writing the first story:
   - Mobile: **Expo SDK 56** + **React Native 0.85** + **React Navigation 7.x**
   - Backend runtime: **Node.js 24 LTS**
   - Web framework: **Express 5.2.x**
   - Language: **TypeScript 5.9+ or 6.0.x**
2. **Update data/infra baselines:** Supabase **PostgreSQL 17**, **Docker Engine 29+**, **Compose plugin 2.40+**, `compose.yaml`.
3. **Pin report-generation versions:** `pdfkit@^0.19.1` + `exceljs@^4.4.0`, or `puppeteer@^25.x` only under Node 24 + ESM.
4. **Update DeepSeek adapter config** to use `deepseek-v4-pro` / `deepseek-v4-flash` and document the 2026-07-24 legacy-alias sunset.
5. **Re-run this reality-check** at implementation kickoff because the Expo/React Native/Node release cadences are rapid.

---

## Sources consulted (snapshot, 2026-06-22)

- Node.js release schedule / endoflife.date — Node 20 EOL 2026-04-30, Node 24 Active LTS.
- Expo changelog / docs.versions/latest — SDK 56.0.0 current; SDK 51 no longer supported in Expo Go.
- React Navigation docs & blog — v7.0 stable (Nov 2024), v8 pre-release.
- Express.js migrating-5 guide / HeroDevs support reference — Express 5.2 endorsed production release (Dec 2025).
- npm / TypeScript blog — TypeScript 6.0.3 latest (Apr 2026).
- Supabase GitHub discussions — PG 17 default flip (week of 2026-06-15), PG 14 EOL 2026-07-01.
- Docker Desktop release notes / Docker Engine endoflife.date — Engine 29.6.0 current; Compose v1 removed Apr 2025.
- GitHub releases: `foliojs/pdfkit` 0.19.1, `puppeteer/puppeteer` 25.1.0 (ESM-only, Node 22+).
- DeepSeek API docs / status — V4 release 2026-04-24, legacy alias retirement 2026-07-24.
- npm: `jsonwebtoken` 9.0.3, `exceljs` 4.4.0, `@supabase/supabase-js` 2.108.x.
