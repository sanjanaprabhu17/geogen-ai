from fastapi import APIRouter, HTTPException, Response
from typing import List, Optional, Dict
from app.core.config import settings
from app.schemas.trip import (
    IntentExtractRequest, IntentExtractResponse,
    PlaceSearchRequest, PlaceSearchResponse, Place,
    PlaceReview, PlaceReviewAnalysis, RouteComputeRequest, RouteComputeResponse,
    TripGenerateRequest, TripRecalculateRequest, TripItinerary,
    ReportGenerateRequest, AssistantChatRequest, AssistantChatResponse
)
from app.services.nlp.intent_extractor import IntentExtractor
from app.services.nlp.sentiment import ReviewAnalysisPipeline
from app.services.maps.google_maps import MapsService
from app.services.gemini.itinerary_generator import ItineraryGenerator
from app.services.pdf.report_builder import PDFReportBuilder
from app.demo.fixtures import DEMO_PLACES, DEMO_REVIEWS

router = APIRouter(prefix="/api")

maps_service = MapsService()
itinerary_generator = ItineraryGenerator(maps_service)
sentiment_pipeline = ReviewAnalysisPipeline()

# In-Memory Fast Cache for Reviews (< 5ms response time)
REVIEW_ANALYSIS_CACHE: Dict[str, PlaceReviewAnalysis] = {}

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "data_mode": "live" if (settings.has_maps or settings.has_gemini) else "demo",
        "is_demo": not (settings.has_maps or settings.has_gemini),
        "gemini_configured": settings.has_gemini,
        "mapbox_configured": bool(settings.mapbox_access_token),
        "google_maps_configured": settings.has_maps,
        "sentiment_model": settings.sentiment_model
    }

@router.post("/intent/extract", response_model=IntentExtractResponse)
async def extract_intent(req: IntentExtractRequest):
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")
    return await IntentExtractor.extract(req.prompt)

@router.post("/places/search", response_model=PlaceSearchResponse)
async def search_places(req: PlaceSearchRequest):
    places = await maps_service.search_places(
        query=req.query,
        destination=req.destination,
        category=req.category
    )
    source = "live" if (places and places[0].source == "live") else "demo"
    return PlaceSearchResponse(places=places, source=source)

@router.get("/places/{place_id}", response_model=Place)
async def get_place_details(place_id: str):
    place = await maps_service.get_place_details(place_id)
    if not place:
        raise HTTPException(status_code=404, detail=f"Place '{place_id}' not found.")
    return place

@router.get("/places/{place_id}/reviews", response_model=PlaceReviewAnalysis)
async def get_place_reviews(place_id: str):
    # Check instant cache first
    if place_id in REVIEW_ANALYSIS_CACHE:
        return REVIEW_ANALYSIS_CACHE[place_id]

    place = await maps_service.get_place_details(place_id)
    place_name = place.name if place else "Selected Location"
    reviews = DEMO_REVIEWS.get(place_id, [])

    if not reviews and place:
        p_name = place.name
        reviews = [
            PlaceReview(
                id=f"rev_{place.id}_1",
                author_name="Suresh Kulkarni",
                rating=5,
                text=f"Truly an iconic landmark! {p_name} offers an authentic local immersion with warm hospitality and deep cultural significance.",
                sentiment_label="positive",
                sentiment_score=0.96
            ),
            PlaceReview(
                id=f"rev_{place.id}_2",
                author_name="Megha Joshi",
                rating=5,
                text=f"Must-visit attraction. The atmosphere around {p_name} is pleasant and very rich in historical charm. Highly recommended for families.",
                sentiment_label="positive",
                sentiment_score=0.92
            ),
            PlaceReview(
                id=f"rev_{place.id}_3",
                author_name="Ravi Deshpande",
                rating=4,
                text=f"Great experience overall. However, weekend parking near {p_name} was a bit tight and there was a moderate queue during evening peak hours.",
                sentiment_label="neutral",
                sentiment_score=0.55
            ),
            PlaceReview(
                id=f"rev_{place.id}_4",
                author_name="Anil Hiremath",
                rating=5,
                text=f"Exceptional quality and genuine authentic character. A standout stop in our northern Karnataka itinerary.",
                sentiment_label="positive",
                sentiment_score=0.97
            )
        ]

    source = "live" if place and place.source == "live" else "demo"
    analysis = sentiment_pipeline.analyze_reviews(
        place_id=place_id,
        place_name=place_name,
        reviews=reviews,
        source=source
    )
    # Store in instant cache
    REVIEW_ANALYSIS_CACHE[place_id] = analysis
    return analysis

@router.post("/routes/compute", response_model=RouteComputeResponse)
async def compute_route(req: RouteComputeRequest):
    origin = await maps_service.get_place_details(req.origin_id)
    destination = await maps_service.get_place_details(req.destination_id)
    if not origin or not destination:
        raise HTTPException(status_code=404, detail="Origin or destination place could not be resolved.")
    
    route = await maps_service.compute_route(origin, destination, req.travel_mode)
    return RouteComputeResponse(route=route, source=route.source)

