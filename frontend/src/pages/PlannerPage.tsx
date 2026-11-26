import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, ArrowUp, ArrowDown, Trash2,
  Car, Bus, Footprints, Bike, Sparkles, BarChart3, FileText, Navigation, ExternalLink,
  Maximize2
} from 'lucide-react';
import type { TripItinerary, ItineraryStop } from '../types';
import { api } from '../services/api';
import mapboxgl from 'mapbox-gl';

interface PlannerPageProps {
  trip: TripItinerary;
  theme?: 'dark' | 'light';
  onTripUpdated: (updatedTrip: TripItinerary) => void;
  onSelectPlaceForAnalysis: (placeId: string) => void;
  onNavigateToReport: () => void;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const PlannerPage: React.FC<PlannerPageProps> = ({
  trip,
  theme = 'dark',
  onTripUpdated,
  onSelectPlaceForAnalysis,
  onNavigateToReport
}) => {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    trip.days[0]?.stops[0]?.place_id || null
  );
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [mobileView, setMobileView] = useState<'both' | 'map' | 'timeline'>('both');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  const activeDay = trip.days[activeDayIndex] || trip.days[0];
  const allStops = trip.days.flatMap(d => d.stops);

  // Helper to open Google Maps turn-by-turn directions
  const openGoogleMapsDirections = (
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    mode: string = 'driving'
  ) => {
    const gMode = mode === 'transit' ? 'transit' : (mode === 'walking' ? 'walking' : (mode === 'bicycling' ? 'bicycling' : 'driving'));
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=${gMode}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper to open Google Maps for a single place
  const openGoogleMapsPlace = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}+${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper to render DOM markers immediately on the map canvas
  const renderMarkers = (map: mapboxgl.Map, stops: ItineraryStop[], currentSelectedId: string | null) => {
    // Remove existing markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    // On Day 1, render Source Departure Marker if departure_leg exists
    if (activeDayIndex === 0 && trip.departure_leg) {
      let srcLng = 75.0078;
      let srcLat = 15.4589;
      if (trip.departure_leg.polyline) {
        try {
          const parsedDep = JSON.parse(trip.departure_leg.polyline);
          if (Array.isArray(parsedDep) && parsedDep.length > 0) {
            srcLng = parsedDep[0][0];
            srcLat = parsedDep[0][1];
          }
        } catch {}
      }

      const srcEl = document.createElement('div');
      srcEl.className = 'custom-map-marker source-marker-pulse';
      srcEl.style.width = '36px';
      srcEl.style.height = '36px';
      srcEl.style.borderRadius = '50%';
      srcEl.style.backgroundColor = '#10B981';
      srcEl.style.border = '3px solid #FFFFFF';
      srcEl.style.color = '#FFFFFF';
      srcEl.style.display = 'flex';
      srcEl.style.alignItems = 'center';
      srcEl.style.justifyContent = 'center';
      srcEl.style.fontWeight = '800';
      srcEl.style.fontSize = '10px';
      srcEl.style.cursor = 'pointer';
      srcEl.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.45)';
      srcEl.innerText = 'START';

      const srcPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="color: #0F172A; padding: 6px; font-family: sans-serif;">
          <div style="font-size: 11px; font-weight: 700; color: #10B981;">JOURNEY ORIGIN</div>
          <b style="font-size: 13px;">${trip.source_location || 'Current Location'}</b><br/>
          <span style="font-size: 11px; color: #64748B;">Departure to ${trip.destination}</span>
        </div>
      `);

      const srcMarker = new mapboxgl.Marker(srcEl)
        .setLngLat([srcLng, srcLat])
        .setPopup(srcPopup)
        .addTo(map);

      markersRef.current['__source_origin__'] = srcMarker;
    }

    // Add Stop Markers
    stops.forEach((stop) => {
      const lng = stop.place.coordinates.lng;
      const lat = stop.place.coordinates.lat;
      const isSelected = currentSelectedId === stop.place_id;

      const el = document.createElement('div');
      el.className = `custom-map-marker ${isSelected ? 'active-marker' : ''}`;
      el.style.width = isSelected ? '38px' : '32px';
      el.style.height = isSelected ? '38px' : '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = isSelected ? '#F97316' : (theme === 'dark' ? '#0F172A' : '#FFFFFF');
      el.style.border = isSelected ? '3px solid #FFFFFF' : '2px solid #38BDF8';
      el.style.color = isSelected ? '#FFFFFF' : (theme === 'dark' ? '#FFFFFF' : '#0F172A');
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontWeight = '700';
      el.style.fontSize = '12px';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
      el.innerText = `${stop.stop_number}`;

      el.addEventListener('click', () => {
        setSelectedPlaceId(stop.place_id);
      });

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="color: #0F172A; padding: 6px; font-family: sans-serif;">
          <b style="font-size: 13px;">${stop.place.name}</b><br/>
          <span style="font-size: 11px; color: #64748B;">Stop #${stop.stop_number} • ★ ${stop.place.rating || 4.5}</span><br/>
          <span style="font-size: 11px; color: #0284C7; font-weight: 600;">Arrival: ${stop.arrival_time_label}</span>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current[stop.place_id] = marker;
    });
  };

  // Helper to render route polylines whenever style is loaded
  const renderRoutePolyline = (map: mapboxgl.Map, stops: ItineraryStop[]) => {
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => {
        if (mapRef.current) renderRoutePolyline(mapRef.current, stops);
      });
      map.once('load', () => {
        if (mapRef.current) renderRoutePolyline(mapRef.current, stops);
      });
      return;
    }

    const features: any[] = [];

    // Departure route on Day 1
    if (activeDayIndex === 0 && trip.departure_leg && trip.departure_leg.polyline) {
      try {
        const parsedDep = JSON.parse(trip.departure_leg.polyline);
        if (Array.isArray(parsedDep) && parsedDep.length >= 2) {
          features.push({
            type: 'Feature',
            properties: { type: 'departure' },
            geometry: { type: 'LineString', coordinates: parsedDep }
          });
        }
      } catch {}
    }

    // Stops routes
    stops.forEach((stop, idx) => {
      const lng = stop.place.coordinates.lng;
      const lat = stop.place.coordinates.lat;

      if (stop.route_to_next && stop.route_to_next.polyline) {
        try {
          const parsed = JSON.parse(stop.route_to_next.polyline);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            features.push({
              type: 'Feature',
              properties: { type: 'transit' },
              geometry: { type: 'LineString', coordinates: parsed }
            });
          }
        } catch {}
      } else if (idx < stops.length - 1) {
        const nextStop = stops[idx + 1];
        features.push({
          type: 'Feature',
          properties: { type: 'transit_straight' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [lng, lat],
              [nextStop.place.coordinates.lng, nextStop.place.coordinates.lat]
            ]
          }
        });
      }
    });

    const geojsonData = {
      type: 'FeatureCollection',
      features: features
    };

    try {
      const source = map.getSource('route-line') as mapboxgl.GeoJSONSource | undefined;
      if (!source) {
        map.addSource('route-line', {
          type: 'geojson',
          data: geojsonData as any
        });

        if (!map.getLayer('route-line-layer')) {
          map.addLayer({
            id: 'route-line-layer',
            type: 'line',
            source: 'route-line',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#38BDF8',
              'line-width': 4,
              'line-opacity': 0.85
            }
          });
        }
      } else {
        source.setData(geojsonData as any);
      }
    } catch (e) {
      console.warn('Mapbox route line update warning:', e);
    }
  };

  // Frame the active day stops nicely
  const fitCurrentDayBounds = (map: mapboxgl.Map, stops: ItineraryStop[]) => {
    if (!map || stops.length === 0) return;
    map.resize();
    const bounds = new mapboxgl.LngLatBounds();
    stops.forEach(s => {
      bounds.extend([s.place.coordinates.lng, s.place.coordinates.lat]);
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 14,
        duration: 500
      });
    }
  };

  // Fit all current stops and departure source into bounds
  const fitRouteBounds = () => {
    const map = mapRef.current;
    if (!map) return;
    map.resize();

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    // Include Departure Source on Day 1
    if (activeDayIndex === 0 && trip.departure_leg && trip.departure_leg.polyline) {
      try {
        const depCoords = JSON.parse(trip.departure_leg.polyline);
        if (Array.isArray(depCoords) && depCoords.length > 0) {
          bounds.extend(depCoords[0]);
          hasCoords = true;
        }
      } catch {}
    }

    const stops = activeDay?.stops || [];
    stops.forEach(s => {
      bounds.extend([s.place.coordinates.lng, s.place.coordinates.lat]);
      hasCoords = true;
    });

    if (hasCoords) {
      map.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 14 });
    }
  };

  // Synchronize all map layers, markers, and bounds
  const updateMapFeatures = () => {
    const map = mapRef.current;
    if (!map) return;

    map.resize();
    const stops = activeDay?.stops || [];
    renderMarkers(map, stops, selectedPlaceId);
    renderRoutePolyline(map, stops);
    fitCurrentDayBounds(map, stops);
  };

  // ================= 1. INITIALIZE MAPBOX INSTANCE ONCE =================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const styleUri = theme === 'dark' 
      ? 'mapbox://styles/mapbox/dark-v11' 
      : 'mapbox://styles/mapbox/light-v11';

    const stops = activeDay?.stops || [];
    const firstStop = stops[0];
    const initialCenter: [number, number] = firstStop 
      ? [firstStop.place.coordinates.lng, firstStop.place.coordinates.lat]
      : [78.9629, 20.5937]; // India geographic center

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUri,
      center: initialCenter,
      zoom: 12
    });

    mapRef.current = map;

    // Add standard navigation controls (zoom in, zoom out, compass reset)
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    // Immediately render HTML markers and initial camera bounds (works instantly!)
    renderMarkers(map, stops, selectedPlaceId);
    fitCurrentDayBounds(map, stops);

    // Attach listeners for when style & tiles complete loading
    map.on('style.load', () => {
      map.resize();
      renderRoutePolyline(map, stops);
    });

    map.on('load', () => {
      map.resize();
      renderMarkers(map, stops, selectedPlaceId);
      renderRoutePolyline(map, stops);
      fitCurrentDayBounds(map, stops);
    });

    // Failsafe timers to resize and ensure route polyline is painted during React tab animations
    const timer1 = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
        renderRoutePolyline(mapRef.current, stops);
      }
    }, 250);

    const timer2 = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
        renderRoutePolyline(mapRef.current, stops);
      }
    }, 750);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      map.remove();
      mapRef.current = null;
    };
  }, [theme]);

  // Re-run feature updates whenever trip or active day changes
  useEffect(() => {
    updateMapFeatures();
  }, [activeDayIndex, trip]);

  // Resize and refit map whenever view mode changes (Split / Full Map)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
        fitCurrentDayBounds(mapRef.current, activeDay?.stops || []);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [mobileView]);

  // ================= 3. FLY TO SELECTED STOP ON CLICK =================
  useEffect(() => {
    if (!selectedPlaceId || !mapRef.current) return;
    const targetStop = allStops.find(s => s.place_id === selectedPlaceId);
    if (targetStop) {
      const lng = targetStop.place.coordinates.lng;
      const lat = targetStop.place.coordinates.lat;
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 700,
        essential: true
      });

      // Highlight active marker styling
      Object.entries(markersRef.current).forEach(([pid, marker]) => {
        const el = marker.getElement();
        if (pid === selectedPlaceId) {
          el.classList.add('active-marker');
          el.style.backgroundColor = '#F97316';
          el.style.color = '#FFFFFF';
          marker.togglePopup();
        } else if (pid !== '__source_origin__') {
          el.classList.remove('active-marker');
          el.style.backgroundColor = theme === 'dark' ? '#0F172A' : '#FFFFFF';
          el.style.color = theme === 'dark' ? '#FFFFFF' : '#0F172A';
        }
      });
    }
  }, [selectedPlaceId]);

  // ================= ACTIONS =================
  const handleMoveStop = async (dayIdx: number, stopIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? stopIdx - 1 : stopIdx + 1;
    if (targetIdx < 0 || targetIdx >= trip.days[dayIdx].stops.length) return;

    const newTrip: TripItinerary = JSON.parse(JSON.stringify(trip));
    const dayStops = newTrip.days[dayIdx].stops;
    const temp = dayStops[stopIdx];
    dayStops[stopIdx] = dayStops[targetIdx];
    dayStops[targetIdx] = temp;

    dayStops.forEach((s, i) => { s.stop_number = i + 1; });

    setRecalculating(true);
    try {
      const recalculated = await api.recalculateTrip(newTrip);
      onTripUpdated(recalculated);
    } catch {
      onTripUpdated(newTrip);
    } finally {
      setRecalculating(false);
    }
  };

  const handleRemoveStop = async (dayIdx: number, stopIdx: number) => {
    const newTrip: TripItinerary = JSON.parse(JSON.stringify(trip));
    newTrip.days[dayIdx].stops.splice(stopIdx, 1);
    newTrip.days[dayIdx].stops.forEach((s, i) => { s.stop_number = i + 1; });

    setRecalculating(true);
    try {
      const recalculated = await api.recalculateTrip(newTrip);
      onTripUpdated(recalculated);
    } catch {
      onTripUpdated(newTrip);
    } finally {
      setRecalculating(false);
    }
  };

  const handleModeChange = async (newMode: 'transit' | 'driving' | 'walking' | 'bicycling') => {
    if (newMode === trip.transport_mode) return;
    setRecalculating(true);
    try {
      const recalculated = await api.recalculateTrip(trip, newMode);
      onTripUpdated(recalculated);
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Top Banner / Actions Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-dark)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Navigation size={13} color="#10B981" /> {trip.source_location || 'Current Location'} ➔ {trip.destination}
            </span>
            <span style={{ color: 'var(--text-subtle)' }}>•</span>
            <span className="badge-live">
              REAL-TIME MAPBOX
            </span>
          </div>
          <h1 className="font-editorial" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {trip.title}
          </h1>
        </div>

        {/* View toggle (mobile) + Transport switcher + Report button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Mobile view switchers */}
          <div className="mobile-toggle" style={{ display: 'flex', gap: '0.3rem', backgroundColor: 'var(--bg-card)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
            {[
              { id: 'both', label: 'Split' },
              { id: 'map', label: 'Map' },
              { id: 'timeline', label: 'Timeline' }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setMobileView(v.id as any)}
                style={{
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: mobileView === v.id ? 700 : 500,
                  backgroundColor: mobileView === v.id ? 'var(--text-main)' : 'transparent',
                  color: mobileView === v.id ? 'var(--bg-primary)' : 'var(--text-muted)',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Transport mode buttons */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
            {[
              { id: 'transit', icon: Bus, label: 'Transit' },
              { id: 'driving', icon: Car, label: 'Drive' },
              { id: 'walking', icon: Footprints, label: 'Walk' },
              { id: 'bicycling', icon: Bike, label: 'Cycle' }
            ].map(m => {
              const Icon = m.icon;
              const active = trip.transport_mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id as any)}
                  disabled={recalculating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 500,
                    backgroundColor: active ? 'var(--text-main)' : 'transparent',
                    color: active ? 'var(--bg-primary)' : 'var(--text-muted)',
                    border: 'none',
                    cursor: recalculating ? 'wait' : 'pointer'
                  }}
                >
                  <Icon size={14} /> {m.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={onNavigateToReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              backgroundColor: 'var(--text-main)',
              color: 'var(--bg-primary)',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <FileText size={15} /> Export Dossier
          </button>
        </div>
      </div>

      {recalculating && (
        <div style={{
          padding: '0.6rem 1rem',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '6px',
          color: 'var(--accent-primary)',
          fontSize: '0.82rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Sparkles size={14} /> Recalculating live road transits, arrival timeline, and budget via Mapbox...
        </div>
      )}

      {/* Split View: Mapbox (Left) & Itinerary Timeline (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobileView === 'map' ? '1fr' : (mobileView === 'timeline' ? '1fr' : 'minmax(380px, 520px) 1fr'),
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Left Column: Live Mapbox Container (Persists in DOM across views) */}
        <div style={{
          display: mobileView === 'timeline' ? 'none' : 'block',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-dark)',
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'sticky',
          top: '80px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
        }}>
          {/* Map Header with Re-center & Full Map action */}
          <div style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <span className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={13} color="var(--accent-primary)" /> Live Mapbox Geometry
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMobileView(prev => prev === 'map' ? 'both' : 'map')}
                title={mobileView === 'map' ? 'Switch to Split Timeline View' : 'Expand Map to Full Width'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: mobileView === 'map' ? 'var(--text-main)' : 'var(--bg-card)',
                  color: mobileView === 'map' ? 'var(--bg-primary)' : 'var(--text-main)',
                  border: '1px solid var(--border-dark)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <Maximize2 size={13} /> {mobileView === 'map' ? 'Split View' : 'Full Map'}
              </button>

              <button
                type="button"
                onClick={fitRouteBounds}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--border-dark)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <Navigation size={13} /> Fit Route
              </button>
            </div>
          </div>

          {/* Mapbox Canvas (Expands fully when in Full Map mode) */}
          <div
            ref={mapContainerRef}
            style={{
              height: mobileView === 'map' ? 'min(720px, calc(100vh - 180px))' : 'min(560px, calc(100vh - 220px))',
              minHeight: mobileView === 'map' ? '650px' : '480px',
              width: '100%',
              backgroundColor: 'var(--bg-primary)',
              transition: 'height 0.2s ease'
            }}
          />

            {/* Selected Place Peek Card with Google Maps Live Navigation */}
            {selectedPlaceId && (
              <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-dark)', backgroundColor: 'var(--bg-card)' }}>
                {(() => {
                  const s = allStops.find(st => st.place_id === selectedPlaceId);
                  if (!s) return null;
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{s.place.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#FBBF24', fontWeight: 600 }}>
                          ★ {s.place.rating || '4.5'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        {s.place.address}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <button
                          onClick={() => onSelectPlaceForAnalysis(s.place_id)}
                          style={{
                            flex: 1,
                            padding: '0.55rem',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-dark)',
                            borderRadius: '6px',
                            color: 'var(--accent-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <BarChart3 size={14} /> Review Analysis
                        </button>

                        {/* Google Maps Live Hand-Off Button */}
                        <button
                          onClick={() => openGoogleMapsPlace(s.place.coordinates.lat, s.place.coordinates.lng, s.place.name)}
                          title="Open this location in Google Maps"
                          style={{
                            padding: '0.55rem 0.85rem',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-primary)',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <ExternalLink size={14} /> Google Maps
                        </button>
                      </div>

                      {/* If next stop exists, provide direct Turn-by-Turn GPS button */}
                      {s.route_to_next && (
                        <button
                          onClick={() => {
                            const currentStopIdx = activeDay.stops.findIndex(st => st.place_id === s.place_id);
                            if (currentStopIdx !== -1 && currentStopIdx < activeDay.stops.length - 1) {
                              const nxt = activeDay.stops[currentStopIdx + 1];
                              openGoogleMapsDirections(
                                s.place.coordinates.lat, s.place.coordinates.lng,
                                nxt.place.coordinates.lat, nxt.place.coordinates.lng,
                                trip.transport_mode
                              );
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '6px',
                            color: '#10B981',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <Navigation size={13} /> Navigate Leg to Next Stop in Google Maps ({s.route_to_next.formatted_distance}) ↗
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

        {/* Right Column: Day Selector & Itinerary Timeline */}
        <div style={{ display: mobileView === 'map' ? 'none' : 'block' }}>
            {/* Day Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {trip.days.map((day, idx) => (
                <button
                  key={day.day_number}
                  onClick={() => setActiveDayIndex(idx)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    backgroundColor: activeDayIndex === idx ? 'var(--text-main)' : 'var(--bg-surface)',
                    color: activeDayIndex === idx ? 'var(--bg-primary)' : 'var(--text-muted)',
                    border: '1px solid',
                    borderColor: activeDayIndex === idx ? 'var(--text-main)' : 'var(--border-dark)',
                    fontSize: '0.85rem',
                    fontWeight: activeDayIndex === idx ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Day {day.day_number} ({day.stops.length} Stops)
                </button>
              ))}
            </div>

            {/* INTERCITY DEPARTURE LEG CARD (Day 1) */}
            {activeDayIndex === 0 && (
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '10px',
                padding: '1.25rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-surface) 100%)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '11px'
                    }}>
                      DEP
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                        DEPARTURE JOURNEY LEG
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {trip.source_location || 'Current Location'} ➔ {trip.destination.split(',')[0]}
                      </div>
                    </div>
                  </div>
                  {trip.departure_leg && (
                    <div style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-dark)',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)'
                    }}>
                      {trip.departure_leg.formatted_distance} • {trip.departure_leg.formatted_duration}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      if (activeDay.stops.length > 0) {
                        const first = activeDay.stops[0].place;
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(trip.source_location || 'Current Location')}&destination=${first.coordinates.lat},${first.coordinates.lng}&travelmode=${trip.transport_mode === 'transit' ? 'transit' : 'driving'}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 0.9rem',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Navigation size={14} /> Start Route in Google Maps (Source ➔ Stop 1) ↗
                  </button>
                </div>
              </div>
            )}

            {/* Stops Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeDay?.stops.map((stop, sIdx) => {
                const isSelected = selectedPlaceId === stop.place_id;
                const nextStop = sIdx < activeDay.stops.length - 1 ? activeDay.stops[sIdx + 1] : null;

                return (
                  <div key={stop.place_id}>
                    {/* Stop Card */}
                    <div
                      onClick={() => setSelectedPlaceId(stop.place_id)}
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-surface)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-dark)'}`,
                        borderRadius: '10px',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.85rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: isSelected ? '#F97316' : 'var(--text-main)',
                            color: 'var(--bg-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {stop.stop_number}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                {stop.arrival_time_label}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>•</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Est. {stop.suggested_duration_minutes}m visit
                              </span>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                              {stop.place.name}
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                              {stop.place.address}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontStyle: 'italic', backgroundColor: 'var(--bg-card)', padding: '0.6rem 0.85rem', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                              "{stop.ai_reason}"
                            </p>
                          </div>
                        </div>

                        {/* Reorder / Delete Controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            disabled={sIdx === 0 || recalculating}
                            onClick={() => handleMoveStop(activeDayIndex, sIdx, 'up')}
                            title="Move Stop Earlier"
                            style={{
                              padding: '0.35rem',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-dark)',
                              borderRadius: '4px',
                              color: sIdx === 0 ? 'var(--text-subtle)' : 'var(--text-main)',
                              cursor: sIdx === 0 || recalculating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            disabled={sIdx === activeDay.stops.length - 1 || recalculating}
                            onClick={() => handleMoveStop(activeDayIndex, sIdx, 'down')}
                            title="Move Stop Later"
                            style={{
                              padding: '0.35rem',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-dark)',
                              borderRadius: '4px',
                              color: sIdx === activeDay.stops.length - 1 ? 'var(--text-subtle)' : 'var(--text-main)',
                              cursor: sIdx === activeDay.stops.length - 1 || recalculating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            disabled={activeDay.stops.length <= 1 || recalculating}
                            onClick={() => handleRemoveStop(activeDayIndex, sIdx)}
                            title="Remove Stop"
                            style={{
                              padding: '0.35rem',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-dark)',
                              borderRadius: '4px',
                              color: 'var(--accent-rose)',
                              cursor: activeDay.stops.length <= 1 || recalculating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Route Connector Leg */}
                    {nextStop && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 1rem',
                        margin: '0.4rem 0 0.4rem 1.5rem',
                        borderLeft: '2px dashed var(--border-dark)',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Car size={13} color="var(--accent-primary)" />
                          <span>
                            {stop.route_to_next ? (
                              <strong>{stop.route_to_next.formatted_distance} ({stop.route_to_next.formatted_duration})</strong>
                            ) : (
                              <span>Transit connecting to {nextStop.place.name}</span>
                            )}
                          </span>
                        </div>
                        <button
                          onClick={() => openGoogleMapsDirections(
                            stop.place.coordinates.lat, stop.place.coordinates.lng,
                            nextStop.place.coordinates.lat, nextStop.place.coordinates.lng,
                            trip.transport_mode
                          )}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Google Maps ↗
                        </button>
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
