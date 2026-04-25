import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MainDashboard from './components/MainDashboard';
import { DashboardProvider } from './contexts/DashboardContext';
import { TradingProvider } from './contexts/TradingContext';
import { ETFDetailsPanel } from './components/ETFDetailsPanel';

const App: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mainFullscreen, setMainFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setMainFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  return (
    <TradingProvider>
      <DashboardProvider initialTickers={['XLK', 'XLF', 'XLE']}>
        <div
          ref={rootRef}
          className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:min-h-0 lg:overflow-hidden bg-slate-950 text-slate-200 dark:bg-slate-950 dark:text-slate-200 light:bg-slate-50 light:text-slate-900 transition-colors duration-300"
        >
          <AppContent 
            mainFullscreen={mainFullscreen} 
            rootRef={rootRef} 
          />
        </div>
      </DashboardProvider>
    </TradingProvider>
  );
};

const AppContent: React.FC<{ 
  mainFullscreen: boolean; 
  rootRef: React.RefObject<HTMLDivElement>;
}> = ({ mainFullscreen, rootRef }) => {
  return (
    <>
      <SidebarWrapper />
      <MainDashboard
        chartLayoutFullscreen={mainFullscreen}
        onEnterMainFullscreen={() => rootRef.current?.requestFullscreen?.()}
        onExitMainFullscreen={() => document.exitFullscreen?.()}
      />
      <ETFDetailsPanel />
    </>
  );
};

// Temporary wrapper for Sidebar until it's also updated to use context if needed, 
// or just to keep App.tsx clean.
const SidebarWrapper: React.FC = () => {
  return <Sidebar />;
};

export default App;
