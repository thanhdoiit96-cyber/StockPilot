# Lá»™ trÃ¬nh hoÃ n thiá»‡n dá»± Ã¡n

Cáº­p nháº­t: 2026-09-19. Má»¥c tiÃªu lÃ  xÃ¢y dá»±ng á»©ng dá»¥ng phÃ¢n tÃ­ch chá»©ng khoÃ¡n Viá»‡t Nam cÃ³ dá»¯ liá»‡u truy xuáº¥t Ä‘Æ°á»£c nguá»“n, tÃ i khoáº£n, danh má»¥c theo dÃµi vÃ  phÃ¢n tÃ­ch AI cÃ³ kiá»ƒm soÃ¡t.

## CÃ¡c má»‘c

| Má»‘c | Pháº¡m vi | TiÃªu chÃ­ nghiá»‡m thu | Tráº¡ng thÃ¡i |
| --- | --- | --- | --- |
| M0 â€” KhÃ´i phá»¥c ná»n táº£ng | Äá»‘i chiáº¿u mÃ£ nguá»“n, cáº¥u hÃ¬nh vÃ  tÃ i liá»‡u | CÃ³ hÆ°á»›ng dáº«n tiáº¿p ná»‘i, test/build hiá»‡n cÃ³ Ä‘Æ°á»£c ghi nháº­n | HoÃ n thÃ nh |
| M1 â€” Cá»§ng cá»‘ demo | Xá»­ lÃ½ lá»—i HTTP, tráº¡ng thÃ¡i táº£i, cache, PostgreSQL vÃ  API | CÃ³ kiá»ƒm thá»­ lá»—i, cache vÃ  luá»“ng API/database | HoÃ n thÃ nh má»™t pháº§n; cÃ²n kiá»ƒm chá»©ng Compose |
| M2 â€” Dá»¯ liá»‡u thá»‹ trÆ°á»ng | Contract, adapter Vnstock/EODHD, ingest EOD, provenance, reconciliation vÃ  corporate action | Dá»¯ liá»‡u khÃ´ng trÃ¹ng, cÃ³ provider/thá»i Ä‘iá»ƒm, audit vÃ  chÃ­nh sÃ¡ch volume rÃµ rÃ ng | HoÃ n thÃ nh cho prototype ná»™i bá»™ |
| M3 â€” TÃ i khoáº£n vÃ  watchlist | ÄÄƒng kÃ½, Ä‘Äƒng nháº­p, JWT, phÃ¢n quyá»n vÃ  watchlist backend | Dá»¯ liá»‡u ngÆ°á»i dÃ¹ng Ä‘Æ°á»£c cÃ´ láº­p vÃ  tá»“n táº¡i sau Ä‘Äƒng nháº­p láº¡i | HoÃ n thÃ nh cho prototype ná»™i bá»™ |
| M4 â€” Danh má»¥c theo dÃµi | Nháº­t kÃ½ mua/bÃ¡n Ä‘Ã£ thá»±c hiá»‡n bÃªn ngoÃ i á»©ng dá»¥ng, vá»‹ tháº¿, giÃ¡ vá»‘n, lÃ£i/lá»— vÃ  phÃ¢n bá»• | KhÃ´ng Ä‘áº·t lá»‡nh broker; dá»¯ liá»‡u ledger cÃ³ kiá»ƒm thá»­ vÃ  lÆ°u bá»n vá»¯ng | HoÃ n thÃ nh cho prototype ná»™i bá»™ |
| M5 â€” PhÃ¢n tÃ­ch ká»¹ thuáº­t vÃ  AI | Chá»‰ bÃ¡o giÃ¡, yáº¿u tá»‘ bÃªn ngoÃ i cÃ³ nguá»“n, insight giáº£i thÃ­ch Ä‘Æ°á»£c vÃ  AI dÃ¹ng dá»¯ liá»‡u/ngá»¯ cáº£nh ngÆ°á»i dÃ¹ng | CÃ³ provenance cho má»i yáº¿u tá»‘; thiáº¿u dá»¯ liá»‡u khÃ´ng táº¡o káº¿t luáº­n giáº£; cÃ³ Ä‘Ã¡nh giÃ¡ cháº¥t lÆ°á»£ng vÃ  kiá»ƒm soÃ¡t chi phÃ­ | Äang hoÃ n thiá»‡n ná»n táº£ng |
| M6 â€” PhÃ¡t hÃ nh | Kiá»ƒm thá»­ Ä‘áº§u cuá»‘i, accessibility/mobile, logging, backup/restore vÃ  cáº¥u hÃ¬nh triá»ƒn khai | CÃ³ báº±ng chá»©ng triá»ƒn khai, phá»¥c há»“i vÃ  váº­n hÃ nh | ChÆ°a triá»ƒn khai |

## Pháº¡m vi M5

### ÄÃ£ hoÃ n thÃ nh trong ná»n táº£ng ká»¹ thuáº­t

- Endpoint `GET /api/stocks/:id/analysis` tÃ­nh SMA20, SMA50, EMA12, EMA26 vÃ  RSI14 tá»« giÃ¡ Ä‘Ã³ng cá»­a Ä‘Ã£ lÆ°u.
- Insight `rule_based_technical_v1` tráº£ tÃ­n hiá»‡u, yáº¿u tá»‘ giáº£i thÃ­ch, sá»‘ phiÃªn quan sÃ¡t, nguá»“n vÃ  thá»i Ä‘iá»ƒm dá»¯ liá»‡u.
- UI chi tiáº¿t mÃ£ hiá»ƒn thá»‹ chá»‰ bÃ¡o, tÃ­n hiá»‡u, provenance vÃ  tráº¡ng thÃ¡i `insufficient_data`.
- KhÃ´ng Ä‘Æ°a ra lá»‡nh mua bÃ¡n; má»i nháº­n Ä‘á»‹nh Ä‘á»u cÃ³ cáº£nh bÃ¡o dÃ¹ng cho nghiÃªn cá»©u.

### Yáº¿u tá»‘ bÃªn ngoÃ i cáº§n tÃ­ch há»£p theo thiáº¿t káº¿

M5 khÃ´ng chá»‰ dÃ¹ng biá»ƒu Ä‘á»“ giÃ¡. Pipeline pháº£i há»— trá»£ cÃ¡c nhÃ³m dá»¯ liá»‡u sau, má»—i báº£n ghi Ä‘á»u cÃ³ `source`, `published_at`, `fetched_at`, mÃ£ liÃªn quan vÃ  tráº¡ng thÃ¡i kiá»ƒm chá»©ng:

1. Tin tá»©c doanh nghiá»‡p vÃ  thá»‹ trÆ°á»ng: tiÃªu Ä‘á», ná»™i dung tÃ³m táº¯t, nguá»“n, thá»i Ä‘iá»ƒm cÃ´ng bá»‘, mÃ£ cá»• phiáº¿u vÃ  nhÃ£n sá»± kiá»‡n.
2. VÄ© mÃ´: lÃ£i suáº¥t, tá»· giÃ¡, láº¡m phÃ¡t, giÃ¡ hÃ ng hÃ³a vÃ  chá»‰ sá»‘ thá»‹ trÆ°á»ng tá»« nguá»“n chÃ­nh thá»©c hoáº·c provider cÃ³ Ä‘iá»u khoáº£n sá»­ dá»¥ng rÃµ rÃ ng.
3. Sá»± kiá»‡n doanh nghiá»‡p: bÃ¡o cÃ¡o tÃ i chÃ­nh, cá»• tá»©c, phÃ¡t hÃ nh, thay Ä‘á»•i quáº£n trá»‹ vÃ  corporate action.
4. Bá»‘i cáº£nh danh má»¥c: tá»· trá»ng, giÃ¡ vá»‘n, thá»i gian náº¯m giá»¯ vÃ  má»©c rá»§i ro do ngÆ°á»i dÃ¹ng cung cáº¥p.

Insight chá»‰ Ä‘Æ°á»£c sá»­ dá»¥ng yáº¿u tá»‘ cÃ³ nguá»“n vÃ  cÃ²n hiá»‡u lá»±c. Náº¿u nguá»“n thiáº¿u, lá»—i hoáº·c chÆ°a Ä‘Æ°á»£c cáº¥p quyá»n hiá»ƒn thá»‹, UI pháº£i ghi rÃµ â€œchÆ°a xÃ¡c minhâ€ vÃ  khÃ´ng biáº¿n thÃ nh tÃ­n hiá»‡u Ä‘áº§u tÆ°.

### Thá»© tá»± hoÃ n thiá»‡n tiáº¿p theo

1. Má»Ÿ rá»™ng lá»‹ch sá»­ giÃ¡ Ä‘á»§ dÃ i Ä‘á»ƒ SMA/EMA/RSI cÃ³ Ã½ nghÄ©a.
2. XÃ¢y contract vÃ  adapter cho news/macro/corporate-event, kÃ¨m provenance vÃ  kiá»ƒm thá»­ dá»¯ liá»‡u thiáº¿u/trá»….
3. Táº¡o lá»›p feature fusion káº¿t há»£p ká»¹ thuáº­t, tin tá»©c, vÄ© mÃ´ vÃ  ngá»¯ cáº£nh danh má»¥c; lÆ°u riÃªng dá»¯ liá»‡u thÃ´ vÃ  feature Ä‘Ã£ chuáº©n hÃ³a.
4. ThÃªm AI Advisor chá»‰ Ä‘á»c cÃ¡c feature Ä‘Ã£ kiá»ƒm chá»©ng, tráº£ trÃ­ch dáº«n nguá»“n, Ä‘á»™ tin cáº­y, yáº¿u tá»‘ tÃ¡c Ä‘á»™ng vÃ  rá»§i ro; khÃ´ng tá»± Ä‘áº·t lá»‡nh.
5. ÄÃ¡nh giÃ¡ offline báº±ng táº­p dá»¯ liá»‡u cÃ³ má»‘c thá»i gian, theo dÃµi Ä‘á»™ chÃ­nh xÃ¡c, Ä‘á»™ trá»…, chi phÃ­ vÃ  tá»· lá»‡ cÃ¢u tráº£ lá»i khÃ´ng Ä‘á»§ báº±ng chá»©ng.

## NguyÃªn táº¯c nghiá»‡m thu

- Thay Ä‘á»•i API/schema pháº£i cáº­p nháº­t tÃ i liá»‡u chuyÃªn mÃ´n vÃ  migration tÆ°Æ¡ng á»©ng.
- PhÃ¢n biá»‡t dá»¯ liá»‡u tháº­t, dá»¯ liá»‡u demo, fixture vÃ  káº¿t quáº£ kiá»ƒm thá»­.
- KhÃ´ng Ä‘Ã¡nh dáº¥u M5 hoÃ n thÃ nh toÃ n bá»™ khi chÆ°a cÃ³ adapter yáº¿u tá»‘ bÃªn ngoÃ i, Ä‘Ã¡nh giÃ¡ cháº¥t lÆ°á»£ng vÃ  xÃ¡c minh quyá»n sá»­ dá»¥ng nguá»“n.
- Cáº­p nháº­t [PROJECT_STATUS.md](PROJECT_STATUS.md) sau má»—i bÆ°á»›c vá»›i ngÃ y, báº±ng chá»©ng, háº¡n cháº¿ vÃ  viá»‡c tiáº¿p theo.
- Quy trÃ¬nh váº­n hÃ nh vÃ  kiá»ƒm tra chung náº±m trong [AGENTS.md](../AGENTS.md).

M5 progress: external-factor contract and fixture adapter are now validated. The next implementation remains a licensed provider adapter and persistence for sourced news/macro/event records.

M5 progress: persistence migration 009 and provider adapters for World Bank macro data and GDELT news are implemented. GDELT records remain unverified until public display rights are confirmed.

M5 live ingestion: World Bank VNM CPI ingestion is operational through 
pm run ingest:external-factors; GDELT remains opt-in and unverified for display rights.

M5 progress: market-wide macro context is now included in stock analysis while symbol-specific events remain separately addressable.

M5 progress: technical and verified macro features now produce a combined, confidence-labeled insight; no buy/sell action is generated.

M5 progress: Advisor UI now consumes the verified fusion insight; generative language model integration remains gated on quality evaluation, cost controls and user-facing source citations.

