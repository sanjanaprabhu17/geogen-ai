export interface Budget {
  amount: number;
  currency: string;
  scope: 'total' | 'per_person';
}

export interface IntentConstraints {
  source_location?: string | null;
  destination?: string | null;
  duration_days: number;
  travellers: number;
  budget?: Budget | null;
  interests: string[];
  transport_mode: 'transit' | 'driving' | 'walking' | 'bicycling';
  start_date?: string | null;
  pace: string;
  additional_constraints: string[];
  clarification_needed?: string | null;
  raw_prompt: string;
  source_lat?: number | null;
  source_lng?: number | null;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PlaceReview {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  time_relative: string;
  sentiment_label: 'positive' | 'neutral' | 'negative';
  sentiment_score: number;
}

export interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  coordinates: Coordinates;
  rating?: number | null;
  user_ratings_total?: number | null;
  opening_hours?: string[] | null;
  photo_url?: string | null;
  price_level?: number | null;
  website?: string | null;
  description?: string | null;
  source: string;
}

export interface RouteLeg {
  origin_id: string;
  destination_id: string;
  origin_name: string;
  destination_name: string;
  distance_meters: number;
  duration_seconds: number;
  formatted_distance: string;
  formatted_duration: string;
  travel_mode: string;
  is_traffic_aware: boolean;
  polyline?: string | null;
  source: string;
}

export interface ItineraryStop {
  stop_number: number;
  place_id: string;
  place: Place;
  suggested_duration_minutes: number;
  arrival_time_label: string;
  ai_reason: string;
  route_to_next?: RouteLeg | null;
}

export interface DayItinerary {
  day_number: number;
  title: string;
  stops: ItineraryStop[];
}

export interface BudgetItem {
  category: string;
  amount: number;
  source_label: string;
  note?: string | null;
}

export interface BudgetBreakdown {
  items: BudgetItem[];
  total_estimated: number;
  per_person_estimated: number;
  currency: string;
  is_within_budget?: boolean | null;
  note: string;
}

export interface TripItinerary {
  id: string;
  title: string;
  overview: string;
  source_location?: string;
  destination: string;
  duration_days: number;
  travellers: number;
  transport_mode: 'transit' | 'driving' | 'walking' | 'bicycling';
  departure_leg?: RouteLeg | null;
  days: DayItinerary[];
  budget_breakdown: BudgetBreakdown;
  travel_tips: string[];
  assumptions_and_caveats: string[];
  source: string;
  created_at: string;
}

export interface SentimentSummary {
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  model_used: string;
  total_analyzed: number;
}

export interface AspectAnalysis {
  positive_themes: string[];
  negative_themes: string[];
}

export interface PlaceReviewAnalysis {
  place_id: string;
  place_name: string;
  reviews_count: number;
  sentiment: SentimentSummary;
  aspects: AspectAnalysis;
  summary_points: string[];
  pros: string[];
  cons: string[];
  reviews: PlaceReview[];
  source: string;
}

export interface ReportOptions {
  include_overview: boolean;
  include_itinerary: boolean;
  include_map: boolean;
  include_routes: boolean;
  include_budget: boolean;
  include_places: boolean;
  include_reviews: boolean;
  include_tips: boolean;
}
