from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from cachetools import TTLCache, cached
import feedparser
from transformers import pipeline as hf_pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Model on Startup
print("Loading BART Large MNLI model...")
try:
    classifier = hf_pipeline("zero-shot-classification", model="facebook/bart-large-mnli", device=-1)
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    classifier = None

# Classification Labels
LABELS = [
    "Geopolitical Tension", 
    "Labor Strike", 
    "Raw Material Shortage",
    "Weather Disturbance",
    "Port Delay",
    "Supply Chain Safe",
    "Demand Fluctuation"
]

# 5 Minute Cache
headline_cache = TTLCache(maxsize=1, ttl=300)

# Geolocation map for port cities and countries
GEO_LOCATIONS = {
    "rotterdam": [51.9225, 4.4791],
    "los angeles": [33.7288, -118.2620],
    "la": [33.7288, -118.2620],
    "shenzhen": [22.5431, 114.0579],
    "panama": [9.1438, -79.7284],
    "suez": [30.5852, 32.2654],
    "shanghai": [31.2304, 121.4737],
    "singapore": [1.3521, 103.8198],
    "china": [35.8617, 104.1954],
    "us": [37.0902, -95.7129],
    "united states": [37.0902, -95.7129],
    "india": [20.5937, 78.9629],
    "europe": [54.5260, 15.2551],
    "taiwan": [23.6978, 120.9605],
    "germany": [51.1657, 10.4515],
    "japan": [36.2048, 138.2529],
    "baltimore": [39.2904, -76.6122]
}

@app.get("/risk")
@cached(cache=headline_cache)
def get_risk():
    if not classifier:
        raise HTTPException(status_code=500, detail="Backend AI Model is offline.")

    try:
        # Fetch Real Live News from GNews (Supply Chain scope)
        rss_url = "https://news.google.com/rss/search?q=supply+chain&hl=en-US&gl=US&ceid=US:en"
        feed = feedparser.parse(rss_url)
        
        results = []
        # Process the top 12 fresh headlines
        for entry in feed.entries[:12]:
            title = entry.title
            source = entry.source.title if hasattr(entry, 'source') else "Unknown News Source"
            
            # Predict risk category using BART
            predictions = classifier(title, LABELS)
            
            risk_type = predictions['labels'][0]
            risk_score = predictions['scores'][0] * 100
            
            # Avoid showing "Supply Chain Safe" with artificially high risk scores. 
            if risk_type == "Supply Chain Safe":
                risk_score = 100 - risk_score
                
            # Perform basic text geocoding
            assigned_lat = 0
            assigned_lng = 0
            title_lower = title.lower()
            for key, coords in GEO_LOCATIONS.items():
                if key in title_lower:
                    assigned_lat, assigned_lng = coords
                    break
                    
            # If no location matched, assign them to major land-based logistics hubs to avoid ocean scattering
            if assigned_lat == 0 and assigned_lng == 0:
                import random
                fallback_hubs = [
                    [53.5511, 9.9937],   # Hamburg, Germany
                    [35.6762, 139.6503], # Tokyo, Japan
                    [40.7128, -74.0060], # New York, USA
                    [1.3521, 103.8198],  # Singapore
                    [51.5074, -0.1278],  # London, UK
                    [-33.8688, 151.2093],# Sydney, Australia
                    [-23.5505, -46.6333],# Sao Paulo, Brazil
                    [25.2048, 55.2708]   # Dubai, UAE
                ]
                assigned_lat, assigned_lng = random.choice(fallback_hubs)

            results.append({
                "title": title,
                "source": source,
                "risk_type": risk_type,
                "risk_score": round(risk_score, 1),
                "explanation": f"Model classified confidentally as {risk_type}.",
                "lat": assigned_lat,
                "lng": assigned_lng
            })
            
        return results if results else []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))