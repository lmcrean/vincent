import { http, HttpResponse } from 'msw';
import fs from 'fs-extra';
import path from 'path';

// Mock responses directory
const RESPONSES_DIR = path.resolve(__dirname, '../fixtures/responses');

// Gemini API base URL
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// API handlers for MSW
export const apiHandlers = [
  // Successful image generation
  http.post(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-preview-image-generation:generateContent`, async ({ request }) => {
    const body = await request.json() as any;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return mock PNG data
    const mockImageBuffer = await fs.readFile(path.join(RESPONSES_DIR, 'sample-generated-image.png'));
    
    return HttpResponse.json({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: mockImageBuffer.toString('base64')
            }
          }]
        }
      }]
    });
  }),

  // Rate limit error (429)
  http.post(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-preview-image-generation:generateContent`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('simulate') === 'rate_limit') {
      return new HttpResponse(null, {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'Retry-After': '60'
        }
      });
    }
  }),

  // Authentication error (401)
  http.post(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-preview-image-generation:generateContent`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('simulate') === 'auth_error') {
      return HttpResponse.json({
        error: {
          code: 401,
          message: 'API key not valid',
          status: 'UNAUTHENTICATED'
        }
      }, { status: 401 });
    }
  }),

  // Server error (500)
  http.post(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-preview-image-generation:generateContent`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('simulate') === 'server_error') {
      return new HttpResponse(null, {
        status: 500,
        statusText: 'Internal Server Error'
      });
    }
  }),

  // Network timeout simulation
  http.post(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-preview-image-generation:generateContent`, async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('simulate') === 'timeout') {
      // Simulate long delay that will cause timeout
      await new Promise(resolve => setTimeout(resolve, 35000));
      return HttpResponse.json({ success: true });
    }
  })
];

// Helper functions for tests
export const mockApiKey = 'test-api-key-12345';

export const mockSuccessfulResponse = {
  candidates: [{
    content: {
      parts: [{
        inlineData: {
          mimeType: 'image/png',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        }
      }]
    }
  }]
};

export const mockErrorResponse = {
  error: {
    code: 400,
    message: 'Invalid request',
    status: 'INVALID_ARGUMENT'
  }
};