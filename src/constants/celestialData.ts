import { PlanetDefinition, PlanetId, ZodiacSign } from '../types/astronomy';

export const PLANET_DEFINITIONS: Record<PlanetId, PlanetDefinition> = {
  sun: {
    id: 'sun',
    name: 'Sun',
    symbol: '☉',
    color: '#F59E0B', // Radiant Gold
    secondaryColor: '#FDE68A',
    nature: 'luminary',
    archetype: 'The Radiant Self, Vitality, Creative Will, Recognition & Life Purpose',
    keywords: ['Identity', 'Visibility', 'Leadership', 'Vitality', 'Core Purpose'],
  },
  moon: {
    id: 'moon',
    name: 'Moon',
    symbol: '☽',
    color: '#E0E7FF', // Silver White / Lunar Pearl
    secondaryColor: '#C7D2FE',
    nature: 'luminary',
    archetype: 'The Emotional Heart, Belonging, Roots, Sanctuary & Intuitive Flow',
    keywords: ['Nurturance', 'Emotional Home', 'Intuition', 'Family', 'Vulnerability'],
  },
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    symbol: '☿',
    color: '#06B6D4', // Electric Cyan
    secondaryColor: '#A5F3FC',
    nature: 'neutral',
    archetype: 'The Messenger, Intellectual Agility, Commerce, Writing & Connection',
    keywords: ['Communication', 'Curiosity', 'Trade', 'Writing', 'Networking'],
  },
  venus: {
    id: 'venus',
    name: 'Venus',
    symbol: '♀',
    color: '#EC4899', // Emerald Rose / Luminous Pink
    secondaryColor: '#FBCFE8',
    nature: 'benefic',
    archetype: 'The Harmonizer, Love, Aesthetics, Magnetism & Abundance',
    keywords: ['Affection', 'Romance', 'Beauty', 'Sensuality', 'Financial Harmony'],
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    symbol: '♂',
    color: '#EF4444', // Crimson Spark
    secondaryColor: '#FCA5A5',
    nature: 'malefic',
    archetype: 'The Initiator, Drive, Physical Courage, Passion & Ambition',
    keywords: ['Decisive Action', 'Courage', 'Enterprise', 'Physical Stamina', 'Friction'],
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    symbol: '♃',
    color: '#8B5CF6', // Royal Amethyst / Expansion Violet
    secondaryColor: '#DDD6FE',
    nature: 'benefic',
    archetype: 'The Great Benefic, Expansion, Wisdom, Opportunity & Good Fortune',
    keywords: ['Blessings', 'Higher Education', 'Generosity', 'Abundance', 'Optimism'],
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn',
    symbol: '♄',
    color: '#94A3B8', // Architectural Slate / Silver Pewter
    secondaryColor: '#CBD5E1',
    nature: 'malefic',
    archetype: 'The Master Builder, Discipline, Sovereignty, Time & Endurance',
    keywords: ['Mastery', 'Structure', 'Patience', 'Karmic Lessons', 'Authority'],
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus',
    symbol: '♅',
    color: '#38BDF8', // Lightning Sky Blue
    secondaryColor: '#BAE6FD',
    nature: 'transpersonal',
    archetype: 'The Awakener, Breakthrough, Innovation, Freedom & Radical Authenticity',
    keywords: ['Revolution', 'Epiphany', 'Individuality', 'Originality', 'Sudden Shift'],
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune',
    symbol: '♆',
    color: '#14B8A6', // Mystical Aquamarine / Teal
    secondaryColor: '#99F6E4',
    nature: 'transpersonal',
    archetype: 'The Mystic Dreamer, Creative Transcendence, Compassion & Spiritual Radiance',
    keywords: ['Spiritual Oneness', 'Artistic Vision', 'Glamour', 'Intuitive Dissolution', 'Dreams'],
  },
  pluto: {
    id: 'pluto',
    name: 'Pluto',
    symbol: '♇',
    color: '#A855F7', // Deep Obsidian Magenta
    secondaryColor: '#E9D5FF',
    nature: 'transpersonal',
    archetype: 'The Alchemist, Phoenix Transformation, Raw Power & Regenerative Rebirth',
    keywords: ['Metamorphosis', 'Shadow Integration', 'Intense Magnetism', 'Psychic Depth', 'Empowerment'],
  },
  chiron: {
    id: 'chiron',
    name: 'Chiron',
    symbol: '⚷',
    color: '#10B981', // Healing Emerald
    secondaryColor: '#A7F3D0',
    nature: 'point',
    archetype: 'The Wounded Healer, Holistic Wisdom, Shamanic Integration & Mentorship',
    keywords: ['Deep Healing', 'Compassion', 'Unique Medicine', 'Self-Acceptance', 'Teacher'],
  },
  north_node: {
    id: 'north_node',
    name: 'North Node',
    symbol: '☊',
    color: '#F59E0B', // Solar Amber
    secondaryColor: '#FEF3C7',
    nature: 'point',
    archetype: 'The Evolutionary Path, Karmic Destiny, Growth Horizon & Soul Calling',
    keywords: ['Soul Purpose', 'Destined Encounters', 'New Frontiers', 'Growth Calling', 'Dharma'],
  },
  south_node: {
    id: 'south_node',
    name: 'South Node',
    symbol: '☋',
    color: '#64748B', // Ancient Charcoal
    secondaryColor: '#CBD5E1',
    nature: 'point',
    archetype: 'The Innate Gifts, Past Mastery, Release & Familiar Ancestral Soil',
    keywords: ['Karmic Memory', 'Comfort Zone', 'Innate Talent', 'Spiritual Release', 'Ancestry'],
  },
  lilith: {
    id: 'lilith',
    name: 'Black Moon Lilith',
    symbol: '⚸',
    color: '#F43F5E', // Wild Crimson
    secondaryColor: '#FECDD3',
    nature: 'point',
    archetype: 'The Untamed Wild, Raw Autonomy, Instinctual Truth & Taboo Liberation',
    keywords: ['Uncompromising Freedom', 'Primal Wisdom', 'Magnetism', 'Truth', 'Defiance'],
  },
  fortune: {
    id: 'fortune',
    name: 'Part of Fortune',
    symbol: '⊗',
    color: '#EAB308', // Radiant Sun-Gold
    secondaryColor: '#FEF08A',
    nature: 'point',
    archetype: 'The Point of Prosperity, Effortless Flow, Serendipity & Material Joy',
    keywords: ['Fulfillment', 'Natural Harmony', 'Abundance', 'Serendipity', 'Joy'],
  },
  ceres: {
    id: 'ceres',
    name: 'Ceres',
    symbol: '⚳',
    color: '#10B981', // Harvest Emerald Green
    secondaryColor: '#A7F3D0',
    nature: 'benefic',
    archetype: 'The Great Mother, Earthly Nurturance, Food, Agriculture & Self-Care',
    keywords: ['Unconditional Care', 'Abundance', 'Nourishment', 'Body Wisdom', 'Earth Roots'],
  },
  pallas: {
    id: 'pallas',
    name: 'Pallas Athena',
    symbol: '⚴',
    color: '#38BDF8', // Strategic Electric Cyan
    secondaryColor: '#BAE6FD',
    nature: 'neutral',
    archetype: 'Athena, Goddess of Creative Strategy, Pattern Recognition & Discernment',
    keywords: ['Strategy', 'Pattern Recognition', 'Warrior Intellect', 'Justice', 'Artistry'],
  },
  juno: {
    id: 'juno',
    name: 'Juno',
    symbol: '⚵',
    color: '#EC4899', // Sacred Partner Rose
    secondaryColor: '#FBCFE8',
    nature: 'benefic',
    archetype: 'The Sacred Partner, Soulmate Commitment, Relational Equity & Devotion',
    keywords: ['Sacred Union', 'Marriage', 'Soul Contracts', 'Mutual Respect', 'Loyalty'],
  },
  vesta: {
    id: 'vesta',
    name: 'Vesta',
    symbol: '⚶',
    color: '#F97316', // Sacred Flame Orange
    secondaryColor: '#FED7AA',
    nature: 'point',
    archetype: 'Keeper of the Sacred Flame, Inner Dedication, Focus & Holy Temple Service',
    keywords: ['Spiritual Focus', 'Sacred Flame', 'Dedication', 'Inner Purity', 'Work Sanctuary'],
  },
};

