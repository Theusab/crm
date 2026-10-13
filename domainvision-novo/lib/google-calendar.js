const { sign } = require('node:crypto');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.events',
];

function calendarConfig() {
  return {
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  };
}

async function getCalendarAccessToken() {
  const { clientEmail, privateKey } = calendarConfig();
  if (!clientEmail || !privateKey) throw new Error('Google Calendar credentials are missing');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: CALENDAR_SCOPES.join(' '),
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })).toString('base64url');
  const unsignedToken = `${header}.${claims}`;
  const key = privateKey.replace(/\\n/g, '\n');
  const signature = sign('RSA-SHA256', Buffer.from(unsignedToken), key).toString('base64url');
  const assertion = `${unsignedToken}.${signature}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Google token request failed');
  const token = await response.json();
  if (!token.access_token) throw new Error('Google token response was incomplete');
  return token.access_token;
}

async function calendarRequest(path, accessToken, options = {}) {
  return fetch(`${GOOGLE_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: options.signal || AbortSignal.timeout(10000),
  });
}

module.exports = { calendarConfig, calendarRequest, getCalendarAccessToken };