M5 progress: quality_gate_v1 now blocks overconfident insight when price history is insufficient; expand historical ingestion before enabling any generative AI layer.

M5 progress: long-history EOD ingestion is complete for the current prototype symbols; quality_gate_v1 now passes for FPT with 250 observations and verified macro context.

M5 progress: risk-plan UI now shows short-, medium- and long-term reference scenarios, allocation ranges, take-profit and stop-loss; these are blocked when evidence is insufficient and never execute trades.

M5 acceptance evidence: FPT/MWG/VHM all pass the current quality gate with long-history EOD and verified macro context. Remaining M5 work is provider expansion, offline backtesting and gated generative AI.

M5 evidence: offline walk-forward backtest and multi-indicator macro ingestion are implemented. Generative AI remains gated and disabled until backtest interpretation, calibration and source-rights review are complete.

## M5 má»Ÿ rá»™ng universe vÃ  vÃ²ng Ä‘á»i Ä‘á» xuáº¥t (2026-09-20)

- `npm run ingest:vnstock-universe` truy váº¥n danh sÃ¡ch niÃªm yáº¿t VCI qua Vnstock, upsert metadata mÃ£ vÃ o `stocks` vÃ  ingest EOD theo batch (`VNSTOCK_BATCH_SIZE`, máº·c Ä‘á»‹nh 25). Lá»‡nh cÃ³ thá»ƒ cháº¡y toÃ n universe; khÃ´ng nÃªn cháº¡y Ä‘á»“ng thá»i nhiá»u job vÃ¬ giá»›i háº¡n upstream.
- `npm run generate:recommendations` táº¡o má»™t snapshot tá»‘i Ä‘a 5 mÃ£ cho khung ngáº¯n háº¡n 20 phiÃªn tá»« universe Ä‘Ã£ ingest. MÃ´ hÃ¬nh hiá»‡n táº¡i lÃ  `short_term_rule_v1`, yÃªu cáº§u tá»‘i thiá»ƒu 50 phiÃªn vÃ  khÃ´ng Ã©p Ä‘á»§ sá»‘ lÆ°á»£ng náº¿u tÃ­n hiá»‡u khÃ´ng Ä‘áº¡t ngÆ°á»¡ng.
- `GET /api/recommendations/latest` tráº£ snapshot, Ä‘iá»ƒm, lÃ½ do, horizon, nguá»“n vÃ  tráº¡ng thÃ¡i Ä‘Ã¡nh giÃ¡. UI hiá»ƒn thá»‹ rÃµ Ä‘Ã¢y lÃ  sÃ ng lá»c nghiÃªn cá»©u, khÃ´ng pháº£i lá»‡nh mua bÃ¡n.
- `npm run evaluate:recommendations` Ä‘á»‘i chiáº¿u giÃ¡ tÆ°Æ¡ng lai sau horizon, lÆ°u `forward_return_pct`, `outcome` vÃ  hit rate. Káº¿t quáº£ dÃ¹ng Ä‘á»ƒ theo dÃµi cháº¥t lÆ°á»£ng mÃ´ hÃ¬nh, khÃ´ng Ä‘Æ°á»£c diá»…n giáº£i thÃ nh báº£o Ä‘áº£m lá»£i nhuáº­n.
- Migration `010_create_recommendations` lÆ°u run vÃ  tá»«ng Ä‘á» xuáº¥t Ä‘á»ƒ cÃ³ thá»ƒ so sÃ¡nh mÃ´ hÃ¬nh theo thá»i gian.

### Lá»™ trÃ¬nh má»Ÿ rá»™ng sá»‘ mÃ£

1. Cháº¡y universe listing vÃ  ingest EOD theo batch nhá», kiá»ƒm tra tá»· lá»‡ lá»—i vÃ  giá»›i háº¡n nguá»“n.
2. Má»Ÿ rá»™ng tá»« universe hiá»‡n cÃ³ lÃªn toÃ n bá»™ mÃ£ `STOCK` há»£p lá»‡; loáº¡i quá»¹, chá»©ng quyá»n vÃ  mÃ£ khÃ´ng cÃ³ lá»‹ch sá»­ Ä‘á»§ dÃ i khá»i short-term ranking.
3. Cháº¡y recommendation snapshot Ä‘á»‹nh ká»³ sau khi ingest hoÃ n táº¥t; lÆ°u nguyÃªn snapshot trÆ°á»›c khi thay Ä‘á»•i model.
4. Chá» Ä‘á»§ 20 phiÃªn sau má»—i snapshot Ä‘á»ƒ Ä‘Ã¡nh giÃ¡; so sÃ¡nh hit rate, return phÃ¢n vá»‹, tá»· lá»‡ pending vÃ  má»©c lá»‡ch theo ngÃ nh.
5. Chá»‰ thay Ä‘á»•i trá»ng sá»‘ hoáº·c báº­t model má»›i sau khi cÃ³ báº±ng chá»©ng out-of-sample vÃ  giá»¯ láº¡i model/version cÅ© Ä‘á»ƒ audit.

Giá»›i háº¡n hiá»‡n táº¡i: láº§n cháº¡y prototype ngÃ y 2026-09-20 má»›i cÃ³ 3 mÃ£ trong database vÃ  khÃ´ng cÃ³ mÃ£ Ä‘áº¡t ngÆ°á»¡ng short-term; universe listing Ä‘Ã£ cÃ³ adapter nhÆ°ng chÆ°a cháº¡y ingest toÃ n thá»‹ trÆ°á»ng do cáº§n kiá»ƒm soÃ¡t táº£i upstream vÃ  thá»i gian xá»­ lÃ½.

- Recommendation feedback loop: GET /api/recommendations/history now exposes measured count, pending count, hit rate and average forward return per snapshot. Keep snapshots immutable and use out-of-sample outcomes before changing short_term_rule_v1.

- Daily loop: after a successful EOD ingest, RECOMMENDATIONS_AFTER_INGEST=true creates a versioned recommendation snapshot. Run 
pm run evaluate:recommendations after the 20-session horizon and inspect /api/recommendations/history before changing model weights.

- Automated feedback loop: RECOMMENDATION_EVALUATION_ENABLED=true schedules evaluation at 16:45 on weekdays in Asia/Ho_Chi_Minh. The job updates the latest snapshot whenever future prices become available; pending outcomes are retained until the configured horizon is reached.

- Universe ingest gate: run `npm run check:vnstock-runtime` first on the deployment host. Proceed from 5 symbols to 25, 100 and full universe only when the preflight succeeds; retain the generated manifest for retries and audit.

- Recommendation readiness gate: run `npm run check:recommendation-readiness` after each ingest expansion. Require at least 50 observations per candidate before interpreting short-term scores or comparing hit rates.

- Dashboard transparency: `/api/recommendations/readiness` and the recommendation panel expose current coverage so users can see whether an empty result reflects weak signals or insufficient history.

- Provider fallback gate: verify EODHD connectivity and key acceptance before adding an EODHD universe adapter. Until that preflight returns an accepted key and usable VN symbols, keep Vnstock as the prototype ingest source and do not mix unverified provider rows into recommendations.

- Vnstock provider policy: use VCI as primary and KBS as per-batch fallback. Inspect the manifest before retrying; provider attempts remain auditable and only completed batches enter the recommendation universe.

- Ingest audit policy: every universe run must leave a manifest, including listing-stage failures. Use that artifact as the handoff when moving execution to a network-enabled host.

- Runtime remediation: before broad ingest, run `node scripts/diagnose-vnstock-spawn.cjs`. If direct Python works but every Node spawn returns EPERM, deploy the worker outside the restricted runtime or use a Python sidecar/queue worker; do not spend time changing ticker lists or API keys.

- Sidecar path: start `python scripts/vnstock_worker.py` on the host, set `VNSTOCK_WORKER_URL=http://127.0.0.1:8787`, run `npm run check:vnstock-runtime`, then perform the 5 â†’ 25 â†’ 100 â†’ full-universe ingest progression.

- Worker proof: the 5-symbol batch has now passed through the HTTP worker. Next run the same path with a historical `VNSTOCK_FROM`/`VNSTOCK_TO` window, then scale batch size gradually while monitoring provider errors and readiness coverage.

- Historical proof: the five added symbols now have 232â€“423 observations each, so all 8 prototype symbols pass readiness. The next evaluation checkpoint is after 20 future sessions for the YBM recommendation; do not calibrate the model from the pending result.

- Scale probe finding: provider fallback must require non-empty EOD data. Empty KBS responses are now failed and retained in the manifest for retry, alongside network and SSL errors.

- Current scale status: 28 metadata symbols are present, 13 are recommendation-eligible, and the failed X/W/V batches require targeted retry after provider connectivity stabilizes. Do not treat metadata count as price-data coverage.

- Current scale status: targeted retry raised eligibility to 21/28 symbols and produced a five-symbol research snapshot. Keep the snapshot immutable and evaluate after 20 future sessions before changing model weights or enabling generative explanations.

- Dashboard usability: overview now prioritizes investor-facing information, supports sortable market data columns, and hides raw diagnostic payloads from non-admin accounts. Keep diagnostic access role-gated as new operational panels are added.

- Universe UX: search and 25-row pagination are now available before scaling beyond the prototype universe. Add server-side filtering/pagination only when response size makes the current API endpoint a bottleneck.

- Server-side universe UX: filtering and pagination now run in the backend with bounded page size and query-aware cache keys. Extend server sort to derived latest-price fields only if product requirements need globally sorted price/volume views.

- Universe sort completeness: latest price and volume are now globally sortable with the same pagination guarantees as code and name.

- Universe expansion policy: use the configured priority list for the first 50â€“100 symbols, then expand by complete VCI listing in controlled batches. Keep batch size small enough to respect provider limits and retain per-batch manifests.

- Priority 50 checkpoint: 46/75 metadata symbols are currently eligible, and the recommendation engine produced five candidates from familiar market names. Retry the four failed batches selectively before moving to 100; keep zero-row responses excluded.

- Priority retry checkpoint: eligibility increased to 61/75 after retrying three batches successfully. Keep the DPM/DCM/REE/BMP/FRT batch isolated and proceed to 100 only after provider stability is confirmed or an alternative verified source is available.

- Incremental expansion: enable `VNSTOCK_SKIP_READY=true` for every 100+ symbol run. This prevents re-fetching the 50-session-complete set and leaves capacity for new investor-priority symbols and targeted retries.

- Expansion limit semantics: apply `VNSTOCK_LIMIT` after readiness filtering so capacity is spent on new/under-covered symbols.

- Listing guard: stop expansion when VCI/KBS returns an empty listing and retry later; never interpret an empty provider response as completed coverage.

- Listing cache policy: allow a fresh listing cache for up to 48 hours during provider outages, while EOD rows still require successful provider responses and remain auditable.

- Listing retry policy: use bounded retries/backoff before fallback; do not increase retries indefinitely because provider rate limits and upstream instability must remain visible in the manifest.

- Priority fallback policy: continue known investor-priority symbols during listing outages, but require a live listing or fresh cache before expanding beyond the configured list.

- Batch checkpoint policy: retain the manifest after every batch and resume failed batches only; never restart a large expansion solely because the worker stopped part-way through.

- Coverage grouping: `/api/stocks` accepts `coverage=ready|incomplete`, using the same 50-observation threshold as recommendation readiness. The UI provides tabs for all symbols, recommendation-ready symbols, and symbols needing more EOD data.

- Search behavior: keep the 350 ms debounced query separate from the visible input value. This avoids network churn and disruptive table refreshes while typing. Sort and coverage changes intentionally reset to page one.

- 100+ ingest continuity: preserve the running manifest after every batch; resume failed/under-covered symbols with `VNSTOCK_SKIP_READY=true`, listing retry/cache, and the configured priority list when providers are interrupted. Do not count metadata-only symbols as usable coverage.

- Priority list target: the configured outage fallback now contains 106 unique commonly followed tickers. Run incremental ingest in batches with `VNSTOCK_SKIP_READY=true`; completed symbols are skipped and failed batches remain in the manifest for retry.

- Sector grouping: `/api/stocks` accepts a validated `sector` filter based on a maintained VN ticker taxonomy. Keep sector mapping explicit and auditable; symbols without a mapped sector remain in `KhÃ¡c` rather than being guessed from incomplete provider metadata.

