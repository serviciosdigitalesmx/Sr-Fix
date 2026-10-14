const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../js/review-request.js'), 'utf8');
const context = { URL, encodeURIComponent, String };
vm.runInNewContext(source, context);
const reviewRequest = context.SrFixReviewRequest;
const reviewUrl = 'https://search.google.com/local/writereview?placeid=ChIJn0CVSNy_YoYRKPaDAcE8nSA';

test('construye WhatsApp para la ficha entregada con enlace directo a las opiniones y datos variables', () => {
  const url = reviewRequest.buildWhatsAppUrl({
    phone: '(81) 1234-5678',
    clientName: 'María López',
    device: 'iPhone',
    repairWork: 'cambio de pantalla',
    status: 'Entregado',
    reviewUrl
  });
  const parsed = new URL(url);
  const message = parsed.searchParams.get('text');

  assert.equal(parsed.hostname, 'wa.me');
  assert.equal(parsed.pathname, '/528112345678');
  assert.match(message, /Hola María,/);
  assert.match(message, /Señor Fix/);
  assert.match(message, /atender tu iPhone y realizar cambio de pantalla/);
  assert.match(message, /search\.google\.com\/local\/writereview\?placeid=/);
  assert.match(message, /Escribir una opinión/);
  assert.match(message, /no necesitas copiar un texto predeterminado/);
  assert.doesNotMatch(message, /puedes copiar y editar esta sugerencia/);
  assert.match(message, /\n\n/);
});

test('saludo neutral y contexto genérico si faltan nombre y equipo', () => {
  const message = reviewRequest.buildReviewMessage('', '', reviewUrl);
  assert.match(message, /^Hola,/);
  assert.match(message, /gracias por confiar en Señor Fix\./);
  assert.doesNotMatch(message, /undefined|null/);
});

test('rechaza teléfono ausente o inválido, estados no entregados y destinos de reseña ajenos', () => {
  const base = { status: 'Entregado', reviewUrl, device: 'Laptop' };
  for (const phone of ['', '123', '81123456789', '+1 415 555 0100']) {
    assert.equal(reviewRequest.buildWhatsAppUrl({ ...base, phone }), '');
  }
  assert.equal(reviewRequest.buildWhatsAppUrl({ ...base, phone: '8112345678', status: 'Listo' }), '');
  for (const invalidReviewUrl of [
    'https://example.com/local/writereview?placeid=ChIJn0CVSNy_YoYRKPaDAcE8nSA',
    'https://maps.app.goo.gl/yApYXDR4eXBZsdJFA',
    'https://search.google.com/local/writereview?placeid=wrong-place',
    'https://search.google.com.evil.example/local/writereview?placeid=ChIJn0CVSNy_YoYRKPaDAcE8nSA',
    'http://search.google.com/local/writereview?placeid=ChIJn0CVSNy_YoYRKPaDAcE8nSA'
  ]) {
    assert.equal(reviewRequest.buildWhatsAppUrl({ ...base, phone: '8112345678', reviewUrl: invalidReviewUrl }), '');
  }
});

test('solo acepta el enlace de escritura de opiniones verificado para Señor Fix', () => {
  assert.equal(reviewRequest.normalizeReviewUrl(reviewUrl), reviewUrl);
  assert.equal(reviewRequest.normalizeReviewUrl(`${reviewUrl}&extra=value`), '');
});

test('normaliza los formatos mexicano nacional, internacional y móvil legado explícito', () => {
  assert.equal(reviewRequest.normalizeMexicanWhatsAppPhone('8112345678'), '528112345678');
  assert.equal(reviewRequest.normalizeMexicanWhatsAppPhone('+52 81 1234 5678'), '528112345678');
  assert.equal(reviewRequest.normalizeMexicanWhatsAppPhone('5218112345678'), '528112345678');
  assert.equal(reviewRequest.normalizeMexicanWhatsAppPhone('1 (415) 555-0100'), '');
});

test('mantiene cada solicitud aislada y no expone teléfonos ni otros nombres', () => {
  const first = reviewRequest.buildWhatsAppUrl({
    phone: '8112345678', clientName: 'Ana Pérez', device: 'Laptop', repairWork: 'cambio de teclado', status: 'Entregado', reviewUrl
  });
  const second = reviewRequest.buildWhatsAppUrl({
    phone: '8187654321', clientName: 'Luis Ruiz', device: 'iPhone', repairWork: 'cambio de batería', status: 'Entregado', reviewUrl
  });
  const firstMessage = new URL(first).searchParams.get('text');
  const secondMessage = new URL(second).searchParams.get('text');
  assert.equal(new URL(first).pathname, '/528112345678');
  assert.equal(new URL(second).pathname, '/528187654321');
  assert.match(firstMessage, /Hola Ana/);
  assert.doesNotMatch(firstMessage, /Luis|528187654321/);
  assert.match(secondMessage, /Hola Luis/);
  assert.doesNotMatch(secondMessage, /Ana|528112345678/);
  assert.match(firstMessage, /atender tu Laptop y realizar cambio de teclado/);
  assert.match(secondMessage, /atender tu iPhone y realizar cambio de batería/);
});

test('omite contexto vacío o que parece contener información sensible', () => {
  assert.equal(reviewRequest.createReviewContext('', ''), '');
  assert.doesNotMatch(reviewRequest.createReviewContext('iPhone', 'cambio de pantalla; IMEI 123456789012345'), /IMEI|123456789/);
});

test('contexto variable no inventa satisfacción, tiempos, precios ni calificaciones', () => {
  const context = reviewRequest.createReviewContext('Consola PlayStation 5');
  assert.match(context, /Consola PlayStation 5/);
  assert.doesNotMatch(context, /excelente|satisfecho|rápido|\$|5 estrellas/i);
});
