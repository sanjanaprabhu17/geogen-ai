# GeoGen AI — One-Pass IDE Build Prompt

> **How to use:** Put this file in the root of your existing project (or paste its complete contents into your IDE agent such as Cursor, Windsurf, Claude Code, or VS Code agent). Then ask the IDE to execute the instructions from top to bottom. The IDE must inspect the repository first, implement the application in the existing project, run it, test it, fix failures, and leave a working local prototype.
>
> **Important:** This is an implementation prompt for your IDE. Do not treat this Markdown file as the application itself. Do not create a second demo website or a disconnected mockup.

---

## 0. Your role and final objective

Act as a senior full-stack engineer, product designer, AI/NLP engineer, QA engineer, and technical writer.

Build a complete, polished, demonstrable web application named **GeoGen AI — AI-Powered Location & Trip Intelligence Platform**.

The user describes a trip in natural language, for example:

> “Plan a 2-day budget food and heritage trip in Mysuru for two people, under ₹4,000, using public transport.”

The application should:

1. Understand the request and extract useful entities and constraints.
2. Find real places using Google Maps Platform.
3. Retrieve place details, ratings, photos, opening hours, and reviews where the API and permissions allow.
4. Calculate real route distances and travel durations where available.
5. Generate a practical, structured itinerary with Gemini.
6. Analyse available reviews using an NLP sentiment pipeline.
7. Display places and routes on an interactive map.
8. Let users inspect a place and its review analysis.
9. Generate and download a clean PDF trip report.
10. Work reliably when API credentials are absent by using an explicitly labelled demo mode with realistic seeded sample data. Never pretend demo data is live data.

The result must be a working end-to-end prototype, not merely a landing page, static UI, or collection of nonfunctional buttons.

**Do not stop after planning.** Inspect, implement, run, test, debug, and document the project. Do not ask the user to manually perform steps that you can perform in the repository.

---

## 1. First inspect the existing repository

Before changing anything:

- Inspect the complete folder structure, package files, existing source code, environment files, assets, scripts, and README.
- Identify the existing framework, package manager, build system, routing approach, and styling conventions.
- Check whether any useful components, API integrations, maps, authentication, database, or existing UI are already present.
- Preserve useful working code and assets. Do not overwrite the project blindly.
- Do not delete existing user data, environment files, or useful project functionality.
- If the repository is empty, initialise a suitable project.
- If an application already exists, adapt it rather than creating a competing app in another folder.
- Make a short implementation plan, then continue immediately with implementation.

### Preferred stack (adapt to the repository when sensible)

- Frontend: React + TypeScript + Vite.
- Styling: Tailwind CSS if already present or easy to add; otherwise use clean CSS modules/global CSS.
- Backend: Python FastAPI.
- Data validation: Pydantic.
- AI: Gemini API, using a current supported Gemini Flash model verified against the official SDK documentation at implementation time.
- Maps: Google Maps JavaScript API, Places API (New), Routes API, and Maps Static API where enabled.
- NLP: spaCy for lightweight entity extraction; a Hugging Face sentiment pipeline or a suitable lightweight transformer for sentiment. Use a deterministic fallback when model installation or network access is unavailable.
- PDF: ReportLab or WeasyPrint. Prefer ReportLab if system dependencies make WeasyPrint unreliable.
- Tests: pytest for backend and Vitest/React Testing Library for frontend if compatible with the project.

Do not introduce a complex microservice architecture. Keep the code understandable and easy for a student to explain.

---

## 2. Non-negotiable engineering rules