- Scroll behavior: preserve the current viewport around sort, coverage tabs, and sector changes. Any future table action that changes the server query must use the same preservation helper.

- Dashboard order: hero/status â†’ key metrics â†’ stock universe table â†’ real portfolio/watchlist â†’ charts and analysis â†’ diagnostics for admins. Keep the stock universe near the top because it is the primary navigation surface for a multi-symbol product.

- Text encoding: validate rendered Vietnamese strings in the production bundle after UI edits; avoid shell rewrites that can convert UTF-8 into mojibake.

- Information architecture: keep market discovery in `Tá»•ng quan`; keep user-owned state in `Danh má»¥c cÃ¡ nhÃ¢n`. Detail and AI Advisor remain separate task views. Do not duplicate transaction forms or personal allocation blocks in the market overview.

- Personal UX: show a clear no-order disclaimer, account-scoped watchlist, transaction history input, current positions and allocation in one responsive page. Unauthenticated users receive a sign-in prompt instead of an empty debug-like form.

- Mandatory UI encoding rule: all frontend copy must remain UTF-8. Before committing UI changes, run `npm run check:encoding` and `npm test`; after a production build, run the same check against `dist`. Reject any source or bundle containing `ï¿½`, `Ãƒ`, `Ã‚`, or `Ã¯Â¿Â½`. Do not use shell commands that reinterpret UTF-8 files through a legacy code page; use Node/UTF-8 file writes or the editor's UTF-8 mode.

- Production acceptance gate: after frontend edits run `npm.cmd run build`, start a fresh preview, verify `/` and `/api/health`, then inspect the served JavaScript bundle for replacement/mojibake markers. Smoke-check stocks, recommendation readiness and ingestion status before calling the UI release-ready.

- Universe display gate: the overview must show server-side total coverage, default to up to 100 rows per page, provide explicit 25/50/100 page-size controls and preserve scroll during sort, filter and pagination. Do not label the current page size as the total universe.

- Runtime stability gate: guard every initial API resource before reading nested fields; verify malformed query URLs with a real browser smoke render. Maintain authenticated E2E fixtures for the current login-first flow and keep test labels in UTF-8.
- E2E modernization next: update `frontend/e2e/loading.spec.mjs` to mock the login-first session and current paginated `/api/stocks?page=...` contract, then assert current Vietnamese labels.

- E2E runner diagnostic: compare the managed Playwright 4180 server with the known-good preview 4175, capture page errors and served asset hashes, then make the E2E server use the same production preview path before considering the suite green.

- E2E context isolation: replace localStorage-only auth setup with a context fixture that seeds storage before page creation and log page errors/response URLs on failure. Keep production preview as the sole E2E server.

- E2E runner follow-up: use the new storage state and request-failure diagnostics to capture the first failing response/page error, then fix the runner context or replace the brittle suite with a minimal production smoke spec.

- E2E failure fixtures: stabilize network-failure and auxiliary-health mocks by waiting for the resource error state rather than dashboard mount, and assert the actual actionable error text for malformed JSON responses.

- E2E acceptance gate is complete: keep the production-preview Playwright config, storage-state auth fixture and failure-state coverage when adding future UI flows.

- Workflow E2E gate: preserve coverage for sort, sector filtering and personal portfolio/watchlist navigation when changing dashboard layout or API query behavior.

- Portfolio workflow gate: preserve E2E coverage for historical transaction recording and Watchlist persistence; these actions remain tracking-only and must never be implemented as broker order execution.

- Scroll stability gate: every server-backed table action, including pagination, must call `preserveStockScroll`; retain the dedicated browser regression test.

- UI copy rule: all user-facing Vietnamese labels, placeholders, tooltips and disclaimers must use complete Vietnamese spelling with diacritics; review rendered strings in source and production bundle before UI work is accepted.

- Copy review gate: before UI acceptance, scan every frontend source/public/index file for mojibake, missing diacritics, abbreviations and spelling errors; verify the built bundle and run unit/E2E tests.


## UI copy and encoding audit - 2026-09-20

- Rebuilt the frontend presentation layer in `frontend/src/App.jsx` with a single Vietnamese copy vocabulary for authentication, market overview, sorting, sectors, portfolio tracking, watchlist, stock detail, diagnostics, and AI analysis.
- Removed visible mojibake and truncated labels; Vietnamese text is stored as explicit Unicode escapes where the source pipeline previously corrupted UTF-8.
- Kept the user flow read-only for market actions: portfolio forms record historical transactions and watchlist items only.
- Added a visible retry surface for health/cache failures and preserved scroll position for sort, sector selection, search, and the pagination control.
- Validation completed: encoding check passed, 12 unit tests passed, and 13 Playwright E2E tests passed.


## Restored analysis surfaces - 2026-09-20

- Restored the overview performance chart, AI insights, short-term recommendation panel, and provider status context.
- Restored stock detail history bars, AI summary metrics, technical-analysis quality display, portfolio allocation rows, and watchlist removal.
- Kept the existing authentication, stock sorting/filtering, historical transaction recording, retry states, and scroll preservation behavior.
- Revalidated after restoration: encoding check passed, 12 unit tests passed, and 13 E2E tests passed.


## Copy correction pass - 2026-09-20

- Rechecked the newly restored chart, insight, recommendation, allocation, detail, external-factor, and risk-plan labels.
- Corrected Vietnamese spelling and diacritics, including labels for bi?u ??, ph?n b? danh m?c, nh?n ??nh AI, y?u t? b?n ngo?i, k?ch b?n tham kh?o, k? v?ng, t? tr?ng, and ch?t l?i.
- Added recommendation-history and demo-portfolio surfaces back to the overview without changing the read-only trading policy.
- Final validation: build passed, encoding check passed, 12 unit tests passed, and 13 E2E tests passed.

## Current roadmap decision - 2026-09-20

The project is at **late M5 foundation**, not M6. M0, M3 and M4 are complete for the internal prototype; M1 remains local-development complete but not deployment-verified; M2 is prototype-complete but does not yet prove full-market coverage. M5 still requires evidence closure for provider rights, 100+ symbol historical coverage, forward recommendation evaluation and the generative-AI quality gate.

The next milestone is a reproducible data-and-evaluation checkpoint: clean the stale runtime documentation, run a checkpointed 100+ symbol ingestion, verify the 50-observation readiness gate, create an immutable recommendation snapshot, and evaluate it after the 20-session horizon. Public release and M6 work wait for this evidence plus provider-rights confirmation.

The AI gate artifact currently says `enabled: true`, but no generative provider service is wired into the current backend and other roadmap entries say the feature remains disabled. This is a release-blocking state mismatch. Keep the feature disabled until an actual provider adapter, citation/fallback behavior and cost controls are implemented and revalidated; otherwise regenerate the artifact as disabled with an explicit reason.

## Fresh evidence checkpoint - 2026-09-21

The current evidence does not support the 100+ target: the incremental-100 run has zero rows, the latest priority retry covers 20 symbols with one failed batch, and the latest listing probe failed for both configured providers. Recover the worker/provider path, rerun a reproducible 25-symbol checkpoint, then scale to 50 and 100 only when readiness and manifests confirm each stage.

The 2026-09-21 gate alignment added an explicit `generative_provider_not_configured` requirement and regenerated a disabled AI-gate artifact. The next implementation checkpoint is therefore provider/runtime recovery and a reproducible 25-symbol ingestion, while generative AI remains unavailable.

The 25-symbol checkpoint is now complete after individual retries: 102 metadata symbols, 86 eligible symbols and 423 distinct sessions are available. The recommendation snapshot selected five symbols, but its outcome evaluation is pending until the 20-session forward horizon. The next data step is targeted remediation of the 16 incomplete symbols, followed by sector-balanced evaluation; do not recalibrate the model from the pending snapshot.

The incremental remediation pass has now raised coverage to 131 metadata symbols and 105 eligible symbols. Eleven provider failures remain checkpointed, and 26 symbols are still incomplete. The next step is targeted retries for those failed symbols, followed by a sector-balanced readiness report; the new five-symbol recommendation snapshot remains immutable and pending.

The failed-batch retry completed all 11 symbols and readiness is now 116/131 eligible. The current five-symbol snapshot is `f450e754-6e1f-461e-88af-fced4b41bf91`; its evaluation remains pending. The next step is to produce the sector-balanced readiness report and keep the 15 incomplete symbols out of ranking until they either recover or are explicitly classified as unavailable.

The sector readiness report is now available at `backend/evidence/sector-readiness-2026-09-21.json`. Banking, real estate, technology and the currently unclassified eligible set are complete; the largest remaining gaps are manufacturing (7 symbols) and construction/infrastructure (4 symbols). Use this report to prioritize retries and to prevent sector-skewed recommendation evaluation.

The sector-targeted retry raised eligibility to 124/131. Only seven symbols remain incomplete, with three confirmed unavailable from both providers (`X77`, `XDC`, `VXP`). Keep those symbols excluded and move the next checkpoint to recommendation monitoring: preserve snapshot `835cefa9-405b-4964-ad22-0eea36bc3071` and wait for its 20-session outcome window before changing model weights.

Recommendation monitoring is now repeatable through `npm run monitor:recommendations`. The current snapshot is pending for all five symbols and is sector-skewed toward energy/resources (3/5); this composition must be reported alongside later hit-rate results and must not be treated as a market-wide conclusion.

Monitoring now emits a concentration warning at 60% or higher. The current snapshot is flagged at exactly 60%; keep it immutable and use the warning when interpreting the eventual out-of-sample result.

Monitoring also records a SHA-256 hash of the run metadata and ranked recommendation payload. Verify this hash before and after forward evaluation so model comparisons use the original snapshot.

`npm run verify:recommendation-snapshot` now performs that check; the current snapshot passed with an exact hash match.

The scheduled and manual recommendation evaluation paths now enforce the same check before updating outcomes. A changed or missing snapshot evidence file blocks evaluation instead of producing unverifiable results.

Integrity regression coverage now includes both matching and tampered evidence cases; retain these tests when changing recommendation persistence or scheduler behavior.

The scheduler readiness check confirms the weekday 16:45 Asia/Ho_Chi_Minh job is enabled and points to a valid immutable snapshot. Continue monitoring its pending state until the forward horizon is available.

## AI Advisor and risk-plan safeguards - 2026-09-20

- AI Advisor must keep a visible chat interaction with quick prompts and selected-symbol context until a generative provider is quality-gated.
- Risk-plan consumers must validate the relation between current price, stop loss, and take profit before rendering. Stop loss is below current price; take profit is above current price; a long-term take-profit may be unbounded and is shown as unavailable by design.
- Any provider response that violates these relations is marked and replaced by a conservative display fallback. The raw provider result remains available for diagnostics.
- Regression gate: backend risk-plan tests, frontend unit tests, encoding guard, production build, and Playwright E2E must pass before releasing related UI changes.

### Intraday quote boundary (2026-09-21)

M5 separates canonical EOD history from quotes. Both overview and detail now use the Vnstock VCI price board and refresh 30 seconds after each completed request. A provider outage leaves the EOD value visible with an explicit fallback label. Live coverage and latency were measured on 2026-09-21 as recorded below; the next gate is continued monitoring of missing/stale quotes. This remains a research prototype, not streaming ticks or confirmation of public redistribution rights.
### Price-board correction (2026-09-21)

The overview and detail now use VCI's multi-symbol price board, replacing sequential per-symbol intraday calls. The list defaults to 200 rows and shows the current 131-stock universe. A live 131-symbol board request returned 105 valid quotes in 1.493 seconds; missing quotes remain EOD, so full-universe quote coverage is not claimed. Continue observing provider availability and thinly traded symbols; polling does not establish tick streaming or public redistribution rights.

### Personal overview UX (2026-09-21)

Positive portfolio positions and Watchlist symbols now pin before server pagination while respecting filters and the selected sort. Overview actions open the existing transaction form with symbol/price prefilled; saving remains explicit. Available source/license URLs have external links with hover titles. These changes extend the existing personal portfolio workflow and do not close another milestone.

### Recommendations workspace (2026-09-21)

