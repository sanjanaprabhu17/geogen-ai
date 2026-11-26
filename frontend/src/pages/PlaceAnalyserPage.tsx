import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, MessageSquare, ThumbsUp, ThumbsDown, Info } from 'lucide-react';
import type { PlaceReviewAnalysis, TripItinerary } from '../types';
import { api } from '../services/api';

interface PlaceAnalyserPageProps {
  trip?: TripItinerary | null;
  selectedPlaceId?: string | null;
}

export const PlaceAnalyserPage: React.FC<PlaceAnalyserPageProps> = ({
  trip,
  selectedPlaceId
}) => {
  const [currentPlaceId, setCurrentPlaceId] = useState<string>(
    selectedPlaceId || trip?.days[0]?.stops[0]?.place_id || 'demo_mysuru_palace'
  );
  const [analysis, setAnalysis] = useState<PlaceReviewAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');

  // Collect available places from trip or demo fallback
  const availablePlaces = trip
    ? trip.days.flatMap(d => d.stops.map(s => s.place))
    : [
        { id: 'demo_mysuru_palace', name: 'Mysore Palace' },
        { id: 'demo_mysuru_mylari', name: 'Hotel Original Vinayaka Mylari' }
      ];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getPlaceReviews(currentPlaceId)
      .then(data => {
        if (isMounted) {
          setAnalysis(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [currentPlaceId]);

  const filteredReviews = analysis?.reviews.filter(r => {
    if (filterSentiment === 'all') return true;
    return r.sentiment_label === filterSentiment;
  }) || [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <span className="text-meta">NLP Aspect & Sentiment Engine</span>
          <span style={{ color: 'var(--text-subtle)' }}>•</span>
          <span className="badge-demo">Model-Estimated Sentiment</span>
        </div>
        <h1 className="font-editorial" style={{ fontSize: '2.2rem', fontWeight: 700, color: '#FFFFFF' }}>
          Review & Place Analyser
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Synthesizing real traveller review sentiment, aspects, and pros/cons with conservative text cleaning and NLP polarity classification.
        </p>
      </div>

      {/* Place Selector Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
        {availablePlaces.map(p => (
          <button
            key={p.id}
            onClick={() => setCurrentPlaceId(p.id)}
            className={`pill-chip ${currentPlaceId === p.id ? 'active' : ''}`}
            style={{ fontSize: '0.82rem' }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-dark)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <div>Extracting review sentiments & positive/negative themes...</div>
        </div>
      ) : analysis ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Overview Card */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-dark)',
            borderRadius: '12px',
            padding: '1.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span className="text-meta">{analysis.source.toUpperCase()} LOCATION ANALYSIS</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#FFFFFF', marginTop: '0.2rem' }}>
                  {analysis.place_name}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
                <MessageSquare size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{analysis.reviews_count} Reviews Analyzed</span>
              </div>
            </div>

            {/* Sentiment Ratio Bar */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                <span style={{ color: 'var(--accent-emerald)' }}>Positive {analysis.sentiment.positive_pct}%</span>
                <span style={{ color: 'var(--text-muted)' }}>Neutral {analysis.sentiment.neutral_pct}%</span>
                <span style={{ color: 'var(--accent-rose)' }}>Negative {analysis.sentiment.negative_pct}%</span>
              </div>
              <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>
                <div style={{ width: `${analysis.sentiment.positive_pct}%`, backgroundColor: 'var(--accent-emerald)', transition: 'width 0.4s ease' }} />
                <div style={{ width: `${analysis.sentiment.neutral_pct}%`, backgroundColor: '#64748B', transition: 'width 0.4s ease' }} />
                <div style={{ width: `${analysis.sentiment.negative_pct}%`, backgroundColor: 'var(--accent-rose)', transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Info size={12} /> Model: {analysis.sentiment.model_used} • Estimated sentiment; not an official Google Maps star rating.
              </div>
            </div>

            {/* 3-Line AI Summary */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-dark)',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem'
            }}>
              <span className="text-meta" style={{ display: 'block', marginBottom: '0.5rem' }}>
                3-Line Synthesis
              </span>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {analysis.summary_points.map((pt, i) => (
                  <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pros & Cons Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Pros */}
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  <ThumbsUp size={16} /> Key Highlights & Pros
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {analysis.pros.map((pro, i) => (
                    <div key={i} style={{ fontSize: '0.82rem', color: '#D1FAE5', display: 'flex', gap: '0.4rem' }}>
                      <CheckCircle2 size={14} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{pro}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cons */}
              <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-rose)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  <ThumbsDown size={16} /> Caveats & Cons
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {analysis.cons.map((con, i) => (
                    <div key={i} style={{ fontSize: '0.82rem', color: '#FFE4E6', display: 'flex', gap: '0.4rem' }}>
                      <AlertTriangle size={14} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{con}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Individual Review Snippets & Filter Tabs */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-dark)',
            borderRadius: '12px',
            padding: '1.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <span className="text-meta">Raw Review Evidence</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(['all', 'positive', 'neutral', 'negative'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterSentiment(tab)}
                    className={`pill-chip ${filterSentiment === tab ? 'active' : ''}`}
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {filteredReviews.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No reviews found under the '{filterSentiment}' sentiment filter.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredReviews.map(r => (
                  <div
                    key={r.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-dark)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#FFFFFF' }}>{r.author_name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#FBBF24' }}>★ {r.rating}</span>
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: r.sentiment_label === 'positive' ? 'rgba(16, 185, 129, 0.15)' : (r.sentiment_label === 'negative' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)'),
                        color: r.sentiment_label === 'positive' ? '#34D399' : (r.sentiment_label === 'negative' ? '#FB7185' : '#94A3B8')
                      }}>
                        {r.sentiment_label} ({Math.round(r.sentiment_score * 100)}%)
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      "{r.text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No review records available for this location.
        </div>
      )}
    </div>
  );
};
