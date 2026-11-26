import uuid
import datetime
from typing import List, Optional, Dict
from app.core.config import settings
from app.schemas.trip import (
    TripItinerary, DayItinerary, ItineraryStop, BudgetBreakdown, BudgetItem,
    IntentExtractResponse, Place, RouteLeg
)
from app.services.maps.google_maps import MapsService

class ItineraryGenerator:
    def __init__(self, maps_service: Optional[MapsService] = None):
        self.maps_service = maps_service or MapsService()

    async def generate_itinerary(
        self,
        prompt: str,
        constraints: IntentExtractResponse,
        places: List[Place]
    ) -> TripItinerary:
        # Check if places is empty
        if not places:
            # Fallback to searching places
            places = await self.maps_service.search_places(
                query=constraints.interests[0] if constraints.interests else "heritage",
                destination=constraints.destination
            )

        duration_days = constraints.duration_days
        travellers = constraints.travellers
        travel_mode = constraints.transport_mode
        dest_name = constraints.destination or "Mysuru, Karnataka, India"
        source_loc = constraints.source_location or "Current Location"

        # Compute Departure Leg (Source -> First Stop in Destination)
        departure_leg: Optional[RouteLeg] = None
        if places:
            first_place = places[0]
            src_clean = source_loc.split(",")[0].strip().lower()
            dest_clean = dest_name.split(",")[0].strip().lower()
            if src_clean != dest_clean:
                source_geo = None
                # Check if exact source GPS coordinates are provided
                if getattr(constraints, "source_lat", None) is not None and getattr(constraints, "source_lng", None) is not None:
                    source_geo = {
                        "lat": float(constraints.source_lat),
                        "lng": float(constraints.source_lng),
                        "address": source_loc
                    }
                else:
                    # Geocode source location if it's not Current Location, or geocode Dharwad as default
                    query_src = "Dharwad, Karnataka, India" if "current" in src_clean else source_loc
                    source_geo = await self.maps_service._geocode_with_mapbox(query_src)
                    if not source_geo:
                        source_geo = {"lat": 15.4589, "lng": 75.0078, "address": "Dharwad, Karnataka, India"}

                if source_geo:
                    from app.schemas.trip import PlaceCoordinates
                    source_place = Place(
                        id="user_source_origin",
                        name=f"{source_loc}",
                        category="Starting Point",
                        address=source_geo["address"],
                        coordinates=PlaceCoordinates(lat=source_geo["lat"], lng=source_geo["lng"]),
                        source="live"
                    )
                    departure_leg = await self.maps_service.compute_route(source_place, first_place, travel_mode)

        # Distribute places across days
        days: List[DayItinerary] = []
        places_per_day = max(2, min(4, len(places) // duration_days if duration_days > 0 else 2))

        place_idx = 0
        current_time_minutes = 9 * 60  # 9:00 AM start

        for d in range(1, duration_days + 1):
            day_stops: List[ItineraryStop] = []
            day_places = places[place_idx : place_idx + places_per_day]
            if not day_places and places:
                day_places = [places[d % len(places)]]
            place_idx += len(day_places)

            for s_idx, place in enumerate(day_places):
                hours = current_time_minutes // 60
                mins = current_time_minutes % 60
                am_pm = "AM" if hours < 12 else "PM"
                disp_hours = hours if hours <= 12 else hours - 12
                if disp_hours == 0:
                    disp_hours = 12
                arrival_time = f"{disp_hours:02d}:{mins:02d} {am_pm}"

                visit_duration = 90 if "Palace" in place.name or "Garden" in place.name else 45
                ai_reason = f"Essential {place.category.lower()} highlight matching your {', '.join(constraints.interests)} interests."

                # Route to next stop
                route_to_next = None
                if s_idx < len(day_places) - 1:
                    next_place = day_places[s_idx + 1]
                    route_to_next = await self.maps_service.compute_route(place, next_place, travel_mode)
                    travel_minutes = max(10, route_to_next.duration_seconds // 60)
                    current_time_minutes += visit_duration + travel_minutes
                else:
                    current_time_minutes += visit_duration

                day_stops.append(ItineraryStop(
                    stop_number=s_idx + 1,
                    place_id=place.id,
                    place=place,
                    suggested_duration_minutes=visit_duration,
                    arrival_time_label=arrival_time,
                    ai_reason=ai_reason,
                    route_to_next=route_to_next
                ))

            # Reset morning time for next day
            current_time_minutes = 9 * 60
            days.append(DayItinerary(
                day_number=d,
                title=f"Day {d}: {day_stops[0].place.category if day_stops else 'City Exploration'} Highlights",
                stops=day_stops
            ))

        # Honest Budget Breakdown
        # Transport estimate based on mode & days
        transport_rate = 200 if travel_mode == "transit" else (800 if travel_mode == "driving" else 50)
        transport_total = transport_rate * duration_days * max(1, travellers // 2)

        # Food estimate
        food_per_person_day = 450
        food_total = food_per_person_day * travellers * duration_days

        # Tickets / entry fees
        tickets_total = 150 * travellers * sum(len(d.stops) for d in days)

        # Accommodation if multi-day
        hotel_nightly = 1500 if duration_days > 1 else 0
        accommodation_total = hotel_nightly * (duration_days - 1) * max(1, travellers // 2)

        misc_total = 300 * duration_days

        total_est = transport_total + food_total + tickets_total + accommodation_total + misc_total
        per_person = round(total_est / travellers, 2)

        user_budget_amt = constraints.budget.amount if constraints.budget else None
        target_budget = user_budget_amt if user_budget_amt else None
        if target_budget and constraints.budget and constraints.budget.scope == "per_person":
            target_budget *= travellers

        is_within = (total_est <= target_budget) if target_budget else True

        budget_note = ""
        if target_budget:
            if is_within:
                budget_note = f"Estimated total of ₹{total_est:,.0f} fits within your ₹{target_budget:,.0f} budget."
            else:
                budget_note = f"Estimated ₹{total_est:,.0f} slightly exceeds ₹{target_budget:,.0f}. Opting for budget homestays or off-peak travel can optimize costs."

        budget_items = [
            BudgetItem(category="Local Transport", amount=float(transport_total), source_label="AI-estimated", note=f"Based on {travel_mode} for {duration_days} days"),
            BudgetItem(category="Food & Dining", amount=float(food_total), source_label="AI-estimated", note=f"₹{food_per_person_day}/person/day across {travellers} people"),
            BudgetItem(category="Entry Tickets & Monument Fees", amount=float(tickets_total), source_label="AI-estimated", note="Standard monument & camera permits"),
            BudgetItem(category="Accommodation", amount=float(accommodation_total), source_label="AI-estimated", note=f"{duration_days - 1} night(s) budget twin-sharing"),
            BudgetItem(category="Miscellaneous / Reserve", amount=float(misc_total), source_label="AI-estimated", note="Water, local guides, prasad, tips")
        ]

        travel_tips = [
            "Start early around 8:30 AM to beat midday sun and tour bus arrivals at popular monuments.",
            f"Public transit ({travel_mode}) in {dest_name.split(',')[0]} is budget-friendly; keep small cash notes (₹10, ₹20, ₹50) handy for bus tickets.",
            "Photography inside royal chambers often requires an inexpensive separate ticket.",
            "Wear comfortable slip-on footwear as heritage and temple complexes require removing shoes."
        ]

        caveats = [
            "All route travel durations and arrival times are estimates subject to traffic and weather.",
            "Monument opening hours and special illumination timings may shift on public holidays.",
            "Budget figures are illustrative estimates; actual dining and hotel tariffs fluctuate by season.",
            "Data source: " + ("Live Google Maps Platform" if places and places[0].source == "live" else "Seeded Demo Dataset (Mysuru/Bengaluru)")
        ]

        trip_id = f"trip_{uuid.uuid4().hex[:8]}"
        created_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

        return TripItinerary(
            id=trip_id,
            title=f"{duration_days}-Day Curated Journey in {dest_name.split(',')[0]}",
            overview=f"A thoughtfully paced itinerary from {source_loc} to {dest_name.split(',')[0]} designed for {travellers} {'person' if travellers == 1 else 'travellers'}, highlighting {', '.join(constraints.interests)} via {travel_mode}.",
            source_location=source_loc,
            destination=dest_name,
            duration_days=duration_days,
            travellers=travellers,
            transport_mode=travel_mode,
            departure_leg=departure_leg,
            days=days,
            budget_breakdown=BudgetBreakdown(
                items=budget_items,
                total_estimated=float(total_est),
                per_person_estimated=float(per_person),
                currency="INR",
                is_within_budget=is_within,
                note=budget_note
            ),
            travel_tips=travel_tips,
            assumptions_and_caveats=caveats,
            source="live" if places and places[0].source == "live" else "demo",
            created_at=created_time
        )