Short-term candidates and forward evaluation are now a separate frontend workspace. The next recommendation gate expands evidence into objective technical history, verified macro context, verified positive/negative news, independently verified sentiment and user supplied subjective constraints. Missing groups receive zero points and remain visibly unavailable. See [RECOMMENDATIONS_DESIGN](RECOMMENDATIONS_DESIGN.md).


### Verified external context for recommendations (2026-09-21)

Snapshot generation now joins verified macro/news `ExternalFactor` records by symbol or global scope into evidence. Scoring remains technical-only until licensed sentiment/news adapters and out-of-sample calibration satisfy the acceptance criteria in `docs/RECOMMENDATIONS_DESIGN.md`.


## Lá»™ trÃ¬nh cáº£i thiá»‡n chart giÃ¡ vÃ  khá»‘i lÆ°á»£ng â€” 2026-09-21

1. **Äá»“ng bá»™ trá»¥c thá»i gian**: dÃ¹ng cÃ¹ng chuá»—i phiÃªn cho Ä‘Æ°á»ng giÃ¡ vÃ  histogram khá»‘i lÆ°á»£ng; phiÃªn intraday má»›i nháº¥t Ä‘Æ°á»£c ná»‘i sau EOD.
2. **Äá»c dá»¯ liá»‡u nhanh**: giá»¯ summary ngoÃ i vÃ¹ng plot Ä‘á»ƒ khÃ´ng cáº¯t chart; tooltip Ä‘iá»ƒm giÃ¡/cá»™t khá»‘i lÆ°á»£ng hiá»ƒn thá»‹ OHLC, khá»‘i lÆ°á»£ng, thá»i Ä‘iá»ƒm vÃ  hÆ°á»›ng tÄƒng/giáº£m.
3. **Kiá»ƒm chá»©ng hiá»ƒn thá»‹**: thÃªm selector E2E cho wrapper chart vÃ  histogram, kiá»ƒm tra cá»™t cÃ³ kÃ­ch thÆ°á»›c hiá»ƒn thá»‹ thay vÃ¬ chá»‰ tá»“n táº¡i trong DOM.
4. **BÆ°á»›c tiáº¿p theo**: bá»• sung scale khá»‘i lÆ°á»£ng, lá»±a chá»n 1D/1W/1M/3M vÃ  tráº¡ng thÃ¡i nguá»“n dá»¯ liá»‡u; chá»‰ thá»±c hiá»‡n khi API cung cáº¥p Ä‘á»§ dá»¯ liá»‡u tÆ°Æ¡ng á»©ng.

### Intraday session alignment (2026-09-22)

- Completed: the latest intraday quote replaces the EOD point for the same Vietnam trading date; price, volume, and axis labels share the same session. Intraday tooltips expose observation time and provider.
- A deterministic E2E regression confirms a single point for the current session and matching dates across chart layers.
- Next: measure quote freshness and coverage across symbols, retaining a visible EOD fallback state when live quotes are missing or stale.

### Live quote freshness and coverage (2026-09-22)

- Completed a live full-universe measurement: 103/131 symbols (78.6%) had intraday quotes, 89 were observed within one minute, and none of the available quotes exceeded 15 minutes at the check time. The worker needed a restart with proxy variables cleared; preserve the evidence at `backend/evidence/live-quotes-2026-09-22.json`.
- 28 symbols remain without intraday data. Next, compare the missing set across market sessions and distinguish provider-unavailable symbols from temporary gaps; preserve the EOD fallback and avoid claiming full live coverage.

### Overview information architecture (2026-09-22)

- Completed: overview no longer repeats recommendation history or presents fabricated performance/allocation visuals. It centers on the stock list and shows real data coverage, personal watchlist/portfolio coverage, provider observation time, and EOD fallback status.
- Validation: frontend unit and encoding checks pass; production build passes; overview and recommendation workflow E2E passes 10/10.
- Next: review the list's current-change and source freshness cues on narrow screens, and only add market-index statistics when a real index feed is available.

## Backlog package: Market overview and portfolio price transparency (2026-09-22)

All four items requested by the user are complete:

1. **Market breadth/volume panel â€” Complete.** Advancing, declining and unchanged counts; average latest change; stacked breadth distribution; session-volume bars grouped by price direction; coverage and observation time. Volume only aggregates current intraday quotes. The board has no aggressor-side fields, so active buy/sell quantities are explicitly unavailable rather than inferred.
2. **Direct symbol lookup in Detail â€” Complete.** Search by ticker/company name, offer symbols from the stock universe and load the exact matching detail record.
3. **Current portfolio prices â€” Complete.** Fetch multi-symbol intraday quotes on opening the portfolio and refresh every 30 seconds; recompute market value/unrealized P&L from quote price. Preserve and label EOD fallback for uncovered positions, including the observation time for quotes.
4. **Portfolio allocation design â€” Complete.** Proportional donut, clear palette, per-symbol market value and weight, total portfolio value, mobile layout, and explicit mixed-source wording under partial coverage.

Acceptance evidence: frontend production build, 12 unit tests, encoding guard and 26 relevant E2E checks passed; portfolio E2E passed again (4/4) after the final fallback-label adjustment. Continue tracking live quote coverage separately; this UI does not claim full-universe quote availability or buyer/seller initiated volume.


### App.jsx Unicode string cleanup (2026-09-22)

- Complete: Vietnamese UI text in `frontend/src/App.jsx` uses literal UTF-8 instead of Unicode escape sequences. Encoding check and production build pass.


### Personalized recommendations and evaluation feedback (2026-09-22)

- Complete: the Recommendations page has user-weighted controls for trend, momentum, RSI, stability, and liquidity, with full eligible-universe re-ranking and explainable score contributions. Criteria are stored locally per browser.
- Complete: evaluated recommendation history can calibrate those factors after at least 15 scored outcomes; until then calibration stays neutral. Daily snapshots store criterion scores for future measurements.
- Limits: this is a rule-based ranking flow. Unverified macro/news/sentiment do not receive points, and historical association is not a guarantee or causal claim.
- Next: gather evaluated snapshots and assess whether calibration is statistically stable before widening the influence range.


### Personalized endpoint runtime verification (2026-09-22)

- Resolved runtime 404 by restarting the stale backend process after confirming the route existed in source. POST to backend and UI origin now returns HTTP 200 (124 eligible symbols, 10 results); calibration remains neutral until there is enough outcome history.


### Recommendation result UI and portfolio action (2026-09-22)

- Complete: color-coded score hierarchy and criterion meters improve scanability. Each recommendation can open the existing portfolio transaction form with its ticker and reference price prefilled.
- Verification: production build, encoding check, and recommendation UI/portfolio handoff E2E passed.


### Explain recommendation history scope (2026-09-22)

- Complete: UI now defines system-run hit rate and average forward return, and distinguishes them from personal position P/L.
- Resolved on 2026-09-22: recommendation-origin BUY transactions retain a validated recommendation snapshot and show per-entry forecast outcome in Personal Portfolio. See the implementation record below.

### Per-position recommendation outcome tracking (2026-09-22)

- Complete: migration 012 stores validated recommendation provenance on portfolio BUY transactions. The user-scoped portfolio API evaluates the reference price at the saved forward horizon and reports pending or evaluated results. Personal Portfolio displays that forecast outcome separately from price movement versus the actual transaction price.
- Existing manual transactions remain unattributed; no retroactive link is inferred. Outcome direction is measured against the reference entry price; no personalized profit target is claimed.
- Validation: PostgreSQL isolated-schema test verifies snapshot persistence, horizon evaluation, and account isolation; backend/frontend tests, build, encoding check, and recommendation-to-portfolio Playwright flow pass.
# Recommendation evaluation robustness (2026-09-22)

- Complete: portfolio-linked forecast evaluation deduplicates daily price observations by Vietnam trading date, uses the latest EOD observation on a duplicate date, ignores explicit intraday rows, and waits for distinct forward sessions.
- Validation: portfolio accounting tests 6/6, full backend 61/61, and isolated PostgreSQL migration/API verification all pass.
- Next: investigate intraday coverage as recorded in PROJECT_STATUS; first repeat the measurement during an open afternoon session.

## Live quote coverage diagnostics (2026-09-22)

- Complete: repeated full-universe coverage through the local API (107/131, 81.7%) and queried the missing set directly against the VCI worker. The provider returned no rows for the 24 missing symbols without request errors; all 24 occur in VCI's listing, including 3 marked DELISTED and 21 still listed.
- Complete: the verifier now records the exchange session phase, suppresses stale-session classification during the lunch break, stores timestamped evidence without same-day overwrite, and attaches VCI listing metadata for missing symbols.
- Evidence: `backend/evidence/live-quotes-2026-09-22T04-52-12-599Z.json`. The observation occurred during the lunch break, so it does not validate freshness during an open session. EOD fallback remains required.
- Complete: afternoon-session measurement and full-universe coverage split are recorded below. Historical symbols remain intact; an alternate provider requires licensing/timestamp review.

### Afternoon-session verification (2026-09-22)

- Full universe: 107/131 quotes (81.7%); non-DELISTED denominator: 107/128 (83.6%). Of returned quotes, 88 were observed within 1 minute, 99 within 5 minutes, 101 within 15 minutes, and 6 exceeded 15 minutes.
- Direct VCI checks for the 6 older quotes matched the API's `observed_at` values and returned without errors, so the API did not make them appear newer. Twenty-four symbols still had no quote row; three were identified as DELISTED and 21 remained listed.
- Evidence: `backend/evidence/live-quotes-2026-09-22T06-33-02-498Z.json`. This confirms quote timestamp propagation during an open session; it does not establish a streaming SLA or explain why a listed security has no board row.

### Coverage reporting by listing status (2026-09-22)