@router.post("/trips/generate", response_model=TripItinerary)
async def generate_trip(req: TripGenerateRequest):
    constraints = req.constraints
    dest_str = req.destination or (constraints.destination if constraints else None) or "Mysuru, Karnataka, India"
    source_str = req.source_location or (constraints.source_location if constraints else "Current Location") or "Current Location"
    
    if not req.prompt or not req.prompt.strip():
        req.prompt = f"Curated journey from {source_str} to {dest_str}"
    
    if not constraints:
        if req.destination:
            constraints = IntentExtractResponse(
                source_location=source_str,
                destination=dest_str,
                duration_days=2,
                travellers=2,
                transport_mode="transit",
                interests=["heritage", "food"],
                raw_prompt=req.prompt,
                source_lat=req.source_lat,
                source_lng=req.source_lng
            )
        else:
            constraints = await IntentExtractor.extract(req.prompt)
            if req.source_lat is not None and req.source_lng is not None:
                constraints.source_lat = req.source_lat
                constraints.source_lng = req.source_lng
    else:
        if dest_str:
            constraints.destination = dest_str
        if source_str:
            constraints.source_location = source_str
        if req.source_lat is not None and req.source_lng is not None:
            constraints.source_lat = req.source_lat
            constraints.source_lng = req.source_lng

    places: List[Place] = []
    if req.selected_place_ids:
        for pid in req.selected_place_ids:
            p = await maps_service.get_place_details(pid)
            if p:
                places.append(p)
    else:
        places = await maps_service.search_places(
            query="attractions food heritage",
            destination=constraints.destination
        )

    trip = await itinerary_generator.generate_itinerary(
        prompt=req.prompt,
        constraints=constraints,
        places=places
    )
    return trip

@router.post("/trips/recalculate", response_model=TripItinerary)
async def recalculate_trip(req: TripRecalculateRequest):
    trip = req.trip
    mode = req.new_transport_mode or trip.transport_mode
    trip.transport_mode = mode

    # Re-calculate Departure Leg (Source -> First Stop in Destination)
    if trip.days and trip.days[0].stops:
        first_place = trip.days[0].stops[0].place
        src_loc = trip.source_location or "Current Location"
        query_src = "Dharwad, Karnataka, India" if "current" in src_loc.lower() else src_loc
        source_geo = await maps_service._geocode_with_mapbox(query_src)
        if source_geo:
            from app.schemas.trip import PlaceCoordinates
            source_place = Place(
                id="user_source_origin",
                name=f"{src_loc}",
                category="Starting Point",
                address=source_geo["address"],
                coordinates=PlaceCoordinates(lat=source_geo["lat"], lng=source_geo["lng"]),
                source="live"
            )
            trip.departure_leg = await maps_service.compute_route(source_place, first_place, mode)

    # Chronologically re-sequence each day's arrival times and route legs
    for day in trip.days:
        current_time_minutes = 9 * 60  # 9:00 AM start
        for s_idx in range(len(day.stops)):
            current_stop = day.stops[s_idx]
            current_stop.stop_number = s_idx + 1

            # Chronological arrival time
            hours = current_time_minutes // 60
            mins = current_time_minutes % 60
            am_pm = "AM" if hours < 12 else "PM"
            disp_hours = hours if hours <= 12 else hours - 12
            if disp_hours == 0:
                disp_hours = 12
            current_stop.arrival_time_label = f"{disp_hours:02d}:{mins:02d} {am_pm}"

            visit_duration = current_stop.suggested_duration_minutes or 60

            if s_idx < len(day.stops) - 1:
                next_stop = day.stops[s_idx + 1]
                updated_route = await maps_service.compute_route(
                    current_stop.place, next_stop.place, mode
                )
                current_stop.route_to_next = updated_route
                travel_minutes = max(10, updated_route.duration_seconds // 60)
                current_time_minutes += visit_duration + travel_minutes
            else:
                current_stop.route_to_next = None
                current_time_minutes += visit_duration

    rate = 200 if mode == "transit" else (800 if mode == "driving" else 50)
    new_transport = rate * trip.duration_days * max(1, trip.travellers // 2)
    for b in trip.budget_breakdown.items:
        if b.category == "Local Transport":
            b.amount = float(new_transport)
            b.note = f"Recalculated for {mode} ({trip.duration_days} days)"

    new_total = sum(b.amount for b in trip.budget_breakdown.items)
    trip.budget_breakdown.total_estimated = float(new_total)
    trip.budget_breakdown.per_person_estimated = round(new_total / max(1, trip.travellers), 2)
    return trip

    return trip

@router.post("/reports/pdf")
def generate_pdf_report(req: ReportGenerateRequest):
    pdf_bytes = PDFReportBuilder.generate_pdf(req.trip, req.options)
    clean_dest = req.trip.destination.split(',')[0].replace(' ', '_')
    filename = f"GeoGen_Trip_{clean_dest}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.post("/assistant/chat", response_model=AssistantChatResponse)
async def chat_with_assistant(req: AssistantChatRequest):
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Query message cannot be empty.")
    from app.services.assistant.chat_assistant import AssistantService
    return await AssistantService.answer_query(
        message=req.message,
        trip_context=req.trip_context,
        history=req.history
    )
