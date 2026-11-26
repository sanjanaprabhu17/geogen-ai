import React from 'react';
import { Compass, MapPin, BarChart3, FileText, Sparkles, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  activeTab: 'home' | 'planner' | 'reviews' | 'report';
  setActiveTab: (tab: 'home' | 'planner' | 'reviews' | 'report') => void;
  isDemo: boolean;
  hasActiveTrip: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDemo,
  hasActiveTrip,
  theme,
  onToggleTheme
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-dark)',
      backgroundColor: 'var(--header-bg)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.85rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem'
    }}>
      {/* Brand */}
      <div 
        onClick={() => setActiveTab('home')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: 'var(--text-main)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--bg-primary)'
        }}>
          <Compass size={20} strokeWidth={2.2} />
        </div>
        <div>
          <span className="font-editorial" style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            GEOGEN <span style={{ color: 'var(--accent-primary)' }}>AI</span>
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginLeft: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Live Spatial Platform
          </span>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <button
          onClick={() => setActiveTab('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'home' ? 600 : 500,
            background: activeTab === 'home' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'home' ? 'var(--text-main)' : 'var(--text-muted)',
            border: activeTab === 'home' ? '1px solid var(--border-dark)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Sparkles size={15} />
          Prompt Hub
        </button>

        <button
          onClick={() => setActiveTab('planner')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'planner' ? 600 : 500,
            background: activeTab === 'planner' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'planner' ? 'var(--text-main)' : 'var(--text-muted)',
            border: activeTab === 'planner' ? '1px solid var(--border-dark)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <MapPin size={15} />
          Map & Planner
          {hasActiveTrip && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />}
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'reviews' ? 600 : 500,
            background: activeTab === 'reviews' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'reviews' ? 'var(--text-main)' : 'var(--text-muted)',
            border: activeTab === 'reviews' ? '1px solid var(--border-dark)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <BarChart3 size={15} />
          Review Analyser
        </button>

        <button
          onClick={() => setActiveTab('report')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'report' ? 600 : 500,
            background: activeTab === 'report' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'report' ? 'var(--text-main)' : 'var(--text-muted)',
            border: activeTab === 'report' ? '1px solid var(--border-dark)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <FileText size={15} />
          PDF Dossier
        </button>
      </nav>

      {/* Mode & Theme Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Dark / Light Toggle */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-dark)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {isDemo ? (
          <span className="badge-demo" title="Demo dataset active">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FBBF24' }} />
            Demo Mode
          </span>
        ) : (
          <span className="badge-live" title="Connected to Live Mapbox and Gemini API Services">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            Live Mapbox
          </span>
        )}
      </div>
    </header>
  );
};
