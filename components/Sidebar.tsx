
import React from 'react';
import { TICKERS } from '../constants';
import { useDashboard } from '../contexts/DashboardContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language } from '../i18n/types';

interface SidebarProps {
  selectedTickers: string[];
  onTickerToggle: (symbol: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedTickers,
  onTickerToggle,
}) => {
  const { isDarkMode, toggleDarkMode, drilldownSector, setDrilldownSector } = useDashboard();
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

  const renderTickerRow = (ticker: any, isMainSector = false) => {
    const isActiveInDrilldown = drilldownSector === ticker.symbol;
    const hasChildren = TICKERS.some(child => child.parentSymbol === ticker.symbol);

    return (
      <div key={ticker.symbol} className="flex items-center group">
        <label className={`flex-1 flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-all border border-transparent ${
          isDarkMode ? 'hover:bg-slate-800/50 hover:border-slate-700/50' : 'hover:bg-slate-200/50 hover:border-slate-300/50'
        }`}>
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={selectedTickers.includes(ticker.symbol)}
              onChange={() => onTickerToggle(ticker.symbol)}
              className={`w-4 h-4 rounded appearance-none border transition-all ${
                isDarkMode 
                  ? 'border-slate-700 bg-slate-800 checked:bg-blue-600' 
                  : 'border-slate-300 bg-white checked:bg-blue-600'
              } text-blue-600 focus:ring-blue-500 checked:border-transparent`}
            />
            {selectedTickers.includes(ticker.symbol) && (
              <svg className="w-3 h-3 absolute left-0.5 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="flex flex-col">
            <span className={`text-sm transition-colors ${
              selectedTickers.includes(ticker.symbol) 
                ? (isDarkMode ? 'text-white font-bold' : 'text-slate-900 font-bold') 
                : (isDarkMode ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-700')
            }`}>
              {ticker.name}
            </span>
            <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{ticker.symbol}</span>
          </div>
        </label>
        
        {isMainSector && hasChildren && (
          <button
            onClick={(e) => {
              e.preventDefault();
              setDrilldownSector(isActiveInDrilldown ? null : ticker.symbol);
            }}
            className={`p-2 ml-1 rounded-md transition-all ${
              isActiveInDrilldown 
                ? 'bg-blue-600/20 text-blue-400 rotate-90' 
                : 'text-slate-600 hover:bg-slate-800 hover:text-slate-400'
            }`}
            title={isActiveInDrilldown ? t('sidebar.drilldown.close') : t('sidebar.drilldown.open')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
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
          {mainSectors.map(ticker => renderTickerRow(ticker, true))}
        </div>

        <div className="mt-5">
          <h4 className={`text-[10px] uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('sidebar.sections.inputs')}</h4>
          <div className="space-y-1">
            {inputSectors.map(ticker => renderTickerRow(ticker, true))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sidebar;
