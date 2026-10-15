const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const configSource = fs.readFileSync(path.join(__dirname, '../../config.js'), 'utf8');
const productionApiUrl = 'https://script.google.com/macros/s/AKfycbyj2zoEbIFANn-MM_SGf3o7BpVCJ58hI1J5t4Y4lOTJLKKx2c_RfCPaQYeKoOw6gf4f/exec';

function loadConfig({ hostname, localApiUrl = '', explicitApiUrl = '' }) {
  const values = new Map(localApiUrl ? [['srfix_api_url', localApiUrl]] : []);
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
  const window = { location: { hostname }, SRFIX_API_URL: explicitApiUrl };
  vm.runInNewContext(configSource, { window, localStorage });
  return window.CONFIG;
}

test('production ignores a stale local API endpoint and uses the deployed backend', () => {
  const config = loadConfig({ hostname: 'serviciosdigitalesmx.github.io', localApiUrl: 'https://old-backend.example/exec' });
  assert.equal(config.API_URL, productionApiUrl);
});

test('an explicit runtime override is still honored', () => {
  const config = loadConfig({ hostname: 'serviciosdigitalesmx.github.io', explicitApiUrl: 'https://qa-backend.example/exec' });
  assert.equal(config.API_URL, 'https://qa-backend.example/exec');
});

test('local development can still use its saved endpoint override or /api fallback', () => {
  assert.equal(loadConfig({ hostname: 'localhost', localApiUrl: 'http://localhost:8787' }).API_URL, 'http://localhost:8787');
  assert.equal(loadConfig({ hostname: '127.0.0.1' }).API_URL, '/api');
});
