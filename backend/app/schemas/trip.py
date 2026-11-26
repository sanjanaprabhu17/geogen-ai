from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BudgetSchema(BaseModel):
    amount: float
    currency: str = "INR"
    scope: str = "total"  # "total" or "per_person"

class IntentExtractRequest(BaseModel):
    prompt: str

class IntentExtractResponse(BaseModel):
    source_location: Optional[str] = "Current Location"
    destination: Optional[str] = None
    duration_days: int = Field(default=1, ge=1, le=14)
    travellers: int = Field(default=1, ge=1)
    budget: Optional[BudgetSchema] = None
    interests: List[str] = Field(default_factory=list)
    transport_mode: str = "transit"  # "transit", "driving", "walking", "bicycling"
    start_date: Optional[str] = None
    pace: str = "moderate"  # "relaxed", "moderate", "fast"
    additional_constraints: List[str] = Field(default_factory=list)
    clarification_needed: Optional[str] = None
    raw_prompt: str = ""
    source_lat: Optional[float] = None
    source_lng: Optional[float] = None

class PlaceCoordinates(BaseModel):
    lat: float
    lng: float

class PlaceReview(BaseModel):
    id: str
    author_name: str
    rating: int
    text: str
    time_relative: str = "recent"
    sentiment_label: str = "neutral"  # "positive", "neutral", "negative"
    sentiment_score: float = 0.5

class Place(BaseModel):
    id: str
    name: str
    category: str
    address: str
    coordinates: PlaceCoordinates
    rating: Optional[float] = None
    user_ratings_total: Optional[int] = None
    opening_hours: Optional[List[str]] = None
    photo_url: Optional[str] = None
    price_level: Optional[int] = None
    website: Optional[str] = None
    description: Optional[str] = None
    source: str = "demo"

class PlaceSearchRequest(BaseModel):
    query: str
    destination: Optional[str] = None
    category: Optional[str] = None

class PlaceSearchResponse(BaseModel):
    places: List[Place]
    source: str = "demo"

class SentimentSummary(BaseModel):
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    model_used: str = "lexicon_fallback"
    total_analyzed: int = 0

class AspectAnalysis(BaseModel):
    positive_themes: List[str] = Field(default_factory=list)
    negative_themes: List[str] = Field(default_factory=list)

class PlaceReviewAnalysis(BaseModel):
    place_id: str
    place_name: str
    reviews_count: int
    sentiment: SentimentSummary
    aspects: AspectAnalysis
    summary_points: List[str] = Field(default_factory=list)
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    reviews: List[PlaceReview] = Field(default_factory=list)
    source: str = "demo"

class RouteLeg(BaseModel):
    origin_id: str
    destination_id: str
    origin_name: str
    destination_name: str
    distance_meters: int
    duration_seconds: int
    formatted_distance: str
    formatted_duration: str
    travel_mode: str
    is_traffic_aware: bool = False
    polyline: Optional[str] = None
    source: str = "demo"

class RouteComputeRequest(BaseModel):
    origin_id: str
    destination_id: str
    travel_mode: str = "transit"

class RouteComputeResponse(BaseModel):
    route: RouteLeg
    source: str = "demo"

class ItineraryStop(BaseModel):
    stop_number: int
    place_id: str
    place: Place
    suggested_duration_minutes: int = 90
    arrival_time_label: str = "10:00 AM"
    ai_reason: str = "Curated stop matching interests."
    route_to_next: Optional[RouteLeg] = None

class DayItinerary(BaseModel):
    day_number: int
    title: str
    stops: List[ItineraryStop]

class BudgetItem(BaseModel):
    category: str
    amount: float
    source_label: str = "AI-estimated"  # "provider-sourced", "user-provided", "AI-estimated"
    note: Optional[str] = None

class BudgetBreakdown(BaseModel):
    items: List[BudgetItem] = Field(default_factory=list)
    total_estimated: float = 0.0
    per_person_estimated: float = 0.0
    currency: str = "INR"
    is_within_budget: Optional[bool] = None
    note: str = ""

class TripItinerary(BaseModel):
    id: str
    title: str
    overview: str
    source_location: str = "Current Location"
    destination: str
    duration_days: int
    travellers: int
    transport_mode: str
    departure_leg: Optional[RouteLeg] = None
    days: List[DayItinerary]
    budget_breakdown: BudgetBreakdown
    travel_tips: List[str] = Field(default_factory=list)
    assumptions_and_caveats: List[str] = Field(default_factory=list)
    source: str = "demo"
    created_at: str = ""

class TripGenerateRequest(BaseModel):
    prompt: Optional[str] = ""
    source_location: Optional[str] = "Current Location"
    destination: Optional[str] = None
    constraints: Optional[IntentExtractResponse] = None
    selected_place_ids: Optional[List[str]] = None
    source_lat: Optional[float] = None
    source_lng: Optional[float] = None

class TripRecalculateRequest(BaseModel):
    trip: TripItinerary
    new_transport_mode: Optional[str] = None

class ReportOptions(BaseModel):
    include_overview: bool = True
    include_itinerary: bool = True
    include_map: bool = True
    include_routes: bool = True
    include_budget: bool = True
    include_places: bool = True
    include_reviews: bool = True
    include_tips: bool = True

class ReportGenerateRequest(BaseModel):
    trip: TripItinerary
    options: ReportOptions = Field(default_factory=ReportOptions)

class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: Optional[str] = None

class AssistantChatRequest(BaseModel):
    message: str
    trip_context: Optional[Dict[str, Any]] = None
    history: Optional[List[ChatMessage]] = Field(default_factory=list)

class AssistantChatResponse(BaseModel):
    reply: str
    suggested_followups: List[str] = Field(default_factory=list)
    source: str = "gemini"
