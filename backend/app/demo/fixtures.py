from typing import List, Dict, Optional
from app.schemas.trip import (
    Place, PlaceCoordinates, PlaceReview, RouteLeg,
    PlaceReviewAnalysis, SentimentSummary, AspectAnalysis,
    BudgetItem, BudgetBreakdown, DayItinerary, ItineraryStop, TripItinerary
)

DEMO_PLACES: Dict[str, Place] = {
    # Mysuru
    "demo_mysuru_palace": Place(
        id="demo_mysuru_palace",
        name="Mysore Palace (Amba Vilas)",
        category="Heritage & Culture",
        address="Sayyaji Rao Rd, Agrahara, Chamrajpura, Mysuru, Karnataka 570001",
        coordinates=PlaceCoordinates(lat=12.3051, lng=76.6551),
        rating=4.7,
        user_ratings_total=98450,
        opening_hours=["10:00 AM - 5:30 PM (Daily)", "Illumination: Sun & Holidays 7:00 PM - 7:45 PM"],
        photo_url="https://images.unsplash.com/photo-1600100397608-f010e42f9b89?auto=format&fit=crop&w=800&q=80",
        price_level=1,
        website="https://www.mysorepalace.karnataka.gov.in",
        description="The majestic historic seat of the Wadiyar dynasty, showcasing Indo-Saracenic architecture with ornate durbar halls and grand arches.",
        source="demo"
    ),
    "demo_mysuru_chamundi": Place(
        id="demo_mysuru_chamundi",
        name="Chamundeshwari Temple",
        category="Spiritual & Scenic",
        address="Chamundi Hill Road, Mysuru, Karnataka 570010",
        coordinates=PlaceCoordinates(lat=12.2753, lng=76.6713),
        rating=4.6,
        user_ratings_total=43210,
        opening_hours=["07:30 AM - 02:00 PM", "03:30 PM - 06:00 PM", "07:30 PM - 09:00 PM"],
        photo_url="https://images.unsplash.com/photo-1627993078453-3b41d2e1bdfc?auto=format&fit=crop&w=800&q=80",
        price_level=1,
        website=None,
        description="Perched atop the 1,000-metre Chamundi Hills, offering panoramic views of Mysuru city alongside an ancient 17th-century temple.",
        source="demo"
    ),
    "demo_mysuru_devaraja": Place(
        id="demo_mysuru_devaraja",
        name="Devaraja Market",
        category="Local Bazaar & Food",
        address="Sayyaji Rao Rd, Shivarampet, Mysuru, Karnataka 570001",
        coordinates=PlaceCoordinates(lat=12.3094, lng=76.6515),
        rating=4.4,
        user_ratings_total=18900,
        opening_hours=["06:30 AM - 08:30 PM (Daily)"],
        photo_url="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        price_level=1,
        website=None,
        description="A vibrant century-old bazaar packed with stalls of fresh Mysore jasmine, colorful kumkum powders, heritage incense, and local fruits.",
        source="demo"
    ),
    "demo_mysuru_mylari": Place(
        id="demo_mysuru_mylari",
        name="Hotel Original Vinayaka Mylari",
        category="Local Dining",
        address="Shop No. 79, Nazarbad Main Rd, Near Police Station, Mysuru, Karnataka 570010",
        coordinates=PlaceCoordinates(lat=12.3087, lng=76.6622),
        rating=4.5,
        user_ratings_total=15400,
        opening_hours=["06:30 AM - 01:30 PM", "03:00 PM - 08:30 PM (Closed Wed)"],
        photo_url="https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80",
        price_level=1,
        website=None,
        description="Legendary tiny breakfast joint world-famous for its melt-in-mouth cloud-soft butter dosas served with fresh coconut chutney.",
        source="demo"
    ),
    "demo_mysuru_philomena": Place(
        id="demo_mysuru_philomena",
        name="St. Philomena's Cathedral",
        category="Heritage Architecture",
        address="Lashkar Mohalla, Ashoka Rd, Mysuru, Karnataka 570001",
        coordinates=PlaceCoordinates(lat=12.3212, lng=76.6575),
        rating=4.5,
        user_ratings_total=27800,
        opening_hours=["05:00 AM - 06:00 PM (Daily)"],
        photo_url="https://images.unsplash.com/photo-1548625361-195fe5795df5?auto=format&fit=crop&w=800&q=80",
        price_level=1,
        website=None,
        description="One of Asia's tallest churches, constructed in 1936 in Neo-Gothic style inspired by the Cologne Cathedral in Germany.",
        source="demo"
    ),
    "demo_mysuru_brindavan": Place(
        id="demo_mysuru_brindavan",
        name="Brindavan Gardens & KRS Dam",
        category="Nature & Evening Promenade",
        address="KRS Dam Road, Mandya District, near Mysuru 571607",
        coordinates=PlaceCoordinates(lat=12.4239, lng=76.5728),
        rating=4.2,
        user_ratings_total=54300,
        opening_hours=["06:30 AM - 09:00 PM (Music fountain: 6:30 PM - 7:30 PM)"],
        photo_url="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80",
        price_level=1,
        website=None,
        description="Expansive terrace gardens below the Krishnarajasagara dam, renowned for musical fountains, illuminated terrace water steps, and boat rides.",
        source="demo"
    ),

    # Bengaluru
    "demo_bengaluru_lalbagh": Place(
        id="demo_bengaluru_lalbagh",
        name="Lalbagh Botanical Garden",
        category="Nature & Botany",
        address="Mavalli, Bengaluru, Karnataka 560004",
        coordinates=PlaceCoordinates(lat=12.9507, lng=77.5848),
        rating=4.6,
        user_ratings_total=78200,
        opening_hours=["06:00 AM - 07:00 PM (Daily)"],
        photo_url="https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80",
        price_level=1,
        website="https://horticulture.karnataka.gov.in",
        description="Sprawling 240-acre historic garden commissioned by Hyder Ali, housing a celebrated Victorian Glass House and centuries-old trees.",
        source="demo"
    ),
    "demo_bengaluru_cubbon": Place(
        id="demo_bengaluru_cubbon",
        name="Cubbon Park",
        category="Nature & Leisure",
        address="Kasturba Rd, Behind High Court of Karnataka, Bengaluru 560001",
        coordinates=PlaceCoordinates(lat=12.9763, lng=77.5929),
        rating=4.6,
        user_ratings_total=64500,
        opening_hours=["06:00 AM - 08:00 PM (Vehicles restricted Sun)"],
        photo_url="https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80",
        price_level=1,
        website=None,
        description="The lush green lung of central Bengaluru featuring bamboo groves, colonial red brick buildings, and peaceful walking avenues.",
        source="demo"
    ),
    "demo_bengaluru_ctr": Place(
        id="demo_bengaluru_ctr",
        name="CTR (Shri Sagar) Malleshwaram",
        category="Heritage Cafe & Food",
        address="7th Cross Rd, Margosa Rd, Malleshwaram, Bengaluru 560003",
        coordinates=PlaceCoordinates(lat=13.0016, lng=77.5702),
        rating=4.6,
        user_ratings_total=32100,
        opening_hours=["07:30 AM - 12:30 PM", "04:00 PM - 09:30 PM (Daily)"],
        photo_url="https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
        price_level=1,
        website=None,
        description="Iconic 1920s heritage South Indian tiffin room celebrated for crispy golden benne masala dosas and frothy filter coffee.",
        source="demo"
    ),
    "demo_bengaluru_palace": Place(
        id="demo_bengaluru_palace",
        name="Bangalore Palace",
        category="Heritage & Architecture",
        address="Vasanth Nagar, Bengaluru, Karnataka 560052",
        coordinates=PlaceCoordinates(lat=12.9988, lng=77.5921),
        rating=4.3,
        user_ratings_total=49100,
        opening_hours=["10:00 AM - 05:30 PM (Daily)"],
        photo_url="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80",
        price_level=2,
        website=None,
        description="19th-century Tudor-style royal residence with fortified towers, stained glass windows, wood carvings, and historical portrait galleries.",
        source="demo"
    )
}

