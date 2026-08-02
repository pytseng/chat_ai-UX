export type ConfidenceLabel = "High" | "Medium" | "Low";

export type MonthClimate = {
  month: number;
  label: string;
  temp_min_c: number;
  temp_max_c: number;
  precip_mm_per_day: number;
  sample_years: string;
  description: string;
  /** 0–100 seasonal-estimate confidence (not a live forecast score). */
  confidence: number;
  confidence_label: ConfidenceLabel;
  /** Hover / accessible explanation of how the estimate was made. */
  estimate_note: string;
};

export type WeatherResult = {
  location: string;
  coordinates: { latitude: number; longitude: number };
  elevation_m: number;
  timezone: string;
  fetched_at: string;
  source: "open-meteo";
  /** Present when the user asked about specific travel months. */
  months?: MonthClimate[];
  current: {
    temp_c: number;
    humidity_pct: number;
    precipitation_mm: number;
    description: string;
    wind_m_s: number;
  };
  forecast_days: Array<{
    date: string;
    temp_min_c: number;
    temp_max_c: number;
    precipitation_mm: number;
    wind_max_m_s: number;
    description: string;
  }>;
};

export type WeatherQuery = {
  place_name?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  elevation_m?: number;
  /** Calendar months 1–12 for typical/climate normals (e.g. [10, 2]). */
  months?: number[];
};

type GeocodingResult = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    elevation: number;
    country_code: string;
    admin1?: string;
    timezone: string;
  }>;
};

type OpenMeteoForecast = {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
};

