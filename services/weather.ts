/**
 * Weather Service using Open-Meteo API (free, no API key needed)
 * Provides weather forecast for event dates
 */

interface WeatherData {
  temperature: number;
  weatherCode: number;
  description: string;
  icon: string;
  isRainy: boolean;
  uvIndex: number | null;
  uvLevel: string | null;
}

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
function getWeatherInfo(code: number): { description: string; icon: string; isRainy: boolean } {
  if (code === 0) return { description: '晴天', icon: '☀️', isRainy: false };
  if (code <= 3) return { description: '多雲', icon: '⛅', isRainy: false };
  if (code <= 48) return { description: '霧', icon: '🌫', isRainy: false };
  if (code <= 57) return { description: '毛毛雨', icon: '🌦', isRainy: true };
  if (code <= 67) return { description: '下雨', icon: '🌧', isRainy: true };
  if (code <= 77) return { description: '下雪', icon: '❄️', isRainy: true };
  if (code <= 82) return { description: '陣雨', icon: '🌧', isRainy: true };
  if (code <= 86) return { description: '雨夾雪', icon: '🌨', isRainy: true };
  if (code <= 99) return { description: '雷雨', icon: '⛈', isRainy: true };
  return { description: '未知', icon: '❓', isRainy: false };
}

/**
 * Get weather forecast for a specific date
 * Default location: Zhubei, Hsinchu (24.8368, 121.0018)
 */
export async function getWeatherForDate(
  date: Date,
  latitude: number = 24.8368,
  longitude: number = 121.0018
): Promise<WeatherData | null> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    const hour = date.getHours();

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weather_code,uv_index&start_date=${dateStr}&end_date=${dateStr}&timezone=Asia/Taipei`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    if (!data.hourly?.temperature_2m || !data.hourly?.weather_code) return null;

    // Get weather for the event hour (or closest available)
    const index = Math.min(hour, data.hourly.temperature_2m.length - 1);
    const temperature = Math.round(data.hourly.temperature_2m[index]);
    const weatherCode = data.hourly.weather_code[index];
    const uvIndex = data.hourly.uv_index?.[index] ?? null;
    const info = getWeatherInfo(weatherCode);

    let uvLevel: string | null = null;
    if (uvIndex !== null) {
      if (uvIndex <= 2) uvLevel = '低';
      else if (uvIndex <= 5) uvLevel = '中';
      else if (uvIndex <= 7) uvLevel = '高';
      else if (uvIndex <= 10) uvLevel = '很高';
      else uvLevel = '極高';
    }

    return {
      temperature,
      weatherCode,
      uvIndex: uvIndex !== null ? Math.round(uvIndex) : null,
      uvLevel,
      ...info,
    };
  } catch (error) {
    console.error('天氣查詢失敗:', error);
    return null;
  }
}