export const ANGLE_DEFINITIONS = {
  MC: {
    code: 'MC',
    name: 'Midheaven (Medium Coeli)',
    latin: 'South Meridian / Peak Sky',
    description: 'Career zenith, public reputation, social status, vocation, worldly authority, and calling.',
    badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
    icon: 'Crown',
  },
  IC: {
    code: 'IC',
    name: 'Imum Coeli (Nadir)',
    latin: 'North Meridian / Ground of Being',
    description: 'Home foundation, emotional roots, ancestry, private sanctuary, inner peace, and real estate.',
    badgeColor: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
    icon: 'Home',
  },
  ASC: {
    code: 'ASC',
    name: 'Ascendant (Rising)',
    latin: 'Eastern Horizon / Dawn',
    description: 'Physical embodiment, personal vitality, self-identity, outward personality, and direct self-expression.',
    badgeColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
    icon: 'Sunrise',
  },
  DSC: {
    code: 'DSC',
    name: 'Descendant (Setting)',
    latin: 'Western Horizon / Sunset',
    description: 'Partnerships, marriage, one-on-one relationships, diplomacy, clientele, and mirror projection.',
    badgeColor: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
    icon: 'HeartHandshake',
  },
};

export const ZODIAC_SIGNS: {
  sign: ZodiacSign;
  symbol: string;
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
  modality: 'Cardinal' | 'Fixed' | 'Mutable';
  ruler: PlanetId;
  color: string;
}[] = [
  { sign: 'Aries', symbol: '♈', element: 'Fire', modality: 'Cardinal', ruler: 'mars', color: '#EF4444' },
  { sign: 'Taurus', symbol: '♉', element: 'Earth', modality: 'Fixed', ruler: 'venus', color: '#10B981' },
  { sign: 'Gemini', symbol: '♊', element: 'Air', modality: 'Mutable', ruler: 'mercury', color: '#06B6D4' },
  { sign: 'Cancer', symbol: '♋', element: 'Water', modality: 'Cardinal', ruler: 'moon', color: '#93C5FD' },
  { sign: 'Leo', symbol: '♌', element: 'Fire', modality: 'Fixed', ruler: 'sun', color: '#F59E0B' },
  { sign: 'Virgo', symbol: '♍', element: 'Earth', modality: 'Mutable', ruler: 'mercury', color: '#84CC16' },
  { sign: 'Libra', symbol: '♎', element: 'Air', modality: 'Cardinal', ruler: 'venus', color: '#EC4899' },
  { sign: 'Scorpio', symbol: '♏', element: 'Water', modality: 'Fixed', ruler: 'pluto', color: '#A855F7' },
  { sign: 'Sagittarius', symbol: '♐', element: 'Fire', modality: 'Mutable', ruler: 'jupiter', color: '#8B5CF6' },
  { sign: 'Capricorn', symbol: '♑', element: 'Earth', modality: 'Cardinal', ruler: 'saturn', color: '#64748B' },
  { sign: 'Aquarius', symbol: '♒', element: 'Air', modality: 'Fixed', ruler: 'uranus', color: '#38BDF8' },
  { sign: 'Pisces', symbol: '♓', element: 'Water', modality: 'Mutable', ruler: 'neptune', color: '#14B8A6' },
];

