const { calendarConfig, calendarRequest, getCalendarAccessToken } = require('../lib/google-calendar');

const TIME_ZONE = 'America/Sao_Paulo';
const SERVICE_NAMES = new Set([
  'Corte de cabelo',
  'Barba completa',
  'Corte + barba',
  'Luzes / platinado',
]);
const SLOT_HOURS = 1;

function respond(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function localDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(Date.now() + offsetDays * 86400000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localDateTimeToIso(date, time) {
  // Pederneiras uses UTC−03:00; the Calendar request also declares the IANA zone.
  return `${date}T${time}:00-03:00`;
}

module.exports = async function availability(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return respond(res, 405, { code: 'method_not_allowed', message: 'Use uma consulta GET.' });
  }

  const query = new URL(req.url, 'http://localhost').searchParams;
  const date = query.get('date') || '';
  const service = query.get('service') || '';

  if (!validDate(date)) return respond(res, 400, { code: 'invalid_date', message: 'Escolha uma data válida.' });
  if (!SERVICE_NAMES.has(service)) return respond(res, 400, { code: 'invalid_service', message: 'Escolha um serviço válido.' });
  if (date < localDate()) return respond(res, 400, { code: 'past_date', message: 'Escolha uma data futura.' });

  const weekday = new Date(`${date}T12:00:00-03:00`).getDay();
  if (weekday === 0) return respond(res, 200, { date, durationMinutes: 60, slots: [] });

  const { calendarId, clientEmail, privateKey } = calendarConfig();
  if (!calendarId || !clientEmail || !privateKey) {
    return respond(res, 503, { code: 'calendar_not_configured', message: 'A agenda precisa ser configurada no servidor.' });
  }

  try {
    const accessToken = await getCalendarAccessToken();
    const freeBusyResponse = await calendarRequest('/freeBusy', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        timeMin: localDateTimeToIso(date, '09:00'),
        timeMax: localDateTimeToIso(date, '19:30'),
        timeZone: TIME_ZONE,
        items: [{ id: calendarId }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!freeBusyResponse.ok) throw new Error('Google Calendar request failed');

    const freeBusy = await freeBusyResponse.json();
    const calendar = freeBusy.calendars?.[calendarId] || Object.values(freeBusy.calendars || {})[0];
    if (!calendar || calendar.errors?.length) throw new Error('Google Calendar did not return availability');
    const busy = (calendar.busy || []).map((period) => ({ start: Date.parse(period.start), end: Date.parse(period.end) }));
    const now = Date.now();
    const slots = [];

    for (let hour = 9; hour + SLOT_HOURS <= 19; hour += SLOT_HOURS) {
      const start = `${String(hour).padStart(2, '0')}:00`;
      const end = `${String(hour + SLOT_HOURS).padStart(2, '0')}:00`;
      const startMs = Date.parse(localDateTimeToIso(date, start));
      const endMs = Date.parse(localDateTimeToIso(date, end));
      const overlaps = busy.some((period) => startMs < period.end && endMs > period.start);
      if (!overlaps && (date !== localDate() || startMs > now)) slots.push({ start, end });
    }

    return respond(res, 200, { date, durationMinutes: 60, timeZone: TIME_ZONE, slots });
  } catch (error) {
    console.error('availability_lookup_failed', error?.message || 'unknown error');
    return respond(res, 502, { code: 'calendar_unavailable', message: 'Não foi possível consultar o Google Calendar agora.' });
  }
};
