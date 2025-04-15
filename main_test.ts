// Workaround for superdeno/superoak compatibility issue with Deno >= 2
// Superdeno v4.9.0 seems to still use 'window' which was removed in Deno 2.
(globalThis as any).window = globalThis;

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.220.1/assert/mod.ts';
import {
  returnsNext,
  stub,
} from 'https://deno.land/std@0.220.1/testing/mock.ts';
import { superoak } from 'https://deno.land/x/superoak@4.8.1/mod.ts'; // Import superoak

// --- Prevent 'unload' listener registration during test ---
const originalAddEventListener = globalThis.addEventListener;
let eventListenerStub; // Let TypeScript infer the type
eventListenerStub = stub(
  globalThis,
  'addEventListener',
  (type, listener, options) => {
    if (type === 'unload') {
      console.log(
        '[TEST_SETUP] Intercepted and blocked "unload" event listener registration.'
      );
      // Do nothing, preventing the listener in db.ts from attaching
    } else {
      // Call the original for other event types
      // Ensure correct context ('this') when calling original
      originalAddEventListener.call(globalThis, type, listener, options);
    }
  }
);
// --- End listener prevention ---

// Import the Application instance from your main file
// NOTE: This import itself might trigger top-level code in main.ts (like .env loading)
import { app } from './main.ts';
// Import the pool *after* stubbing addEventListener
import { pool } from './src/config/db.ts'; // <-- Re-add pool import

import type { Lead, PageSpeedApiResponse, Scores } from './src/types/index.ts';

// --- Mock Data ---
const mockApiUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const mockScores: Scores = {
  performance: 0.91,
  accessibility: 0.82,
  bestPractices: 0.73,
  seo: 0.94,
};
const mockPageSpeedResponse: PageSpeedApiResponse = {
  lighthouseResult: {
    categories: {
      performance: { score: mockScores.performance! },
      accessibility: { score: mockScores.accessibility! },
      'best-practices': { score: mockScores.bestPractices! },
      seo: { score: mockScores.seo! },
    },
    requestedUrl: 'https://example-test.com',
    finalUrl: 'https://example-test.com',
  },
  analysisUTCTimestamp: new Date().toISOString(),
};

// Mock a successful lead creation response (assuming DB interaction works or is mocked elsewhere)
// In a real scenario without DB mocking, this part is hard to predict
const mockCreatedLeadId = 999;

// --- Test Suite ---
Deno.test(
  'Integration Test: POST /api/v1/leads/analyze - Success Scenario',
  async () => {
    let fetchStub;
    const originalFetch = globalThis.fetch;

    try {
      // --- Ensure addEventListener stub is active ---
      // (It is active from the top-level execution)

      // --- Mock global fetch ---
      fetchStub = stub(
        globalThis,
        'fetch',
        (
          input: Request | URL | string,
          init?: RequestInit
        ): Promise<Response> => {
          const urlString = String(
            input instanceof Request ? input.url : input
          );
          if (urlString.startsWith(mockApiUrl)) {
            console.log(`[TEST] Intercepted PageSpeed API call: ${urlString}`);
            const response = new Response(
              JSON.stringify(mockPageSpeedResponse),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            );
            return Promise.resolve(response);
          }
          // Pass through others
          console.log(`[TEST] Passing through fetch call: ${urlString}`);
          return originalFetch(input, init);
        }
      );

      // --- Run test request ---
      const request = await superoak(app);
      await request
        .post('/api/v1/leads/analyze')
        .send({
          email: 'integration-test@example.com',
          websiteUrl: 'https://example-test.com',
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .expect((res) => {
          // Assertions using res.body.data
          assertExists(res.body.data, 'Response body.data should exist');
          assertEquals(
            typeof res.body.data.leadId,
            'number',
            'data.leadId should be a number'
          );
          assertExists(res.body.data.scores, 'data.scores should exist');
          assertEquals(
            res.body.data.scores.performance,
            mockScores.performance
          );
          assertEquals(
            res.body.data.scores.accessibility,
            mockScores.accessibility
          );
          assertEquals(
            res.body.data.scores.bestPractices,
            mockScores.bestPractices
          );
          assertEquals(res.body.data.scores.seo, mockScores.seo);
        });
    } finally {
      // --- Restore stubs --- (Order matters: restore listener before closing pool maybe? No, after.)
      fetchStub?.restore();
      // Restore the event listener stub *after* the test logic/request is done
      eventListenerStub?.restore();

      // --- Explicitly close the database pool ---
      console.log('[TEST] Closing database pool explicitly...');
      try {
        await pool.end();
        console.log('[TEST] Database pool explicitly closed.');
      } catch (closeError) {
        console.error(
          '[TEST] Error explicitly closing database pool:',
          closeError
        );
        // Ignore error if pool was already closed somehow, but log it.
      }
    }
  }
);

// TODO: Add more tests:
// - Error scenario (e.g., invalid input -> 400 Bad Request)
// - PageSpeed API failure scenario (mock fetch to return error)
// - Test the GET /health endpoint (if you add one)
// - Test the POST /api/v1/leads/:id/continue endpoint