- Complete: verifier compares all 131 application symbols against VCI's listing and reports `listed`, `delisted`, and `unknown` groups separately. The live measurement returned 109/131 overall and 109/128 for listed, non-DELISTED symbols; three delisted symbols had no quote and no universe symbol had unknown status.
- Evidence: `backend/evidence/live-quotes-2026-09-22T06-47-59-124Z.json`. The main quote API succeeded; the secondary direct probe of missing symbols received an upstream connection reset and is recorded as inconclusive.
- Scope: this classification is measurement data only; it does not remove symbols from stock history or the UI.
- Complete: migration 013 persists exchange and listing status; stock list/detail API and overview UI now expose them while retaining delisted history. Applied the migration and synchronized metadata for all 131 existing development symbols (no stock or price rows created/deleted). Verification: backend 64/64, frontend 12/12, PostgreSQL isolated migration/API checks passed, production build passed, overview E2E 8/8.
- Complete: migration 014 persists `listing_checked_at`; list/detail API and overview badge tooltip expose the latest successful metadata check. A weekday 15:15 Asia/Ho_Chi_Minh scheduler refreshes VCI listing metadata only, without price ingestion, and invalidates stock cache after success.
- Limitation: freshness depends on the Vnstock worker being reachable. Listing status is not a quote availability or activity signal.
- Verification: backend 66/66, isolated PostgreSQL migration/API checks, frontend 12/12, encoding check, production build, and overview E2E 8/8 passed. Development migration 014 and an immediate metadata-only sync completed; VCI returned 3,632 rows and the sync checked all 131 existing symbols without creating records. API smoke check returned 200.
- Verified the production 15:15 Asia/Ho_Chi_Minh cron tick on 2026-09-22: 3,632 VCI rows, 131 existing symbols checked, none created; API returned 200/131; price history remained at 50,195 rows with unchanged latest timestamp. Evidence: `backend/evidence/listing-sync-verification-2026-09-22.json`. Added bounded, credential-redacted details for worker HTTP errors in EOD/intraday fetchers; PostgreSQL checks pass and backend tests now pass 74/74. A 15:30 post-session probe returned 5/5 quotes without errors (`backend/evidence/quote-worker-probe-2026-09-22.json`); it did not reproduce the intermittent 500, so retry/fallback remain unchanged. Added `npm run verify:quote-freshness` for up to 30 symbols (defaults to 5), recording quote age and market phase while evaluating stale thresholds only during regular sessions. After-hours trial returned 5/5 but is correctly not scored for freshness (`backend/evidence/quote-freshness-2026-09-22T09-23-00-756Z.json`). Added tests for Vietnam session boundaries. Current check is after market close; next: run the bounded probe during the next open session and adjust retry/fallback only if diagnostics show a repeatable cause.
- Chart session investigation: confirmed 09-21 was missing from EOD storage, not filtered by chart code. VCI supplied the session for active examples; idempotent backfill added 101 rows and left 9 prior rows unchanged, bringing coverage to 110/131. Detail API now includes 09-21 for FPT/SSI/VCB/HPG/BSR, and FPT quote API supplies 09-22; targeted chart E2E confirms aligned labels `[09-18, 09-21, 09-22]` (1/1 passed). Twenty-one symbols still lack persisted 09-21 rows (3 delisted, 18 listed without a persisted result from this run; VTX had a DNS error). Backfill evidence is `backend/evidence/eod-backfill-2026-09-21-2026-09-22T09-55-12-125Z.json`. Added documented `backfill:vnstock-session` script with bounded retries and idempotent writes. Next: retry/classify missing listed symbols after provider connectivity stabilizes, then run the quote-freshness probe during the next open session.
- Follow-up targeted retry: added explicit-symbol scope and continue-on-error behavior to the backfill. All 18 listed symbols were retried after a healthy-worker check and a successful FPT control request; the provider returned no 09-21 rows for the targets (one logged YTC connection reset, with retries on transient failures). Coverage remains 110/131. This is a provider no-row result, not evidence of no market activity. Latest evidence: `backend/evidence/eod-backfill-2026-09-21-2026-09-22T10-11-36-360Z.json`. Keep these gaps flagged for provider reconciliation; next run the quote-freshness probe during the next open session.
- Complete: chart API selection now uses market observation time ahead of import/update time, filters records without an observation time, and uses explicit NULLS LAST ordering. Price/volume/axis dates share Vietnam session-date formatting, with a visible empty-history state for symbols without provider rows. Backend tests 76/76, targeted chart E2E 2/2, frontend build, and encoding check passed. Restarted the API on port 5000, cleared 24 stock cache entries, and confirmed live health/list/detail return 200; FPT detail now returns 20 correctly ordered observations including 09-21 and no null timestamps. The 18 provider-unconfirmed 09-21 gaps remain unchanged.
- Complete: added and ran a read-only full-universe chart-history audit. All 131 symbols were checked in one database query: 110 have 09-21, 21 do not (18 listed, 3 delisted), three histories are empty, three rows have null observation time, and there are no duplicate observed session dates. Broad per-symbol API verification was limited by the configured 100-request/minute cap; focused post-reset API checks for FPT/VTQ/VXP passed. Evidence: `backend/evidence/chart-history-audit-2026-09-21-2026-09-22T10-30-11-370Z.json`. Next: run quote-freshness during the next open session and retain unresolved EOD gaps pending actual provider candles.
- Complete: ran a post-restart quote-freshness probe at 17:33 Vietnam time. API returned 5/5 (FPT/SSI/VCB/HPG/BSR) from VCI; observations were about 10,093 seconds old after close, so no open-session freshness score was applied. Evidence: `backend/evidence/quote-freshness-2026-09-22T10-33-16-276Z.json`. Next: repeat during regular trading hours; do not tune stale thresholds from this after-hours sample.
- Complete: scheduled bounded quote freshness probes at 09:35/13:35 Vietnam time on weekdays, with overlap suppression and timestamped evidence. In-session scoring now also requires a quote stamped with the current local session date, so weekday holidays and provider-wide stale observations stay inconclusive. Backend 80/80 passed; restarted API logs show the scheduler registered. Post-restart manual after-hours control returned 5/5 VCI quotes without errors. Evidence: `backend/evidence/quote-freshness-2026-09-22T10-39-07-100Z.json`. Next: inspect the first scheduled report during an open session.
- Complete: checked the 18 provider-unconfirmed 09-21 candles against configured EODHD coverage. The account accepts the key and returned an FPT control row, but none of the 18 targets returned that session; five network errors from the first attempt resolved to no rows on retry. KBS control was inconclusive due to a worker connection reset. Added a paced coverage-only EODHD probe and made 404 no-coverage responses nonfatal in reconciliation; nothing was written to stock prices. Backend 82/82 passed. Evidence files are recorded in PROJECT_STATUS. Next: inspect the first scheduled open-session quote report; do not backfill a symbol without an actual licensed-provider candle.
- In progress: detail API exposes the three latest Vietnam-local EOD dates found anywhere in stored Vnstock daily data. The chart warns when this symbol has no candle for one of those observed sessions and never synthesizes a point or volume bar. This is an observed-data reference, not an official exchange calendar. Frontend build/encoding passed; backend and Playwright checks are being rerun after the first test invocation exposed a mock ordering error and Windows worker-spawn restriction. Next: finish tests, confirm the running detail API/UI, then review the first scheduled open-session quote report.
- Complete: final verification passed: backend 82/82, targeted detail chart E2E 2/2, frontend build and encoding check. Backend port 5000 and preview port 4180 were restarted; live FPT detail now exposes observed market-session metadata alongside stored history.
- Complete: morning-session freshness probe on 2026-09-23 returned 5/5 VCI quotes with current session dates, all under five minutes old and zero over-15-minute observations. Evidence: `backend/evidence/quote-freshness-2026-09-23T02-20-38-891Z.json`. Health/list API smoke check returned 200 with all 131 symbols; frontend service tests 12/12 passed. Keep scheduled monitoring enabled; no provider fallback change is needed.
- Complete: closed a recommendation workspace UI regression found by the full suite. Added explicit short-term/criteria headings and rendered the existing concentration-risk snapshot warning. Full Playwright now passes 29/29; production build passes; preview restarted at port 4180. Recommendation scoring/data contracts were unchanged. Next: wait for sufficient measured history before enabling weight calibration.
- Complete: recommendation readiness check confirms 124/131 symbols meet the 50-observation minimum, and snapshot integrity verification matches the expected hash. This was read-only; no new recommendations or price rows were generated. Next: let the evaluation scheduler accumulate measured per-symbol outcomes before enabling calibration.
- Complete: scheduled 09:35 quote freshness returned 5/5 current VCI observations with zero stale results. Recommendation monitor confirms 0/5 measured and 5/5 pending for the latest 20-session snapshot; calibration remains disabled and the 60% concentration warning is valid. Evidence is recorded in PROJECT_STATUS. Next: review after the evaluation horizon or when the 13:35 quote probe produces a new report.
- Complete: post-monitor backend regression verification passed 22 suites/82 tests. No recommendation or calibration writes were triggered; await the configured evaluation horizon and next 13:35 freshness report.
- Complete: fixed the recurring EOD omission at its source. The 2026-09-22 audit initially showed 0/131 rows, proving the chart was not hiding the session. EOD scheduling is now enabled by default with an explicit opt-out, and the full session backfill inserted 107 rows (23 provider no-row gaps remain explicit). FPT API history includes 09-21 and 09-22. Backend 84/84, build, and chart E2E 2/2 pass; API restarted with the EOD scheduler active.
- Complete: post-repair audit confirms 108/131 symbols carry 09-22 EOD data; FPT/BSR/SSI live detail APIs all expose 09-22. Twenty-three symbols remain provider no-row gaps and are disclosed. Repeat the audit after the 10:30 daily EOD scheduler run to verify automatic continuity.
- Complete: hardened the actual EOD ingestion path against worker payload failures. Full-universe requests now split into bounded batches and aggregate results; a two-symbol idempotency control passed with 2 received/2 skipped. Backend 84/84 passes and the restarted API has both batching and EOD scheduling enabled.
- Complete: fixed the remaining scheduler failure mode. EOD batches now retry transient worker errors and continue through later symbols. A FPT/DBC/BSR control run completed without aggregate errors (1 insert, 2 skips); backend remains 84/84. Next scheduled EOD run will validate the full-universe path with this continuation logic.
- Complete: full 131-symbol control run now completes through all batches despite transient worker failures (85 received, 84 skips, 1 insert, 0 rejected). Individual errors are retained for retry and no longer abort the universe. Continue provider retries for the remaining gaps without altering existing prices.
- Complete: worker health is ready and transient EOD connection failures are now retried three times with a 1.5-second backoff. Five-symbol stability probe completed without errors; backend 84/84 passes and API restarted. Keep remaining provider gaps for later retries rather than fabricating candles.
- Complete: standardized green profit/gain and red loss/drop semantics across portfolio P/L and overview change cells, with neutral styling for unavailable values. Existing detail/market/recommendation indicators retain the same convention. Frontend build, encoding check, and portfolio E2E 6/6 passed.
- Complete: added non-blocking realtime loading feedback while retaining immediate EOD/cache rendering. Overview, detail, and portfolio quote refreshes now show an animated indicator until success/failure, without masking fallback data. Build, encoding, and targeted E2E 8/8 passed; preview restarted at 4180.
- Complete: full frontend regression after realtime loading feedback passed 29/29. Overview, detail, portfolio, recommendation, and pagination workflows remain intact; no data behavior changes were required.
- Complete: added regression coverage for delayed realtime quotes: loading indicator remains visible while cached/EOD data is usable and clears after success. Loading E2E 1/1, build, and encoding check passed.

- Complete: added a lightweight bootstrap loading screen for the authenticated first stock-list request. It does not block cached/EOD data after the first payload and does not replace the inline realtime indicators. Build and encoding checks passed; the full Playwright passed 30/30.


## VNINDEX universe scale and market breadth metrics — 2026-09-23

- Roadmap scope: expand the supported universe from the current 131 symbols to at least 500 records so a VNINDEX-sized universe (300+ symbols) is covered without changing stock-detail, portfolio, recommendation, or chart contracts. The stock-list API now accepts a bounded `pageSize` up to 500; the overview universe request uses that bound while the visible table remains paginated.
- Performance guardrails: keep visible rows paginated, retain five-minute server cache, request realtime quotes in bounded batches with concurrency limits, and add database indexes for `(stock_id, observed_at)` and `(provider, interval, observed_at)`. Measure first-paint, universe fetch, quote refresh, and chart render budgets at 300/500 symbols before raising the cap again.
- Data contract to add, nullable until a licensed provider supplies it: per-session `trade_count`, `traded_value`, `reference_price`, `ceiling_price`, and `floor_price`; market-breadth aggregates will expose `ceiling_count`, `floor_count`, and their `observed_at` session key. Missing fields must remain explicit and must never be inferred as zero.
- Chart integration: use one Vietnam-local session-date key for price, volume, trade count, traded value, and ceiling/floor counts. Detail charts will add synchronized tooltip series and optional overlays; the overview breadth chart will add timeline points and summary cards. Existing price line, volume bars, axis labels, range controls, and fallback states remain unchanged.
- Delivery order: (1) provider/ingestion contract and migration, (2) aggregate breadth endpoint with cache and bounded query, (3) detail chart optional series/tooltips, (4) overview timeline and ceiling/floor summary, (5) 300/500-symbol load tests and visual regression. Do not backfill or display fabricated counts when the provider has no licensed observation.
- Current implementation checkpoint: API/frontend support the bounded 500-symbol universe; provider-backed transaction count and ceiling/floor observations remain pending contract and ingestion work.

- Complete: migration 015 and the market-data contract now carry nullable transaction count, traded value, reference, ceiling, and floor prices through Vnstock ingestion into detail history payloads. Existing data remains backward compatible. Backend 84/84 passed. Next: add the cached market-breadth aggregate endpoint and synchronized chart overlays only when provider observations are available.

- Complete: restored the previously shipped frontend capabilities after the UI regression: initial and realtime loading feedback, user-weighted recommendation criteria with feedback history, 500-symbol market breadth, portfolio allocation donut, recommendation tracking, and semantic gain/loss colors. Frontend build and encoding checks pass; Playwright execution was blocked in this environment by child-process `spawn EPERM`.

## Market breadth expansion plan — 2026-09-28

### Đánh giá hiện trạng

`MarketBreadthChart` hiện tính trên universe tối đa 500 mã và hiển thị ba nhóm tăng/giảm/đứng giá, tỷ trọng số mã, khối lượng phiên theo nhóm, biến động bình quân, độ phủ quote và thời điểm quan sát. Đây là nền tảng đúng, nhưng chưa cho biết độ rộng theo thời gian, sức mạnh tương đối của nhóm ngành, giá trị giao dịch, mức ảnh hưởng theo vốn hóa hay dòng tiền chủ động. Các trường không có trong quote hiện không được suy diễn.