1. Build a real full-stack application with a clear frontend/backend boundary.
2. Keep secrets on the backend. Never expose the Gemini API key or unrestricted server credentials in browser code.
3. A Google Maps browser key may be used in the frontend only when restricted by HTTP referrer and enabled APIs. Keep server-side keys separate.
4. Read credentials from environment variables. Never hardcode secrets.
5. Provide `.env.example` with placeholder values only. Never overwrite a real `.env`.
6. Validate all backend inputs and handle API errors, timeouts, quota limits, missing fields, and empty results.
7. Do not fabricate ratings, review counts, opening hours, photos, live traffic, coordinates, travel durations, or route availability.
8. Mark every result as **Live**, **Demo**, or **Unavailable** as appropriate.
9. If a provider does not return reviews or photos for a place, explain that the data is unavailable. Do not invent review text.
10. AI output must be grounded in the place and route data actually returned by providers. Tell the model not to invent places, coordinates, opening hours, ratings, or travel times.
11. Keep a clear separation between provider data, NLP-derived scores, and AI-generated recommendations.
12. Never claim that a route duration is real-time traffic unless the Routes API response actually includes traffic-aware duration and the selected routing preference supports it.
13. Do not call an LLM for simple deterministic operations that can be handled by normal code.
14. Use accessible controls, semantic HTML, keyboard navigation, visible focus states, and responsive layouts.
15. Do not leave placeholder buttons, fake links, dead navigation, TODO-only features, or nonfunctional controls.
16. If an API integration cannot be completed because credentials or billing are missing, implement and test the integration boundary and provide a clearly labelled demo fallback.
17. Do not claim that a test passed unless it was actually run and passed.
18. Keep the implementation understandable: small modules, clear names, comments only where useful, and no unnecessary abstractions.

---

## 3. Product scope — exactly four main pages

Use a compact application with four main navigation destinations. A shared header/sidebar and shared components are fine. Do not expand this into a bloated admin dashboard or add unrelated pages.

### Page 1 — Home & Prompt Hub

Purpose: collect the user's natural-language trip request.

Required UI:

- GeoGen AI logo/wordmark and concise product tagline.
- Main prompt composer with a large, inviting input area.
- Example prompt chips:
  - “2-day heritage trip in Mysuru”
  - “Budget-friendly food tour in Bengaluru”
  - “Quiet nature weekend near Hubballi”
  - “One-day family trip with public transport”
- Quick constraint controls for:
  - Destination (optional if extracted from prompt)
  - Number of days
  - Number of travellers
  - Total or per-person budget (make the budget type explicit)
  - Travel mode: driving, walking, cycling, or public transport where supported
  - Interests/vibe: food, heritage, nature, shopping, adventure, family, photography, relaxed
- Recent searches stored locally in the browser, with a clear-history action.
- A primary **Generate my trip** action.
- Loading state with meaningful stages: understanding request, finding places, checking routes, analysing reviews, building itinerary.
- Inline validation and useful error messages.

Core GenAI/NLP:

- Parse the natural-language request before querying Maps.
- Extract destination, dates/duration, budget, currency, traveller count, interests, transport mode, and other useful constraints.
- Display extracted constraints in an editable confirmation panel before generating, or allow users to edit them in the planner.
- Never silently assume whether a budget is per person or total. If unclear, ask a concise clarification in the UI or label the assumption clearly and allow editing.

### Page 2 — Interactive Map & Trip Planner

Purpose: show the generated itinerary and real places spatially.

Required layout:

- Desktop: split view with map and itinerary/place list.
- Mobile: map/list toggle or stacked layout.
- Interactive Google Map with custom markers and numbered day/stop labels.
- Fit map bounds to the selected itinerary.
- Marker click selects the corresponding place card.
- Place card click opens the place analyser.
- Show route lines only when route geometry is available from the provider.
- Display route distance and duration for each leg, with units and source status.
- Show day-by-day itinerary with:
  - Day title and date if known.
  - Stop order.
  - Suggested arrival/visit duration only when clearly presented as an AI estimate.
  - Place name, category, address, rating if returned, and opening hours if returned.
  - Route mode and travel estimate between stops.
  - AI explanation for why the stop matches the user's request.
- Provide actions to:
  - Reorder stops.
  - Remove a stop.
  - Add a place from search results.
  - Regenerate the itinerary.
  - Change the transport mode.
  - Return to the prompt hub without losing the current plan.
