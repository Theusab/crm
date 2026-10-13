const { calendarConfig, calendarRequest, getCalendarAccessToken } = require('../lib/google-calendar');

const TIME_ZONE = 'America/Sao_Paulo';
const SERVICES = new Set([
  'Corte de cabelo',
  'Barba completa',
  'Corte + barba',
  'Luzes / platinado',
]);

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

function todayInShopTimezone() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localDateTime(date, time) {
  return `${date}T${time}:00-03:00`;
}

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 10000) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function hasSameHostOrigin(req) {
  try {
    return Boolean(req.headers?.origin && req.headers?.host && new URL(req.headers.origin).host === req.headers.host);
  } catch {
    return false;
  }
}

module.exports = async function createAppointment(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { code: 'method_not_allowed', message: 'Use um envio POST.' });
  }
  if (!hasSameHostOrigin(req)) return respond(res, 403, { code: 'invalid_origin', message: 'Atualize a página e tente novamente.' });

  let data;
  try {
    data = await readBody(req);
  } catch {
    return respond(res, 400, { code: 'invalid_request', message: 'Não foi possível ler os dados do agendamento.' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return respond(res, 400, { code: 'invalid_request', message: 'Confira os dados do agendamento.' });
  }
  if (typeof data.website === 'string' && data.website.trim()) return respond(res, 200, { ok: true });

  const customer = typeof data.customer === 'string' ? data.customer.trim().replace(/\s+/g, ' ') : '';
  const service = typeof data.service === 'string' ? data.service : '';
  const date = typeof data.date === 'string' ? data.date : '';
  const time = typeof data.time === 'string' ? data.time : '';
  if (customer.length < 2 || customer.length > 80 || /[\u0000-\u001f\u007f]/.test(customer)) {
    return respond(res, 400, { code: 'invalid_name', message: 'Informe um nome válido.' });
  }
  if (!SERVICES.has(service)) return respond(res, 400, { code: 'invalid_service', message: 'Escolha um serviço válido.' });
  if (!validDate(date) || date < todayInShopTimezone()) return respond(res, 400, { code: 'invalid_date', message: 'Escolha uma data válida e futura.' });
  if (new Date(`${date}T12:00:00-03:00`).getDay() === 0) return respond(res, 400, { code: 'closed_day', message: 'A barbearia não atende aos domingos.' });
  if (!/^(09|1[0-8]):00$/.test(time)) return respond(res, 400, { code: 'invalid_time', message: 'Escolha um horário entre 09:00 e 18:00.' });

  const { calendarId, clientEmail, privateKey } = calendarConfig();
  if (!calendarId || !clientEmail || !privateKey) {
    return respond(res, 503, { code: 'calendar_not_configured', message: 'O calendário do barbeiro ainda não está configurado.' });
  }

  try {
    const accessToken = await getCalendarAccessToken();
    const freeBusyResponse = await calendarRequest('/freeBusy', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        timeMin: localDateTime(date, '09:00'),
        timeMax: localDateTime(date, '19:30'),
        timeZone: TIME_ZONE,
        items: [{ id: calendarId }],
      }),
    });
    if (!freeBusyResponse.ok) throw new Error('Google Calendar availability check failed');
    const freeBusy = await freeBusyResponse.json();
    const calendar = freeBusy.calendars?.[calendarId] || Object.values(freeBusy.calendars || {})[0];
    if (!calendar || calendar.errors?.length) throw new Error('Google Calendar did not return availability');

    const startIso = localDateTime(date, time);
    const endHour = Number(time.slice(0, 2)) + 1;
    const end = `${String(endHour).padStart(2, '0')}:00`;
    const endIso = localDateTime(date, end);
    const startMs = Date.parse(startIso);
    const endMs = Date.parse(endIso);
    const overlaps = (calendar.busy || []).some((period) => startMs < Date.parse(period.end) && endMs > Date.parse(period.start));
    if (overlaps || startMs <= Date.now()) {
      return respond(res, 409, { code: 'slot_taken', message: 'Esse horário acabou de ficar indisponível. Consulte a agenda novamente.' });
    }

    const eventId = `dv${date.replaceAll('-', '')}${time.replace(':', '')}`;
    const eventResponse = await calendarRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          id: eventId,
          summary: `${service} — ${customer}`,
          description: `Agendamento solicitado pelo site Domain Vision. Pendente de confirmação pelo WhatsApp.\nCliente: ${customer}\nServiço: ${service}`,
          status: 'tentative',
          transparency: 'opaque',
          start: { dateTime: startIso, timeZone: TIME_ZONE },
          end: { dateTime: endIso, timeZone: TIME_ZONE },
          guestsCanInviteOthers: false,
          guestsCanModify: false,
          guestsCanSeeOtherGuests: false,
        }),
      },
    );
    if (eventResponse.status === 409) {
      return respond(res, 409, { code: 'slot_taken', message: 'Esse horário já recebeu um pedido. Consulte a agenda novamente.' });
    }
    if (!eventResponse.ok) throw new Error('Google Calendar could not save the event');

    const event = await eventResponse.json();
    return respond(res, 201, {
      ok: true,
      eventId: event.id,
      status: 'tentative',
      date,
      time,
      end,
      timeZone: TIME_ZONE,
      customer,
      service,
    });
  } catch (error) {
    console.error('calendar_booking_failed', error?.message || 'unknown error');
    return respond(res, 502, { code: 'calendar_unavailable', message: 'Não foi possível salvar o evento agora.' });
  }
};
