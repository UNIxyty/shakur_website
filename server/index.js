// SHAKUR API — Node 22 ESM Express app, no build step.
// Runs as compose service `api` on :8787, proxied by nginx at /api/.
// Every key-dependent endpoint degrades to 503 + {error} when its env is
// missing so the client can fall back to sample copy / mock behaviour.
import express from 'express';
import { rateLimiter } from './lib/shared.js';
import { handleAiWrite } from './lib/ai.js';
import { handleSlots } from './lib/slots.js';
import {
  handleCreateBooking,
  handleGetBooking,
  handleCancelBooking,
  handleRescheduleBooking,
  requireAdmin,
  handleAdminCancel,
  handleAdminReschedule,
} from './lib/bookings.js';
import { handleCreateConsultation } from './lib/consultations.js';
import { handleMediaUpload } from './lib/media.js';
import { startReminderLoop } from './lib/reminders.js';

const app = express();
app.disable('x-powered-by');
// nginx fronts this service; trust X-Forwarded-For for rate-limit keys.
app.set('trust proxy', true);
app.use(express.json({ limit: '100kb' }));

const HOUR = 60 * 60 * 1000;

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/ai/write', rateLimiter(20, HOUR), handleAiWrite);

app.get('/api/slots', handleSlots);

app.post('/api/bookings', rateLimiter(20, HOUR), handleCreateBooking);
app.get('/api/bookings/:token', handleGetBooking);
app.post('/api/bookings/:token/cancel', handleCancelBooking);
app.post('/api/bookings/:token/reschedule', handleRescheduleBooking);

app.post('/api/consultations', rateLimiter(10, HOUR), handleCreateConsultation);

// Media uploads — images + video (multipart; express.json ignores non-JSON
// bodies, so no body-parser limit applies here — busboy streams to disk).
app.post('/api/media', requireAdmin, handleMediaUpload);

app.post('/api/admin/meetings/:id/cancel', requireAdmin, handleAdminCancel);
app.post('/api/admin/meetings/:id/reschedule', requireAdmin, handleAdminReschedule);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Express error handler (malformed JSON bodies land here too).
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  console.error('[server]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 8787);
const server = app.listen(port, () => {
  console.log(`[shakur-api] listening on :${port}`);
  // emails/2-reminder goes out when a scheduled meeting is <= 24h away.
  startReminderLoop();
});

// POST /api/media accepts video uploads up to 512 MB; Node's default cap on
// receiving a full request (requestTimeout, 5 min) is too tight for large
// files on slow uplinks. Headers still time out normally (headersTimeout).
server.requestTimeout = 60 * 60 * 1000;