- Recalculate routes after changes when the provider is configured.
- Display a visible notice when any route is estimated or demo-generated.

Important route logic:

- Use Google Routes API for route calculations when configured.
- Prefer traffic-aware driving estimates only when supported and requested.
- For walking/cycling, use supported route travel modes.
- Public transport support depends on provider coverage; if unavailable, say so and do not silently substitute driving.
- Compare routes only when comparable route alternatives are returned. Do not label a route “fastest” or “shortest” without calculating the comparison.
- If multiple route alternatives are unavailable, show the single available route without inventing alternatives.
- Display units consistently (km, min, hours).
- Preserve precision internally. Format values for display without hiding meaningful differences (e.g. 0.03 km must not become “0 km shorter”; show “30 m shorter” or “0.03 km shorter”).

### Page 3 — NLP Review & Place Analyser

Purpose: allow users to inspect a selected place and understand its reviews.

Required UI:

- Place name, category, address, rating and review count when returned.
- Place photos when returned and permitted.
- Opening hours when returned.
- A sentiment visualisation with positive, neutral, and negative percentages.
- A clear statement of how many actual reviews were analysed.
- Extracted common positive themes and negative themes.
- Pros and cons generated from the available review text.
- A concise three-line AI summary.
- Review snippets with source attribution when permitted by the provider's terms.
- Filters for sentiment category if review data is available.
- A clear unavailable state when the API returns no review data.

NLP pipeline:

1. Obtain review text only from the configured provider and within its permitted use.
2. Clean text conservatively: remove empty entries and obvious duplicate records; do not change the meaning.
3. Run sentiment classification into Positive, Neutral, or Negative.
4. Aggregate percentages from the classified review count. Percentages must total 100% (allow normal rounding).
5. Extract recurring aspects/themes from the actual review text.
6. Use Gemini to summarise the evidence and explain common themes, but do not let it invent evidence.
7. Clearly label sentiment as **model-estimated sentiment**, not an official Google rating.
8. Show model name/version where practical and make clear that sentiment can be imperfect, especially for sarcasm, mixed-language reviews, and short text.

Fallback:

- If the transformer model cannot load, use a simple transparent lexicon-based fallback and label it **Basic NLP fallback**.
- If no real reviews are available, show “No review text available for analysis”; do not populate fake sentiment charts.
- Demo mode may include a small, clearly labelled sample review set for demonstration only.

### Page 4 — PDF Report Builder

Purpose: create a downloadable trip dossier from the current plan.

Required UI:

- Report title and trip summary.
- Preview panel with page-like styling.
- Checkboxes to include/exclude:
  - Trip overview and extracted preferences.
  - Day-by-day itinerary.
  - Map image/snapshot (only if successfully generated).
  - Route distance/time table.
  - Estimated budget breakdown.
  - Place details and ratings.
  - Review sentiment and highlights.
  - AI travel tips and important caveats.
- Include/exclude controls must actually change the generated PDF.
- A **Generate PDF** action and a **Download PDF** action.
- Show generation progress and clear errors.
- Use a clean printable layout with headers, page numbers, consistent spacing, and readable typography.
- Include generation date and data-source status.
- Include a disclaimer that route times, opening hours, prices, and availability can change.
- If a static map image cannot be generated, omit the image and show the itinerary/route table instead. Never insert a broken image.

PDF implementation:

- Generate the PDF on the backend.
- Use the current trip data; do not ask Gemini to regenerate or alter factual provider data during export.
- Escape user content safely in HTML/PDF templates.
- Return a real PDF response with correct content type and filename.
- Test that the output exists, is non-empty, starts with a valid PDF signature, and contains expected report text.

---

## 4. Visual design — use the supplied Orvante HTML as the design reference