type OpenMeteoArchive = {
  elevation?: number;
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
};

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function weatherCodeToDescription(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] ?? `Weather code ${code}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function modeNumber(values: number[]): number {
  const counts = new Map<number, number>();
  let best = values[0] ?? 0;
  let bestCount = 0;
  for (const v of values) {
    const next = (counts.get(v) ?? 0) + 1;
    counts.set(v, next);
    if (next > bestCount) {
      best = v;
      bestCount = next;
    }
  }
  return best;
}

function normalizeMonths(months?: number[]): number[] {
  if (!months?.length) return [];
  const unique = new Set<number>();
  for (const m of months) {
    if (Number.isInteger(m) && m >= 1 && m <= 12) unique.add(m);
  }
  return [...unique].slice(0, 4);
}

function monthsUntil(month: number, from = new Date()): number {
  const current = from.getUTCMonth() + 1;
  return (month - current + 12) % 12;
}

function confidenceForMonthEstimate(opts: {
  month: number;
  label: string;
  sampleDays: number;
  sampleYears: string;
  elevation_m?: number;
}): Pick<MonthClimate, "confidence" | "confidence_label" | "estimate_note"> {
  const { month, label, sampleDays, sampleYears, elevation_m } = opts;
  const ahead = monthsUntil(month);
  const elev = elevation_m ?? 0;

  // Climate normals are useful for packing, but never as sure as a near-term forecast.
  let score = 58;
  if (sampleDays >= 140) score += 10;
  else if (sampleDays >= 90) score += 6;
  else if (sampleDays < 45) score -= 14;

  if (ahead === 0) score += 10;
  else if (ahead <= 2) score += 6;
  else if (ahead <= 5) score -= 2;
  else score -= 12;

  if (elev >= 5000) score -= 14;
  else if (elev >= 3000) score -= 8;
  else if (elev >= 1500) score -= 3;

  score = Math.max(28, Math.min(84, Math.round(score)));

  const confidence_label: ConfidenceLabel =
    score >= 68 ? "High" : score >= 48 ? "Medium" : "Low";

  const horizon =
    ahead === 0
      ? "this month / soon"
      : ahead === 1
        ? "about 1 month out"
        : `about ${ahead} months out`;

  const estimate_note = [
    `Seasonal estimate for ${label} at this location, using Open-Meteo historical daily averages (${sampleYears}, ${sampleDays} sample days).`,
    `Travel window looks ${horizon}.`,
    elev >= 3000
      ? "High-elevation weather swings more than these averages suggest."
      : null,
    "This is typical climate, not a day-by-day forecast — check a live forecast closer to your actual travel dates.",
  ]
    .filter(Boolean)
    .join(" ");

  return { confidence: score, confidence_label, estimate_note };
}

type KnownPlace = {
  latitude: number;
  longitude: number;
  elevation: number;
  name: string;
  country_code: string;
  admin1?: string;
  timezone: string;
};

/** Famous peaks the geocoder often ranks below same-named towns. */
const KNOWN_PLACES: Record<string, KnownPlace> = {
  "mount everest": {
    latitude: 27.9881,
    longitude: 86.925,
    elevation: 8848,
    name: "Mount Everest",
    country_code: "NP",
    timezone: "Asia/Kathmandu",
  },
  "mt everest": {
    latitude: 27.9881,
    longitude: 86.925,
    elevation: 8848,
    name: "Mount Everest",
    country_code: "NP",
    timezone: "Asia/Kathmandu",
  },
  everest: {
    latitude: 27.9881,
    longitude: 86.925,
    elevation: 8848,
    name: "Mount Everest",
    country_code: "NP",
    timezone: "Asia/Kathmandu",
  },
  "everest base camp": {
    latitude: 28.0029,
    longitude: 86.8528,
    elevation: 5364,
    name: "Everest Base Camp",
    country_code: "NP",
    timezone: "Asia/Kathmandu",
  },
  "mt. everest": {
    latitude: 27.9881,
    longitude: 86.925,
    elevation: 8848,
    name: "Mount Everest",
    country_code: "NP",
    timezone: "Asia/Kathmandu",
  },
};

function lookupKnownPlace(name: string): KnownPlace | undefined {
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  return KNOWN_PLACES[key];
}

function scoreGeocodeResult(
  result: NonNullable<GeocodingResult["results"]>[0],
  query: string
): number {
  const q = query.trim().toLowerCase();
  let score = 0;
  if (result.name.toLowerCase() === q) score += 20;
  else if (result.name.toLowerCase().includes(q)) score += 8;

  // Famous mountain queries: prefer high elevation over same-named towns.
  const elev = result.elevation ?? 0;
  score += Math.min(elev, 9000) / 80;

  if (/everest/i.test(q) && result.country_code === "NP") score += 200;
  if (/fuji|kilimanjaro|denali|matterhorn|mont blanc/i.test(q) && elev > 2000)
    score += 80;

  return score;
}

async function geocodePlace(
  name: string,
  countryCode?: string
): Promise<NonNullable<GeocodingResult["results"]>[0]> {
  const known = lookupKnownPlace(name);
  if (known && !countryCode) {
    return {
      name: known.name,
      latitude: known.latitude,
      longitude: known.longitude,
      elevation: known.elevation,
      country_code: known.country_code,
      admin1: known.admin1,
      timezone: known.timezone,
    };
  }

  const params = new URLSearchParams({
    name: name.trim(),
    count: "10",
    language: "en",
    format: "json",
  });

  if (countryCode?.trim()) {
    params.set("countryCode", countryCode.trim().toUpperCase());
  } else if (/everest/i.test(name)) {
    params.set("countryCode", "NP");
  }

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`
  );
  if (!res.ok) {
    throw new Error(`Geocoding failed for "${name}"`);
  }

  const data = (await res.json()) as GeocodingResult;
  let results = data.results ?? [];

  // If Nepal filter returned nothing, retry worldwide and score.
  if (results.length === 0 && !countryCode?.trim() && /everest/i.test(name)) {
    const retry = new URLSearchParams({
      name: name.trim(),
      count: "10",
      language: "en",
      format: "json",
    });
    const retryRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${retry}`
    );
    if (retryRes.ok) {
      results = ((await retryRes.json()) as GeocodingResult).results ?? [];
    }
  }

  if (results.length === 0) {
    if (known) {
      return {
        name: known.name,
        latitude: known.latitude,
        longitude: known.longitude,
        elevation: known.elevation,
        country_code: known.country_code,
        admin1: known.admin1,
        timezone: known.timezone,
      };
    }
    throw new Error(
      countryCode
        ? `No location found for "${name}" in ${countryCode.toUpperCase()}`
        : `No location found for "${name}"`
    );
  }

  return [...results].sort(
    (a, b) => scoreGeocodeResult(b, name) - scoreGeocodeResult(a, name)
  )[0];
}

async function fetchMonthlyNormals(
  latitude: number,
  longitude: number,
  elevation: number | undefined,
  months: number[]
): Promise<MonthClimate[]> {
  if (months.length === 0) return [];

  const endYear = new Date().getUTCFullYear() - 1;
  const startYear = endYear - 4;
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: `${startYear}-01-01`,
    end_date: `${endYear}-12-31`,
    timezone: "auto",
    cell_selection: "land",
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "weather_code",
    ].join(","),
  });

  if (elevation != null && Number.isFinite(elevation)) {
    params.set("elevation", String(Math.round(elevation)));
  }

  const res = await fetch(
    `https://archive-api.open-meteo.com/v1/archive?${params}`
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Open-Meteo archive failed: ${err}`);
  }

  const data = (await res.json()) as OpenMeteoArchive;
  const daily = data.daily;
  if (!daily?.time?.length) {
    throw new Error("Incomplete climate data from Open-Meteo");
  }

  const sampleYears = `${startYear}–${endYear}`;
  const elevUsed = elevation ?? data.elevation;

  return months.map((month) => {
    const maxes: number[] = [];
    const mins: number[] = [];
    const precip: number[] = [];
    const codes: number[] = [];

    for (let i = 0; i < daily.time.length; i++) {
      const m = Number(daily.time[i].slice(5, 7));
      if (m !== month) continue;
      const hi = daily.temperature_2m_max[i];
      const lo = daily.temperature_2m_min[i];
      if (hi == null || lo == null) continue;
      maxes.push(hi);
      mins.push(lo);
      precip.push(daily.precipitation_sum[i] ?? 0);
      if (daily.weather_code[i] != null) codes.push(daily.weather_code[i]);
    }

    if (maxes.length === 0) {
      throw new Error(`No climate samples for month ${month}`);
    }

    const label = MONTH_LABELS[month - 1];
    const confidence = confidenceForMonthEstimate({
      month,
      label,
      sampleDays: maxes.length,
      sampleYears,
      elevation_m: elevUsed,
    });

    return {
      month,
      label,
      temp_min_c: round1(mean(mins)),
      temp_max_c: round1(mean(maxes)),
      precip_mm_per_day: round1(mean(precip)),
      sample_years: sampleYears,
      description: weatherCodeToDescription(modeNumber(codes)),
      ...confidence,
    };
  });
}

export async function fetchWeather(query: WeatherQuery): Promise<WeatherResult> {
  let latitude = query.latitude;
  let longitude = query.longitude;
  let elevation = query.elevation_m;
  let label = query.place_name?.trim() ?? "Selected location";
  let timezone = "auto";
  const months = normalizeMonths(query.months);

  if (latitude == null || longitude == null) {
    if (!query.place_name?.trim()) {
      throw new Error("Provide place_name or both latitude and longitude");
    }
    const place = await geocodePlace(query.place_name, query.country_code);
    latitude = place.latitude;
    longitude = place.longitude;
    elevation = elevation ?? place.elevation;
    // Prefer country over obscure admin1 (avoids "Mount Everest, Free State, ZA").
    const countryName =
      place.country_code === "NP"
        ? "Nepal"
        : place.country_code === "CN"
          ? "China"
          : place.country_code;
    label =
      place.country_code === "NP" || place.country_code === "CN"
        ? `${place.name}, ${countryName}`
        : place.admin1
          ? `${place.name}, ${place.admin1}, ${place.country_code}`
          : `${place.name}, ${place.country_code}`;
    timezone = place.timezone;
  } else if (query.country_code && query.place_name) {
    label = `${query.place_name}, ${query.country_code.toUpperCase()}`;
  }

  const forecastParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone,
    forecast_days: "5",
    cell_selection: "land",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "wind_speed_10m",
      "weather_code",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "wind_speed_10m_max",
    ].join(","),
  });

  if (elevation != null && Number.isFinite(elevation)) {
    forecastParams.set("elevation", String(Math.round(elevation)));
  }

  const [forecastRes, monthClimate] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams}`),
    months.length
      ? fetchMonthlyNormals(latitude, longitude, elevation, months)
      : Promise.resolve([] as MonthClimate[]),
  ]);

  if (!forecastRes.ok) {
    const err = await forecastRes.text();
    throw new Error(`Open-Meteo forecast failed: ${err}`);
  }

  const data = (await forecastRes.json()) as OpenMeteoForecast;
  const current = data.current;

  if (!current || !data.daily) {
    throw new Error("Incomplete weather data from Open-Meteo");
  }

  const forecast_days = data.daily.time.map((date, i) => ({
    date,
    temp_min_c: round1(data.daily!.temperature_2m_min[i]),
    temp_max_c: round1(data.daily!.temperature_2m_max[i]),
    precipitation_mm: round1(data.daily!.precipitation_sum[i]),
    wind_max_m_s: round1(data.daily!.wind_speed_10m_max[i]),
    description: weatherCodeToDescription(data.daily!.weather_code[i]),
  }));

  return {
    location: label,
    coordinates: { latitude: data.latitude, longitude: data.longitude },
    elevation_m: data.elevation,
    timezone: data.timezone,
    fetched_at: new Date().toISOString(),
    source: "open-meteo",
    months: monthClimate.length ? monthClimate : undefined,
    current: {
      temp_c: round1(current.temperature_2m),
      humidity_pct: current.relative_humidity_2m,
      precipitation_mm: round1(current.precipitation),
      description: weatherCodeToDescription(current.weather_code),
      wind_m_s: round1(current.wind_speed_10m),
    },
    forecast_days,
  };
}

/** Open-Meteo attribution / docs home. */
export function weatherSourceUrl(): string {
  return "https://open-meteo.com/";
}

/** Human-readable map forecast for the resolved coordinates. */
export function weatherDetailUrl(weather: WeatherResult): string {
  const { latitude, longitude } = weather.coordinates;
  const lat = latitude.toFixed(3);
  const lon = longitude.toFixed(3);
  return `https://www.windy.com/${lat}/${lon}?${latitude},${longitude},8`;
}