export const LIFE_CATEGORIES_META: Record<
  string,
  { label: string; icon: string; color: string; description: string }
> = {
  career: {
    label: 'Career & Ambition',
    icon: 'Briefcase',
    color: '#F59E0B',
    description: 'Professional recognition, vocational mastery, entrepreneurship, and leadership status.',
  },
  relationships: {
    label: 'Love & Partnerships',
    icon: 'Heart',
    color: '#EC4899',
    description: 'Romantic magnetism, deep soulmate bonds, business alliances, and close collaboration.',
  },
  creativity: {
    label: 'Art & Creative Expression',
    icon: 'Palette',
    color: '#8B5CF6',
    description: 'Artistic inspiration, musical and visual genius, joy, dramatic flair, and playful innovation.',
  },
  spirituality: {
    label: 'Spirituality & Intuition',
    icon: 'Sparkles',
    color: '#14B8A6',
    description: 'Psychic perception, contemplative depth, sacred sanctuaries, meditation, and mystic insight.',
  },
  growth: {
    label: 'Personal Growth & Evolution',
    icon: 'Compass',
    color: '#38BDF8',
    description: 'Accelerated self-actualization, breaking through limitations, and stepping into destiny.',
  },
  stability: {
    label: 'Stability & Grounding',
    icon: 'Anchor',
    color: '#64748B',
    description: 'Long-term security, discipline, enduring achievements, physical endurance, and reliability.',
  },
  finances: {
    label: 'Finances & Wealth Flow',
    icon: 'Coins',
    color: '#10B981',
    description: 'Material prosperity, investments, lucrative contracts, asset growth, and abundance.',
  },
  family: {
    label: 'Home & Sanctuary',
    icon: 'Home',
    color: '#93C5FD',
    description: 'Emotional nourishment, ancestral peace, peaceful domestic life, and real estate contentment.',
  },
  travel: {
    label: 'Travel & Exploration',
    icon: 'Plane',
    color: '#F97316',
    description: 'Cross-cultural exploration, horizon-expanding journeys, intellectual freedom, and wanderlust.',
  },
  community: {
    label: 'Community & Social Circles',
    icon: 'Users',
    color: '#06B6D4',
    description: 'Like-minded friendships, social movements, collective endeavors, and public goodwill.',
  },
  health: {
    label: 'Vitality & Health',
    icon: 'Activity',
    color: '#22C55E',
    description: 'Physical vigor, bodily resilience, holistic wellness routines, and rejuvenating restorative energy.',
  },
  purpose: {
    label: 'Life Purpose & Dharma',
    icon: 'Flame',
    color: '#EAB308',
    description: 'Synchronistic life events, fulfilling soul missions, and harmonic alignment with divine destiny.',
  },
};
