import React from 'react';
import { Home, MessageSquare } from 'lucide-react';
import { BirthData, CalculationMethod, CityData, Coordinates } from '../types/astronomy';

interface HeaderNavProps {
  currentProfile: BirthData | null;
  onOpenBirthModal: () => void;
  relocationTarget?: (CityData | (Coordinates & { name?: string; country?: string })) | null;
  onOpenRelocationPicker?: () => void;
  onClearRelocation?: () => void;
  isDualChartActive: boolean;
  onToggleDualChart: () => void;
  showTransits: boolean;
  onToggleTransits: () => void;
  onOpenReportModal: () => void;
  onToggleChartWheel: () => void;
  isChartWheelOpen: boolean;
  onOpenTopCities: () => void;
  activeLocationName?: string;
  calculationMethod: CalculationMethod;
  onChangeCalculationMethod: (method: CalculationMethod) => void;
  isRecalculating?: boolean;
  onOpenTutorial?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentProfile,
  onOpenBirthModal,
  relocationTarget,
  onOpenRelocationPicker,
  onClearRelocation,
  isDualChartActive,
  onToggleDualChart,
  showTransits,
  onToggleTransits,
  onOpenReportModal,
  onToggleChartWheel,
  isChartWheelOpen,
  onOpenTopCities,
  activeLocationName,
  calculationMethod,
  onChangeCalculationMethod,
  isRecalculating = false,
  onOpenTutorial,
}) => {
  return (
    <header className="atlas-cosmic-nav h-16 px-4 sm:px-6 backdrop-blur-md flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left Brand Identity */}
      <div className="flex items-center gap-3">
        <a
          href="https://spectralgarden.github.io/spectralgarden/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Spectral Garden"
          title="Visit Spectral Garden"
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-500 via-violet-400 to-fuchsia-400 p-[1px] shadow-lg shadow-violet-500/10 transition duration-200 hover:shadow-[0_0_18px_rgba(167,139,250,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <span className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950">
            <img
              src={`${import.meta.env.BASE_URL}sglogo.png`}
              alt=""
              className="h-7 w-7 rounded-lg object-contain"
            />
          </span>
        </a>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-bold text-sm sm:text-base text-white tracking-wider">SPECTRAL ATLAS</h1>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30">
              Astrocartography
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>by spectral garden</span>
            {activeLocationName && (
              <>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-violet-400 font-sans truncate max-w-[150px] sm:max-w-[220px] hidden sm:inline">
                  {activeLocationName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center Action Features */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Mundo vs Zodiaco Projection Switcher */}
        <div
          className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner"
          title="Switch calculation method: In Mundo (Jim Lewis physical sky alignment) vs In Zodiaco (Zodico ecliptic projection matching relocated chart cusps like Astro.com & Astro-Seek)"
        >
          <button
            id="btn-calc-mundo"
            type="button"
            disabled={isRecalculating}
            onClick={() => onChangeCalculationMethod('in_mundo')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
              calculationMethod === 'in_mundo'
                ? 'bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            } ${isRecalculating && calculationMethod === 'in_mundo' ? 'animate-pulse' : ''}`}
          >
            {isRecalculating && calculationMethod === 'in_mundo' ? (
              <span className="animate-spin text-violet-400 text-[10px] inline-block">◌</span>
            ) : (
              <span className="text-violet-400 text-[10px]">☉</span>
            )}
            <span>In Mundo</span>
          </button>
          <button
            id="btn-calc-zodiaco"
            type="button"
            disabled={isRecalculating}
            onClick={() => onChangeCalculationMethod('in_zodiaco')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
              calculationMethod === 'in_zodiaco'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            } ${isRecalculating && calculationMethod === 'in_zodiaco' ? 'animate-pulse' : ''}`}
          >
            {isRecalculating && calculationMethod === 'in_zodiaco' ? (
              <span className="animate-spin text-cyan-400 text-[10px] inline-block">◌</span>
            ) : (
              <span className="text-cyan-400 text-[10px]">♈</span>
            )}
            <span>In Zodiaco</span>
          </button>
        </div>

        {/* Top Cities Power List Trigger */}
        <button
          id="btn-nav-top-cities"
          onClick={onOpenTopCities}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-500/20 to-violet-600/20 hover:from-violet-500/30 hover:to-violet-600/30 text-violet-300 border border-violet-500/40 shadow-sm shadow-violet-500/10 transition flex items-center gap-1.5 cursor-pointer"
          title="Ranked Top Cities and Planetary Power Spots for your Chart"
        >
          <span className="text-violet-400">✦</span>
          <span className="font-serif">Top Cities List</span>
        </button>

        {/* Toggle Chart Wheel */}
        <button
          id="btn-toggle-wheel"
          onClick={onToggleChartWheel}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
            isChartWheelOpen
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
          title="Toggle Natal & Relocated Chart Wheel"
        >
          <span>Chart Wheel</span>
        </button>

        {/* Real-Time Planetary Transits */}
        <button
          id="btn-toggle-transits"
          onClick={onToggleTransits}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
            showTransits
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
          title="Map live planetary transits across the globe"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${showTransits ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
          <span>Transits</span>
        </button>

        {/* Dual Chart Synastry Comparison */}
        <button
          id="btn-toggle-dual"
          onClick={onToggleDualChart}
          className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
            isDualChartActive
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
          title="Dual Chart Synastry Comparison"
        >
          <span>Dual Chart</span>
        </button>

        {/* Export Full Report */}
        <button
          id="btn-open-report"
          onClick={onOpenReportModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white transition cursor-pointer"
          title="Export Complete Astrocartography Report"
        >
          <span>Report</span>
        </button>

        {/* Tutorial / Beginner's User Manual */}
        {onOpenTutorial && (
          <button
            id="btn-open-tutorial"
            onClick={onOpenTutorial}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:border-violet-400 transition cursor-pointer shadow-xs"
            title="Open Complete Beginner's Manual & Astrological Reference Guide"
          >
            <span>📖</span>
            <span className="font-serif">Tutorial</span>
          </button>
        )}
        <a
          id="btn-open-forum"
          href="https://flame-finder-main.onrender.com/?tab=forum"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 hover:border-fuchsia-400 transition cursor-pointer shadow-xs"
          title="Open the Flame Finder community forum"
        >
          <MessageSquare size={14} aria-hidden="true" />
          <span className="font-serif">Forum</span>
        </a>
      </div>

      {/* Right: Relocation & Active Natal Profile Indicators */}
      <div className="flex items-center gap-2">
        <a
          id="btn-home"
          href="https://spectralgarden.github.io/spectralgarden/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Spectral Garden home"
          title="Home"
          className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 transition duration-200 hover:border-violet-300 hover:shadow-[0_0_18px_rgba(167,139,250,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <Home aria-hidden="true" className="h-4 w-4 text-slate-300 transition-colors group-hover:text-violet-300" />
        </a>

        {/* Relocation Target Badge or Add Button */}
        {relocationTarget ? (
          <div
            onClick={onOpenRelocationPicker}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-xs transition cursor-pointer group"
            title="Relocation Target active — click to change or inspect"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 group-hover:scale-125 transition-transform" />
            <div className="text-left">
              <span className="text-[9px] text-purple-300 font-mono block leading-none uppercase">Relocation:</span>
              <span className="font-semibold text-white text-[11px] leading-none block mt-0.5 truncate max-w-[110px] sm:max-w-[140px]">
                {'name' in relocationTarget && relocationTarget.name
                  ? relocationTarget.name
                  : `${relocationTarget.lat.toFixed(1)}°, ${relocationTarget.lng.toFixed(1)}°`}
              </span>
            </div>
            {onClearRelocation && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearRelocation();
                }}
                className="text-purple-400 hover:text-rose-400 ml-1 text-xs px-1 rounded hover:bg-purple-900/80"
                title="Remove relocation target"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <button
            id="btn-add-relocation-header"
            onClick={onOpenRelocationPicker}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-950/50 text-slate-300 hover:text-purple-200 border border-slate-800 hover:border-purple-500/40 text-xs transition cursor-pointer"
            title="Set a destination to compare your natal vs relocated chart"
          >
            <span className="text-purple-400 font-serif">✦</span>
            <span>+ Relocation Target</span>
          </button>
        )}

        {/* Active Natal Profile Indicator */}
        <button
          id="btn-active-profile"
          onClick={onOpenBirthModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
            currentProfile
              ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              : 'bg-violet-500/20 hover:bg-violet-500/30 border-violet-500/40 text-violet-200 shadow-sm shadow-violet-500/10'
          }`}
          title={currentProfile ? 'Edit Birth Chart or Switch Profile' : 'Enter Birth Chart'}
        >
          <span className={`w-2 h-2 rounded-full ${currentProfile ? 'bg-emerald-400 animate-pulse' : 'bg-violet-400 animate-ping'}`} />
          <div className="text-left">
            <span className="font-semibold block leading-none text-white text-[11px] sm:text-xs">
              {currentProfile ? currentProfile.name : 'Enter Birth Info'}
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono leading-none">
              {currentProfile ? `${currentProfile.cityName} • ${currentProfile.date}` : 'Setup Required'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
