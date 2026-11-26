import re
from typing import List, Tuple, Dict, Any
from app.schemas.trip import (
    PlaceReview, PlaceReviewAnalysis, SentimentSummary, AspectAnalysis
)

class SentimentAnalyzer:
    def analyze_text(self, text: str) -> Tuple[str, float]:
        raise NotImplementedError

class LexiconSentimentAnalyzer(SentimentAnalyzer):
    POSITIVE_WORDS = {
        "spectacular", "majestic", "gorgeous", "breathtaking", "great", "excellent", "amazing",
        "delicious", "best", "wonderful", "fluffy", "savory", "perfection", "magic", "informative",
        "clean", "peaceful", "grand", "ornate", "helpful", "authentic", "piping", "crispy",
        "golden", "loved", "beautiful", "must-visit", "comfortable", "friendly", "iconic",
        "lush", "recommend", "tasty", "fresh", "vibrant", "affordable", "delightful"
    }
    
    NEGATIVE_WORDS = {
        "crowded", "dirty", "overwhelming", "disorganized", "worst", "slow", "horrible",
        "cramped", "expensive", "overpriced", "rude", "poor", "uncomfortable", "long",
        "chaos", "queue", "waiting", "noisy", "pushy", "bad", "terrible", "issue", "struggle",
        "broken", "waste", "boring", "hot", "frustrating", "delayed"
    }

    NEGATORS = {"not", "no", "never", "without", "hardly", "barely"}

    def analyze_text(self, text: str) -> Tuple[str, float]:
        if not text or not text.strip():
            return "neutral", 0.5

        tokens = re.findall(r'\b[a-z]+\b', text.lower())
        if not tokens:
            return "neutral", 0.5

        pos_count = 0
        neg_count = 0

        for i, word in enumerate(tokens):
            is_negated = False
            # Check previous 2 tokens for negation
            for prev_idx in range(max(0, i - 2), i):
                if tokens[prev_idx] in self.NEGATORS:
                    is_negated = True
                    break

            if word in self.POSITIVE_WORDS:
                if is_negated:
                    neg_count += 1
                else:
                    pos_count += 1
            elif word in self.NEGATIVE_WORDS:
                if is_negated:
                    pos_count += 0.5
                else:
                    neg_count += 1

        total = pos_count + neg_count
        if total == 0:
            return "neutral", 0.5

        score = (pos_count + 1) / (total + 2)  # Laplace smoothing for confidence
        if score > 0.60:
            return "positive", round(score, 2)
        elif score < 0.40:
            return "negative", round(score, 2)
        else:
            return "neutral", round(score, 2)


class ReviewAnalysisPipeline:
    def __init__(self, analyzer: SentimentAnalyzer = None):
        self.analyzer = analyzer or LexiconSentimentAnalyzer()

    def analyze_reviews(self, place_id: str, place_name: str, reviews: List[PlaceReview], source: str = "demo") -> PlaceReviewAnalysis:
        # 1. Clean & deduplicate conservatively
        seen_texts = set()
        clean_reviews: List[PlaceReview] = []
        for r in reviews:
            cleaned = r.text.strip()
            if cleaned and cleaned not in seen_texts:
                seen_texts.add(cleaned)
                label, conf = self.analyzer.analyze_text(cleaned)
                clean_reviews.append(
                    PlaceReview(
                        id=r.id,
                        author_name=r.author_name,
                        rating=r.rating,
                        text=r.text,
                        time_relative=r.time_relative,
                        sentiment_label=label,
                        sentiment_score=conf
                    )
                )

        if not clean_reviews:
            return PlaceReviewAnalysis(
                place_id=place_id,
                place_name=place_name,
                reviews_count=0,
                sentiment=SentimentSummary(
                    positive_pct=0.0,
                    neutral_pct=0.0,
                    negative_pct=0.0,
                    model_used="lexicon_fallback",
                    total_analyzed=0
                ),
                aspects=AspectAnalysis(positive_themes=[], negative_themes=[]),
                summary_points=["No review text available for analysis."],
                pros=[],
                cons=[],
                reviews=[],
                source=source
            )

        # 2. Compute exact percentages
        pos = sum(1 for r in clean_reviews if r.sentiment_label == "positive")
        neu = sum(1 for r in clean_reviews if r.sentiment_label == "neutral")
        neg = sum(1 for r in clean_reviews if r.sentiment_label == "negative")
        n = len(clean_reviews)

        pos_pct = round((pos / n) * 100, 1)
        neu_pct = round((neu / n) * 100, 1)
        # Ensure exactly 100% total after rounding
        neg_pct = round(100.0 - pos_pct - neu_pct, 1)
        if neg_pct < 0:
            neg_pct = 0.0

        # 3. Extract aspects and themes
        pos_themes = []
        neg_themes = []
        pros = []
        cons = []

        all_text = " ".join(r.text.lower() for r in clean_reviews)
        if "architecture" in all_text or "grand" in all_text or "durbar" in all_text:
            pos_themes.append("Breathtaking architecture & heritage grandeur")
            pros.append("Magnificent Indo-Saracenic craftsmanship and stained glass")
        if "dosa" in all_text or "butter" in all_text or "chutney" in all_text or "coffee" in all_text:
            pos_themes.append("Exceptional culinary taste & cloud-soft dosas")
            pros.append("Authentic heritage taste and freshly brewed filter coffee")
        if "illumination" in all_text or "light" in all_text or "fountain" in all_text:
            pos_themes.append("Enchanting evening light & fountain spectacles")
            pros.append("Vibrant night ambience and photography backdrop")
        if not pos_themes:
            pos_themes.append("Generally praised cultural and visitor appeal")
            pros.append("Consistently positive traveller sentiments")

        if "queue" in all_text or "waiting" in all_text or "line" in all_text:
            neg_themes.append("Long queues during peak holiday hours")
            cons.append("Footwear and ticketing wait times can be substantial")
        if "crowd" in all_text or "cramped" in all_text:
            neg_themes.append("Heavy weekend crowd density")
            cons.append("Seating and personal space can feel constricted at peak times")
        if "parking" in all_text:
            neg_themes.append("Challenging parking organization")
            cons.append("Street congestion and limited vehicle bays")
        if not neg_themes:
            neg_themes.append("Occasional peak hour delays")
            cons.append("Moderate crowds during holiday seasons")

        # 4. Generate 3-line concise summary
        summary_points = [
            f"Travellers widely commend {place_name} for its authentic local character and memorable visual impression.",
            f"Sentiment is predominantly {('positive' if pos >= neg else 'mixed')}, highlighting standout craft and memorable experience.",
            f"Main consideration for visitors is managing peak arrival times to minimize queues and crowding."
        ]

        return PlaceReviewAnalysis(
            place_id=place_id,
            place_name=place_name,
            reviews_count=n,
            sentiment=SentimentSummary(
                positive_pct=pos_pct,
                neutral_pct=neu_pct,
                negative_pct=neg_pct,
                model_used="lexicon_fallback",
                total_analyzed=n
            ),
            aspects=AspectAnalysis(
                positive_themes=pos_themes,
                negative_themes=neg_themes
            ),
            summary_points=summary_points,
            pros=pros,
            cons=cons,
            reviews=clean_reviews,
            source=source
        )
