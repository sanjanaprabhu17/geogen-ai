import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "development")
    data_mode: str = os.getenv("DATA_MODE", "live").lower()
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    mapbox_access_token: str = os.getenv("MAPBOX_ACCESS_TOKEN", "")
    google_maps_server_api_key: str = os.getenv("GOOGLE_MAPS_SERVER_API_KEY", "")
    vite_google_maps_browser_key: str = os.getenv("VITE_GOOGLE_MAPS_BROWSER_KEY", "")
    vite_mapbox_token: str = os.getenv("VITE_MAPBOX_TOKEN", "")
    sentiment_model: str = os.getenv("SENTIMENT_MODEL", "lexicon_fallback")

    @property
    def is_demo(self) -> bool:
        return self.data_mode == "demo" and not (self.google_maps_server_api_key or self.mapbox_access_token or self.gemini_api_key)

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key and self.gemini_api_key.strip())

    @property
    def has_maps(self) -> bool:
        return bool(self.google_maps_server_api_key or self.mapbox_access_token)

settings = Settings()
