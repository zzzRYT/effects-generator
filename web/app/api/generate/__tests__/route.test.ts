import { describe, it, expect } from 'vitest';
import { POST } from '../route';

describe('POST /api/generate', () => {
  it('should return 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: 'invalid json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it('should return 400 for honeypot filled', async () => {
    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        artist: 'Oasis',
        song: 'Wonderwall',
        guitar: 'Cort G250',
        processor: 'GP-150',
        botcheck: 'filled',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should return 400 for validation errors', async () => {
    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        artist: '',
        song: 'Wonderwall',
        guitar: 'Cort G250',
        processor: 'GP-150',
        botcheck: '',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.errors).toBeDefined();
    expect(data.errors.artist).toBeTruthy();
  });

  // Phase 3에서: E2E 테스트로 full flow 검증 (resolver, cache, tone_jobs INSERT)
});