### Tham chiếu SSI và nguyên tắc áp dụng

SSI iBoard tổ chức màn hình thị trường thành các lát cắt bổ sung: top tăng/giảm theo giá và phần trăm, top khối lượng/giá trị, giao dịch nước ngoài; tài liệu iBoard Pro còn mô tả dòng chảy thị trường (net flow) và bản đồ nhiệt theo ngành. Ứng dụng này sẽ mượn cấu trúc thông tin và cách ưu tiên khám phá, nhưng giữ cách trình bày riêng, không sao chép giao diện hay nhận diện SSI.

### Lộ trình đề xuất

1. **Mốc 1 — Breadth snapshot đáng tin cậy.** Bổ sung A/D ratio, chênh lệch tăng–giảm, tỷ lệ mã có dữ liệu, giá trị giao dịch nếu provider có trường này; thêm bộ lọc universe/sàn/ngành và các khối Top tăng, Top giảm, Top khối lượng, Top giá trị. Mỗi khối phải có `observed_at`, session key và trạng thái thiếu dữ liệu.
2. **Mốc 2 — Độ rộng theo thời gian.** Tạo endpoint aggregate có cache cho các điểm trong phiên và EOD; hiển thị A/D line, breadth theo 1D/5D/20D, volume breadth và vùng cảnh báo khi độ rộng phân kỳ với chỉ số. Không vẽ đường nếu chuỗi quan sát không liên tục.
3. **Mốc 3 — Ngành và bản đồ nhiệt.** Tổng hợp theo ngành với số mã tăng/giảm, giá trị giao dịch, độ rộng ngành và đóng góp chỉ số khi có market-cap/weight hợp lệ; cho phép nhấn một ngành để lọc danh sách cổ phiếu hiện hữu.
4. **Mốc 4 — Dòng tiền có kiểm chứng.** Chỉ thêm net flow, giao dịch nước ngoài và tác động chỉ số khi backend/provider cung cấp aggressor side, foreign buy/sell và index weight. Không suy luận mua chủ động từ volume hoặc màu giá.
5. **Mốc 5 — Hiệu năng và nghiệm thu.** Đo first usable paint, thời gian aggregate và refresh ở 300/500 mã; kiểm thử responsive, empty/partial/stale data, tooltip và accessibility. Chỉ đóng mốc khi dữ liệu live, mock và fallback được phân biệt rõ trong bằng chứng.

### Thứ tự triển khai được chọn

Ưu tiên Mốc 1 trước vì tận dụng quote contract hiện có và tạo giá trị ngay; sau đó Mốc 2 để biến snapshot thành công cụ theo dõi xu hướng. Mốc 3 là lớp khám phá ngành. Mốc 4 phụ thuộc dữ liệu provider và không nên chặn ba mốc đầu.

**Trạng thái cập nhật 2026-09-28:** Đã triển khai phần snapshot an toàn gồm A/D ratio, chênh lệch A−D và tỷ lệ mã được phân loại trong source component và runtime bundle. Top lists, giá trị giao dịch và data contract mở rộng vẫn để ở phần tiếp theo của Mốc 1.

**Thiết kế giao diện cập nhật:** Org chart và bản đồ dữ liệu mới được ghi trong [`docs/MARKET_BREADTH_DESIGN.md`](MARKET_BREADTH_DESIGN.md), tổ chức theo thứ tự toàn cảnh nhanh → cấu phần độ rộng → thanh khoản/phân rã → xu hướng → chất lượng dữ liệu.

**Trạng thái 2026-09-28:** Đã thêm ba nhóm Top tăng, Top giảm và Top khối lượng, tối đa 5 mã mỗi nhóm. Bước tiếp theo của Mốc 1 là bổ sung bộ lọc phạm vi và liên kết tương tác sang bảng cổ phiếu.

**Trạng thái 2026-09-28:** Đã hoàn tất liên kết tương tác từ mã trong Top list về ô tìm kiếm/bảng cổ phiếu bằng click hoặc Enter/Space. Bộ lọc phạm vi chuyên biệt vẫn là phần tiếp theo.

**Trạng thái 2026-09-28:** Top list đã dùng chung bộ lọc Nhóm ngành của bảng và hiển thị rõ phạm vi đang chọn. Bộ lọc sàn/universe độc lập sẽ chỉ thêm khi backend có contract tương ứng.

**Trạng thái 2026-09-28:** Backend đã có contract `exchange=HSX|HNX|UPCOM` và UI đã thêm bộ lọc Sàn cho Top list. Bộ lọc này chỉ thay đổi phạm vi ba Top list; bảng cổ phiếu chính vẫn giữ luồng lọc hiện tại.

**Kiến trúc page:** Đã ghi thiết kế tách `Tổng quan` và `Bảng giá` trong [`docs/MARKET_PAGES_SPLIT_DESIGN.md`](MARKET_PAGES_SPLIT_DESIGN.md). Bản runtime hiện đã cung cấp hai view điều hướng riêng và giữ chung query state; bước tiếp theo là chuyển cơ chế này thành view/route React `market-board` khi source `App.jsx` khôi phục đầy đủ để loại bỏ runtime injection.

- Complete: UI/UX context review across all investor pages. Page order is preserved, each page now has contextual topbar titles, and browser reload restores the active page and selected symbol through session storage. Continue with visual review at the 4180 preview after deployment.

- Complete: simplified recommendation and shared page presentation. Recommendation flow now removes duplicate headings, groups criteria and actions, and uses a compact responsive grid. Shared page spacing and panel hierarchy are consistent. Resume 500-symbol expansion with universe/quote batching measurements at 300 and 500 records.

- In progress: overview now requests the bounded 500-symbol universe and refreshes intraday quotes in five bounded batches of up to 100 symbols, while the visible table remains paginated. Next acceptance check: measure universe fetch, quote refresh, market-breadth render and first usable paint at 300/500 symbols during an open session.

- Complete: migration 016 adds scale indexes for latest-per-symbol and provider/session queries. Backend regression remains 23 suites/84 tests. Apply the migration in the target database before 300/500-symbol performance measurement.

- Scale probe 2026-09-23: development DB has 131 stocks, 128 covered, and 50,416 price rows. Latest-per-stock query measured 15.67 ms at limit 300 and 15.97 ms at limit 500; session query 21.97 ms. This validates query/index latency but not full 300/500 coverage; provider ingestion must reach that coverage before final performance acceptance.

- Coverage checkpoint 2026-09-23: bounded 300-symbol ingest completed 12/12 batches with 0 failed batches and 859 EOD rows inserted. Development DB now has 424 metadata symbols, 321 covered symbols, and 51,275 price rows. Read latency measured 13.84 ms at limit 300 and 17.47 ms at limit 500; 300 coverage is reached, while 500 coverage remains pending targeted retries and the next expansion run.

- 500-scale ingest attempt 2026-09-23: targeted retry recovered 52 EOD rows, but the subsequent 20-batch 500 run failed at provider level (etch failed) and its retry continued timing out. Runtime health returned ready while data requests failed. Development DB remains at 624 metadata symbols, 332 covered symbols, 51,328 price rows; do not claim 500 coverage until worker request stability is restored.

- Worker diagnosis 2026-09-23: health remained 200 while data requests inherited a dead localhost proxy. Clean-proxy restart restored FPT EOD/intraday and two-symbol EOD, but requests of five symbols still reset. Treat provider batch size 2 as the current safe ceiling; 500 coverage remains pending a worker/provider batching fix. No failed-run data was counted as coverage.

- Complete: vnstockBridgeFetcher now splits worker EOD requests into safe two-symbol chunks and preserves successful partial chunks instead of discarding an entire outer batch. Regression is 86/86. Provider instability remains: the 500 retry recorded 83 rows but 18/20 outer batches failed, so 500 coverage is still pending.

- Provider retry checkpoint: partial-chunk retry preserved 74 existing rows and left 17/18 outer batches failed. Empty fallback env was repopulated by dotenv, so this was not a pure VCI-only run. Add an explicit disable-fallback flag before the next retry; current coverage remains 332/624 symbols.
- Complete: ingest universe now supports VNSTOCK_DISABLE_FALLBACK=true, preventing dotenv from silently re-enabling KBS during provider diagnosis. Script syntax and fetcher regression pass.

- VCI-only retry 2026-09-23: explicit fallback disable worked (allback: null), but 16/17 batches still failed from VCI resets/no-row and the 78 returned rows were idempotent skips. Coverage remains 332/624; query latency remains 12.48 ms at 300 and 14.99 ms at 500. Upstream low-liquidity coverage is the remaining blocker.

- Gap audit 2026-09-23: added classify:universe-gaps and generated evidence/vnstock-universe-gap-audit-latest.json. The VCI-only manifest has 400 gaps, all conservatively classified transient because failed batches lack symbol-level no-data evidence. Keep them outside readiness and retry in smaller scheduled groups.

- Canary retry 2026-09-24: first ten VCI-only gap symbols succeeded with 48 EOD rows and coverage 332 to 342. The next ten failed as one VCI batch. Query latency remains 12.16 ms at 300 and 15.60 ms at 500. Continue small-group retries with manifests; do not increase concurrency until provider stability is repeatable.

- Canary expansion 2026-09-24: retry of the second ten symbols succeeded with 32 rows; the next ten produced 14 rows with partial chunk failures but no failed outer batch. Coverage is now 353/624, with 51,422 price rows. Keep retry groups at ten until two consecutive clean groups justify increasing the group size.

- Canary retry continuation 2026-09-24: SDC-SDU returned 11 rows cleanly; SDV-SFI returned 19 rows with two partial chunk failures but no outer batch failure. Coverage is now 364/624 with 51,452 price rows; query latency 13.39 ms at 300 and 15.15 ms at 500. Keep sequential groups of ten.

- Canary SFN-SGR 2026-09-24: clean VCI-only group of ten returned 35 EOD rows with no errors. Coverage is now 372/624 and query latency is 12.55 ms at 300 and 15.13 ms at 500. Continue sequential groups of ten.

- Canary SGS-SHX 2026-09-24: VCI-only worker chunk 2 hoàn tất 1/1 batch, nhận 39 dòng EOD, 0 batch lỗi. Coverage tăng lên 380/624 mã với 51.526 dòng giá; query latency 12,8 ms ở 300 và 15,25 ms ở 500, session query 28,33 ms. Tiếp tục retry tuần tự nhóm 10 mã, chưa mở rộng concurrency.

- Canary SIC-SJF 2026-09-24: VCI-only worker chunk 2 hoàn tất 1/1 batch, nhận 24 dòng EOD, 0 batch lỗi. Coverage tăng lên 386/624 mã với 51.550 dòng giá; query latency 12,71 ms ở 300 và 15,17 ms ở 500, session query 23,64 ms. Tiếp tục retry tuần tự nhóm 10 mã.

- Canary SJG-SMA 2026-09-24: VCI-only worker chunk 2 hoàn tất 1/1 batch, nhận 39 dòng EOD, 0 batch lỗi. Coverage tăng lên 396/624 mã với 51.589 dòng giá; query latency 12,8 ms ở 300 và 15,18 ms ở 500, session query 22,65 ms. Tiếp tục retry tuần tự nhóm 10 mã.

- Canary SMB-SPB 2026-09-24: VCI-only worker chunk 2 hoàn tất 1/1 batch, ghi 28 dòng EOD và không có batch thất bại; worker ghi nhận no-data cho SON nhưng không làm mất partial response. Coverage tăng lên 402/624 mã với 51.617 dòng giá; query latency 13,06 ms ở 300 và 15,31 ms ở 500, session query 22,69 ms. Tiếp tục retry tuần tự nhóm 10 mã.

- Canary SPC-SRB 2026-09-24: VCI-only worker chunk 2 hoàn tất 1/1 batch, nhận 14 dòng EOD, 0 batch lỗi. Coverage tăng lên 407/624 mã với 51.631 dòng giá; query latency 13,17 ms ở 300 và 16,1 ms ở 500, session query 22,61 ms. Tiếp tục retry tuần tự nhóm 10 mã.

