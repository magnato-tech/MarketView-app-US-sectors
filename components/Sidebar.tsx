
import React from 'react';
import { TICKERS } from '../constants';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language } from '../i18n/types';
import type { DashboardTab } from '../contexts/DashboardContext';

interface SidebarProps {
  // Props fjernet da navigasjon nå styres via Context
}

const Sidebar: React.FC<SidebarProps> = () => {
  const {
    isDarkMode,
    toggleDarkMode,
    setDetailContext,
    drilldownSector,
    activeTickers,
    handleTickerToggle,
    activeTab,
    setActiveTab
  } = useDashboard();
  const { language, setLanguage, t } = useLanguage();
  const indices = TICKERS.filter(ticker => ticker.category === 'Index');
  const sectors = TICKERS.filter(ticker => ticker.category === 'Sector');
  const mainSectors = sectors.filter(ticker => ticker.group !== 'Innsatsvarer');
  const inputSectors = sectors.filter(ticker => ticker.group === 'Innsatsvarer');

  const renderLanguageButton = (lang: Language, label: string) => {
    const active = language === lang;
    return (
      <button
        key={lang}
        type="button"
        onClick={() => setLanguage(lang)}
        aria-pressed={active}
        title={t('sidebar.language.switchTo', { lang: lang === 'no' ? t('sidebar.language.norwegian') : t('sidebar.language.english') })}
        className={`px-2 py-1 text-[10px] font-black tracking-wider rounded transition-colors ${
          active
            ? 'bg-blue-600 text-white shadow-sm'
            : isDarkMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
        }`}
      >
        {label}
      </button>
    );
  };

  const renderTickerRow = (ticker: any) => {
    const isDrilldownActive = drilldownSector === ticker.symbol;
    const isSelected = activeTickers.includes(ticker.symbol);
    
    return (
      <div key={ticker.symbol} className="flex items-center group gap-1">
        {/* Checkbox for comparison */}
        <div className="pl-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleTickerToggle(ticker.symbol)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        <button
          onClick={() => setDetailContext({ symbol: ticker.symbol, type: ticker.category === 'Sector' ? 'sector' : 'etf' })}
          className={`flex-1 flex items-center gap-3 p-2 rounded-lg transition-all border border-transparent text-left ${
            isDarkMode ? 'hover:bg-slate-800/50 hover:border-slate-700/50' : 'hover:bg-slate-200/50 hover:border-slate-300/50'
          } ${isDrilldownActive ? (isDarkMode ? 'bg-blue-600/10 border-blue-500/30' : 'bg-blue-50 border-blue-200') : ''}`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-colors shrink-0 ${
            isDrilldownActive
              ? 'bg-blue-600 text-white border-blue-500'
              : isDarkMode 
                ? 'bg-slate-800 text-slate-400 border-slate-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500' 
                : 'bg-white text-slate-400 border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500'
          }`}>
            {ticker.symbol.substring(0, 2)}
          </div>
          <div className="flex-1 flex items-center justify-between min-w-0">
            <div className="flex flex-col min-w-0">
              <span className={`text-sm truncate transition-colors ${
                isDrilldownActive
                  ? (isDarkMode ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold')
                  : isDarkMode ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-900'
              }`}>
                {ticker.name}
              </span>
              <span className={`text-[10px] font-mono ${isDrilldownActive ? 'text-blue-500/60' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                {ticker.symbol}
              </span>
            </div>
            {ticker.category === 'Sector' && (
              <div className={`transition-transform duration-300 ${isDrilldownActive ? 'rotate-90 opacity-100' : 'rotate-0 opacity-0 group-hover:opacity-100'}`}>
                <svg className={`w-4 h-4 ${isDrilldownActive ? 'text-blue-500' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className={`w-full lg:w-72 shrink-0 p-6 flex flex-col gap-8 overflow-y-auto max-h-[45vh] lg:max-h-none lg:h-full lg:min-h-0 shadow-2xl transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
    } border-r`}>
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/40 shrink-0">M</div>
          <h1 className={`text-xl font-bold tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('sidebar.appTitle')} <span className="text-blue-500 italic">{t('sidebar.appSuffix')}</span></h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label={t('sidebar.language.label')}
            className={`flex items-center gap-1 p-0.5 rounded-md border ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {renderLanguageButton('no', t('sidebar.language.shortNo'))}
            {renderLanguageButton('en', t('sidebar.language.shortEn'))}
          </div>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-all border border-transparent ${
              isDarkMode
                ? 'bg-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                : 'bg-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
            title={isDarkMode ? t('sidebar.theme.toLight') : t('sidebar.theme.toDark')}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] border-b pb-2 ${
          isDarkMode ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-200'
        }`}>Workspace</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'dashboard', label: 'Market' },
            { id: 'commandCenter', label: 'Command Center' },
            { id: 'lab', label: 'The Lab' },
            { id: 'factory', label: 'Factory' },
          ].map((tab: { id: DashboardTab; label: string }) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : isDarkMode
                    ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-5 border-b pb-2 ${
          isDarkMode ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-200'
        }`}>{t('sidebar.sections.anchorIndices')}</h3>
        <div className="space-y-3">
          {indices.map(ticker => renderTickerRow(ticker))}
        </div>
      </section>

      <section className="pb-10">
        <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-5 border-b pb-2 ${
          isDarkMode ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-200'
        }`}>{t('sidebar.sections.sectorCategories')}</h3>
        <div className="space-y-1">
          {mainSectors.map(ticker => renderTickerRow(ticker))}
        </div>

        <div className="mt-5">
          <h4 className={`text-[10px] uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('sidebar.sections.inputs')}</h4>
          <div className="space-y-1">
            {inputSectors.map(ticker => renderTickerRow(ticker))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sidebar;
