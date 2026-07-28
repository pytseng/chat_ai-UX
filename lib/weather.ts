export type WeatherResult = {
  location: string;
  coordinates: { latitude: number; longitude: number };
  elevation_m: number;
  timezone: string;
  fetched_at: string;
  source: "open-meteo";
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

async function geocodePlace(
  name: string,
  countryCode?: string
): Promise<NonNullable<GeocodingResult["results"]>[0]> {
  const params = new URLSearchParams({
    name: name.trim(),
    count: "10",
    language: "en",
    format: "json",
  });

  if (countryCode?.trim()) {
    params.set("countryCode", countryCode.trim().toUpperCase());
  }

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`
  );
  if (!res.ok) {
    throw new Error(`Geocoding failed for "${name}"`);
  }

  const data = (await res.json()) as GeocodingResult;
  const results = data.results ?? [];

  if (results.length === 0) {
    throw new Error(
      countryCode
        ? `No location found for "${name}" in ${countryCode.toUpperCase()}`
        : `No location found for "${name}"`
    );
  }

  return results[0];
}

export async function fetchWeather(query: WeatherQuery): Promise<WeatherResult> {
  let latitude = query.latitude;
  let longitude = query.longitude;
  let elevation = query.elevation_m;
  let label = query.place_name?.trim() ?? "Selected location";
  let timezone = "auto";

  if (latitude == null || longitude == null) {
    if (!query.place_name?.trim()) {
      throw new Error("Provide place_name or both latitude and longitude");
    }
    const place = await geocodePlace(query.place_name, query.country_code);
    latitude = place.latitude;
    longitude = place.longitude;
    elevation = elevation ?? place.elevation;
    label = place.admin1
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

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${forecastParams}`
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Open-Meteo forecast failed: ${err}`);
  }

  const data = (await res.json()) as OpenMeteoForecast;
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