DEMO_REVIEWS: Dict[str, List[PlaceReview]] = {
    "demo_mysuru_palace": [
        PlaceReview(
            id="rev_mp_1",
            author_name="Aditi Sharma",
            rating=5,
            text="Spectacular architecture and rich heritage. The audio guide was very informative and the durbar hall with stained glass is breathtaking.",
            sentiment_label="positive",
            sentiment_score=0.96
        ),
        PlaceReview(
            id="rev_mp_2",
            author_name="Karthik Narayan",
            rating=5,
            text="The evening illumination on Sunday is pure magic! A must-visit landmark in Karnataka. Very well maintained premises.",
            sentiment_label="positive",
            sentiment_score=0.94
        ),
        PlaceReview(
            id="rev_mp_3",
            author_name="Rahul Verma",
            rating=3,
            text="The place itself is gorgeous, but the weekend crowd was overwhelming and footwear deposit queue took over 30 minutes in the hot sun.",
            sentiment_label="neutral",
            sentiment_score=0.48
        ),
        PlaceReview(
            id="rev_mp_4",
            author_name="Sophie Miller",
            rating=4,
            text="Historic rooms are grand and ornate. Guides are helpful though pushed a bit for extra tips. Overall a great cultural immersion.",
            sentiment_label="positive",
            sentiment_score=0.82
        ),
        PlaceReview(
            id="rev_mp_5",
            author_name="Venkatesh Rao",
            rating=2,
            text="Heavy crowd control issues near the inner sanctum stairs. Parking is disorganized on festival days.",
            sentiment_label="negative",
            sentiment_score=0.22
        )
    ],
    "demo_mysuru_mylari": [
        PlaceReview(
            id="rev_mm_1",
            author_name="Pooja Hegde",
            rating=5,
            text="Unbelievably soft and fluffy benne dosa! The sagu filling inside is savory perfection with fresh white butter on top.",
            sentiment_label="positive",
            sentiment_score=0.98
        ),
        PlaceReview(
            id="rev_mm_2",
            author_name="Naveen Kumar",
            rating=4,
            text="Authentic taste unchanged for decades. Filter coffee is piping hot and strong. Very affordable breakfast spot.",
            sentiment_label="positive",
            sentiment_score=0.88
        ),
        PlaceReview(
            id="rev_mm_3",
            author_name="Deepak Joshi",
            rating=3,
            text="Seating is very cramped and there is always a waiting line outside. Service is fast once seated though.",
            sentiment_label="neutral",
            sentiment_score=0.51
        ),
        PlaceReview(
            id="rev_mm_4",
            author_name="Ananya Roy",
            rating=5,
            text="Best breakfast experience in Mysuru hands down. Two dosas per person is the sweet spot. Truly comforting food.",
            sentiment_label="positive",
            sentiment_score=0.95
        )
    ]
}