- Complete: fixed negative market breadth color, added realtime portfolio quote refresh and client-side P/L revaluation, and widened detail history retention/cache version so current intraday data cannot hide the preceding EOD session. Backend 86/86, frontend service tests 14/14, encoding check, and build passed.

- Complete: corrected market breadth sign coloring, restored portfolio RAG styling, restored donut hover detail and day-over-day total in the allocation center, and verified the 23-09 gap is provider coverage per symbol rather than chart filtering. FPT 23-09 was backfilled successfully through VCI; continue targeted retries for remaining gaps.

## Correction: breadth color, allocation hover, and current EOD — 2026-09-24

- Keep the market breadth chip background neutral and color only the signed value. Negative values use the shared red text token; non-negative values use the shared green text token.
- Allocation tooltip scope is per holding: aggregate donut tooltip was removed, and each holding row exposes only its own symbol, weight, and market value. The center remains reserved for total assets and day-over-day delta.
- FPT was a control symbol, not a special data source. VCI backfill uses the same per-symbol worker path for the entire 624-symbol universe. The first follow-up group returned 9/10 records; BCG remains a provider no-data gap and stays in retry backlog.
- 2026-09-24 is intraday while the session is open. Its EOD candle cannot be displayed until the market closes; current charts must merge the latest quote without replacing the preceding EOD candle.

## UX continuity follow-up — 2026-09-24

Loading feedback, per-slice donut hover targets, and route persistence across browser reload are now part of the frontend acceptance checks. A reload must preserve the active page and the selected detail context rather than defaulting to Overview.

## Follow-up UX acceptance — 2026-09-24

The overview must show a translucent intraday loading overlay, donut slices must expose per-symbol hover targets, and reload must restore both the active route and selected detail symbol from session storage. These checks are now implemented and covered by the production build verification.

## Next performance step — 2026-09-24

Overview intraday requests are now bounded to batches of 100 symbols with partial-success merging. The freshness verifier confirms all five control symbols return current-session VCI observations; lunch-break age is reported without triggering a false stale failure.

## Regression gate — 2026-09-24

Full backend and frontend regression is green after the donut geometry, loading, route persistence, and MarketBreadthChart newline fixes. Keep the current preview asset as the review target.

## EOD backlog continuation — 2026-09-24

Two controlled VCI retry groups completed. Coverage is 348/624 symbols; successful records are persisted idempotently, while provider no-data and connection resets remain explicit backlog entries. Do not mark 500-symbol EOD coverage complete until symbol-level gaps are resolved or classified with provider evidence.

## Shared loading acceptance — 2026-09-24

Every page that waits for intraday or detail data must expose the same loading overlay. Overview, Portfolio, and Detail now share the overlay behavior; a page may render cached content beneath it while the realtime request is pending.

## Recommendation reference price correction — 2026-09-24

Personalized recommendations now use the newest VCI intraday quote as the reference/entry price when available. EOD is an explicit fallback only. The response records source and observation time so evaluation can distinguish stale EOD from current-session pricing.

## Recommendation pricing acceptance — 2026-09-24

Both personalized and scheduled recommendation flows now prefer the current intraday quote for `entry_price`. EOD fallback is explicit and labeled. Recommendation evaluation retains the captured reference price, source, and observation time for auditability.

## Recommendation explainability checkpoint — 2026-09-24

Next step after adding Ichimoku/MACD/Bollinger is to keep the recommendation snapshot auditable: each item records its normalized technical score and the current state of each confirmation model. The next visual review should verify these fields are visible or accessible from the recommendation card without forcing users to open Chi tiết mã.

## Recommendation card explainability — 2026-09-24

Đã hoàn tất bước hiển thị trực tiếp điểm kỹ thuật và trạng thái Ichimoku/MACD/Bollinger trên từng thẻ Đề xuất. Khi rà soát giao diện thực tế, kiểm tra thêm khả năng đọc trên màn hình nhỏ và tooltip trạng thái dài; không thay đổi logic xếp hạng hoặc giá tham chiếu.

## Snapshot compatibility follow-up — 2026-09-24

Khi mở lại các đợt Đề xuất đã lưu trước khi bổ sung trường xác nhận, giao diện đọc fallback từ các chỉ báo đã lưu trong `rationale.indicators`. Snapshot mới tiếp tục dùng `technical_confirmation` làm nguồn ưu tiên.

## EOD adjacent-session reliability — 2026-09-25

Đã bổ sung fallback retry từng mã khi worker trả response từng phần và invalidation các generation cache detail. Nhóm mã ưu tiên hiện đạt `105/106` có EOD phiên 24-09; toàn universe chưa hoàn tất vì upstream còn reset/từ chối một số mã. Mốc 500 mã vẫn mở, chỉ đóng khi audit theo phiên đạt coverage mục tiêu và có phân loại bằng chứng cho mã không có dữ liệu.

## EOD reliability checkpoint — 2026-09-25

Session audit now excludes intraday rows. Live 24-09 EOD coverage measured 327/624, then 329/624 as the existing runtime continued updating data. The 500-symbol milestone remains open. Scheduled session-specific retry, paced requests, exponential backoff, timestamped coverage evidence and in-process overlap prevention are implemented; backend regression passes 92/92. Deployment/restart and a complete scheduled run remain to be verified. Continue from the latest PROJECT_STATUS entry before expanding scope.

## Build reproducibility blocker — 2026-09-25

The current App.jsx does not reproduce the shipped dist: advanced analysis and other shipped UI behaviors are absent from source. Safe build compiles but rejects the resulting incomplete bundle and restores the previous dist. Restore the corresponding source before accepting a new release. Browser checks also expose an existing loading overlay that remains active after empty quotes. These issues precede further UI acceptance; service-test and bundle-marker success alone are insufficient. See PROJECT_STATUS for live evidence and the EOD canary results (341/624 session coverage; 500 remains open).

## Intraday reliability and source recovery completed — 2026-09-25

Build reproducibility is restored through application-only recovery from the shipped asset (provenance in frontend/recovery/README.md); ordinary Vite build now passes. Three-page intraday behavior uses request settlement/deadlines, serial active-page polling, partial quote retention and shared per-symbol backend caching. Portfolio loading is independent of Watchlist and exposes errors/retry. Final verification: backend 98 tests, frontend 14 service tests and 36 Chrome E2E pass; live FPT/SSI/VCB and FPT detail return intraday. Provider availability remains external; continue session coverage audits without claiming 500-symbol EOD completion. Refactoring recovered compiled variable names is a separate follow-up, not a prerequisite for the functioning build.

## Intraday provider reset follow-up — 2026-09-25

The remaining incident was worker concurrency and provider instability: simultaneous per-symbol calls could reset the HTTP worker, while the UI mislabeled valid intraday trades as EOD because it required `volume_type=session`. The service now serializes worker calls, falls back to the local bridge, returns partial symbols early, and polls missing symbols. UI labels use the intraday interval. Latest live evidence shows partial-first/3-symbol cached follow-up; provider resets remain an external limitation and are explicitly surfaced.

## Frontend reproducible release checkpoint — 2026-09-30

- Complete: source recovery now covers Detail, Recommendation Workbench, market board/breadth, portfolio/watchlist, quality overlays and lazy expert analysis. Source parity is 9/9.
- Complete: Vite emits the four runtime overlays/actions as explicit release assets; safe-build and bundle integrity accept a clean rebuild without relying on the previously ignored hashed bundle.
- Complete: frontend service tests pass 14/14 and the production artifact passes all 48 Chrome E2E scenarios, including saved recommendations and partial quote retention.
- Open: this closes the frontend build-reproducibility blocker, not M5. Continue the bounded, session-specific EOD coverage audit toward the 500-symbol acceptance criterion and classify provider gaps without fabricating data or increasing concurrency prematurely.

## Bundle backup restoration follow-up — 2026-09-30

- In progress: user-provided `index_backup.js` is now the recovery baseline; source extraction and clean rebuild succeed.
- Open gate: merge the later quote-refresh and overview selector fixes into the recovered baseline, then require full E2E 48/48 before deleting the ignored backup artifact.
- Prevention: retain a hashed recovery artifact outside `dist`, make the extraction script reproducible, and treat any build from a partial/recovered source as blocked until source parity and full E2E pass.

## Rà soát UI/UX theo page — 2026-10-01

