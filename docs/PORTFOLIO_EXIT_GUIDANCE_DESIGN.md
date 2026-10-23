# Exit guidance for held positions — proposed design

## Decision and boundary

This document proposes a separate, explainable **exit-guidance** capability for positions the signed-in user already holds. It answers “should this position be reviewed for profit-taking or loss control?”; it does not place orders, modify transactions, send notifications, claim a target execution price, or change the existing buy-ranking model.

The first release is a research/shadow capability. It is deliberately not a personalized investment recommendation or a guarantee that a stop will execute at the displayed level. A stop is only a trigger policy; in a fast-moving market an execution price can differ materially from the trigger, and a stop-limit can instead remain unfilled. [SEC: Stop Order](https://www.sec.gov/answers/stopord.htm)

## Problem, users, and success criteria

| Item | Decision |
| --- | --- |
| Primary user | A logged-in user who has recorded BUY/SELL transactions and currently holds a positive quantity. |
| Problem | The app ranks possible buys but gives no position-specific, data-provenance-aware way to review downside protection or profit protection. |
| Main flow | Open **Danh mục** → read one exit state per open position → inspect price/cost basis, as-of, model inputs and reasons → optionally open the existing position detail or record a manual SELL. |
| Out of scope | Auto-trading, broker integration, notifications, real-time stop monitoring, suggestions for non-held symbols, tax/fees optimization, and model calibration from unrelated buy outcomes. |
| Success | A user can distinguish `cut_loss`, `take_profit_review`, `trailing_protect`, `hold/review`, and `unavailable`; every actionable-looking state has one immutable EOD snapshot and reproducible reasons. |

The current app has portfolio cost/quantity from transactions, EOD series with intraday display fallback, and a symbol-level `risk_plan`. It does **not** yet retain an entry-linked exit plan, a market-regime contract suitable for signals, or compatible measured exit outcomes. Therefore no existing “take profit” number should simply be relabelled a sell recommendation.

## Model review and selected approach

| Option | Value | Main problem | Decision |
| --- | --- | --- | --- |
| Fixed percentage stop/target | Small and simple | Ignores volatility, price regime and position cost; unstable across symbols | Reject |
| Reuse current `risk_plan` levels | Existing code | Calculated from latest symbol price, not the user's cost/entry or a frozen position plan | Reject as exit signal; retain as detail-page education |
| Pure ML/GARCH classifier | Can model changing volatility; GARCH is a standard conditional-variance family [Bollerslev (1986)](https://www.sciencedirect.com/science/article/pii/0304407686900631/pdf?md5=82d024e6d388b7ba06a8d7574133206a&pid=1-s2.0-0304407686900631-main.pdf) | No labelled exit cohort, data coverage is currently partial, difficult to explain and validate | Defer |
| Deterministic volatility + trend rules, shadow evaluated | Reproducible, position-aware, works from stored daily EOD and exposes uncertainty | Needs an immutable snapshot and enough post-signal sessions before any performance claim | **Choose for v1** |

Research on stop-loss policies does not support assuming they always add value: their effect depends on the return process and can differ under momentum versus a random-walk-like process. [Kaminski & Lo](https://dspace.mit.edu/entities/publication/bb69ca4b-0cdc-487f-831d-63b2e84fafee) This is why v1 uses the output as an explainable review state and requires separate shadow evaluation rather than “self-improving” from every observed trade.

## Proposed v1 model contract

### Inputs and data gate

For each open position, calculate from one frozen daily EOD session only:

1. User-owned position quantity and average cost, reconstructed by the existing portfolio ledger. A position with no valid positive cost is `unavailable`.
2. At least 60 distinct same-provider daily EOD closes ending at `as_of`; ATR(14), SMA(20), SMA(50), and RSI(14) are derived from that same series. When a trailing stop needs the highest close since the effective entry session, the stored series must also cover that entry session continuously. A bounded recent window that begins after entry is `unavailable`; it must not infer a high-water mark from partial history. A later version may use an independently sealed, entry-linked high-water record, but may not silently substitute one.
3. Positive close, currency/price-unit compatibility, provider, interval, price-adjustment basis and session date. Missing, stale or mixed-basis inputs fail closed.
4. An optional market-regime overlay only when a separately defined breadth/index dataset has same-session provenance and passes its own coverage gate. If unavailable, the overlay is `unavailable`; it must not fabricate a market trend or by itself create a sell state.

The v1 trigger ladder is deterministic, versioned as `position_exit_rule_v1`, and parameter values are persisted with the snapshot:

1. **`cut_loss`** — EOD close is at or below the active protective stop. Initial stop is entry cost minus 2 ATR(14); after the position reaches +2 ATR from cost, the active stop may trail the highest close since entry by 3 ATR, never below cost. Exact multipliers are candidate parameters, not accepted defaults until shadow evidence exists.
2. **`trailing_protect`** — the trailing stop is armed and price is within 0.5 ATR above it, or trend confirmation has deteriorated (close below SMA20 and bearish momentum). State asks the user to review protection; it does not say an order was executed.
3. **`take_profit_review`** — unrealized gain reaches +3 ATR from cost **and** momentum weakens (RSI leaves an overbought region or close falls below SMA20). It suggests reviewing partial profit-taking; hitting a target alone is not sufficient.
4. **`hold`** — no exit trigger; show active stop/target bands only as research reference.
5. **`unavailable`** — any data, ownership, freshness, adjustment-basis, or model-integrity gate fails.

If more than one rule fires, priority is `cut_loss` → `trailing_protect` → `take_profit_review` → `hold`. The output must include `as_of`, source/provider, reference price, average cost, active levels, indicator values, input coverage, model version, reasons, and `research_only: true`. It must never use an intraday tick to change the EOD trigger; an intraday quote may appear separately as a display-only current quote with its own timestamp.

## Persistence, API, and evaluation

Create a separate immutable `position_exit_runs` / `position_exit_guidance` lineage rather than modifying `recommendation_runs` or calibration tables. A run contains user/portfolio ownership, EOD session, position ledger digest, price-input provenance/hash, model/parameters, result state and reasons. It must be idempotent by `(portfolio, as_of, model, input_hash)`.

Proposed read contract: `GET /api/portfolio/exit-guidance` returns only the authenticated user's open positions plus their latest same-session guidance. Proposed shadow-generation job runs after EOD ingestion only when the per-position data gate passes. The read endpoint does not generate, mutate, call a provider, or auto-sell.

Evaluation is model-specific and separate from buy recommendation outcomes. For each frozen signal, record 1/5/20 distinct subsequent EOD sessions, maximum adverse/favourable excursion, whether the stop/target boundary was crossed, and an explicitly defined counterfactual baseline. Do not call a signal “correct” merely because a later close is lower/higher. Publish action counts, coverage, pending/excluded cohorts and confidence intervals only after a predeclared minimum sample and stable out-of-sample window; no parameter tuning or automatic calibration before that gate.

The original pure evaluator `position_exit_shadow_evaluation_v1` remains a legacy contract. Runtime now uses `position_exit_shadow_evaluation_v2` with independent 1/5/20-session maturity and migration `051`. Its output contains observations, close-based MAE/MFE and boundary crossings without a correctness score or parameter mutation. Local opt-in persistence is available; publication of measured performance still requires a valid cohort and declared baseline.

## UI/UX

### Evaluation lifecycle correction (2026-10-23)

The evaluation consumer needs reproducible maturity per horizon. A single immutable pending row prevents future maturity, so the selected approach is append-only results per `(guidance_id, horizon_days, schema_version)` for 1/5/20 sessions. Pending is a transient runner count and is not sealed in v2. Existing v1 records remain audit history. Each horizon uses only its first N distinct Vietnam EOD sessions after the signal date, with provider/basis agreement and payload hash verification. Excursions are close-based and include the zero reference baseline. No public accuracy claim or automatic calibration is introduced. Query budget: up to 100 incomplete guidance records and 20 deduplicated subsequent daily rows each; no provider requests or browser polling. Acceptance: pending-to-mature reruns, idempotent/concurrent writes, exact-day exclusion and independent horizon windows must pass tests before local migration and execution.

Place this in **Danh mục**, next to each existing open position, not inside the buy-focused **Đề xuất** page:

- A compact, semantic status chip: `Cắt lỗ — cần xem xét`, `Bảo vệ lợi nhuận — cần xem xét`, `Chốt lời từng phần — cần xem xét`, `Theo dõi`, or `Chưa đủ dữ liệu`.
- A one-line reason plus `as_of` and source. No red/green wording that implies an executed trade or guaranteed return.
- “Xem cơ sở” expands an accessible detail panel containing cost basis, EOD reference, stop/target bands, indicators, market-overlay availability, data freshness, model version and disclaimer. It is keyboard-operable, has an announced loading/error state, and has a compact mobile layout.
- A SELL transaction remains an explicit, existing user action with confirmation. Guidance cannot prefill or submit it. A later phase may let the user attach a guidance snapshot to a manual sell for evaluation, subject to clear consent.
- Empty state: no open positions. Unavailable state: preserve the holding and explain which input is missing; never replace it with a generic SELL.

## Performance and privacy budget

- One authenticated, bounded portfolio request; maximum 100 open positions and 60 EOD rows per position (6,000 rows) in v1. Query by held `stock_id`, `interval='1d'`, ordered session date, with no provider bridge and no browser polling.
- Response contains a compact per-position summary; detailed evidence is fetched only on expansion if measurements show the initial payload needs splitting. No cache/pagination/virtualization is added before a baseline supports it.
- Before UI release, record five-sample endpoint and browser measurements (request count, payload size, p50/p95 and first meaningful position render). Initial acceptance target: one API request, no provider request, <=100 kB summary payload and no measured regression of the current portfolio screen; revise targets from the recorded baseline rather than claiming unmeasured performance.
- All records are scoped to `user_id`/portfolio ownership; no other user's positions, cost basis or exit history can be queried. Keep only the minimum immutable evidence needed for evaluation and never persist quote-provider payloads unnecessarily.

## Delivery plan and gates

1. **Data audit/design lock:** audit price adjustment/unit, distinct Vietnam sessions, existing average-cost semantics, corporate-action effect and market-overlay availability for held symbols. Finalize model parameters and counterfactual before code.
2. **Pure engine and contracts:** implement deterministic calculator plus exhaustive edge cases (no cost, partial history, split/adjustment mismatch, stale EOD, gap session, multiple lots, overlapping triggers). No database mutation or UI yet.
3. **Schema and shadow ledger:** add migration, ownership constraints, input/hash integrity, idempotent EOD job and read-only API. Gate all writes behind EOD/data completeness and record excluded runs.
4. **Portfolio UI:** add loading/empty/error/unavailable/available states, accessible disclosure and mobile layout. Run build, contract tests and measured browser baseline.
5. **Shadow evaluation:** collect declared horizons and publish coverage/pending/excluded counts. Compare fixed parameters out of sample against a predeclared baseline; only then decide whether any language can move beyond “nghiên cứu”.

Not planned without new authority: notifications, intraday triggers, broker execution, ML/GARCH, automatic parameter changes, or turning the existing buy-calibration outcomes into exit-model evidence.
