import React, { useState } from 'react';
import { Download, CheckSquare, Square, Sparkles, AlertCircle } from 'lucide-react';
import type { TripItinerary, ReportOptions } from '../types';
import { api } from '../services/api';

interface ReportPageProps {
  trip?: TripItinerary | null;
}

export const ReportPage: React.FC<ReportPageProps> = ({ trip }) => {
  const [options, setOptions] = useState<ReportOptions>({
    include_overview: true,
    include_itinerary: true,
    include_map: true,
    include_routes: true,
    include_budget: true,
    include_places: true,
    include_reviews: true,
    include_tips: true
  });

  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleOption = (key: keyof ReportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownload = async () => {
    if (!trip) return;
    setDownloading(true);
    setError(null);
    setDownloadSuccess(false);

    try {
      const blob = await api.downloadReportPdf(trip, options);
      // Trigger browser file download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GeoGen_Trip_${trip.destination.split(',')[0].replace(/\s+/g, '_')}_Dossier.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloading(false);
      setDownloadSuccess(true);
    } catch (err: any) {
      console.error(err);
      setDownloading(false);
      setError(err.message || 'Failed to generate PDF. Please try again.');
    }
  };

  if (!trip) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <h2 className="font-editorial" style={{ fontSize: '1.8rem', color: '#FFFFFF', marginBottom: '0.75rem' }}>
          No Active Trip Plan Available
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Please go back to the Prompt Hub to describe and generate a trip before exporting a PDF dossier.
        </p>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-dark)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <span className="text-meta">Report Generator & Dossier Export</span>
            <span style={{ color: 'var(--text-subtle)' }}>•</span>
            <span className="badge-live">ReportLab Vector PDF</span>
          </div>
          <h1 className="font-editorial" style={{ fontSize: '2.2rem', fontWeight: 700, color: '#FFFFFF' }}>
            Executive Trip Dossier
          </h1>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.85rem 1.5rem',
            backgroundColor: '#FFFFFF',
            color: '#0B0E14',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: downloading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {downloading ? (
            <>
              <div style={{ width: '16px', height: '16px', border: '2px solid #0B0E14', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Compiling PDF...
            </>
          ) : (
            <>
              <Download size={18} /> Download Official PDF
            </>
          )}
        </button>
      </div>

      {downloadSuccess && (
        <div style={{
          padding: '0.85rem 1.25rem',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          color: '#34D399',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Sparkles size={16} /> PDF Dossier compiled and downloaded successfully!
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.85rem 1.25rem',
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '8px',
          color: '#FDA4AF',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Grid: Controls on left, Live Sheet Preview on right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 340px) 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* Dossier Customization Controls */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-dark)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h3 className="text-meta" style={{ marginBottom: '1.25rem' }}>
            Dossier Inclusion Sections
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Toggle modules below. Every modification directly recalculates the compiled ReportLab PDF output.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { key: 'include_overview', label: '1. Executive Trip Summary' },
              { key: 'include_itinerary', label: '2. Day-by-Day Itinerary' },
              { key: 'include_routes', label: '3. Route Transit & Distance Table' },
              { key: 'include_budget', label: '4. Estimated Budget Breakdown' },
              { key: 'include_tips', label: '5. AI Travel Guidelines & Caveats' }
            ].map(item => {
              const checked = options[item.key as keyof ReportOptions];
              return (
                <div
                  key={item.key}
                  onClick={() => toggleOption(item.key as keyof ReportOptions)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.85rem',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-dark)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    color: checked ? '#FFFFFF' : 'var(--text-subtle)',
                    fontWeight: checked ? 600 : 400
                  }}
                >
                  {checked ? <CheckSquare size={16} color="var(--accent-primary)" /> : <Square size={16} />}
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Dossier Sheet Preview */}
        <div style={{
          backgroundColor: '#FFFFFF',
          color: '#111827',
          borderRadius: '8px',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          fontFamily: 'Inter, system-ui, sans-serif',
          minHeight: '600px'
        }}>
          {/* Dossier Header */}
          <div style={{ borderBottom: '2px solid #111827', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color: '#6B7280', textTransform: 'uppercase' }}>
                GEOGEN AI / OFFICIAL DOSSIER • {trip.source.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                {currentDate}
              </span>
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
              {trip.title}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#4B5563', marginTop: '0.3rem' }}>
              Destination: <b>{trip.destination}</b> &nbsp;|&nbsp; Duration: <b>{trip.duration_days} Day(s)</b> &nbsp;|&nbsp; Travellers: <b>{trip.travellers}</b>
            </div>
          </div>

          {/* Section 1: Overview */}
          {options.include_overview && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: '0.4rem' }}>
                1. Executive Trip Summary
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                {trip.overview}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', backgroundColor: '#F3F4F6', padding: '0.75rem', borderRadius: '4px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700 }}>DAYS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{trip.duration_days}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700 }}>TRAVELLERS</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{trip.travellers}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700 }}>MODE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'capitalize' }}>{trip.transport_mode}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700 }}>EST. TOTAL</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>₹{trip.budget_breakdown.total_estimated.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Day-by-Day Itinerary */}
          {options.include_itinerary && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: '0.6rem' }}>
                2. Day-by-Day Itinerary
              </h4>
              {trip.days.map(day => (
                <div key={day.day_number} style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1F2937', marginBottom: '0.35rem' }}>
                    {day.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {day.stops.map(s => (
                      <div key={s.stop_number} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.82rem', padding: '0.4rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#111827' }}>#{s.stop_number}</span>
                        <span style={{ color: '#2563EB', fontWeight: 600 }}>{s.arrival_time_label}</span>
                        <span style={{ fontWeight: 600 }}>{s.place.name}</span>
                        <span style={{ color: '#6B7280' }}>({s.suggested_duration_minutes}m stay)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section 3: Routes */}
          {options.include_routes && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: '0.6rem' }}>
                3. Route Transit & Travel Legs
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F3F4F6', textAlign: 'left' }}>
                    <th style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>ORIGIN</th>
                    <th style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>DESTINATION</th>
                    <th style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>DISTANCE</th>
                    <th style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>EST. TIME</th>
                    <th style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>MODE</th>
                  </tr>
                </thead>
                <tbody>
                  {trip.days.flatMap(d => d.stops).filter(s => s.route_to_next).map((s, idx) => {
                    const r = s.route_to_next!;
                    return (
                      <tr key={idx}>
                        <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>{r.origin_name}</td>
                        <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>{r.destination_name}</td>
                        <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>{r.formatted_distance}</td>
                        <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>{r.formatted_duration}</td>
                        <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB', textTransform: 'capitalize' }}>{r.travel_mode}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 4: Budget Breakdown */}
          {options.include_budget && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: '0.6rem' }}>
                4. Estimated Budget Breakdown
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F3F4F6', textAlign: 'left' }}>
                    <th style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>EXPENSE CATEGORY</th>
                    <th style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>ESTIMATED AMOUNT</th>
                    <th style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>ATTRIBUTION</th>
                  </tr>
                </thead>
                <tbody>
                  {trip.budget_breakdown.items.map((b, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>{b.category}</td>
                      <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB', fontWeight: 600 }}>₹{b.amount.toLocaleString()}</td>
                      <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB', color: '#6B7280' }}>{b.source_label}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#F9FAFB', fontWeight: 700 }}>
                    <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>TOTAL ESTIMATED</td>
                    <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>₹{trip.budget_breakdown.total_estimated.toLocaleString()}</td>
                    <td style={{ padding: '0.4rem', border: '1px solid #E5E7EB' }}>₹{trip.budget_breakdown.per_person_estimated.toLocaleString()} / person</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section 5: Guidelines */}
          {options.include_tips && (
            <div>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: '0.4rem' }}>
                5. AI Travel Guidelines & Notice
              </h4>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#4B5563', lineHeight: 1.5 }}>
                {trip.travel_tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dossier Footer */}
          <div style={{ marginTop: '2rem', paddingTop: '0.75rem', borderTop: '1px solid #E5E7EB', fontSize: '0.68rem', color: '#9CA3AF' }}>
            DISCLAIMER: Recommendations grounded in real places. Opening hours, entry tariffs, ticket queues, and traffic timings remain variable. Confirm live details before departure.
          </div>
        </div>
      </div>
    </div>
  );
};
