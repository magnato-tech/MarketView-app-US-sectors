import React from 'react';

type Props = { isNo: boolean };

export const CrisisSixPercentExplainer: React.FC<Props> = ({ isNo }) => {
  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-slate-950 p-6 space-y-6 shadow-2xl">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1 space-y-5">
          <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tight text-slate-100 uppercase">
              {isNo ? 'Hva betyr egentlig «6%»?' : 'What does «6%» actually mean?'}
            </h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
              {isNo ? 'Den fysiske grensen for stabilitet' : 'The physical limit of stability'}
            </p>
          </div>
          
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            {isNo 
              ? '6% er ikke et mål på hvor mye gass som er igjen i verden, men en kritisk grense for strømnettet i Taiwan og Sør-Korea. Når reserven faller under 6%, kan ikke lenger nettet garantere stabil spenning til maskinene som etser sjetonger.'
              : '6% is not a measure of global gas supply, but a critical threshold for the power grids in Taiwan and South Korea. Below 6%, the grid can no longer guarantee stable voltage to the machines etching silicon.'}
          </p>
          
          <div className="space-y-3">
            <div className="group flex items-center gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-mono text-lg font-black border border-emerald-500/20">10+</div>
              <div>
                <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">{isNo ? 'Trygg Sone' : 'Safe Zone'}</p>
                <p className="text-[11px] text-slate-400 font-medium">{isNo ? 'Overskuddskapasitet. Fabrikkene kjører for fullt.' : 'Surplus capacity. Fabs running at 100%.'}</p>
              </div>
            </div>
            <div className="group flex items-center gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 font-mono text-lg font-black border border-amber-500/20">6-10</div>
              <div>
                <p className="text-xs font-black text-amber-400 uppercase tracking-wider">{isNo ? 'Spenning i systemet' : 'System Strain'}</p>
                <p className="text-[11px] text-slate-400 font-medium">{isNo ? 'Industrien må kutte. Risiko for svingninger øker.' : 'Industry curtailment. Risk of fluctuations rising.'}</p>
              </div>
            </div>
            <div className="group flex items-center gap-4 p-3 rounded-xl bg-rose-500/5 border border-rose-500/30 animate-pulse shadow-[0_0_20px_-10px_rgba(244,63,94,0.3)]">
              <div className="w-12 h-12 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-mono text-lg font-black border border-rose-500/40">{'<'}6</div>
              <div>
                <p className="text-xs font-black text-rose-400 uppercase tracking-wider">{isNo ? 'Kritisk (Grid Lock)' : 'Critical (Grid Lock)'}</p>
                <p className="text-[11px] text-rose-200 font-bold">{isNo ? 'Uunngåelige strømbrudd. Wafer-produksjon stopper.' : 'Inevitable blackouts. Wafer production halts.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          
          <svg viewBox="0 0 200 140" className="w-full h-auto drop-shadow-2xl">
            {/* The Cliff Path */}
            <path d="M0 100 L100 100 L140 130 L200 130" stroke="#475569" strokeWidth="3" fill="none" strokeLinecap="round" />
            
            {/* 6% Vertical Marker */}
            <line x1="100" y1="20" x2="100" y2="100" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" />
            <rect x="105" y="25" width="50" height="12" rx="2" fill="#f43f5e" />
            <text x="110" y="34" fill="white" fontSize="7" fontWeight="900" letterSpacing="0.5">6% LIMIT</text>
            
            {/* The "Economy" Car */}
            <g transform="translate(45, 82)">
              <rect x="0" y="0" width="24" height="14" rx="3" fill="#22d3ee" className="animate-bounce" style={{ animationDuration: '3s' }} />
              <rect x="16" y="3" width="6" height="4" rx="1" fill="#0f172a" />
              <circle cx="6" cy="14" r="3" fill="#1e293b" stroke="#22d3ee" strokeWidth="1" />
              <circle cx="18" cy="14" r="3" fill="#1e293b" stroke="#22d3ee" strokeWidth="1" />
              <text x="-12" y="-6" fill="#22d3ee" fontSize="8" fontWeight="900" uppercase>ECONOMY</text>
            </g>

            {/* Danger Zone Glow */}
            <rect x="100" y="100" width="100" height="40" fill="url(#dangerGrad)" opacity="0.2" />
            <defs>
              <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            
            <text x="145" y="120" fill="#fb7185" fontSize="8" fontWeight="900" className="animate-pulse">COLLAPSE</text>
          </svg>
          
          <div className="mt-6 p-3 bg-slate-950 rounded-lg border border-slate-800 w-full">
            <p className="text-[10px] text-slate-400 text-center font-mono leading-relaxed">
              {isNo 
                ? 'Når reserven bryter 6%, kollapser fysikken bak narrativet.' 
                : 'When reserves break 6%, the physics behind the narrative collapse.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-indigo-500/5 rounded-xl border border-indigo-500/20 p-5">
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">
              {isNo ? 'Gass-koblingen (Drivstoffet)' : 'The Gas Connection (The Fuel)'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {isNo 
                ? 'Gass (LNG) er det som holder motoren i gang. Hvis JKM LNG-prisen går for høyt, har ikke Taiwan råd til å brenne nok gass til å holde reserven over 6%. 6% er altså ikke et mål på gass, men et mål på om gassen vi har er nok til å holde lyset på i fabrikkene.'
                : 'Gas (LNG) is what keeps the engine running. If JKM LNG prices spike, Taiwan cannot afford to burn enough gas to keep reserves above 6%. Thus, 6% is not a gas measurement, but a measurement of whether available gas is sufficient to keep the lights on in the fabs.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