- P0 hoàn thành: mobile shell không tràn document, refresh intraday không khóa thao tác, topbar đúng ngữ cảnh, coverage Tổng quan/Danh mục đúng phạm vi và AI Advisor có trạng thái gửi/accessibility rõ.
- Audit regression bao phủ Đăng nhập, Tổng quan, Bảng giá, Danh mục cá nhân, Chi tiết mã, Đề xuất và AI Advisor ở desktop `1440×1000` và mobile `390×844`.
- P1 đang thực hiện: Bảng giá đã thành `MarketBoardPage` do React sở hữu từ tải/render danh sách, navigation/phân trang đến quote lifecycle, loading và toolbar. Sticky mã, cấu hình cột lưu cục bộ và xuất CSV theo trang/bộ lọc được giữ nguyên.
- Đã loại `market-board-tools.js`, `sidebar-toggle-icon.js` và các observer còn lại khỏi source/build. Các enhancement page cũ được kích hoạt bằng sự kiện commit tường minh từ React; release gate kiểm tra marker Bảng giá/sidebar ngay trong bundle chính.
- Bốn lượt cục bộ trên Chrome headless/build production cho p50 quan sát 300 mã `583/556/150 ms`, 500 mã `790/848/193 ms` tương ứng first usable/chuyển page/quote settlement; khoảng lớn nhất vẫn dưới budget regression `10.000/2.000/3.000 ms`. Mock API tức thời và mẫu nhỏ nên chưa coi đây là SLA/p95 production; cần chạy nhiều lượt với API/live data và ghi cấu hình máy.
- P1 hoàn thành lát cắt runtime: đã bỏ `overview-table-actions.js`; `MarketBreadth`, `PortfolioAllocation` và lifecycle phân tích Chi tiết do React sở hữu; request coordination chuyển thành service, không còn observer DOM.
- Đo live 5 mẫu đã có p50/p95: stocks-500 `13/1815 ms`, quotes-40 `848/2633 ms`, first usable `217/311 ms`, chuyển Bảng giá `30198/30376 ms`, quote settlement `3/5 ms`. API stocks/quotes là live; browser fixture hoá auth/endpoint phụ, nên không coi là SLA production.
- P1 tiếp theo: trace outlier chuyển Bảng giá khoảng 30 giây trên phiên authenticated production-like, lặp lại benchmark live rồi mới quyết định server pagination/windowing. Song song tách `App.jsx` thành page modules có tên rõ; chỉ code-split Detail, Đề xuất và Advisor khi source parity/full E2E vẫn xanh.
- P1 checkpoint 2026-10-01: đã có lệnh `npm run measure:live:market-board` để tách list/quote live theo p50/p95 mà không ghi dữ liệu. Năm mẫu API local trả list 40 mã p50/p95 3/130 ms và quote 40 mã 2/5068 ms (cold provider/cache miss 5.068 giây, các lượt cache 1–3 ms, 39/40 quote). Không thêm virtualization hay pagination mới chỉ để che cold quote. Còn thiếu trace navigation trên browser có session production-like hợp lệ; token fixture đã hết hạn và không được thay bằng phiên giả.
- P1 checkpoint 2026-10-01: loading screen đã được hợp nhất thành `PageLoadingOverlay`, dùng cho các page và Bảng giá. Acceptance hiện có: lớp phủ full viewport xuất hiện trong request, khóa pointer/keyboard/scroll, giữ dữ liệu cũ phía sau và khôi phục focus sau settle. Việc khóa có chủ ý áp dụng trong toàn bộ request loading; cần theo dõi trace authenticated để bảo đảm thời lượng cold quote không làm trải nghiệm production bị gián đoạn quá lâu.
- P1 checkpoint 2026-10-01: có lệnh `npm run trace:live:market-board` cho trace browser authenticated, nhận `MARKET_AUTH_TOKEN` duy nhất qua environment và không lưu bí mật. Ở workspace hiện tại lệnh trả `skipped` vì không có token hợp lệ; đây là điều kiện đo còn thiếu, không phải số liệu performance. Chạy trace bằng session thật là gate trước mọi quyết định tối ưu quote lifecycle/provider.
- P1 checkpoint 2026-10-01: bắt đầu tách `App.jsx` theo boundary có contract rõ. `DetailSymbolSearch` đã thành component React riêng, giữ nguyên lookup/navigation và có regression pass. Tiếp theo là hero/analysis của Chi tiết; không di chuyển khối JSX lớn chỉ để đổi vị trí file khi state/API chưa được đóng gói.
- P1 checkpoint 2026-10-01: `DetailHero` đã tách khỏi `App.jsx` với props cho quote/EOD, provider, analysis và action callbacks; lookup/retry regression xanh. Tiếp theo chỉ tách chart/analysis khi contract dữ liệu độc lập rõ, giữ nguyên hành vi request và acceptance tests.
- P1 checkpoint 2026-10-01: `DetailPriceVolumeChart` đã thành component React riêng, giữ data gap, Intraday overlay, tooltip/ARIA và chart summary; 4 regression chart xanh. Dọn `rv` dead source là change riêng có kiểm chứng, sau đó mới tiếp tục panel analysis.
- P1 checkpoint 2026-10-01: đã xoá `rv` dead source; source chỉ còn một implementation chart trong `DetailPriceVolumeChart`, build và 4 regression chart xanh. Tiếp theo là panel analysis theo contract dữ liệu rõ.
- P1 checkpoint 2026-10-01: `DetailAnalysisStatus` đã tách header/status/error/empty của panel analysis; 4 workflow analysis xanh. Nội dung guidance/risk vẫn ở container cho đến khi section contract được đóng gói riêng.
- P1 điều chỉnh 2026-10-01: Summary/indicator JSX trong `App.jsx` có continuation giữa các lời gọi JSX phục hồi; extraction từng đoạn làm build fail và đã được hoàn nguyên trước khi phát hành. Phụ thuộc mới cho tách guidance/risk là migration syntax-aware hoặc chuẩn hoá trọn boundary, không thay đoạn nhỏ.
- P1 checkpoint 2026-10-01: đã chuẩn hoá toàn bộ `App.jsx` bằng Babel AST với lệnh kiểm tra lặp lại được `npm run normalize:recovered-source -- --check`; build sạch và workflow 19/19 xanh. Bước kế tiếp là tách đúng một section guidance hoặc risk bằng boundary AST rõ ràng, giữ nguyên contract/lifecycle và chỉ mở rộng sau targeted regression.
- P1 checkpoint 2026-10-01: `DetailExpertGuidance` đã tách theo một AST boundary, giữ toàn bộ presentation của expert guidance trong component và không chạm request/state lifecycle. Page audit desktop/mobile cùng regression analysis đã xanh. Tiếp theo là Risk Plan; contract phải nhận guidance/risk data đã xác thực, `Gh` normalization và price/translation formatter từ container.
- P1 checkpoint 2026-10-01: `DetailRiskPlan` đã tách theo một AST boundary với `Gh` normalization và price formatter được truyền tường minh; regression kiểm tra adjustment stop/take theo giá hiện hành, audit desktop/mobile xanh. Bước presentation cuối có thể tách là External Factors/citation list khi contract link/source được giữ nguyên; song song, trace Bảng giá authenticated vẫn là performance gate trước mọi thay đổi provider/lifecycle.
- P1 checkpoint 2026-10-01: `DetailExternalFactors` đã khôi phục và tách citation/status nguồn, sử dụng lại `SourceLink` để giữ chính sách URL an toàn. Một regression từ migration Risk Plan đã được phát hiện và sửa trước commit; workflow giờ kiểm tra citation URL. Presentation của Analysis không còn là ưu tiên refactor; trace Bảng giá authenticated là gate tiếp theo trước tối ưu lifecycle/provider.
- P1 checkpoint 2026-10-01: trace authenticated đã xác nhận tự bỏ qua an toàn khi thiếu `MARKET_AUTH_TOKEN`; API-only live sample mới là list p50/p95 3/349 ms, quote p50/p95 830/867 ms với 39/40 quote. Số liệu không thay thế trace browser/session thật. Gate và thứ tự quyết định lifecycle/provider không đổi.
- P2 checkpoint 2026-10-01: hoàn thiện Mốc 1 Market Breadth bằng timestamp quote gần nhất và nhãn nguồn Intraday/EOD trên Top tăng/giảm/khối lượng; scope sàn và navigation Chi tiết giữ nguyên, regression liên quan xanh. Mốc 2 phụ thuộc endpoint aggregate liên tục theo session; không triển khai timeline từ snapshot rời rạc.
- P2 checkpoint 2026-10-01: backend đã có endpoint breadth history giới hạn 1–60 session, cache 5 phút và contract continuity/gap; A/D dùng EOD close so với phiên lưu trước, không nội suy và không giả lập traded value. Backend 114/114 cùng targeted 15/15 xanh. Bước kế tiếp là live-smoke sau restart/deploy; UI timeline chỉ bật cho range có continuity thực tế.
- P2 checkpoint 2026-10-01: live-smoke 12 scope/range đều continuous; UI đã có timeline A/D tích lũy 1D/5D/20D, coverage và gate không vẽ chuỗi gapped/insufficient. Build, Tổng quan 7/7 và audit desktop/mobile 2/2 xanh. Phần Mốc 2 còn lại là historical volume breadth/divergence, phụ thuộc benchmark/index series; không suy diễn trước contract.
- P2 checkpoint 2026-10-01: Danh mục đã có lát cắt quản lý ledger đầu tiên. `GET /api/portfolio` trả lịch sử giao dịch đã chuẩn hóa trong đúng scope người dùng; UI hiển thị 10 dòng mới nhất, cho mở rộng và xuất toàn bộ CSV UTF-8 có chống formula injection. Không đổi schema hay phép tính vị thế. Backend 116/116, frontend service 20/20, Danh mục 8/8, audit desktop/mobile 2/2 và production build xanh.
- P2 checkpoint 2026-10-01: import ledger CSV đã có preview không ghi, lỗi theo dòng, giới hạn 500 dòng, kiểm tra mã/số/ngày/trùng/timeline SELL và commit revalidation trong một transaction với một `bulkCreate`. UI có file mẫu, khóa commit khi preview lỗi và refresh ledger sau thành công. Backend 124/124, frontend service 22/22, Danh mục 10/10, audit desktop/mobile 2/2 và build xanh; chưa thực hiện import ghi thật trên database phát triển vì không dùng dữ liệu người dùng làm smoke test.
- P2 checkpoint 2026-10-01: ledger hỗ trợ sửa và xóa qua dialog xác nhận. Backend khóa portfolio cùng toàn bộ ledger của JWT hiện tại, dựng timeline sau mutation, từ chối SELL âm lịch sử rồi mới update/destroy trong cùng Sequelize transaction; xóa còn yêu cầu `confirmed=true` ở API. Giao dịch gắn Đề xuất giữ nguyên mã/provenance và loại Mua. Backend 129/129, frontend service 22/22, Danh mục 12/12, audit desktop/mobile và full Playwright 67/67, production build xanh; không mutation dữ liệu thật khi smoke-check.
- P2 checkpoint 2026-10-02: Danh mục có bộ lọc React **Đang mở/Đã đóng**. Backend suy ra `closed_positions` và `position_counts` từ cùng ledger đã xác thực; vị thế đóng chỉ hiển thị lãi/lỗ đã thực hiện và thời điểm đóng gần nhất, không gán giá trị thị trường/lãi lỗ chưa thực hiện giả. Backend 131/131, frontend service/encoding 22/22, Danh mục 13/13 và production build xanh.
- P2 checkpoint 2026-10-02: phép đo read-only trên database phát triển có 2 portfolio, 34 giao dịch, p50 2, p95/max 32, một portfolio trên 10 và không portfolio nào trên 50 dòng. UI mặc định chỉ render 10 dòng và mở rộng theo yêu cầu, nên chưa thêm server pagination khi chưa có bằng chứng quy mô.
- P2 checkpoint 2026-10-02: Đề xuất có component so sánh hai snapshot đã lưu, tự chọn hai bản mới nhất và trình bày thay đổi trọng số, mã thêm/giữ/bớt, hạng và điểm. Đây là phép so sánh deterministic trên snapshot bất biến, không chạy lại model hoặc ghi dữ liệu. Frontend service **23/23**, targeted Đề xuất **1/1**, full Playwright **68/68** và production build xanh.
- P2 checkpoint 2026-10-02: `AdvisorWorkspace` sở hữu hội thoại rule-based và cho chọn ngữ cảnh Mã đang chọn/Danh mục/Thị trường. Mỗi phản hồi lưu nhãn ngữ cảnh và citation tương ứng; URL chỉ render thành link khi là HTTP(S), nguồn nội bộ vẫn được ghi nhãn nhưng không giả link. Frontend service **25/25**, page audit desktop/mobile **2/2** và production build xanh.
- P2 checkpoint 2026-10-02: Chi tiết mã có mục lục React dính cho Tổng quan/Biểu đồ/Phân tích. Action cuộn đúng section, chuyển focus tới đích và công bố `aria-current`; mobile chia đều ba action, không làm tràn viewport. Unit/service **25/25**, regression loading/detail cùng audit desktop/mobile **25/25** và production build xanh.
- P2 checkpoint 2026-10-02: điểm giá và cột khối lượng trên chart Chi tiết dùng tooltip React chung cho hover/focus, trình bày thời điểm, OHLC, khối lượng và provider. Arrow Left/Right di chuyển tuần tự trong cùng lớp điểm, Escape đóng tooltip; `aria-describedby` liên kết đúng điểm đang focus. Unit/service **25/25**, regression chart/audit **25/25** và production build xanh.
- P2 checkpoint 2026-10-02: chart Chi tiết có zoom in/out và pan Cũ hơn/Mới hơn trên đúng các phiên đã tải, kèm nhãn cửa sổ `Phiên x–y/tổng` và action khóa tại biên. Helper thuần clamp size/offset để không tạo phiên giả; thay đổi range trở về cửa sổ mới nhất. Unit/service **27/27**, regression chart/audit **26/26** và production build xanh.
- P2 checkpoint 2026-10-02: auth dùng `AuthPasswordField` cho cả đăng nhập/đăng ký, có toggle hiện/ẩn với `aria-pressed`, cảnh báo Caps Lock, mô tả yêu cầu tối thiểu và `current-password`/`new-password` autocomplete đúng ngữ cảnh. Unit/service **27/27**, page audit desktop/mobile **2/2** và production build xanh.
- P2 checkpoint 2026-10-02: lỗi auth dùng `AuthErrorMessage` với tiêu đề Đăng nhập/Đăng ký, `role=alert`, `aria-live=assertive`, `aria-atomic` và focus lập trình khi message xuất hiện. Input được giữ sau lỗi; đổi chế độ hoặc logout dọn lỗi cũ. Unit/service **27/27**, targeted auth/audit **3/3** và production build xanh.
- P2 checkpoint 2026-10-02: form auth có submission state riêng và guard chống gửi lặp. Trong request, form công bố `aria-busy`, live status theo mode, đổi nhãn submit và khóa email/password/toggle/chuyển mode; `finally` luôn mở lại form khi lỗi. E2E giữ request pending để xác nhận đúng một request; targeted auth/audit **3/3**, unit/service **27/27** và production build xanh.
- P2 còn lại sau P1: historical volume breadth/divergence, chart benchmark, drill-down evidence Đề xuất khi có provenance nguồn và quản lý nhiều hội thoại Advisor khi có API persistence/retention. Phân trang ledger bị hoãn theo bằng chứng quy mô hiện tại; đo lại khi p95 vượt 50 hoặc chi phí render thực tế vượt budget. Hạng mục cấu hình cột/sticky/export Bảng giá cùng history/import/export/edit/delete ledger, lọc vị thế đóng, điều hướng/tooltip/zoom Chi tiết, so sánh snapshot và Advisor context/citation đã có bản đầu; server-side export ngoài trang Bảng giá hiện tại chưa triển khai.
- Chi tiết, tiêu chí nghiệm thu và giới hạn nằm tại [UI_UX_AUDIT](UI_UX_AUDIT.md).
