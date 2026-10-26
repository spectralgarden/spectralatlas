import tzLookup from 'tz-lookup';

export function resolveTimezoneForLocation(timezone: string, lat: number, lng: number): string {
  const fixedOffsetMatch = timezone.match(/^UTC([+-])?(\d{1,2}(?:\.\d+)?)?$/);
  if (!fixedOffsetMatch) return timezone;

  const offset = Number(fixedOffsetMatch[2] || 0) * (fixedOffsetMatch[1] === '-' ? -1 : 1);
  if (offset !== Math.round(lng / 15)) return timezone;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return timezone;
  }

  return tzLookup(lat, lng);
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
