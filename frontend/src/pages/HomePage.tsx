import React, { useState, useEffect } from 'react';
import {
  Clock, Users, Wallet, Navigation, MapPin,
  Sparkles, Compass, Route, ChevronDown, ChevronUp,
  ExternalLink, Crosshair, FileCheck2
} from 'lucide-react';
import type { TripItinerary, IntentConstraints } from '../types';
import { api } from '../services/api';

interface HomePageProps {
  onTripGenerated: (trip: TripItinerary) => void;
}

const POPULAR_DESTINATIONS = [
  "Mysuru", "Coorg", "Goa", "Jaipur", "Manali",
  "Varanasi", "Ooty", "Hampi", "Kochi", "Dharwad"
];

const LOADING_STAGES = [
  "1. Resolving source & destination coordinates...",
  "2. Querying Mapbox for real locations & road geometry...",
  "3. Calculating live road distances & transit durations...",
  "4. Running instant NLP review sentiment pipeline...",
  "5. Generating grounded itinerary & budget dossier..."
];

export const HomePage: React.FC<HomePageProps> = ({ onTripGenerated }) => {
  // Source & Destination
  const [source, setSource] = useState<string>("📍 Current Location");
  const [sourceCoords, setSourceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<string>("Mysuru");
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationSuccess, setLocationSuccess] = useState<boolean>(false);

  // Quick constraints
  const [days, setDays] = useState<number>(2);
  const [travellers, setTravellers] = useState<number>(2);
  const [budgetAmount, setBudgetAmount] = useState<number>(6000);
  const [budgetScope, setBudgetScope] = useState<'total' | 'per_person'>('total');
  const [transportMode, setTransportMode] = useState<'transit' | 'driving' | 'walking' | 'bicycling'>('transit');
  const [interests, setInterests] = useState<string[]>(["heritage", "food"]);

  // Optional extra notes
  const [notes, setNotes] = useState<string>("");
  const [showNotes, setShowNotes] = useState<boolean>(false);

  // Loading & error
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const resolveLocation = async (lat: number, lng: number) => {
    setSourceCoords({ lat, lng });
    setLocationSuccess(true);
    try {
      const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality,district&access_token=${MAPBOX_TOKEN}`);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const placeName = data.features[0].place_name;
          setSource(`📍 ${placeName}`);
          return;
        }
      }
    } catch {}
    setSource(`📍 Detected Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
  };

  // Attempt auto-detecting location on mount
  useEffect(() => {
    if (navigator.geolocation && (source === "📍 Current Location" || !sourceCoords)) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolveLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Fallback to Dharwad, Karnataka
          setSource("📍 Dharwad, Karnataka, India");
          setSourceCoords({ lat: 15.4589, lng: 75.0078 });
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    }
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        resolveLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn("Location detection notice:", err);
        setSource("📍 Dharwad, Karnataka, India");
        setSourceCoords({ lat: 15.4589, lng: 75.0078 });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const toggleInterest = (vibe: string) => {
    setInterests(prev => 
      prev.includes(vibe) ? prev.filter(i => i !== vibe) : [...prev, vibe]
    );
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!destination.trim()) {
      setError("Please specify a Destination to generate your itinerary.");
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingStage(0);

    const stageTimer = setInterval(() => {
      setLoadingStage(s => (s < LOADING_STAGES.length - 1 ? s + 1 : s));
    }, 450);

    try {
      const cleanSource = source.replace("📍", "").trim() || "Current Location";
      const cleanDest = destination.trim().toLowerCase().includes("india")
        ? destination.trim()
        : `${destination.trim()}, India`;

      const promptStr = notes.trim()
        ? `Trip from ${cleanSource} to ${cleanDest}: ${notes.trim()}`
        : `Trip from ${cleanSource} to ${cleanDest}`;

      const constraints: IntentConstraints = {
        source_location: cleanSource,
        destination: cleanDest,
        duration_days: days,
        travellers: travellers,
        transport_mode: transportMode,
        interests: interests.length ? interests : ["heritage", "nature"],
        budget: budgetAmount > 0 ? {
          amount: budgetAmount,
          currency: 'INR',
          scope: budgetScope
        } : null,
        raw_prompt: promptStr,
        pace: 'moderate',
        additional_constraints: notes.trim() ? [notes.trim()] : [],
        source_lat: sourceCoords?.lat,
        source_lng: sourceCoords?.lng
      };

      const trip = await api.generateTrip(
        promptStr,
        constraints,
        undefined,
        cleanSource,
        cleanDest,
        sourceCoords?.lat,
        sourceCoords?.lng
      );

      clearInterval(stageTimer);
      setLoading(false);
      onTripGenerated(trip);
    } catch (err: any) {
      clearInterval(stageTimer);
      setLoading(false);
      setError(err.message || "Failed to generate itinerary. Please try again.");
    }
  };

  return (
    <div style={{ position: 'relative', overflowX: 'hidden' }}>
      {/* Warm Ambient Radial Horizon Glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1200px',
        height: '420px',
        background: 'radial-gradient(ellipse at top, rgba(249, 115, 22, 0.16) 0%, rgba(217, 119, 6, 0.05) 45%, transparent 75%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>
        
        {/* ================= HERO SECTION ================= */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.9rem',
            borderRadius: '9999px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-dark)',
            marginBottom: '1.25rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-muted)'
          }}>
            <Sparkles size={14} color="#F97316" />
            <span>AI-Powered Location & Real-Time Route Intelligence</span>
          </div>

          <h1 className="font-editorial" style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)',
            fontWeight: 700,
            lineHeight: 1.08,
            color: 'var(--text-main)',
            maxWidth: '920px',
            margin: '0 auto 1.5rem'
          }}>
            Direct Source-to-Destination <br />
            <span style={{
              background: 'linear-gradient(135deg, #F97316 0%, #F59E0B 50%, #38BDF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Real-Time Travel Planning
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
            color: 'var(--text-muted)',
            maxWidth: '680px',
            margin: '0 auto 2rem',
            lineHeight: 1.6
          }}>
            Enter your destination and depart directly from your current location with live Mapbox road geometry, chronological timelines, and turn-by-turn Google Maps navigation.
          </p>
        </div>

        {/* ================= COMPOSER SECTION (SOURCE ➔ DESTINATION) ================= */}
        <div id="composer" style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-dark)',
          borderRadius: '16px',
          padding: '2.25rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          marginBottom: '5rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <span className="text-meta" style={{ color: 'var(--accent-primary)' }}>Route & Itinerary Engine</span>
            <h2 className="font-editorial" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.3rem' }}>
              Plan Your Journey
            </h2>
          </div>

          <form onSubmit={handleGenerate}>
            {/* SOURCE & DESTINATION DUAL CARDS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              {/* SOURCE (START POINT) */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-dark)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <label className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10B981' }}>
                    <MapPin size={14} color="#10B981" /> Source / Starting Point
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.6rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-dark)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: isLocating ? 'wait' : 'pointer'
                    }}
                  >
                    <Crosshair size={12} color="#10B981" />
                    {isLocating ? 'Detecting...' : (locationSuccess ? '📍 GPS Active' : 'Detect GPS')}
                  </button>
                </div>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Current Location or Starting City"
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: '8px',
                    padding: '0.75rem 0.9rem',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    fontWeight: 600
                  }}
                />
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {["📍 Current Location", "Bengaluru", "Mumbai", "Delhi"].map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setSource(city)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        backgroundColor: source === city ? 'var(--text-main)' : 'var(--bg-surface)',
                        color: source === city ? 'var(--bg-primary)' : 'var(--text-muted)',
                        border: '1px solid var(--border-dark)',
                        cursor: 'pointer'
                      }}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* DESTINATION */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-dark)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <label className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', marginBottom: '0.6rem' }}>
                  <Navigation size={14} color="var(--accent-primary)" /> Destination (India)
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Mysuru, Coorg, Goa, Jaipur, Varanasi..."
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: '8px',
                    padding: '0.75rem 0.9rem',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    fontWeight: 600
                  }}
                />
                {/* Popular Destination Quick Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {POPULAR_DESTINATIONS.slice(0, 6).map(dest => (
                    <button
                      key={dest}
                      type="button"
                      onClick={() => setDestination(dest)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        backgroundColor: destination === dest ? 'var(--accent-primary)' : 'var(--bg-surface)',
                        color: destination === dest ? '#0F172A' : 'var(--text-muted)',
                        border: '1px solid var(--border-dark)',
                        fontWeight: destination === dest ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {dest}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Constraint Controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '10px',
              border: '1px solid var(--border-dark)',
              marginBottom: '1.5rem'
            }}>
              <div>
                <label className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <Clock size={13} /> Duration (Days)
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: '6px',
                    padding: '0.55rem 0.75rem',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                >
                  {[1, 2, 3, 4, 5].map(d => (
                    <option key={d} value={d}>{d} Day{d > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <Users size={13} /> Travellers
                </label>
                <select
                  value={travellers}
                  onChange={(e) => setTravellers(Number(e.target.value))}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: '6px',
                    padding: '0.55rem 0.75rem',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                >
                  {[1, 2, 3, 4, 6].map(t => (
                    <option key={t} value={t}>{t} Person{t > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <Wallet size={13} /> Budget (INR)
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(Number(e.target.value))}
                    step="500"
                    style={{
                      width: '60%',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-dark)',
                      borderRadius: '6px',
                      padding: '0.55rem 0.75rem',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem'
                    }}
                  />
                  <select
                    value={budgetScope}
                    onChange={(e) => setBudgetScope(e.target.value as any)}
                    style={{
                      width: '40%',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-dark)',
                      borderRadius: '6px',
                      padding: '0.55rem 0.4rem',
                      color: 'var(--text-main)',
                      fontSize: '0.75rem'
                    }}
                  >
                    <option value="total">Total</option>
                    <option value="per_person">Per Head</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Travel Mode & Vibes */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <span className="text-meta" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Travel Mode
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[
                    { id: 'transit', label: 'Transit / Bus' },
                    { id: 'driving', label: 'Driving / Cab' },
                    { id: 'walking', label: 'Walking' },
                    { id: 'bicycling', label: 'Bicycle' }
                  ].map(m => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setTransportMode(m.id as any)}
                      className={`pill-chip ${transportMode === m.id ? 'active' : ''}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-meta" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Vibe & Interests
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['heritage', 'food', 'nature', 'relaxed', 'shopping', 'adventure'].map(v => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => toggleInterest(v)}
                      className={`pill-chip ${interests.includes(v) ? 'active' : ''}`}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* OPTIONAL NOTES ACCORDION */}
            <div style={{ marginBottom: '1.75rem' }}>
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showNotes ? "Hide Trip Notes / Special Requests" : "＋ Add Trip Notes / Special Requests (Optional)"}
              </button>
              {showNotes && (
                <div style={{ marginTop: '0.6rem' }}>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Vegetarian food preference, traveling with elderly parents, interested in sunrise photography..."
                    rows={2}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-dark)',
                      borderRadius: '8px',
                      padding: '0.75rem 0.9rem',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '6px',
                color: 'var(--accent-rose)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem'
              }}>
                {error}
              </div>
            )}

            {loading ? (
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-dark)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-dark)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                <div className="font-editorial" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  {LOADING_STAGES[loadingStage]}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Planning departure from {source} to {destination} with live Mapbox road transit.
                </p>
              </div>
            ) : (
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: 'var(--text-main)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                }}
              >
                <span>Generate Route & Journey: {source.replace("📍", "").trim()} ➔ {destination}</span>
                <Route size={18} />
              </button>
            )}
          </form>
        </div>

        {/* ================= PLATFORM PILLARS ================= */}
        <div style={{ marginBottom: '6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="text-meta" style={{ color: 'var(--accent-primary)' }}>Architecture & Intelligence</span>
            <h2 className="font-editorial" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.4rem' }}>
              Built for Real-World Spatial Precision
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {[
              {
                icon: MapPin,
                color: '#38BDF8',
                title: "Live Mapbox Spatial Polylines",
                desc: "Renders authentic road transit networks across India with real turn-by-turn coordinate geometry."
              },
              {
                icon: ExternalLink,
                color: '#10B981',
                title: "1-Click Google Maps GPS",
                desc: "Seamlessly hand off route legs to the Google Maps app for live turn-by-turn driving, walking, or transit."
              },
              {
                icon: Compass,
                color: '#F59E0B',
                title: "Origin-to-Destination Routing",
                desc: "Calculate departure routes from your current GPS location directly to the destination with intercity estimates."
              },
              {
                icon: FileCheck2,
                color: '#EC4899',
                title: "Chronological Day Timelines",
                desc: "Realistic 9:00 AM sequential itineraries with visit durations, route times, and transparent budget breakdowns."
              }
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: '12px',
                    padding: '1.75rem',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--border-dark)'
                  }}>
                    <Icon size={20} color={card.color} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= FAQ SECTION ================= */}
        <div style={{ maxWidth: '800px', margin: '0 auto 6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span className="text-meta" style={{ color: 'var(--accent-primary)' }}>Frequently Asked Questions</span>
            <h2 className="font-editorial" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.3rem' }}>
              GeoGen Platform Details
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              {
                q: "How does the 'Current Location' source work?",
                a: "GeoGen AI requests browser geolocation permission to detect your live latitude and longitude. When enabled, your journey departure leg connects your current point directly to the destination city."
              },
              {
                q: "How does the Google Maps live hand-off work?",
                a: "Every route leg and place includes a direct 'Google Maps' deep-link. Clicking it opens the Google Maps mobile or web app pre-populated with your exact origin and destination coordinates."
              },
              {
                q: "Can I enter any city in India?",
                a: "Yes! GeoGen AI supports any destination across all Indian states and union territories, with zero-latency pre-seeded databases for major travel hubs and live geocoding for all others."
              }
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '1.2rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-main)',
                      fontSize: '0.98rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 1.5rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