def get_demo_route_leg(origin: Place, dest: Place, travel_mode: str) -> RouteLeg:
    # Deterministic geodesic approximation for demo route
    import math
    lat1, lon1 = origin.coordinates.lat, origin.coordinates.lng
    lat2, lon2 = dest.coordinates.lat, dest.coordinates.lng
    
    # Haversine distance in meters
    R = 6371000  # meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    direct_dist = R * c
    
    # Road routing factor (approx 1.35x crow-fly in city)
    road_dist = int(direct_dist * 1.35)
    if road_dist < 50:
        road_dist = 120
        
    # Speed assumptions based on mode
    speeds = {
        "walking": 1.25,     # ~4.5 km/h
        "bicycling": 3.8,    # ~14 km/h
        "transit": 4.5,      # ~16 km/h with stops
        "driving": 7.0       # ~25 km/h in city
    }
    speed = speeds.get(travel_mode, 4.5)
    duration_sec = int(road_dist / speed)

    # Format distance and duration with exact precision specifications
    if road_dist < 1000:
        fmt_dist = f"{road_dist} m"
    else:
        fmt_dist = f"{road_dist / 1000:.1f} km"

    mins = round(duration_sec / 60)
    if mins < 60:
        fmt_dur = f"{mins} min" if mins > 1 else "1 min"
    else:
        hours = mins // 60
        rem_mins = mins % 60
        fmt_dur = f"{hours}h {rem_mins}m" if rem_mins else f"{hours}h"

    return RouteLeg(
        origin_id=origin.id,
        destination_id=dest.id,
        origin_name=origin.name,
        destination_name=dest.name,
        distance_meters=road_dist,
        duration_seconds=duration_sec,
        formatted_distance=fmt_dist,
        formatted_duration=fmt_dur,
        travel_mode=travel_mode,
        is_traffic_aware=False,
        polyline=None,
        source="demo"
    )
