import { Cloud, CloudRain, CloudSnow, Info, Sun, Zap } from "lucide-react";
import type { MonthClimate, WeatherResult } from "../../lib/weather";
import { weatherDetailUrl } from "../../lib/weather";

type WeatherWidgetProps = {
  weather: WeatherResult;
};

function weekdayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date.slice(5);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function ConditionIcon({ description }: { description: string }) {
  const d = description.toLowerCase();
  const props = { size: 22, strokeWidth: 1.75, "aria-hidden": true as const };
  if (d.includes("thunder")) return <Zap {...props} />;
  if (d.includes("snow") || d.includes("rime")) return <CloudSnow {...props} />;
  if (d.includes("rain") || d.includes("drizzle") || d.includes("shower"))
    return <CloudRain {...props} />;
  if (d.includes("clear") || d.includes("mainly clear"))
    return <Sun {...props} />;
  return <Cloud {...props} />;
}

function ConfidenceMeter({ month }: { month: MonthClimate }) {
  if (month.confidence == null || !month.confidence_label) return null;

  const note =
    month.estimate_note ||
    "Seasonal estimate from historical averages. Check a live forecast closer to your travel dates.";

  return (
    <div
      className={[
        "weather-confidence",
        `weather-confidence--${month.confidence_label.toLowerCase()}`,
      ].join(" ")}
    >
      <div className="weather-confidence__row">
        <span className="weather-confidence__label">
          {month.confidence_label}
        </span>
        <span
          className="weather-confidence__info"
          tabIndex={0}
          role="img"
          aria-label={note}
          title={note}
        >
          <Info size={13} strokeWidth={2} aria-hidden />
          <span className="weather-confidence__tip" role="tooltip">
            {note}
          </span>
        </span>
      </div>
      <div className="weather-confidence__track" aria-hidden title={note}>
        <span
          className="weather-confidence__fill"
          style={{ width: `${month.confidence}%` }}
        />
      </div>
    </div>
  );
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  const { current, forecast_days: days, location, months, elevation_m } =
    weather;
  const detailHref = weatherDetailUrl(weather);
  const hasSeasonal = Boolean(months && months.length > 0);

  return (
    <aside className="weather-widget" aria-label={`Weather for ${location}`}>
      <div className="weather-widget__header">
        <p className="weather-widget__place">{location}</p>
        {Number.isFinite(elevation_m) && (
          <p className="weather-widget__meta">
            {Math.round(elevation_m).toLocaleString()} m
          </p>
        )}
      </div>

      {hasSeasonal ? (
        <ul className="weather-widget__month-grid">
          {months!.map((month) => (
            <li key={month.month}>
              <p className="weather-widget__month-name">{month.label}</p>
              <p className="weather-widget__month-range">
                {Math.round(month.temp_min_c)}°–{Math.round(month.temp_max_c)}°
              </p>
              <p className="weather-widget__month-desc">{month.description}</p>
              <p className="weather-widget__month-precip">
                ~{month.precip_mm_per_day} mm/day
              </p>
              <ConfidenceMeter month={month} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="weather-widget__now">
            <span className="weather-widget__icon">
              <ConditionIcon description={current.description} />
            </span>
            <div className="weather-widget__now-text">
              <p className="weather-widget__temp">
                {Math.round(current.temp_c)}°
                <span className="weather-widget__condition">
                  {current.description}
                </span>
              </p>
            </div>
          </div>
          <dl className="weather-widget__stats">
            <div>
              <dt>Humidity</dt>
              <dd>{current.humidity_pct}%</dd>
            </div>
            <div>
              <dt>Wind</dt>
              <dd>{current.wind_m_s} m/s</dd>
            </div>
            <div>
              <dt>Precip</dt>
              <dd>{current.precipitation_mm} mm</dd>
            </div>
          </dl>
          {days.length > 0 && (
            <ul className="weather-widget__days">
              {days.slice(0, 5).map((day) => (
                <li key={day.date}>
                  <span className="weather-widget__day-name">
                    {weekdayLabel(day.date)}
                  </span>
                  <span className="weather-widget__day-range">
                    {Math.round(day.temp_min_c)}°–{Math.round(day.temp_max_c)}°
                  </span>
                  <span
                    className="weather-widget__day-desc"
                    title={day.description}
                  >
                    {day.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="weather-widget__links">
        <a href={detailHref} target="_blank" rel="noreferrer">
          Full forecast
        </a>
      </div>
    </aside>
  );
}
