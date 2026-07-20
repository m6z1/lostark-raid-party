import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const env = { ALLOWED_ORIGINS: 'https://m6z1.github.io', LOSTARK_API_KEY: 'test-secret' };

test('rejects requests from unknown origins', async () => {
  const response = await worker.fetch(new Request('https://worker.test/characters/name/siblings', {
    headers: { Origin: 'https://evil.example' },
  }), env);
  assert.equal(response.status, 403);
});

test('only proxies allow-listed Lost Ark API paths', async () => {
  const response = await worker.fetch(new Request('https://worker.test/news', {
    headers: { Origin: 'https://m6z1.github.io' },
  }), env);
  assert.equal(response.status, 404);
});

test('adds the secret on the server without exposing it to the browser', async () => {
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  globalThis.fetch = async (url, options) => {
    upstreamRequest = { url, options };
    return new Response(JSON.stringify([{ CharacterName: '테스트' }]), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const response = await worker.fetch(new Request('https://worker.test/characters/test/siblings', {
      headers: { Origin: 'https://m6z1.github.io' },
    }), env);
    assert.equal(response.status, 200);
    assert.equal(upstreamRequest.options.headers.authorization, 'bearer test-secret');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://m6z1.github.io');
    assert.doesNotMatch(await response.text(), /test-secret/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('returns a safe error when the Lost Ark API is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('upstream detail'); };
  try {
    const response = await worker.fetch(new Request('https://worker.test/characters/test/siblings', {
      headers: { Origin: 'https://m6z1.github.io' },
    }), env);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://m6z1.github.io');
    assert.doesNotMatch(await response.text(), /upstream detail|test-secret/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
