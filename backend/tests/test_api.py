import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.nlp.intent_extractor import IntentExtractor
from app.services.nlp.sentiment import LexiconSentimentAnalyzer, ReviewAnalysisPipeline
from app.schemas.trip import PlaceReview, TripItinerary, ReportOptions
from app.services.pdf.report_builder import PDFReportBuilder

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "data_mode" in data
    assert "is_demo" in data

def test_intent_extraction_mysuru_prompt():
    prompt = "Plan a 2-day budget food and heritage trip in Mysuru for two people, under ₹4,000, using public transport."
    res = IntentExtractor.extract_deterministic(prompt)
    assert res.destination == "Mysuru, Karnataka, India"
    assert res.duration_days == 2
    assert res.travellers == 2
    assert res.budget is not None
    assert res.budget.amount == 4000
    assert res.budget.scope == "total"
    assert "food" in res.interests
    assert "heritage" in res.interests
    assert res.transport_mode == "transit"

def test_intent_extraction_missing_destination():
    prompt = "Just want a weekend getaway with nature and hiking."
    res = IntentExtractor.extract_deterministic(prompt)
    assert res.destination is None
    assert res.clarification_needed is not None
    assert "destination" in res.clarification_needed.lower()

def test_intent_extraction_per_person_budget():
    prompt = "3-day trip to Bengaluru for 3 people, budget 5000 per person by car."
    res = IntentExtractor.extract_deterministic(prompt)
    assert "Bengaluru" in res.destination
    assert res.duration_days == 3
    assert res.travellers == 3
    assert res.budget is not None
    assert res.budget.amount == 5000
    assert res.budget.scope == "per_person"
    assert res.transport_mode == "driving"

def test_sentiment_analyzer_lexicon():
    analyzer = LexiconSentimentAnalyzer()
    
    # Positive
    label, score = analyzer.analyze_text("Spectacular architecture, absolutely majestic and breathtaking!")
    assert label == "positive"
    assert score > 0.6

    # Negative
    label, score = analyzer.analyze_text("Terrible experience, overcrowded, dirty, and horrible queues.")
    assert label == "negative"
    assert score < 0.4

    # Negated positive -> negative
    label, score = analyzer.analyze_text("The food was not good and not clean.")
    assert label == "negative"

    # Empty text
    label, score = analyzer.analyze_text("")
    assert label == "neutral"
    assert score == 0.5

def test_review_analysis_pipeline_and_percentages():
    pipeline = ReviewAnalysisPipeline()
    reviews = [
        PlaceReview(id="1", author_name="A", rating=5, text="Gorgeous place, highly recommended!", sentiment_label="", sentiment_score=0),
        PlaceReview(id="2", author_name="B", rating=4, text="Great atmosphere and tasty coffee.", sentiment_label="", sentiment_score=0),
        PlaceReview(id="3", author_name="C", rating=2, text="Too crowded, noisy, and long waiting line.", sentiment_label="", sentiment_score=0)
    ]
    analysis = pipeline.analyze_reviews("demo_mysuru_palace", "Mysore Palace", reviews)
    assert analysis.reviews_count == 3
    total_pct = analysis.sentiment.positive_pct + analysis.sentiment.neutral_pct + analysis.sentiment.negative_pct
    assert round(total_pct, 1) == 100.0
    assert len(analysis.summary_points) == 3
    assert len(analysis.pros) > 0

def test_review_analysis_empty_reviews():
    pipeline = ReviewAnalysisPipeline()
    analysis = pipeline.analyze_reviews("demo_empty", "Empty Place", [])
    assert analysis.reviews_count == 0
    assert analysis.sentiment.positive_pct == 0.0
    assert "No review text" in analysis.summary_points[0]

def test_places_search_endpoint():
    response = client.post("/api/places/search", json={"query": "heritage", "destination": "Mysuru"})
    assert response.status_code == 200
    data = response.json()
    assert "places" in data
    assert len(data["places"]) > 0
    assert data["source"] in ["demo", "live"]

def test_place_details_endpoint():
    response = client.get("/api/places/demo_mysuru_palace")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "demo_mysuru_palace"
    assert "Mysore Palace" in data["name"]

def test_routes_compute_endpoint():
    payload = {
        "origin_id": "demo_mysuru_palace",
        "destination_id": "demo_mysuru_chamundi",
        "travel_mode": "transit"
    }
    response = client.post("/api/routes/compute", json=payload)
    assert response.status_code == 200
    data = response.json()
    route = data["route"]
    assert route["distance_meters"] > 0
    assert route["duration_seconds"] > 0
    assert "km" in route["formatted_distance"] or "m" in route["formatted_distance"]

def test_trip_generate_endpoint():
    payload = {
        "prompt": "Plan a 2-day budget food and heritage trip in Mysuru for two people, under ₹4,000, using public transport."
    }
    response = client.post("/api/trips/generate", json=payload)
    assert response.status_code == 200
    trip = response.json()
    assert trip["duration_days"] == 2
    assert len(trip["days"]) == 2
    assert trip["budget_breakdown"]["total_estimated"] > 0
    assert len(trip["travel_tips"]) > 0

def test_pdf_report_generation():
    # Generate trip first
    trip_res = client.post("/api/trips/generate", json={"prompt": "2-day heritage trip in Mysuru"}).json()
    trip_obj = TripItinerary(**trip_res)
    
    # Generate PDF
    pdf_bytes = PDFReportBuilder.generate_pdf(trip_obj, ReportOptions())
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 1000
    # Must start with standard PDF header
    assert pdf_bytes[:5] == b"%PDF-"