The supplied `Pasted text.txt` contains an **Orvante** editorial branding-agency landing-page design. Use it as the visual reference for the GeoGen AI interface. Do not reproduce its agency copy, branding, fake business statistics, or unrelated navigation. Translate its visual language into a useful trip-planning product.

### Visual direction to preserve

- Premium editorial art direction.
- Strong black/white contrast with restrained neutral greys.
- Oversized condensed/tight typography.
- Large headline typography and generous whitespace.
- Asymmetric composition and carefully aligned content.
- Large photographic/visual areas with rounded or carefully clipped edges.
- Compact uppercase labels and microcopy.
- Minimal pill/chip controls.
- Subtle hover transitions and tasteful reveal motion.
- Dark cards paired with light surfaces.
- Strong typographic hierarchy, not generic dashboard gradients.
- Responsive layouts that preserve the design's character on mobile.

### Translate the reference into a product UI

- Use the Orvante-style large typographic hero for the Home & Prompt Hub, with GeoGen AI messaging such as “TRAVEL / WITH INTELLIGENCE”.
- Replace the original person/agency hero imagery with travel/map/architecture imagery or a tasteful map visual. Use licensed/available assets or provider-returned photos; do not depend on a remote image that may disappear.
- The app shell should be quieter than the hero: clean navigation, simple controls, high-contrast cards.
- The map should be the main visual focus on the planner page.
- Review analysis should use editorial typography and simple neutral charts.
- The PDF preview should look like a premium travel dossier.
- Use a restrained accent colour only for map pins, active states, sentiment categories, and primary actions. Keep the overall palette monochrome/neutral.
- Use a readable sans-serif family such as Inter/Inter Tight or a reliable local/system fallback.
- Add subtle transitions, but respect `prefers-reduced-motion`.
- Do not use excessive glassmorphism, neon gradients, giant rounded dashboard cards, or generic AI-themed purple gradients.
- Keep all content legible and functional. Visual style must not compromise usability.

### Responsive and accessibility requirements

- Test at 1440px, 1024px, 768px, and 390px viewport widths.
- No horizontal overflow.
- All buttons and form controls must be usable by keyboard.
- Provide labels and accessible names.
- Ensure adequate text contrast.
- Avoid tiny text for important information.
- Add visible focus styles.
- Respect reduced-motion settings.
- Use loading skeletons or progress indicators without layout jumps.

---

## 5. AI and NLP implementation details

### A. Intent extraction / NER

Create a dedicated service that converts free text into a validated structured object, for example:

```json
{
  "destination": "Mysuru, Karnataka, India",
  "duration_days": 2,
  "travellers": 2,
  "budget": {
    "amount": 4000,
    "currency": "INR",
    "scope": "total"
  },
  "interests": ["food", "heritage"],
  "transport_mode": "transit",
  "start_date": null,
  "pace": "moderate",
  "additional_constraints": []
}
```

- Use Gemini structured output or a schema-constrained JSON response where supported.
- Use spaCy/entity extraction and deterministic parsing for obvious values such as number of days, people, and currency amounts.
- Merge extraction results carefully; validate with Pydantic.
- Do not let an LLM response bypass validation.
- Preserve the original prompt.
- If destination is missing or ambiguous, ask the user to clarify rather than inventing one.
- Do not interpret a budget as per-person or total without an explicit signal or a visible assumption.
- Include unit tests for common prompt variations and missing/ambiguous data.

### B. Gemini itinerary generation

Use Gemini Flash through the official supported SDK and a backend-only API key.

The model should receive:

- The original user prompt.
- Validated extracted preferences.
- The list of real places returned by Places API (or demo fixtures in demo mode).
- Coordinates and place IDs.
- Ratings/opening hours/review summaries only when actually returned.
- Route distances and durations actually returned by Routes API.
- Budget assumptions and known/unknown costs.

Require structured output that includes:

- Trip title and short overview.
- Day-by-day stops referencing only supplied place IDs.
- A reason for each stop.
- Suggested visit duration, explicitly labelled as an estimate.
- Route leg references.
- Budget estimates with each line labelled as provider-sourced, user-provided, or AI-estimated.
- Practical tips and caveats.
- Missing information and assumptions.

