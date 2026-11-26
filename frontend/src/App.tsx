import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AIAssistant } from './components/AIAssistant';
import { HomePage } from './pages/HomePage';
import { PlannerPage } from './pages/PlannerPage';
import { PlaceAnalyserPage } from './pages/PlaceAnalyserPage';
import { ReportPage } from './pages/ReportPage';
import type { TripItinerary } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'planner' | 'reviews' | 'report'>('home');
  const [trip, setTrip] = useState<TripItinerary | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  
  // Theme state: dark / light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('geogen_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('geogen_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // Check backend health and mode
    api.getHealth()
      .then(res => {
        setIsDemo(res.is_demo);
      })
      .catch(err => {
        console.warn('Backend connection notice:', err);
      });
  }, []);

  const handleTripGenerated = (newTrip: TripItinerary) => {
    setTrip(newTrip);
    setSelectedPlaceId(newTrip.days[0]?.stops[0]?.place_id || null);
    setActiveTab('planner');
  };

  const handleSelectPlaceForAnalysis = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setActiveTab('reviews');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDemo={isDemo}
        hasActiveTrip={!!trip}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main style={{ flex: 1 }}>
        {activeTab === 'home' && (
          <HomePage onTripGenerated={handleTripGenerated} />
        )}

        {activeTab === 'planner' && (
          trip ? (
            <PlannerPage
              trip={trip}
              theme={theme}
              onTripUpdated={setTrip}
              onSelectPlaceForAnalysis={handleSelectPlaceForAnalysis}
              onNavigateToReport={() => setActiveTab('report')}
            />
          ) : (
            <HomePage onTripGenerated={handleTripGenerated} />
          )
        )}

        {activeTab === 'reviews' && (
          <PlaceAnalyserPage
            trip={trip}
            selectedPlaceId={selectedPlaceId}
          />
        )}

        {activeTab === 'report' && (
          <ReportPage trip={trip} />
        )}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-dark)',
        padding: '1.25rem 1.5rem',
        marginTop: '3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        color: 'var(--text-subtle)',
        fontSize: '0.75rem'
      }}>
        <div>
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>GEOGEN AI</span> • Real-Time Spatial Location & Route Platform
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>Mapbox Live Geometry</span>
          <span>•</span>
          <span>Gemini 2.5 Flash Grounding</span>
          <span>•</span>
          <span>Dual Dark/Light Systema UI</span>
        </div>
      </footer>

      {/* Persistent Floating Integrated AI Travel Assistant */}
      <AIAssistant trip={trip} theme={theme} />
    </div>
  );
};

export default App;
