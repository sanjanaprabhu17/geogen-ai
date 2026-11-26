import httpx
import json
import re
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.schemas.trip import ChatMessage, AssistantChatResponse

class AssistantService:
    @classmethod
    async def answer_query(
        cls,
        message: str,
        trip_context: Optional[Dict[str, Any]] = None,
        history: Optional[List[ChatMessage]] = None
    ) -> AssistantChatResponse:
        # 1. Try Gemini API if key is configured
        if settings.has_gemini:
            res = await cls._answer_with_gemini(message, trip_context, history)
            if res:
                return res

        # 2. High-quality offline travel intelligence fallback
        return cls._offline_fallback_answer(message, trip_context)

    @classmethod
    async def _answer_with_gemini(
        cls,
        message: str,
        trip_context: Optional[Dict[str, Any]] = None,
        history: Optional[List[ChatMessage]] = None
    ) -> Optional[AssistantChatResponse]:
        context_str = ""
        if trip_context:
            context_str = f"""
CURRENT USER TRIP CONTEXT:
- Starting Location: {trip_context.get('source_location', 'Current Location')}
- Destination: {trip_context.get('destination', 'India')}
- Duration: {trip_context.get('duration_days', 2)} days
- Travellers: {trip_context.get('travellers', 2)}
- Transport Mode: {trip_context.get('transport_mode', 'transit')}
"""
            stops = trip_context.get('stops', [])
            if stops:
                context_str += f"- Planned Stops: {', '.join(stops[:6])}\n"
            if trip_context.get('budget'):
                context_str += f"- Budget: ₹{trip_context['budget']}\n"

        system_instruction = f"""You are GeoGen AI Assistant — the intelligent, conversational AI assistant for GeoGen AI spatial mapping and travel across India.

PRIMARY OBJECTIVE & IDENTITY:
- You are GeoGen AI Assistant. Your foremost specialty is spatial intelligence, road routing, interactive Mapbox maps, live Google Maps handoff, and travel planning in India (itineraries, budgets, local timings, monuments, cuisine, packing, safety, and cultural tips).

VERSATILITY (CRITICAL REQUIREMENT):
- While your primary domain is GeoGen AI and Indian travel/geography, you are powered by Google Gemini and MUST answer ANY question the user asks.
- Whether the user asks about world history, coding, science, sports, literature, mathematics, everyday queries, current events, or general chat, provide an intelligent, accurate, helpful, and polite response!
- Where natural, you may gently relate it back to GeoGen AI or Indian travel, but ALWAYS directly and thoroughly answer the user's specific inquiry first.
- NEVER refuse a question by saying you only answer travel questions.

{context_str}

Format your output strictly as a JSON object:
{{
  "reply": "Your markdown formatted reply",
  "suggested_followups": ["Relevant question 1?", "Relevant question 2?", "Relevant question 3?"]
}}
"""
        history_text = ""
        if history:
            for h in history[-4:]:
                history_text += f"{h.role.upper()}: {h.content}\n"

        prompt_body = f"{history_text}USER QUERY: {message}"

        # Highly reliable models supported on standard keys
        candidate_models = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash"]
        body = {
            "contents": [{"parts": [{"text": f"{system_instruction}\n\n{prompt_body}"}]}],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1000}
        }

        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.gemini_api_key}"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(url, json=body)
                    if resp.status_code == 200:
                        raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                        clean_json = re.sub(r'```(?:json)?', '', raw).strip('` \n')
                        
                        # Resilient parsing: attempt json parse first, then regex, then raw text
                        reply_text = None
                        followups = []
                        try:
                            data = json.loads(clean_json, strict=False)
                            reply_text = data.get("reply")
                            followups = data.get("suggested_followups", [])
                        except Exception:
                            m = re.search(r'"reply"\s*:\s*"(.*?)"(?:\s*,\s*"suggested_followups"|\s*})', clean_json, re.DOTALL)
                            if m:
                                reply_text = m.group(1).replace('\\"', '"').replace('\\n', '\n')
                            else:
                                reply_text = raw.replace("```json", "").replace("```", "").strip()

                        if not reply_text:
                            reply_text = raw.replace("```json", "").replace("```", "").strip()

                        if reply_text.strip().startswith('{"reply":') or reply_text.strip().startswith('{\n  "reply":'):
                            m2 = re.search(r'"reply"\s*:\s*"(.*?)"', reply_text, re.DOTALL)
                            if m2:
                                reply_text = m2.group(1).replace('\\"', '"').replace('\\n', '\n')

                        if not followups:
                            followups = [
                                "Can you tell me more about this?",
                                "How does this relate to GeoGen AI?",
                                "Can you plan an itinerary for me?"
                            ]

                        return AssistantChatResponse(
                            reply=reply_text,
                            suggested_followups=followups,
                            source="gemini"
                        )
            except Exception as e:
                print(f"Assistant Gemini {model} notice: {e}")
                continue
        return None

    @classmethod
    def _offline_fallback_answer(
        cls,
        message: str,
        trip_context: Optional[Dict[str, Any]] = None
    ) -> AssistantChatResponse:
        lower = message.lower()
        dest = trip_context.get("destination", "your destination") if trip_context else "India"

        if any(w in lower for w in ["google map", "navigation", "gps", "turn by turn", "direction"]):
            reply = f"""**Google Maps Live GPS Navigation:**

1. **For Intercity Route**: In your Day 1 itinerary, click the green **"Start Route in Google Maps (Source ➔ Stop 1) ↗"** button. This automatically opens the Google Maps mobile or web app with your starting location and initial destination waypoint.
2. **For Between-Stop Legs**: Look at the dashed route connector between any two stops and click **"Google Maps ↗"** or **"Navigate Leg to Next Stop in Google Maps"** to launch turn-by-turn driving or transit directions.
3. **Single Landmark Search**: Click **"Google Maps"** on any stop card to view live photos, street reviews, and official business hours."""
            followups = [
                "What is the best travel mode for this route?",
                "Are parking spots available near monuments?",
                "Can I download the PDF itinerary offline?"
            ]

        elif any(w in lower for w in ["dress", "cloth", "wear", "shoes", "temple code", "entry rules"]):
            reply = f"""**Dress Codes & Cultural Guidelines for {dest}:**

- **Heritage Temples & Sacred Shrines**: Conservative attire covering shoulders and knees is mandatory. Avoid sleeveless tops or short shorts. 
- **Footwear**: Shoes must be removed before entering sanctums and heritage courtyards. Slip-on sandals or easily removable shoes with socks (for sun-heated stone walkways) are strongly recommended.
- **Head Coverings**: Certain sacred shrines (e.g. Golden Temple, Gurudwaras, or select temples) require covering your head with a scarf or handkerchief."""
            followups = [
                "Are photography permits required?",
                "What is the best time of day to visit temples?",
                "Are entry tickets available online?"
            ]

        elif any(w in lower for w in ["ticket", "entry fee", "pass", "camera", "cost", "price"]):
            reply = f"""**Monument Entry & Ticket Advisory:**

- **Standard Entry**: Most Archeological Survey of India (ASI) and state heritage monuments charge between ₹20 to ₹50 for Indian residents and ₹300 to ₹600 for international visitors.
- **Online Booking**: For major landmarks (such as Taj Mahal, Mysore Palace, Amber Fort, and Red Fort), pre-booking online via official ASI or state tourism portals is recommended to bypass ticket queues.
- **Camera / Drone Permits**: Still mobile photography is typically free, while professional DSLRs or video equipment may require a nominal ₹50–₹100 token. Drones are strictly prohibited near historical monuments."""
            followups = [
                "How do I recalculate my trip budget?",
                "Are guided tours available at these monuments?",
                "What local foods should I try?"
            ]

        elif any(w in lower for w in ["pack", "luggage", "bring", "carry", "essentials", "weather"]):
            reply = f"""**Packing Essentials for {dest}:**

1. **Clothing**: Lightweight breathable cottons for daytime exploration; a light cardigan or shawl for air-conditioned transit or cool evening breezes.
2. **Hydration & Protection**: A reusable water bottle, sunscreen (SPF 30+), UV-protective sunglasses, and a wide-brim hat or umbrella.
3. **Payments & Cash**: While UPI (PhonePe, Google Pay, Paytm) is widely accepted across India, carry ₹500–₹1,000 in small denominations (₹10, ₹20, ₹50) for auto-rickshaws, shoe-drop stalls, and temple offerings.
4. **Power**: A 10,000 mAh power bank for high battery usage during GPS navigation."""
            followups = [
                "Is public transit safe for solo travelers?",
                "What are the best street food options?",
                "How do I export this itinerary as a PDF?"
            ]

        elif any(w in lower for w in ["food", "dish", "eat", "dining", "cuisine", "restaurant", "vegetarian", "sweet"]):
            reply = f"""**Culinary Recommendations for {dest}:**

- **Authentic Local Specialities**: Immerse yourself in the regional delicacies featured in your itinerary. If in Karnataka, savor authentic Dharwad Pedha or Mysore Masala Dosa; in Rajasthan, enjoy Dal Baati Churma; in Varanasi, try Banarasi Tamatar Chaat and freshly made Malaiyo.
- **Dietary Considerations**: Pure vegetarian and Jain dining options are ubiquitous across all stops in your itinerary. Look for the green vegetarian dot on menu boards or ask the restaurant staff for *"shuddh shakahari"*.
- **Water Safety**: Always opt for packaged mineral water or filtered in-house RO water at established eateries."""
            followups = [
                "What is the average food cost per day?",
                "Can I move or remove stops in the itinerary?",
                "How do I launch Google Maps directions?"
            ]

        elif any(w in lower for w in ["pdf", "export", "download", "print", "dossier", "report"]):
            reply = f"""**Exporting Your Itinerary Dossier:**

You can download a publication-ready PDF dossier of your trip to {dest} anytime:
1. In the top navigation bar or the planner header, click the **"Export Dossier"** button.
2. You'll be taken to the **Executive Travel Dossier** preview with your high-resolution vector road map, budget table, and stop breakdown.
3. Click **"Download Official PDF"** to save the document directly to your device for offline access during transit."""
            followups = [
                "Can I recalculate the route after editing stops?",
                "What are the best travel times to avoid traffic?",
                "How do I contact customer support?"
            ]

        else:
            reply = f"""Hello! I am your **GeoGen AI Travel Assistant**.

I am here to ensure your journey to **{dest}** is seamless, comfortable, and well-organized. You can ask me about:
- **Navigation & Routes**: Opening turn-by-turn driving, transit, or walking directions directly in Google Maps.
- **Sightseeing & Heritage**: Monument hours, entry ticket policies, and temple dress codes.
- **Logistics & Safety**: Packing recommendations, night safety tips, and local auto/bus transit advice.
- **Dining & Cuisine**: Iconic regional food spots, street snacks, and vegetarian dining.

How can I assist you with your trip today?"""
            followups = [
                "What are the essential packing tips?",
                "How do I open routes in Google Maps?",
                "Are entry tickets required for all stops?"
            ]

        return AssistantChatResponse(
            reply=reply,
            suggested_followups=followups,
            source="knowledge_base"
        )
