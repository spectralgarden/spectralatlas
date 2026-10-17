import React, { useState, useMemo } from 'react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Chapter {
  id: string;
  title: string;
  icon: string;
  badge?: string;
  summary: string;
  content: React.ReactNode;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [activeChapterId, setActiveChapterId] = useState<string>('quickstart');
  const [searchQuery, setSearchQuery] = useState('');

  const chapters: Chapter[] = useMemo(
    () => [
      {
        id: 'quickstart',
        title: 'Quick Start: 3 Easy Steps',
        icon: '🚀',
        badge: 'Beginner',
        summary: 'Learn how to generate your map, read celestial power lines, and inspect locations.',
        content: (
          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <p>
              Welcome to the <strong className="text-white">Astrocartography Studio</strong>! Astrocartography (also known as Locational Astrology) maps your natal birth chart across the physical surface of planet Earth.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm mb-3">
                    1
                  </div>
                  <h4 className="font-semibold text-white text-base mb-1">Set Your Birth Data</h4>
                  <p className="text-xs text-slate-400">
                    Click the top bar to enter your exact birth date, time, and birth city. Accurate birth time is crucial because the Earth rotates 1° of longitude every 4 minutes.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-amber-300/80">✦ Exact minute matters</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-sm mb-3">
                    2
                  </div>
                  <h4 className="font-semibold text-white text-base mb-1">Explore Planetary Lines</h4>
                  <p className="text-xs text-slate-400">
                    Each colored line on the map represents where a planet was rising, setting, culminating, or anti-culminating at the moment you took your first breath.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-cyan-300/80">✦ ~350 km active corridor</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-sm mb-3">
                    3
                  </div>
                  <h4 className="font-semibold text-white text-base mb-1">Click Any City to Inspect</h4>
                  <p className="text-xs text-slate-400">
                    Click anywhere on the globe or choose a city to see your Relocation Verdict, side-by-side house shifts, active parans, and locational power quotient.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-mono text-purple-300/80">✦ Instant A+ to D Grade</div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'angles',
        title: 'The 4 Cardinal Angles Demystified',
        icon: '🏛️',
        badge: 'Core Theory',
        summary: 'Understand Midheaven (MC), Nadir (IC), Ascendant (ASC), and Descendant (DSC).',
        content: (
          <div className="space-y-5 text-sm text-slate-300 leading-relaxed">
            <p>
              In astrology, the four cardinal angles represent the most powerful points where planetary energy directly impacts human experience. Living or traveling near these lines activates that planet in your life:
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 font-mono">
                    MC (Midheaven)
                  </span>
                  <span className="font-semibold text-white text-sm">Medium Coeli • Zenith / High Noon</span>
                </div>
                <p className="text-xs text-slate-300 mb-2">
                  <strong>Life Area:</strong> Career, worldly ambition, public reputation, status, and life purpose.
                </p>
                <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-amber-300 font-semibold">Real Life Effect:</span> On your <em>Sun MC</em> line, your leadership and visibility soar. On your <em>Venus MC</em> line, you gain executive charm and public favor. On <em>Saturn MC</em>, you take on heavy responsibilities and build long-term authority.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-sky-500/20 text-sky-300 font-mono">
                    IC (Imum Coeli)
                  </span>
                  <span className="font-semibold text-white text-sm">Nadir • Ground of Being / Midnight</span>
                </div>
                <p className="text-xs text-slate-300 mb-2">
                  <strong>Life Area:</strong> Home, private sanctuary, psychological roots, family ancestry, and emotional foundation.
                </p>
                <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-sky-300 font-semibold">Real Life Effect:</span> On your <em>Moon IC</em> line, you feel deeply rooted, comfortable, and emotionally nourished. On <em>Jupiter IC</em>, you find generous living spaces and domestic blessings.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                    ASC (Ascendant)
                  </span>
                  <span className="font-semibold text-white text-sm">Eastern Horizon • Rising Sun</span>
                </div>
                <p className="text-xs text-slate-300 mb-2">
                  <strong>Life Area:</strong> Physical vitality, bodily embodiment, personal persona, and how you project yourself to the world.
                </p>
                <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-emerald-300 font-semibold">Real Life Effect:</span> On your <em>Mars ASC</em> line, you feel driven, athletic, and assertive (watch for burnout). On <em>Venus ASC</em>, you radiate physical beauty, grace, and effortless social warmth.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 font-mono">
                    DSC (Descendant)
                  </span>
                  <span className="font-semibold text-white text-sm">Western Horizon • Sunset</span>
                </div>
                <p className="text-xs text-slate-300 mb-2">
                  <strong>Life Area:</strong> One-on-one relationships, marriage, business partnerships, and how others mirror you.
                </p>
                <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-rose-300 font-semibold">Real Life Effect:</span> On your <em>Venus DSC</em> line, you attract romantic partners and harmonious alliances. On <em>Jupiter DSC</em>, you encounter generous benefactors and legal protection.
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'local_space',
        title: 'Local Space Lines (Compass Azimuth Vectors)',
        icon: '🧭',
        badge: 'Directional',
        summary: 'How horizontal compass bearings project planetary power from your birth or home city.',
        content: (
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              Pioneered by Michael Erlewine, <strong className="text-white">Local Space Astrology</strong> shifts the perspective from celestial coordinates to horizontal compass bearings (Azimuth and Altitude) originating directly from where you are standing.
            </p>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
              <h4 className="font-semibold text-amber-300 text-sm mb-1">How Local Space Works</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                At the exact moment of your birth, each planet was situated at a specific compass bearing (e.g. Venus at 112° ESE, Mars at 285° WNW). If you draw a straight line along that compass heading around the Earth as a great circle, that is your <strong className="text-amber-200">Local Space Line</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                <div className="font-semibold text-white mb-1">✈️ Travel & Relocation</div>
                <p className="text-slate-400">
                  Traveling or relocating along your Jupiter Local Space line directs your steps toward places that expand your wealth, education, and philosophical horizon.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                <div className="font-semibold text-white mb-1">🏡 Micro-Cosmic Feng Shui</div>
                <p className="text-slate-400">
                  Local Space can even be applied to your city or your living room! Placing your desk along your Mercury line aids writing, while placing your bed along your Moon line promotes deep sleep.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'fixed_stars',
        title: 'Fixed Stars & Bernadette Brady Star Parans',
        icon: '🌟',
        badge: 'Ancient Stars',
        summary: 'Ancient cosmic stellar alignments locking into terrestrial latitudes across the globe.',
        content: (
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              Astrologer <strong className="text-white">Bernadette Brady</strong> revived the ancient Egyptian and Sumerian methodology of <strong className="text-white">Paranatellonta (Star Parans)</strong>.
            </p>

            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
              <h4 className="font-semibold text-purple-300 text-sm mb-1">What is a Star Paran?</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                A Star Paran is an exact terrestrial latitude where a prominent fixed star (like Sirius, Regulus, or Spica) and a natal planet cross the four cardinal angles (Rising, Culminating, Setting, Nadir) at the exact same moment. Because Earth spins on its polar axis, a paran forms a continuous horizontal ring of latitude around the entire globe!
              </p>
            </div>

            <h4 className="font-semibold text-white text-sm">Key Stars in this Tool</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-amber-300">Sirius (The Scorcher):</span> Blazing public recognition, fame, monumental achievement that outlasts the individual.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-amber-300">Regulus (Heart of the Lion):</span> The Kingmaker, royal authority, natural executive command (avoid petty revenge).
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-rose-300">Algol (Medusa’s Head):</span> Raw primal feminine power, fierce passion, unbridled creative force when channeled cleanly.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-emerald-300">Spica (Sheaf of Wheat):</span> Pure brilliant talent, unearned grace, artistic fruitfulness, and natural genius.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-sky-300">Arcturus (The Pathfinder):</span> The celestial navigator; guiding others into new frontiers and paradigm shifts.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <span className="font-bold text-purple-300">Antares (Heart of Scorpio):</span> Strategic courage, fearless drive to tackle colossal odds in crises.
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'advanced_points',
        title: 'Chiron, Lilith, Nodes & Major Asteroids',
        icon: '🪐',
        badge: 'Advanced Points',
        summary: 'Deep meanings of Chiron, Lilith, Lunar Nodes, and the 4 Major Goddess Asteroids.',
        content: (
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              Beyond the traditional 10 celestial bodies, our tool tracks profound evolutionary points and the 4 major asteroids:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                <div className="font-bold text-emerald-300 text-sm mb-1">⚷ Chiron — The Wounded Healer</div>
                <p className="text-slate-300">
                  Where you confront deep-seated vulnerabilities, transmute personal wounds into unique medicine, and emerge as an empathetic mentor or healer for others.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30">
                <div className="font-bold text-rose-300 text-sm mb-1">⚸ Black Moon Lilith — Raw Autonomy</div>
                <p className="text-slate-300">
                  Untamed feminine sovereignty, instinctive truth, rejection of oppressive societal roles, and hypnotic magnetic authority.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30">
                <div className="font-bold text-amber-300 text-sm mb-1">☊ ☋ Lunar Nodes — Karmic Destiny</div>
                <p className="text-slate-300">
                  <strong>North Node:</strong> The evolutionary growth edge, soul purpose, and dharmic future.<br />
                  <strong>South Node:</strong> Innate talents, comfort zone, and familiar ancestral soil.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                <div className="font-bold text-emerald-300 text-sm mb-1">⚳ Ceres — The Great Mother</div>
                <p className="text-slate-300">
                  Earthly nourishment, bodily wellness, self-care, food, agriculture, and unconditional maternal protection.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/30">
                <div className="font-bold text-sky-300 text-sm mb-1">⚴ Pallas Athena — Creative Strategy</div>
                <p className="text-slate-300">
                  Wisdom goddess of pattern recognition, warrior intellect, discernment, legal strategy, and artistic design.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-pink-950/20 border border-pink-500/30">
                <div className="font-bold text-pink-300 text-sm mb-1">⚵ Juno — Sacred Partnership</div>
                <p className="text-slate-300">
                  Soulmate contracts, mutual fidelity, marital equity, and deep relational devotion.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-orange-950/20 border border-orange-500/30 md:col-span-2">
                <div className="font-bold text-orange-300 text-sm mb-1">⚶ Vesta — The Sacred Flame</div>
                <p className="text-slate-300">
                  Spiritual focus, inner devotion, sacred temple service, work sanctuaries, and unyielding dedication to a holy calling.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'relocation_ranking',
        title: 'How Relocation Verdicts & Scoring Work',
        icon: '🏆',
        badge: 'Grading Guide',
        summary: 'Understand the A+ to D grades, Benefic vs Malefic corridors, and pros/cons.',
        content: (
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              When you click on a city or set a relocation destination, our engine calculates a clear, unambiguous <strong className="text-white">Relocation Verdict</strong>:
            </p>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                  Grade A+ / A
                </span>
                <div>
                  <div className="font-semibold text-emerald-200 text-sm">Exceptional / Highly Favorable Haven</div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Activated by Great Benefics (Venus, Jupiter, Sun, Part of Fortune, Ceres). High social magnetism, career advancement, effortless financial flow, and health protection.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-950/30 border border-sky-500/40">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-sky-500/20 text-sky-300 font-mono">
                  Grade B
                </span>
                <div>
                  <div className="font-semibold text-sky-200 text-sm">Balanced & Steady Sanctuary</div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Minimal harsh afflictions; stable psychological foundation. Personal outcomes here depend mostly on your everyday actions rather than overwhelming celestial turbulence.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 font-mono">
                  Grade C
                </span>
                <div>
                  <div className="font-semibold text-amber-200 text-sm">Mixed Influences / Caution Advised</div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    High ambition or creative opportunities offset by notable friction (e.g. Venus on MC but Saturn on Ascendant). Requires deliberate stress management and patience.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-950/30 border border-rose-500/40">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 font-mono">
                  Grade D
                </span>
                <div>
                  <div className="font-semibold text-rose-200 text-sm">High Friction / Demanding Crucible</div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Dominated by heavy malefic corridors (Mars on Descendant, Saturn on Nadir, Pluto on MC). Prone to burnout, domestic upheaval, or interpersonal friction. Can catalyze deep growth if prepared.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'mundo_vs_zodiaco',
        title: 'In Mundo vs In Zodiaco (Methods Explained)',
        icon: '📐',
        badge: 'Astronomy',
        summary: 'Learn the difference between physical sky positions and ecliptic projections.',
        content: (
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              In the calculation options, you can toggle between <strong className="text-white">In Mundo</strong> and <strong className="text-white">In Zodiaco</strong>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="font-semibold text-amber-300 text-sm mb-1">In Mundo (Physical Sky)</div>
                <p className="text-xs text-slate-300 mb-2">
                  The original Astro*Carto*Graphy method developed by Jim Lewis in 1976.
                </p>
                <p className="text-xs text-slate-400">
                  Takes into account the physical spherical coordinates (Right Ascension & Declination) of each planet in the real sky. When a planet physically touches the horizon, that is where the ASC or DSC line is drawn.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="font-semibold text-cyan-300 text-sm mb-1">In Zodiaco (Ecliptic Longitude)</div>
                <p className="text-xs text-slate-300 mb-2">
                  The standard relocated horoscope approach favored by modern computer charts.
                </p>
                <p className="text-xs text-slate-400">
                  Projects the planet purely onto the 2D ecliptic circle (0° Aries to 360° Pisces). Calculates where a relocated chart’s Ascendant or Midheaven degree is mathematically conjunct that zodiac degree.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <span className="text-amber-300 font-semibold">Which should you use?</span> Professional astrocartographers prefer <strong>In Mundo</strong> for physical terrestrial travel and relocation, and <strong>In Zodiaco</strong> when comparing side-by-side relocated chart wheels!
            </div>
          </div>
        ),
      },
    ],
    []
  );

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    return chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        (c.badge && c.badge.toLowerCase().includes(q))
    );
  }, [chapters, searchQuery]);

  const activeChapter = chapters.find((c) => c.id === activeChapterId) || chapters[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                Astrocartography User Manual & Tutorial
              </h2>
              <p className="text-xs text-slate-400">
                Complete guide to planetary lines, local space, star parans, and relocation scoring
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Close Tutorial"
          >
            ✕
          </button>
        </div>

        {/* Search Filter */}
        <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/40">
          <input
            type="text"
            placeholder="Search manual (e.g. Venus, Local Space, Brady Parans, Grade A+, MC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Two-Column Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Chapter Navigation Sidebar */}
          <div className="w-full md:w-72 border-r border-slate-800 bg-slate-950/30 overflow-y-auto p-3 space-y-1.5 shrink-0 max-h-48 md:max-h-none">
            {filteredChapters.map((ch) => {
              const isActive = ch.id === activeChapter.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChapterId(ch.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-base">{ch.icon}</span>
                    <span className="truncate">{ch.title}</span>
                  </div>
                  {ch.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0 ml-1">
                      {ch.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chapter Content Area */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{activeChapter.icon}</span>
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">{activeChapter.title}</h3>
                  <p className="text-xs text-slate-400">{activeChapter.summary}</p>
                </div>
              </div>
              {activeChapter.badge && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                  {activeChapter.badge}
                </span>
              )}
            </div>

            <div className="mt-4">{activeChapter.content}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">Esc</kbd> anytime to return to your map</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
