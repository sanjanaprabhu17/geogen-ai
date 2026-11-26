import type {
  IntentConstraints,
  TripItinerary,
  Place,
  PlaceReviewAnalysis,
  RouteLeg,
  ReportOptions
} from '../types';

import {
  generateTripClient,
  computeRouteClient,
  getPlaceReviewsClient,
  chatWithAssistantClient
} from './clientGenerator';

const API_BASE = '/api';

// Helper to check if a response is JSON
async function parseJsonResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Non-JSON response from server');
  }
  return res.json();
}

export const api = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        return await parseJsonResponse(res);
      }
    } catch {}
    return { status: 'healthy', provider: 'geogen_client_spatial_engine' };
  },

  async extractIntent(prompt: string): Promise<IntentConstraints> {
    try {
      const res = await fetch(`${API_BASE}/intent/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (res.ok) {
        return await parseJsonResponse(res);
      }
    } catch (e) {
      console.warn('Backend intent extract failed, applying client parser:', e);
    }

    // Client intent extractor
    const cleanPrompt = prompt.trim();
    return {
      destination: cleanPrompt || 'Mysuru',
      duration_days: 2,
      travellers: 2,
      interests: ['heritage', 'food', 'scenic'],
      transport_mode: 'driving',
      pace: 'balanced',
      additional_constraints: [],
      raw_prompt: prompt
    };
  },

  async searchPlaces(query: string, destination?: string | null): Promise<Place[]> {
    try {
      const res = await fetch(`${API_BASE}/places/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, destination })
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (data.places && data.places.length > 0) return data.places;
      }
    } catch (e) {
      console.warn('Backend search places failed, fallback to client:', e);
    }
    const sampleTrip = await generateTripClient('', null, undefined, undefined, destination || query);
    return sampleTrip.days.flatMap((d) => d.stops.map((s) => s.place));
  },

  async getPlaceReviews(placeId: string): Promise<PlaceReviewAnalysis> {
    try {
      const res = await fetch(`${API_BASE}/places/${placeId}/reviews`);
      if (res.ok) {
        return await parseJsonResponse(res);
      }
    } catch (e) {
      console.warn('Backend reviews failed, fallback to client:', e);
    }
    return getPlaceReviewsClient(placeId);
  },

  async computeRoute(originId: string, destinationId: string, travelMode: string): Promise<RouteLeg> {
    try {
      const res = await fetch(`${API_BASE}/routes/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin_id: originId, destination_id: destinationId, travel_mode: travelMode })
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (data.route) return data.route;
      }
    } catch (e) {
      console.warn('Backend compute route failed, fallback to client:', e);
    }
    return computeRouteClient(
      { id: originId, name: 'Origin', coordinates: { lat: 15.4589, lng: 75.0078 } },
      { id: destinationId, name: 'Destination', coordinates: { lat: 12.3051, lng: 76.6551 } },
      travelMode
    );
  },

  async generateTrip(
    prompt: string = '',
    constraints?: IntentConstraints | null,
    selectedPlaceIds?: string[],
    sourceLocation?: string,
    destination?: string,
    sourceLat?: number | null,
    sourceLng?: number | null
  ): Promise<TripItinerary> {
    try {
      const res = await fetch(`${API_BASE}/trips/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || (destination ? `Trip from ${sourceLocation || 'Current Location'} to ${destination}` : ''),
          source_location: sourceLocation,
          destination: destination,
          constraints,
          selected_place_ids: selectedPlaceIds,
          source_lat: sourceLat,
          source_lng: sourceLng
        })
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
      }
    } catch (e) {
      console.warn('Backend trip generate unreachable, generating autonomously on client:', e);
    }

    // Seamless autonomous fallback for GitHub Pages and offline mode
    return generateTripClient(
      prompt,
      constraints,
      selectedPlaceIds,
      sourceLocation,
      destination,
      sourceLat,
      sourceLng
    );
  },

  async recalculateTrip(trip: TripItinerary, newTransportMode?: string): Promise<TripItinerary> {
    try {
      const res = await fetch(`${API_BASE}/trips/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip,
          new_transport_mode: newTransportMode
        })
      });
      if (res.ok) {
        return await parseJsonResponse(res);
      }
    } catch (e) {
      console.warn('Backend recalculate failed, updating client-side:', e);
    }

    const mode = (newTransportMode as any) || trip.transport_mode;
    return generateTripClient(
      trip.overview,
      {
        destination: trip.destination,
        duration_days: trip.duration_days,
        travellers: trip.travellers,
        transport_mode: mode,
        interests: ['heritage', 'scenic', 'food'],
        pace: 'balanced',
        additional_constraints: [],
        raw_prompt: trip.title
      },
      undefined,
      trip.source_location,
      trip.destination
    );
  },

  async downloadReportPdf(trip: TripItinerary, options: ReportOptions): Promise<Blob> {
    try {
      const res = await fetch(`${API_BASE}/reports/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip, options })
      });
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      console.warn('Backend PDF failed, generating printable client blob:', e);
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${trip.title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
            h1 { color: #0284c7; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
            .badge { background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>GeoGen AI - ${trip.title}</h1>
          <p><strong>Departure Leg:</strong> ${trip.source_location || 'Current Location'} ➔ ${trip.destination} (${trip.departure_leg?.formatted_distance || ''}, ${trip.departure_leg?.formatted_duration || ''})</p>
          <p>${trip.overview}</p>
          <h2>Days & Schedule</h2>
          ${trip.days
            .map(
              (d) => `
            <div class="card">
              <h3>Day ${d.day_number}: ${d.title}</h3>
              ${d.stops
                .map(
                  (s) => `
                <div style="margin-left: 16px; margin-bottom: 12px;">
                  <span class="badge">${s.arrival_time_label}</span> <strong>${s.place.name}</strong> - ${s.place.category}
                  <p style="margin: 4px 0; color: #64748b;">${s.ai_reason}</p>
                </div>
              `
                )
                .join('')}
            </div>
          `
            )
            .join('')}
          <h2>Estimated Budget</h2>
          <p><strong>Total:</strong> ₹${trip.budget_breakdown.total_estimated.toLocaleString('en-IN')}</p>
        </body>
      </html>
    `;
    return new Blob([htmlContent], { type: 'text/html' });
  },

  async chatWithAssistant(
    message: string,
    tripContext?: any,
    _history?: { role: string; content: string }[]
  ): Promise<{ reply: string; suggested_followups: string[]; source: string }> {
    try {
      const res = await fetch(`${API_BASE}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          trip_context: tripContext,
          history: _history
        })
      });
      if (res.ok) {
        return await parseJsonResponse(res);
      }
    } catch (e) {
      console.warn('Backend chat unreachable, generating client concierge reply:', e);
    }
    return chatWithAssistantClient(message, tripContext);
  }
};