Model guardrails:

- The model may select and arrange only supplied place IDs.
- It must not create imaginary businesses or claim an unverified place exists.
- It must not invent ratings, reviews, addresses, opening hours, route durations, or prices.
- If a field is missing, return null or mark it unknown.
- It must distinguish estimated budget from verified prices.
- If the requested budget is unrealistic, explain why and offer a lower-cost alternative.
- Validate every referenced place ID after generation; remove or repair invalid references using deterministic logic.
- Retry once with a concise repair prompt if structured output is invalid. If still invalid, show a useful error or deterministic fallback rather than crashing.

### C. Sentiment analysis

Implement a provider-independent sentiment interface, for example:

- `SentimentAnalyzer`
- `TransformerSentimentAnalyzer`
- `LexiconSentimentAnalyzer`

The rest of the app must not depend on a specific model implementation.

- Prefer a lightweight model that can run locally.
- Download/cache model weights only when configured and permitted.
- Do not force a huge model download during normal application startup.
- Use a deterministic fallback if model loading fails.
- Handle mixed-language and empty reviews safely.
- Return per-review label and confidence plus aggregate counts/percentages.
- Do not present confidence as certainty.
- Include unit tests for positive, negative, neutral, mixed, empty, and duplicate review cases.

### D. Semantic matching (optional bonus)

If time and dependencies permit, add sentence-transformers (`all-MiniLM-L6-v2`) or another lightweight embedding model to rank places by the user's stated vibe/interests.

- Keep this optional.
- Do not make the main app fail if the embedding model is unavailable.
- Explain that semantic matching is a relevance estimate, not a factual rating.

---

## 6. Google Maps Platform integration

Use official Google Maps Platform APIs and current documentation. Do not use undocumented endpoints or scrape Google Maps pages.

Potential APIs:

- Maps JavaScript API: interactive frontend map.
- Places API (New): text search/nearby search, place details, photos, and reviews where available.
- Routes API: route distance and duration.
- Maps Static API: optional map image for PDF.

### Implementation requirements

- Create a backend Maps service with isolated methods for place search, place details, and route calculation.
- Create a frontend map component that consumes normalised backend data.
- Store provider place IDs and coordinates.
- Request only the fields actually needed; use field masks where required.
- Respect Google Maps Platform attribution, display, caching, and content restrictions.
- Do not permanently store or redistribute restricted Google Maps content unless the applicable terms allow it.
- Do not assume all places expose reviews or photos.
- Do not assume every region supports every travel mode.
- Handle quota, billing, invalid key, permission, timeout, and zero-results errors.
- Never show “live” if the response came from fixtures or cache.
- Include a small provider-status indicator.

### API key setup

Add `.env.example` with variables appropriate to the chosen implementation, for example:

```env
# Backend
GEMINI_API_KEY=
GOOGLE_MAPS_SERVER_API_KEY=
APP_ENV=development
DATA_MODE=demo

# Frontend (public browser key; restrict by HTTP referrer and enabled APIs)
VITE_GOOGLE_MAPS_BROWSER_KEY=

# Optional
SENTIMENT_MODEL=
```

Adjust variable names to the actual framework and ensure the backend reads secrets only from server environment variables.

Add setup documentation explaining:

- Which Google Cloud APIs must be enabled.
- That a Google Cloud billing account may be required.
- How to create separate browser and server keys.
- How to restrict the browser key by HTTP referrer and API.
- How to restrict the server key by server environment/IP and API.
- How to set the Gemini key.
- How to run in demo mode without credentials.
- That API usage can incur charges and quotas apply.

Do not put real API keys in the repository or ask the user to paste secrets into source code.

---

## 7. Backend API design

Use clean, documented endpoints. Adjust naming if the existing app has conventions, but preserve equivalent capabilities.

