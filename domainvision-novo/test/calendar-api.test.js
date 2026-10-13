const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const { afterEach, beforeEach, test } = require('node:test');
const availability = require('../api/availability');
const createAppointment = require('../api/appointments');

const envKeys = ['GOOGLE_CALENDAR_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'];
const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const savedFetch = global.fetch;
const futureMonday = '2030-01-07';

function mockResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() { return body; },
  };
}

async function invoke(handler, { method = 'GET', url = '/', body, headers = {} } = {}) {
  const res = {
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value = '') { this.body = value; },
  };
  await handler({ method, url, body, headers }, res);
  return { ...res, data: res.body ? JSON.parse(res.body) : undefined };
}

function configureGoogle() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  process.env.GOOGLE_CALENDAR_ID = 'barber@example.com';
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'calendar-agent@example.iam.gserviceaccount.com';
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKey;
}

beforeEach(() => {
  envKeys.forEach((key) => delete process.env[key]);
});

afterEach(() => {
  envKeys.forEach((key) => {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  });
  global.fetch = savedFetch;
});

test('availability rejects invalid date and service', async () => {
  const invalidDate = await invoke(availability, { url: '/api/availability?date=2030-02-31&service=Corte%20de%20cabelo' });
  assert.equal(invalidDate.statusCode, 400);
  assert.equal(invalidDate.data.code, 'invalid_date');

  const invalidService = await invoke(availability, { url: `/api/availability?date=${futureMonday}&service=outro` });
  assert.equal(invalidService.statusCode, 400);
  assert.equal(invalidService.data.code, 'invalid_service');
});

test('availability marks Sundays closed and reports missing calendar setup clearly', async () => {
  const sunday = await invoke(availability, { url: '/api/availability?date=2030-01-06&service=Corte%20de%20cabelo' });
  assert.equal(sunday.statusCode, 200);
  assert.deepEqual(sunday.data.slots, []);

  const missing = await invoke(availability, { url: `/api/availability?date=${futureMonday}&service=Corte%20de%20cabelo` });
  assert.equal(missing.statusCode, 503);
  assert.equal(missing.data.code, 'calendar_not_configured');
});

test('availability removes full-hour and partial overlaps and closes at 19:00', async () => {
  configureGoogle();
  let requestCount = 0;
  global.fetch = async (url) => {
    requestCount += 1;
    if (url === 'https://oauth2.googleapis.com/token') return mockResponse(200, { access_token: 'test-token' });
    return mockResponse(200, { calendars: { 'barber@example.com': { busy: [
      { start: `${futureMonday}T13:00:00-03:00`, end: `${futureMonday}T14:00:00-03:00` },
      { start: `${futureMonday}T16:30:00-03:00`, end: `${futureMonday}T16:45:00-03:00` },
    ] } } });
  };

  const result = await invoke(availability, { url: `/api/availability?date=${futureMonday}&service=Corte%20de%20cabelo` });
  assert.equal(result.statusCode, 200);
  assert.equal(requestCount, 2);
  assert.deepEqual(result.data.slots.map((slot) => slot.start), ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '17:00', '18:00']);
  assert.equal(result.data.durationMinutes, 60);
});

test('appointment endpoint rejects cross-origin writes and duplicate/malformed input', async () => {
  const crossOrigin = await invoke(createAppointment, {
    method: 'POST', url: '/api/appointments', body: {},
    headers: { host: 'localhost:4173', origin: 'https://attacker.example' },
  });
  assert.equal(crossOrigin.statusCode, 403);

  const invalid = await invoke(createAppointment, {
    method: 'POST', url: '/api/appointments', body: { customer: 'Davi', service: 'Outro', date: futureMonday, time: '10:00' },
    headers: { host: 'localhost:4173', origin: 'http://localhost:4173' },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.data.code, 'invalid_service');
});

test('appointment rechecks free/busy and creates a tentative one-hour event', async () => {
  configureGoogle();
  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') return mockResponse(200, { access_token: 'test-token' });
    if (url.endsWith('/freeBusy')) return mockResponse(200, { calendars: { 'barber@example.com': { busy: [] } } });
    return mockResponse(201, { id: 'dv203001071000' });
  };

  const result = await invoke(createAppointment, {
    method: 'POST', url: '/api/appointments',
    body: { customer: 'Cliente Teste', service: 'Corte de cabelo', date: futureMonday, time: '10:00' },
    headers: { host: 'localhost:4173', origin: 'http://localhost:4173' },
  });
  assert.equal(result.statusCode, 201);
  assert.equal(result.data.status, 'tentative');
  assert.equal(result.data.end, '11:00');

  const eventRequest = requests.find((request) => request.url.includes('/events?'));
  assert.ok(eventRequest);
  const event = JSON.parse(eventRequest.options.body);
  assert.equal(event.summary, 'Corte de cabelo — Cliente Teste');
  assert.equal(event.status, 'tentative');
  assert.equal(event.start.dateTime, `${futureMonday}T10:00:00-03:00`);
  assert.equal(event.end.dateTime, `${futureMonday}T11:00:00-03:00`);
  assert.equal(event.attendees, undefined);
});

test('appointment rejects a busy time and does not create an event', async () => {
  configureGoogle();
  const requestedUrls = [];
  global.fetch = async (url) => {
    requestedUrls.push(url);
    if (url === 'https://oauth2.googleapis.com/token') return mockResponse(200, { access_token: 'test-token' });
    return mockResponse(200, { calendars: { 'barber@example.com': { busy: [
      { start: `${futureMonday}T10:30:00-03:00`, end: `${futureMonday}T10:45:00-03:00` },
    ] } } });
  };
  const result = await invoke(createAppointment, {
    method: 'POST', url: '/api/appointments',
    body: { customer: 'Cliente Teste', service: 'Barba completa', date: futureMonday, time: '10:00' },
    headers: { host: 'localhost:4173', origin: 'http://localhost:4173' },
  });
  assert.equal(result.statusCode, 409);
  assert.equal(result.data.code, 'slot_taken');
  assert.equal(requestedUrls.some((url) => url.includes('/events?')), false);
});
