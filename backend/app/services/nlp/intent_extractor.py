import re
import json
import httpx
from typing import Optional, List, Dict, Any
from app.core.config import settings
from app.schemas.trip import IntentExtractResponse, BudgetSchema

INDIAN_DESTINATION_MAP: Dict[str, str] = {
    # North India
    "delhi": "Delhi, India",
    "new delhi": "Delhi, India",
    "ncr": "Delhi NCR, India",
    "agra": "Agra, Uttar Pradesh, India",
    "varanasi": "Varanasi, Uttar Pradesh, India",
    "banaras": "Varanasi, Uttar Pradesh, India",
    "kashi": "Varanasi, Uttar Pradesh, India",
    "lucknow": "Lucknow, Uttar Pradesh, India",
    "jaipur": "Jaipur, Rajasthan, India",
    "udaipur": "Udaipur, Rajasthan, India",
    "jodhpur": "Jodhpur, Rajasthan, India",
    "jaisalmer": "Jaisalmer, Rajasthan, India",
    "pushkar": "Pushkar, Rajasthan, India",
    "amritsar": "Amritsar, Punjab, India",
    "chandigarh": "Chandigarh, India",
    "manali": "Manali, Himachal Pradesh, India",
    "shimla": "Shimla, Himachal Pradesh, India",
    "dharamshala": "Dharamshala, Himachal Pradesh, India",
    "kullu": "Kullu, Himachal Pradesh, India",
    "kasol": "Kasol, Himachal Pradesh, India",
    "spiti": "Spiti Valley, Himachal Pradesh, India",
    "rishikesh": "Rishikesh, Uttarakhand, India",
    "haridwar": "Haridwar, Uttarakhand, India",
    "dehradun": "Dehradun, Uttarakhand, India",
    "nainital": "Nainital, Uttarakhand, India",
    "mussoorie": "Mussoorie, Uttarakhand, India",
    "srinagar": "Srinagar, Jammu & Kashmir, India",
    "gulmarg": "Gulmarg, Jammu & Kashmir, India",
    "leh": "Leh, Ladakh, India",
    "ladakh": "Leh, Ladakh, India",

    # West India
    "mumbai": "Mumbai, Maharashtra, India",
    "bombay": "Mumbai, Maharashtra, India",
    "pune": "Pune, Maharashtra, India",
    "mahabaleshwar": "Mahabaleshwar, Maharashtra, India",
    "lonavala": "Lonavala, Maharashtra, India",
    "alibaug": "Alibaug, Maharashtra, India",
    "aurangabad": "Chhatrapati Sambhajinagar, Maharashtra, India",
    "goa": "Goa, India",
    "north goa": "North Goa, India",
    "south goa": "South Goa, India",
    "panaji": "Panaji, Goa, India",
    "ahmedabad": "Ahmedabad, Gujarat, India",
    "kutch": "Rann of Kutch, Gujarat, India",

    # South India
    "bengaluru": "Bengaluru, Karnataka, India",
    "bangalore": "Bengaluru, Karnataka, India",
    "mysuru": "Mysuru, Karnataka, India",
    "mysore": "Mysuru, Karnataka, India",
    "dharwad": "Dharwad, Karnataka, India",
    "hubballi": "Hubballi, Karnataka, India",
    "hubli": "Hubballi, Karnataka, India",
    "hampi": "Hampi, Karnataka, India",
    "gokarna": "Gokarna, Karnataka, India",
    "coorg": "Coorg, Karnataka, India",
    "madikeri": "Madikeri, Coorg, Karnataka, India",
    "chikmagalur": "Chikmagalur, Karnataka, India",
    "chikkamagaluru": "Chikmagalur, Karnataka, India",
    "badami": "Badami, Karnataka, India",
    "mangalore": "Mangaluru, Karnataka, India",
    "mangaluru": "Mangaluru, Karnataka, India",
    "hyderabad": "Hyderabad, Telangana, India",
    "visakhapatnam": "Visakhapatnam, Andhra Pradesh, India",
    "tirupati": "Tirupati, Andhra Pradesh, India",
    "chennai": "Chennai, Tamil Nadu, India",
    "madras": "Chennai, Tamil Nadu, India",
    "ooty": "Ooty, Tamil Nadu, India",
    "kodaikanal": "Kodaikanal, Tamil Nadu, India",
    "madurai": "Madurai, Tamil Nadu, India",
    "rameswaram": "Rameswaram, Tamil Nadu, India",
    "kanyakumari": "Kanyakumari, Tamil Nadu, India",
    "kochi": "Kochi, Kerala, India",
    "cochin": "Kochi, Kerala, India",
    "munnar": "Munnar, Kerala, India",
    "alleppey": "Alappuzha, Kerala, India",
    "alappuzha": "Alappuzha, Kerala, India",
    "wayanad": "Wayanad, Kerala, India",
    "varkala": "Varkala, Kerala, India",
    "thiruvananthapuram": "Thiruvananthapuram, Kerala, India",
    "pondicherry": "Puducherry, India",
    "puducherry": "Puducherry, India",

    # East & North-East India
    "kolkata": "Kolkata, West Bengal, India",
    "calcutta": "Kolkata, West Bengal, India",
    "darjeeling": "Darjeeling, West Bengal, India",
    "sunderbans": "Sundarbans, West Bengal, India",
    "bhubaneswar": "Bhubaneswar, Odisha, India",
    "puri": "Puri, Odisha, India",
    "konark": "Konark, Odisha, India",
    "gangtok": "Gangtok, Sikkim, India",
    "sikkim": "Sikkim, India",
    "shillong": "Shillong, Meghalaya, India",
    "cherrapunji": "Cherrapunji, Meghalaya, India",
    "guwahati": "Guwahati, Assam, India",
    "kaziranga": "Kaziranga, Assam, India"
}