Suggested endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health and configuration status |
| POST | `/api/intent/extract` | Extract structured trip intent |
| POST | `/api/places/search` | Search real or demo places |
| GET | `/api/places/{place_id}` | Fetch place details |
| GET | `/api/places/{place_id}/reviews` | Fetch permitted review data and analysis |
| POST | `/api/routes/compute` | Calculate route legs |
| POST | `/api/trips/generate` | Generate grounded itinerary |
| POST | `/api/trips/recalculate` | Recalculate after itinerary edits |
| POST | `/api/reports/pdf` | Generate downloadable PDF |

Use Pydantic request/response schemas for all endpoints.

- Return consistent error objects with a useful message and machine-readable code.
- Set sensible request timeouts.
- Avoid blocking the event loop with long-running synchronous work; use appropriate async patterns or thread pools.
- Add CORS only for the local frontend origin(s) needed in development.
- Add basic rate limiting or at least request-size/time protections to expensive AI endpoints.
- Never log API keys, full secrets, or unnecessary personal data.
- Add structured application logging.

---

## 8. Demo mode and sample data

The app must be demonstrable without API keys.

Implement a `DATA_MODE=demo` path using a small, clearly labelled dataset for one or two sample destinations, such as Mysuru and Bengaluru.

Demo fixtures should include:

- A handful of plausible named attractions/food places.
- Stable fake demo IDs, coordinates suitable for the selected city, categories, and short descriptions.
- Clearly labelled sample ratings and opening hours.
- A small sample review set for demonstrating sentiment analysis.
- Demo route legs with plausible but explicitly illustrative distance/time values.
- A sample itinerary and budget.

Important:

- Every demo record must carry `source: "demo"` or equivalent.
- The UI must show a persistent **DEMO DATA** indicator.
- Never mix demo and live records without showing the source per record.
- Never imply demo ratings/reviews are real Google Maps content.
- Do not create fake live traffic data.
- Keep demo fixtures isolated from production provider services.
- Tests must cover demo mode so the prototype can be run offline.

When live credentials are present, allow `DATA_MODE=live` and show provider errors honestly. Do not silently fall back to demo while still displaying a Live label.

---

## 9. Frontend implementation requirements

Build reusable components rather than putting the entire application into one giant file.

Suggested component groups:

- `AppShell`, `TopNav` / `Sidebar`, `PageHeader`
- `PromptComposer`, `ExamplePromptChips`, `ConstraintEditor`
- `TripMap`, `MapMarker`, `RouteLine`
- `ItineraryTimeline`, `DaySection`, `StopCard`, `RouteSummary`
- `PlaceDetailPanel`, `ReviewList`, `SentimentChart`, `ThemeList`
- `ReportOptions`, `ReportPreview`, `DownloadReportButton`
- `LoadingStages`, `ErrorState`, `EmptyState`, `SourceBadge`

State management:

- Keep the current prompt, extracted intent, selected place, itinerary, route data, report options, and data-source status in a coherent shared state.
- Avoid duplicating the same data in multiple components.
- Preserve the trip when navigating between the four pages.
- Persist only non-sensitive convenience data locally (for example recent prompts); provide a clear-history action.
- Do not store API keys or sensitive information in local storage.
- Show a confirmation before discarding a generated trip if needed.

All visible controls must work. If a feature cannot be implemented, remove the control or label it as unavailable rather than leaving a fake interaction.

---

## 10. Budget and route calculations

Budget must be useful but honest.

- Separate transport, accommodation, food, tickets/activities, and miscellaneous costs.
- Clearly mark each item as user-provided, provider-sourced, or AI-estimated.
- If reliable price data is unavailable, show an estimate range and say it is an estimate.
- Distinguish total group budget from per-person budget.
- Calculate per-person and group totals correctly.
- Avoid false precision.
- Currency defaults to INR for Indian destinations but should follow extracted/user-selected currency where practical.

Route calculations:

