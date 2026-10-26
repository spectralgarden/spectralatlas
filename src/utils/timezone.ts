import { WORLD_CITIES } from '../constants/worldCities';

export function resolveTimezoneForLocation(timezone: string, lat: number, lng: number): string {
  const fixedOffsetMatch = timezone.match(/^UTC([+-])?(\d{1,2}(?:\.\d+)?)?$/);
  if (!fixedOffsetMatch) return timezone;

  const offset = Number(fixedOffsetMatch[2] || 0) * (fixedOffsetMatch[1] === '-' ? -1 : 1);
  if (offset !== Math.round(lng / 15)) return timezone;

  const nearestCity = WORLD_CITIES.reduce(
    (nearest, city) => {
      if (/^UTC/.test(city.timezone)) return nearest;
      const lat1 = lat * (Math.PI / 180);
      const lat2 = city.lat * (Math.PI / 180);
      const deltaLat = (city.lat - lat) * (Math.PI / 180);
      const deltaLng = (city.lng - lng) * (Math.PI / 180);
      const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
      const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return distanceKm < nearest.distanceKm ? { timezone: city.timezone, distanceKm } : nearest;
    },
    { timezone, distanceKm: 75 }
  );

  return nearestCity.timezone;
}

export function getTimezoneOffsetAtBirth(date: string, time: string, timezone: string): number | null {
  const fixedOffsetMatch = timezone.match(/^UTC([+-])?(\d{1,2}(?:\.\d+)?)?$/);
  if (fixedOffsetMatch) {
    const offset = Number(fixedOffsetMatch[2] || 0);
    return fixedOffsetMatch[1] === '-' ? -offset : offset;
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let utcTimestamp = localAsUtc;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const getOffsetAt = (timestamp: number) => {
      const parts = formatter.formatToParts(new Date(timestamp));
      const partValue = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((part) => part.type === type)?.value);
      const zonedAsUtc = Date.UTC(
        partValue('year'),
        partValue('month') - 1,
        partValue('day'),
        partValue('hour'),
        partValue('minute'),
        partValue('second')
      );
      return (zonedAsUtc - timestamp) / 3600000;
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      const offset = getOffsetAt(utcTimestamp);
      const adjustedUtcTimestamp = localAsUtc - offset * 3600000;
      if (adjustedUtcTimestamp === utcTimestamp) return offset;
      utcTimestamp = adjustedUtcTimestamp;
    }

    return getOffsetAt(utcTimestamp);
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}
