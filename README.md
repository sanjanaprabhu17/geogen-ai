# GeoGen AI — Real-Time Spatial Trip & Location Intelligence Platform

[![Live App](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-10B981?style=for-the-badge&logo=githubpages&logoColor=white)](https://yash-chavan-29.github.io/geogen-ai/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Yash-Chavan-29/geogen-ai)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Mapbox](https://img.shields.io/badge/Mapbox-GL%20JS%20v3-000000?style=for-the-badge&logo=mapbox&logoColor=white)](https://www.mapbox.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com)

**GeoGen AI** turns natural-language travel and routing queries into structured, grounded, and actionable trip dossiers with live road geometry across India. It integrates **Mapbox GL JS** for real spatial route geometry and turn-by-turn navigation handoff to Google Maps, **Google Gemini** for intelligent chat assistance and itinerary synthesis, an **NLP aspect review pipeline**, and vector PDF export.

🚀 **Live Public App:** [https://yash-chavan-29.github.io/geogen-ai/](https://yash-chavan-29.github.io/geogen-ai/)

---

## 1. What GeoGen AI Does

A user provides a natural language travel prompt, such as:
> *“Plan a 2-day budget food and heritage trip in Mysuru for two people, under ₹4,000, using public transport.”*

GeoGen AI:
1. **Parses & Extracts Intent:** Uses deterministic NER / Gemini structured output to extract destination, days, travellers, budget amount & scope, travel mode, and vibe/interests.
2. **Grounds Places:** Queries real locations via Google Places API (New) (or seeded deterministic datasets in Demo mode). It never invents non-existent places.
3. **Calculates Real Routes:** Computes distance and duration for each transit leg using Google Routes API.
4. **Analyses Sentiment:** Classifies reviews into Positive, Neutral, or Negative sentiment, extracting key pros, cons, and common themes.
5. **Generates Grounded Itinerary:** Arranges visited stops with arrival timings, visit durations, and honest budget estimates.
6. **Compiles Downloadable Dossier:** Generates vector PDF reports with customized module inclusion.

---

## 2. Four Main Pages & Features

### Page 1 — Home & Prompt Hub
- **Editorial Typography:** High-contrast, Orvante-inspired visual art direction.
- **Natural Language Prompt Composer:** Large input field with sample prompt chips.
- **Quick Constraint Controls:** Real-time controls for Destination, Days, Travellers, Budget (with explicit Total vs. Per-Head toggle), Transport Mode, and Interests.
- **Multi-Stage Progress Indicator:** Live animation reflecting entity extraction, maps search, route calculation, sentiment analysis, and itinerary synthesis.
- **Search History:** Persisted locally with clear action.

### Page 2 — Interactive Map & Trip Planner
- **Spatial Route Geometry Canvas:** Dynamic map canvas rendering numbered waypoints and connected route paths.
- **Marker-to-Card Selection:** Clicking pins highlights the corresponding stop card; clicking stop cards opens details or deep-links to NLP Review Analysis.
- **Day-by-Day Stops Timeline:** Clear schedule with visit estimates, arrival times, and AI match reasoning.
- **Interactive Stop Reordering & Deletion:** Move stops up or down with automatic real-time recalculation of transit legs.
- **Transport Mode Switcher:** Toggle between Transit, Driving, Walking, or Cycling with recalculated distances and durations.
- **Honest Budget Breakdown:** Separates Transport, Dining, Monument Tickets, Accommodation, and Reserve funds with source attribution.

### Page 3 — NLP Review & Place Analyser
- **Location Selector & Details:** Category, address, and ratings.
- **Sentiment Ratio Bar:** Exact percentages of Positive, Neutral, and Negative reviews totaling 100%.
- **Model Attribution:** Transparently labelled as *Model-Estimated Sentiment*.
- **Aspect & Theme Extraction:** Identifies recurring strengths (e.g., architectural grandeur, fluffy dosas) and caveats (e.g., weekend queues, footwear delays).
- **Pros & Cons Synthesis:** Actionable visitor highlights.
- **Filterable Review Snippets:** Filter by All, Positive, Neutral, or Negative sentiment tags.

### Page 4 — PDF Report Builder
- **Executive Dossier Sheet:** Printable vector preview with clean editorial layout.
- **Dynamic Module Checkboxes:** Choose which sections to include:
  - 1. Executive Trip Summary
  - 2. Day-by-Day Itinerary
  - 3. Route Transit & Distance Table
  - 4. Estimated Budget Breakdown
  - 5. AI Travel Guidelines & Caveats
- **Live PDF Generation:** Streams valid ReportLab PDF documents with standard `%PDF-` signature.

---

## 3. Architecture & Data Flow

```
[ User Natural Language Prompt ]
              │
              ▼
    [ Fast API Backend ] 
              │
    ┌─────────┴─────────┐
    ▼                   ▼
[ Intent Extractor ]   [ Maps Service ]
 (spaCy / Gemini)    (Google Places / Seeded Demo)
    │                   │
    └─────────┬─────────┘
              ▼
    [ Routes Service ] (Google Routes / Geodesic Physics)
              ▼
    [ Sentiment Pipeline ] (Lexicon / Aspect NLP)
              ▼
    [ Itinerary Generator ] (Gemini Flash / Grounded Schema)
              │
              ├──► [ Interactive Frontend (React + TS + Vite) ]
              │
              └──► [ PDF Dossier Builder (ReportLab) ]
```

---

## 4. Tech Stack & Rationale

| Layer | Technology | Why Selected |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | Blazing fast build speed, type-safety, and modern reactive component architecture. |
| **Styling** | Custom Editorial CSS | Tailored Orvante aesthetic, high-contrast monochrome design, clean typography. |
| **Backend** | Python 3.13 + FastAPI + Uvicorn | High performance, native async support, clean OpenAPI docs, and rich Python NLP libraries. |
| **Validation** | Pydantic v2 | Strict request/response validation adhering to zero-trust input standards. |
| **NLP** | Custom Polarity & Aspect Engine | Fast, deterministic sentiment classification without heavy GPU or model download locks. |
| **PDF Generation** | ReportLab 5.1 | Industry-standard vector PDF generation without fragile headless browser dependencies. |
| **Testing** | Pytest 9.2 + Pytest-Asyncio | Automated unit and integration testing covering all critical business paths. |

---

## 5. Folder Structure

```text
geogen-ai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── schemas/
│   │   │   └── trip.py
│   │   ├── services/
│   │   │   ├── maps/google_maps.py
│   │   │   ├── gemini/itinerary_generator.py
│   │   │   ├── nlp/
│   │   │   │   ├── intent_extractor.py
│   │   │   │   └── sentiment.py
│   │   │   └── pdf/report_builder.py
│   │   ├── demo/
│   │   │   └── fixtures.py
│   │   └── main.py
│   ├── tests/
│   │   └── test_api.py
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/Header.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── PlannerPage.tsx
│   │   │   ├── PlaceAnalyserPage.tsx
│   │   │   └── ReportPage.tsx
│   │   ├── services/api.ts
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
├── .env.example
├── README.md
└── PROMPT.md
```

---

## 6. How to Run Frontend and Backend

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ (Tested on Node.js 24)

### 1. Start the Backend
```bash
cd Y:\Practice\geogen-ai\backend
# Create virtual environment if not already created
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend will be live at `http://127.0.0.1:8000` (API docs at `http://127.0.0.1:8000/docs`).

### 2. Start the Frontend
In a new terminal:
```bash
cd Y:\Practice\geogen-ai\frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 7. Demo Mode vs. Live Mode

- **Demo Mode (`DATA_MODE=demo` or missing keys):**
  Works 100% offline without API keys! Uses seeded high-fidelity landmarks in **Mysuru** (Mysore Palace, Chamundi Hill, Devaraja Market, Vinayaka Mylari, St. Philomena's) and **Bengaluru** (Lalbagh, Cubbon Park, CTR Malleshwaram, Bangalore Palace). All UI items display a persistent `DEMO DATA` badge.
- **Live Mode (`DATA_MODE=live` + API keys configured):**
  Populate `.env` with:
  ```env
  GEMINI_API_KEY=your_gemini_key
  GOOGLE_MAPS_SERVER_API_KEY=your_google_maps_key
  VITE_GOOGLE_MAPS_BROWSER_KEY=your_browser_maps_key
  ```

---

## 8. Automated Testing

Run the backend test suite:
```bash
cd Y:\Practice\geogen-ai\backend
.\.venv\Scripts\pytest -v
```
All 12 unit and integration tests pass, testing health, intent extraction, budget scopes, sentiment analysis, route computation, itinerary generation, and PDF generation.

Run the frontend type checks and build:
```bash
cd Y:\Practice\geogen-ai\frontend
npm run build
```

---

## 9. Viva / Demo Guide — How to Present GeoGen AI

When presenting this project to an examiner or evaluator:

1. **What Problem It Solves:** Generic LLMs hallucinate non-existent attractions, invent fake ticket prices, and propose impossible travel routes. GeoGen AI solves this by **grounding** LLM generation in verified Google Maps spatial data and real travel routes.
2. **Where GenAI & NLP Are Used:**
   - **Intent Extraction / NER:** Converts unstructured user prompts into structured constraints (dates, budget scope, travel mode, interests).
   - **Sentiment Analysis:** Categorizes real user reviews into Positive, Neutral, and Negative sentiments with aspect theme mining.
   - **Grounded Itinerary Synthesis:** Gemini arranges verified places into logical sequences based on geographic proximity.
3. **Data Integrity & Honesty:**
   - Clearly labels whether data is **Live** or **Demo**.
   - Explicitly distinguishes user-provided budgets, provider-sourced prices, and AI-estimated costs.
4. **Export Capability:**
   - Compiles vector PDF dossiers using ReportLab, respecting user-selected module inclusions.