class IntentExtractor:
    @classmethod
    async def extract(cls, prompt: str) -> IntentExtractResponse:
        # 1. If Gemini is available, use semantic understanding & most-resembling matching across India
        if settings.has_gemini:
            semantic_res = await cls._extract_with_gemini(prompt)
            if semantic_res and semantic_res.destination:
                return semantic_res

        # 2. Deterministic Fallback
        return cls.extract_deterministic(prompt)

    @classmethod
    async def _extract_with_gemini(cls, prompt: str) -> Optional[IntentExtractResponse]:
        # Primary model is gemini-flash-lite-latest (fast & high quota); fallbacks to flash
        candidate_models = ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-3-flash-preview"]
        sys_prompt = """You are an expert Indian Travel & Geographic Intelligence Parser.
The user will provide a travel request in natural language.
Your job is to extract:
1. "destination": The exact Indian city and state (e.g. "Jaipur, Rajasthan, India", "Manali, Himachal Pradesh, India", "Varanasi, Uttar Pradesh, India", "Goa, India", "Dharwad, Karnataka, India", "Kochi, Kerala, India").
CRITICAL: If the user describes a vibe, landscape, or activity without explicitly naming a city (e.g. "snow mountains and river rafting", "desert safari and royal forts", "coffee estates and misty waterfalls", "peaceful beach sunset with seafood", "spiritual temple ghats"), infer the MOST RESEMBLING, iconic Indian travel destination matching that description.
2. "duration_days": int (1 to 14, default 2).
3. "travellers": int (default 2).
4. "budget_amount": float or null.
5. "budget_scope": "total" or "per_person".
6. "interests": list of strings (e.g. ["heritage", "palaces", "culinary"]).
7. "transport_mode": "transit", "driving", "walking", or "bicycling".
8. "matched_reason": concise 1-sentence note explaining why this destination was chosen or matched.

Return ONLY a clean JSON object with no markdown backticks."""

        body = {
            "contents": [{"parts": [{"text": f"{sys_prompt}\n\nUser prompt: {prompt}"}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1000}
        }

        for model_name in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.gemini_api_key}"
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.post(url, json=body)
                    if res.status_code == 200:
                        raw_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                        clean_json = re.sub(r'```(?:json)?', '', raw_text).strip('` \n')
                        data = json.loads(clean_json)

                        budget = None
                        if data.get("budget_amount"):
                            budget = BudgetSchema(
                                amount=float(data["budget_amount"]),
                                currency="INR",
                                scope=data.get("budget_scope", "total")
                            )

                        dest = data.get("destination")
                        if dest and not dest.lower().endswith("india"):
                            dest = f"{dest}, India"

                        return IntentExtractResponse(
                            destination=dest,
                            duration_days=max(1, min(14, int(data.get("duration_days", 2)))),
                            travellers=max(1, min(20, int(data.get("travellers", 2)))),
                            budget=budget,
                            interests=data.get("interests", ["heritage", "nature"]),
                            transport_mode=data.get("transport_mode", "transit"),
                            start_date=None,
                            pace="moderate",
                            additional_constraints=[],
                            clarification_needed=data.get("matched_reason"),
                            raw_prompt=prompt
                        )
            except Exception as e:
                print(f"Gemini {model_name} notice: {e}")
                continue
        return None

    @staticmethod
    def extract_deterministic(prompt: str) -> IntentExtractResponse:
        text = prompt.strip()
        lower = text.lower()

        destination = None
        for city_key in sorted(INDIAN_DESTINATION_MAP.keys(), key=len, reverse=True):
            if re.search(r'\b' + re.escape(city_key) + r'\b', lower):
                destination = INDIAN_DESTINATION_MAP[city_key]
                break

        matched_reason = None
        if destination:
            matched_reason = f"Identified destination: {destination}"

        if not destination:
            # Semantic Vibe & Landscape Inference for all of India
            vibe_map = [
                (["desert", "dune", "sand", "camel"], "Jaisalmer, Rajasthan, India", "Matched to Jaisalmer for desert safari and golden sand dunes."),
                (["palace", "fort", "royal", "haveli"], "Jaipur, Rajasthan, India", "Matched to Jaipur for royal palaces and historic hill forts."),
                (["beach", "shack", "coastal", "seafood", "sea"], "Goa, India", "Matched to Goa for iconic coastal beaches, shacks, and seafood."),
                (["snow", "mountain", "pine", "rafting", "himalaya"], "Manali, Himachal Pradesh, India", "Matched to Manali for snow-capped Himalayan peaks and alpine adventures."),
                (["coffee", "estate", "misty", "plantation"], "Coorg, Karnataka, India", "Matched to Coorg for lush coffee plantations and misty waterfalls."),
                (["tea", "toy train", "darjeeling"], "Darjeeling, West Bengal, India", "Matched to Darjeeling for panoramic tea estates and Himalayan views."),
                (["backwater", "houseboat", "alleppey"], "Alappuzha, Kerala, India", "Matched to Alappuzha for serene Kerala backwaters and houseboats."),
                (["ghat", "ganga", "spiritual", "aarti", "kashi"], "Varanasi, Uttar Pradesh, India", "Matched to Varanasi for sacred Ganga ghats and evening aarti."),
                (["pedha", "chalukya", "kannada", "bendre"], "Dharwad, Karnataka, India", "Matched to Dharwad for heritage culture and famous Pedha confectionery."),
                (["tech", "cubbon", "lalbagh", "tiffin"], "Bengaluru, Karnataka, India", "Matched to Bengaluru for garden parks and iconic heritage tiffin rooms.")
            ]
            for keywords, dest, reason in vibe_map:
                if any(k in lower for k in keywords):
                    destination = dest
                    matched_reason = reason
                    break

        if not destination:
            match = re.search(r'\b(?:in|to|near|around|visit|explore)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)', text, re.IGNORECASE)
            if match:
                extracted = match.group(1).strip()
                extracted = re.sub(r'\s+(?:for|with|under|using|at|on|by|and|during)$', '', extracted, flags=re.IGNORECASE).strip()
                invalid_tokens = ["a", "the", "two", "three", "four", "public", "budget", "for", "with", "my", "our"]
                if extracted.lower() not in invalid_tokens:
                    if not extracted.lower().endswith("india"):
                        destination = f"{extracted.title()}, India"
                    else:
                        destination = extracted.title()
                    matched_reason = f"Parsed destination from prompt: {destination}"

        duration_days = 2
        day_match = re.search(r'(\d+)\s*[- ]?day', lower)
        if day_match:
            duration_days = max(1, min(14, int(day_match.group(1))))
        elif "weekend" in lower:
            duration_days = 2
        elif "one day" in lower or "single day" in lower:
            duration_days = 1

        travellers = 2
        if any(w in lower for w in ["solo", "alone", "myself"]):
            travellers = 1
        elif any(w in lower for w in ["couple", "two people", "2 people", "for two"]):
            travellers = 2
        elif "family" in lower:
            travellers = 4
        else:
            trav_match = re.search(r'(?:for\s+)?(\d+)\s*(?:people|persons|travellers|travelers|friends|adults)', lower)
            if trav_match:
                travellers = max(1, min(20, int(trav_match.group(1))))

        budget = None
        amt_match = re.search(r'(?:under|budget|cost|within|around|spend)\s*(?:of\s*)?[₹]?\s*([0-9,]+)\s*(k)?', lower)
        if amt_match:
            val_str = amt_match.group(1).replace(",", "")
            amount = float(val_str)
            if amt_match.group(2) == 'k':
                amount *= 1000
            scope = "per_person" if any(w in lower for w in ["per person", "per head", "each"]) else "total"
            budget = BudgetSchema(amount=amount, currency="INR", scope=scope)

        interests = []
        interest_keywords = {
            "food": ["food", "culinary", "dishes", "dosa", "dining", "cuisine", "taste", "street food", "restaurant", "sweets", "chaat", "biryani", "thali"],
            "heritage": ["heritage", "palace", "history", "historical", "temple", "monument", "architecture", "culture", "cultural", "fort", "museum"],
            "nature": ["nature", "park", "garden", "hill", "lake", "view", "greenery", "wildlife", "botanical", "mountains", "scenic", "beach", "waterfall", "sea"],
            "relaxed": ["relaxed", "chill", "peaceful", "slow", "quiet", "leisure", "sunset"],
            "shopping": ["shopping", "market", "bazaar", "souvenir", "silk", "handicrafts", "textiles"],
            "adventure": ["adventure", "trek", "hike", "thrill", "sports", "rafting", "camping"]
        }
        for category, kws in interest_keywords.items():
            if any(k in lower for k in kws):
                interests.append(category)
        if not interests:
            interests = ["heritage", "nature", "food"]

        transport_mode = "transit"
        if any(w in lower for w in ["drive", "car", "driving", "taxi", "cab", "uber", "ola", "rental"]):
            transport_mode = "driving"
        elif any(w in lower for w in ["walk", "walking", "foot"]):
            transport_mode = "walking"
        elif any(w in lower for w in ["cycle", "cycling", "bicycle", "bike"]):
            transport_mode = "bicycling"

        return IntentExtractResponse(
            destination=destination,
            duration_days=duration_days,
            travellers=travellers,
            budget=budget,
            interests=interests,
            transport_mode=transport_mode,
            start_date=None,
            pace="moderate",
            additional_constraints=[],
            clarification_needed=matched_reason or (f"Parsed destination: {destination}" if destination else "Please specify an Indian destination."),
            raw_prompt=prompt
        )
