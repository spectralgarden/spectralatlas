import React from 'react';
import { CalculationMethod } from '../types/astronomy';

interface CalculationLoadingDialogProps {
  isOpen: boolean;
  targetMethod: CalculationMethod | null;
  isBirthDataLoading?: boolean;
  isMapLoading?: boolean;
}

export const CalculationLoadingDialog: React.FC<CalculationLoadingDialogProps> = ({
  isOpen,
  targetMethod,
  isBirthDataLoading = false,
  isMapLoading = false,
}) => {
  if (!isOpen) return null;

  const isZodiaco = targetMethod === 'in_zodiaco';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm pointer-events-auto select-none transition-all duration-200" role="status" aria-live="polite" aria-busy="true">
      <div className="relative max-w-sm w-full bg-slate-950/95 backdrop-blur-xl border border-violet-500/40 shadow-2xl shadow-violet-500/20 rounded-2xl p-5 text-center space-y-3.5 animate-scaleUp">
        {/* Animated Celestial Gyroscope / Orbital Spinner */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          {/* Outer rotating ring */}
          <div
            className={`absolute inset-0 rounded-full border-2 border-transparent ${
              isZodiaco ? 'border-t-cyan-400 border-r-cyan-400/50' : 'border-t-violet-400 border-r-violet-400/50'
            } animate-spin`}
            style={{ animationDuration: '1.2s' }}
          />
          {/* Inner counter-rotating ring */}
          <div
            className={`absolute inset-1.5 rounded-full border-2 border-transparent ${
              isZodiaco ? 'border-b-purple-400 border-l-purple-400/50' : 'border-b-sky-400 border-l-sky-400/50'
            } animate-spin`}
            style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}
          />
          {/* Central Celestial Glyph */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-serif font-bold shadow-lg ${
              isZodiaco
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-500/20'
                : 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-violet-500/20'
            }`}
          >
            {isZodiaco ? '♈' : '☉'}
          </div>
        </div>

        {/* Title & Method Badge */}
        <div>
          <h3 className="text-sm font-serif font-bold text-white tracking-wide">
            {isMapLoading
              ? 'Loading Your Atlas Map'
              : isBirthDataLoading
              ? 'Updating Birth Information'
              : 'Recalculating Astrological Matrix'}
          </h3>
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border bg-slate-900/90 border-slate-700">
            <span className={isZodiaco ? 'text-cyan-400' : 'text-violet-400'}>
              {isZodiaco ? '♈ In Zodiaco Mode' : '☉ In Mundo Mode'}
            </span>
          </div>
        </div>

        {/* Informative Explanation */}
        <p className="text-xs text-slate-300 leading-relaxed px-2">
          {isMapLoading
            ? 'Preparing the interactive map and loading its first map tiles. This usually takes just a few moments.'
            : isBirthDataLoading
            ? 'Recalculating your astrocartography map from the updated birth date, time, and location.'
            : isZodiaco
            ? 'Transforming planetary azimuths to relocated ecliptic cusps (matching standard Astro-Seek & Astro.com chart angles).'
            : 'Computing 3D prime vertical topocentric coordinates (Jim Lewis original physical rising, culmination & horizon crossings).'}
        </p>

        {/* Glowing Progress Indicator Bar */}
        <div className="space-y-1 pt-1">
          <div className="w-full bg-slate-900 border border-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full animate-pulse ${
                isZodiaco
                  ? 'bg-gradient-to-r from-cyan-500 via-sky-300 to-cyan-500'
                  : 'bg-gradient-to-r from-violet-500 via-yellow-300 to-violet-500'
              }`}
              style={{ width: '100%' }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 px-0.5">
            <span>{isMapLoading ? 'Loading Map Tiles' : isBirthDataLoading ? 'Recalculating Birth Chart' : 'Updating Spherical Projections'}</span>
            <span className="text-violet-400 animate-pulse">{isMapLoading ? 'Loading…' : isBirthDataLoading ? 'Updating…' : 'Calculating...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