- Store numeric distance and duration values, not formatted strings.
- Use metres/seconds internally when provider APIs return those units.
- Convert for display in one shared formatter.
- Compare route alternatives using unrounded values.
- For tiny distance differences, show metres (e.g. 30 m) rather than rounding to 0 km.
- Display “approx.” for estimates.
- Never invent a second route simply to make a comparison card look complete.

---

## 11. Error handling and edge cases

Handle and test at least these cases:

- Empty prompt.
- Prompt without a destination.
- Ambiguous destination.
- Budget missing.
- Budget scope unclear (per person vs total).
- Invalid number of days/travellers.
- No places found.
- Provider returns partial place details.
- No reviews available.
- No photos available.
- Routes API unavailable.
- Unsupported travel mode.
- Gemini timeout or quota error.
- Gemini returns invalid JSON or unknown place IDs.
- Sentiment model unavailable.
- PDF generation failure.
- Missing/invalid API keys.
- Offline/demo mode.
- User removes every stop.
- User reorders stops.
- Very long place names/addresses.
- Mobile layout and small screens.

Every failure should have a useful recovery action. Avoid blank screens and unhandled exceptions.

---

## 12. Automated testing — mandatory

Create and run a real test suite. Do not merely write test files.

### Backend tests

At minimum test:

- Health endpoint.
- Intent extraction schema validation.
- Missing/ambiguous destination behaviour.
- Budget parsing and scope.
- Demo place search.
- Place details lookup.
- Missing reviews behaviour.
- Sentiment aggregation and percentages.
- Duplicate/empty review handling.
- Route calculations in demo mode.
- Route formatting and small-distance precision.
- Itinerary validation against supplied place IDs.
- Invalid Gemini response handling.
- PDF generation and PDF signature/content.
- Missing API key behaviour.
- Provider timeout/error handling.

Mock external APIs in unit tests. Tests must not require real API keys, network access, or paid API calls.

### Frontend tests

At minimum test:

- Four-page navigation.
- Prompt submission and validation.
- Example prompt chip fills the composer.
- Extracted constraints can be edited.
- Itinerary renders from API response.
- Selecting a marker/card selects the correct place.
- Review analyser shows real response data or the correct empty state.
- Sentiment chart renders valid percentages.
- Report checkboxes affect the request.
- PDF download action handles success and failure.
- Demo/live source indicators are accurate.
- Mobile navigation works.

### Build and quality checks

Run all available commands, such as:

- Backend lint/type checks if configured.
- `pytest`.
- Frontend lint.
- Frontend type check.
- Frontend unit tests.
- Production frontend build.

If browser automation (Playwright or equivalent) is available, add an end-to-end smoke test that:

1. Opens the app.
2. Enters a sample prompt.
3. Generates a demo trip.
4. Opens the planner.
5. Selects a place.
6. Opens review analysis.
7. Opens the report builder.
8. Generates and downloads a PDF.

If browser automation is not available, run the closest practical integration tests and state the limitation.

**Fix every failure caused by your changes.** Do not hide failures by deleting tests, disabling type checking, or weakening assertions.

---

## 13. Live prototype — run it locally and verify it

The final deliverable must be a runnable local prototype in the existing project.

- Add clear development scripts.
- Start the backend and frontend using the simplest reliable local workflow.
- If the IDE environment supports terminal sessions, launch both services and keep them running.
- Verify `/api/health`.
- Open the frontend in the available browser/preview tool if one exists.
- Exercise the demo flow end-to-end.
- Check browser console and backend logs for errors.
- Fix runtime issues before finishing.
- Do not claim to have opened or visually tested a browser if no browser tool was available.
- If the environment cannot keep servers running, provide exact commands and confirm that the production build and tests pass.
- Do not deploy publicly unless explicitly requested.

The prototype should open on the Home & Prompt Hub and make the sample trip flow obvious.

---

## 14. Documentation and final handoff

Create or update:

