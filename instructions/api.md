# API-Football Capabilities and Limitations

This document outlines the features and constraints of using API-Football for a football application like Last Man Standing.

## Fixtures and Results Data 📅⚽

*   **Match Schedules:** Provides comprehensive fixture data including date, kickoff time (with timezone), teams, and venue details.
    *   Example `date`: `"2020-02-06T14:00:00+00:00"` with a specified timezone.
*   **Home/Away Teams:** Fixtures detail home and away teams with IDs, names, and logos.
    *   Example structure: `teams.home` and `teams.away` objects containing `id`, `name`, `logo` (URL).
    *   The `/teams` endpoint can provide additional details like team codes and home venues if needed.
*   **Live Status Updates:** Each fixture has a status (short code and description) indicating its state (e.g., Not Started, 1st Half, Halftime, Finished, Postponed).
    *   Example: `"status": {"long": "Halftime", "short": "HT", "elapsed": 45}`.
    *   Common short codes: `NS`, `1H`, `2H`, `HT`, `FT`, `AET`, `PEN`, `PST`, `CANC`.
*   **Scores and Outcomes:** Provides real-time scores and final results.
    *   Live score example: `"goals": {"home": 0, "away": 1}`.
    *   Final score under `score.fulltime`.
    *   Winner indication: Each team object includes a `winner` boolean (`true`, `false`, or `null` for draw).

**Summary:** Essential fixture info (date/time, teams, status, scores) is fully supported.

## Round Structure and "Gameweeks" 🗓️

*   **League Rounds:** The API recognizes seasonal rounds (often equivalent to gameweeks, e.g., Premier League has 38).
*   **Rounds Endpoint:** `GET /fixtures/rounds?league={LEAGUE_ID}&season={YEAR}` returns all rounds/matchdays for a league/season (e.g., "Regular Season - Round 5").
*   **Fetching Fixtures by Round:** The `/fixtures` endpoint accepts a `round` parameter (e.g., `round="Regular Season - 5"`) to get matches for a specific gameweek.
*   **Deadlines:** API-Football **does not** provide explicit round deadline timestamps.
    *   **Derivation:** You can calculate a deadline based on fixture data (e.g., the kickoff time of the first match in the round).

**Summary:** Round structures are supported, but deadlines need to be calculated based on fixture times.

## Team and Competition Data 🏟️

*   **Competitions (Leagues):** Detailed info available via the `/leagues` endpoint (query by country or ID, e.g., Premier League ID 39). Provides name, country, logo/flag.
*   **Teams:** Detailed info available via the `/teams` endpoint (query by league and season, e.g., `/teams?league=39&season=2024`). Provides ID, name, code, country, founded year, logo URL, venue info.
    *   Team info (ID, name, logo) is also embedded within fixture data.
*   **Linking Teams to Leagues:** Querying teams via `/teams?league=...` inherently links them. Team logos are provided as direct URLs.

**Summary:** Comprehensive team and competition data is available, including unique IDs and logos.

## Historical Data and Live Updates 📖📊

*   **Past Seasons:** The API offers historical data (fixtures, results, standings) for previous seasons, ideal for stats.
    *   **Note:** Free plan limits access to historical data; paid plans offer full access.
*   **Live Scores:** Real-time score updates and in-game events are available on all plans (updates potentially every 15 seconds).
    *   Use the `/livescore` endpoint or query specific fixtures periodically.
    *   Basic fixture data (`goals`, `status`) often suffices for simple score display.
*   **Coverage Depth:** Major leagues (like Premier League) typically have full live coverage (scores, events, lineups). Lower-tier leagues might only update final scores.
*   **Data Completeness:** Covers 1,100+ leagues/cups. Major leagues like EPL have comprehensive data.
    *   Potential "gaps" relate to rescheduled/postponed matches (status `PST`, `CANC`) or unconfirmed schedules (`TBD`). Data updates once confirmed.

**Summary:** Robust historical and live data support for major leagues.

## Rate Limits and Pricing 💰📈

*   **Free Plan:** 100 requests/day. Access to core endpoints for current/recent seasons. Live data included, but limited by daily quota.
*   **Pro Plan ($19/month):** 7,500 requests/day. Full historical data access. Suitable for moderate app usage.
*   **Ultra Plan ($29/month):** 75,000 requests/day. For high-volume needs.
*   **Mega Plan ($39/month):** 150,000 requests/day. For very large-scale applications.
*   **Notes:**
    *   Paid plans remove historical season restrictions.
    *   Daily quotas are the main limit; per-minute limits aren't strictly documented.
    *   Consider caching data or using Supabase storage (Option A below) to manage limits.

**Summary:** Tiered pricing based on daily API call limits. Caching is recommended to stay within limits, especially on lower tiers.

## Option A (Storing Data) vs Option B (Live Fetching) 🔄

### Option A – Store Fixtures/Results in Supabase 📥

*   **How:** Import/sync data from API-Football into your Supabase database periodically (e.g., via cron jobs).
*   **Feasibility:** Fully supported. Batch requests are possible.
*   **Pros:**
    *   Minimizes runtime API calls (read from fast, unlimited Supabase DB).
    *   Essential for staying within API rate limits, especially free/low tiers.
    *   Allows adding custom fields (e.g., deadline) and joining data easily (e.g., user picks vs results).
    *   App functions even if the API is temporarily down.
    *   Recommended best practice by the API provider for efficiency.
*   **Cons:**
    *   Requires implementing data synchronization logic (added complexity).
    *   Initial data load can consume significant API calls (can be managed).
    *   Potential for data staleness if sync jobs fail or are infrequent.

### Option B – Live Fetch On-Demand 🌐

*   **How:** Query API-Football in real time whenever the app needs data (e.g., viewing fixtures, checking live scores). Supabase stores mainly user data.
*   **Feasibility:** Supported due to flexible query parameters (fetch by date, round, ID).
*   **Pros:**
    *   Simpler implementation (no sync logic).
    *   Data is always fresh.
    *   Less initial setup.
*   **Cons:**
    *   Heavier API usage, quickly hits rate limits (especially free tier).
    *   App performance/availability depends directly on API speed/uptime.
    *   Potential latency compared to local DB queries.
    *   Complex queries (e.g., checking all user picks) can require many API calls.

### Hybrid Approach

*   Store relatively static data (e.g., fixture list, teams) in Supabase.
*   Fetch dynamic data (e.g., live scores) on demand from the API.

### Making the Choice

*   **Option A (Store)** is generally recommended for apps with relational logic (like user picks vs results), frequent data reads, or when needing to stay within stricter API limits. The sync effort often pays off in performance and cost-effectiveness.
*   **Option B (Live)** can work for simpler apps with low usage or where absolute real-time data is paramount for *all* data points, provided API limits are managed (likely requires a paid plan).

**Summary:** Both are viable. Option A is often better for complex apps or managing API costs/limits. A hybrid approach is also common.

## Conclusion ✅

API-Football provides the necessary data (fixtures, results, rounds, teams, live scores, historical data) for a comprehensive football app like Last Man Standing, especially for major leagues. Choose your data fetching strategy (store vs live vs hybrid) based on your application's complexity, scale, real-time needs, and API plan constraints. Caching/storing data in Supabase is often beneficial for performance and managing API usage.