import React from 'react';
import { MapPin, Star, Trash2 } from 'lucide-react';
import { CityData, Coordinates } from '../types/astronomy';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: (CityData | Coordinates)[];
  activeLocation: Coordinates | null;
  onSelectLocation: (location: CityData | Coordinates) => void;
  onRemoveFavorite: (location: CityData | Coordinates) => void;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  isOpen,
  onClose,
  favorites,
  activeLocation,
  onSelectLocation,
  onRemoveFavorite,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorites-title"
        className="top-cities-nebula-panel flex h-full w-full max-w-lg flex-col bg-slate-900 shadow-2xl animate-slideInRight"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <div className="flex items-center gap-2">
              <Star aria-hidden="true" size={17} className="fill-amber-300 text-amber-300" />
              <h2 id="favorites-title" className="text-base font-serif font-bold tracking-wide text-white">
                Starred Locations
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Saved in this browser. Select a location to inspect it on the map.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close favorites"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {favorites.length === 0 ? (
            <div className="py-12 text-center">
              <Star aria-hidden="true" size={28} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No starred locations yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Open a location on the map and select the star to save it here.
              </p>
            </div>
          ) : (
            [...favorites].reverse().map((location, index) => {
              const isCity = 'id' in location;
              const name = isCity ? location.name : `Coordinates`;
              const detail = isCity ? location.country : 'Custom map location';
              const isSelected = Boolean(
                activeLocation &&
                Math.abs(activeLocation.lat - location.lat) < 0.1 &&
                Math.abs(activeLocation.lng - location.lng) < 0.1
              );
              const key = isCity
                ? location.id
                : `coords_${location.lat}_${location.lng}_${index}`;

              return (
                <article
                  key={key}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 transition ${
                    isSelected
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-slate-800 bg-slate-950/60 hover:border-violet-500/50'
                  }`}
                >
                  <MapPin aria-hidden="true" size={17} className="shrink-0 text-violet-300" />
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLocation(location);
                      onClose();
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-semibold text-white">
                      {name}
                      {isCity && <span className="ml-1.5 text-xs font-normal text-slate-400">{detail}</span>}
                    </span>
                    {!isCity && <span className="block text-xs text-slate-400">{detail}</span>}
                    <span className="mt-1 block font-mono text-[11px] text-slate-500">
                      {location.lat.toFixed(3)}°, {location.lng.toFixed(3)}°
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveFavorite(location)}
                    aria-label={`Remove ${name} from favorites`}
                    title="Remove from favorites"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