- `README.md`
- `.env.example`
- Backend dependency file (`requirements.txt` or project equivalent)
- Frontend package scripts
- API documentation or concise endpoint reference
- Test instructions
- Demo-mode instructions
- Live API setup instructions
- Known limitations

README must include:

1. What GeoGen AI does.
2. Four-page feature overview.
3. Architecture and data flow.
4. Tech stack and why each part is used.
5. Folder structure.
6. Prerequisites.
7. Installation steps.
8. How to run frontend and backend.
9. How to run without API keys in demo mode.
10. How to configure Gemini and Google Maps safely.
11. How to run tests.
12. Current limitations and API billing/quota notes.

Add a short **How to explain this project in a viva/demo** section covering:

- What problem it solves.
- Where GenAI is used.
- What NER/entity extraction does.
- How sentiment analysis works.
- How Google Maps data is used.
- How the itinerary is grounded in actual places/routes.
- How PDF generation works.
- Difference between live data and demo data.
- Limitations and future improvements.

---

## 15. Suggested folder structure

Adapt this to the existing repository; do not force a restructure if a clean structure already exists.

```text
geogen-ai/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── HomePage/
│   │   │   ├── PlannerPage/
│   │   │   ├── PlaceAnalyserPage/
│   │   │   └── ReportPage/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── state/
│   │   ├── types/
│   │   └── styles/
│   └── tests/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── maps/
│   │   │   ├── gemini/
│   │   │   ├── nlp/
│   │   │   └── pdf/
│   │   ├── demo/
│   │   └── main.py
│   └── tests/
├── docs/
├── .env.example
├── README.md
└── PROMPT.md
```

---

## 16. Definition of done — do not finish until checked

The project is complete only when all achievable items below are true:

- [ ] Existing repository inspected and useful code preserved.
- [ ] Four main pages implemented.
- [ ] Orvante-inspired editorial visual style applied to the actual app.
- [ ] Responsive desktop/tablet/mobile layout.
- [ ] Natural-language prompt submission works.
- [ ] Intent extraction returns validated structured data.
- [ ] User can edit extracted trip constraints.
- [ ] Demo place search works without credentials.
- [ ] Live Google Maps integration is implemented behind environment configuration.
- [ ] Map renders and markers select matching place cards when a Maps key is configured.
- [ ] Itinerary is generated from supplied place data, not invented places.
- [ ] Route distances/durations are shown with honest source labels.
- [ ] Review analyser works with available review text.
- [ ] Sentiment calculations are based on analysed review records.
- [ ] Missing reviews produce a proper empty state.
- [ ] PDF options affect the actual generated report.
- [ ] PDF downloads and is a valid readable PDF.
- [ ] Demo mode is clearly labelled and useful.
- [ ] No secrets are committed or exposed to the frontend.
- [ ] Backend tests run and pass.
- [ ] Frontend tests run and pass.
- [ ] Production build succeeds.
- [ ] End-to-end smoke test runs if browser automation is available.
- [ ] README and `.env.example` are complete.
- [ ] Known limitations are documented honestly.

---

## 17. Final response required from the IDE agent

When implementation and testing are complete, report:

1. What was built.
2. Which existing files/components were reused or changed.
3. The four pages and their working features.
4. The exact commands to run the project.
5. The local frontend URL and backend URL, only if actually started and verified.
6. Whether the app is in Demo or Live mode.
7. Which API keys are still required for live mode (never print key values).
8. Test commands executed and their actual pass/fail results.
9. Production build result.
10. Any remaining limitations or failed checks.
11. The most important files to understand when presenting the project.

Do not say “everything works” if any mandatory check failed. Be specific and honest.

---

# Start now

Inspect the repository, make the implementation plan, and then execute the full build. Prioritise a stable, understandable, end-to-end working prototype over unnecessary complexity. Do not stop after generating a plan or a visual mockup. Run the app, test the complete demo flow, fix errors, and finish with the handoff described above.
