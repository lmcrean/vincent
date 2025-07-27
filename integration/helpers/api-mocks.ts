import { http, HttpResponse } from 'msw';
import fs from 'fs-extra';
import path from 'path';

// Mock responses directory
const RESPONSES_DIR = path.resolve(__dirname, '../fixtures/responses');

// Gemini API base URL
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// API handlers for MSW
export const apiHandlers = [
  // Successful image generation - Default handler
  http.post(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-preview-image-generation:generateContent`, async ({ request }) => {
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('key');
    const simulate = url.searchParams.get('simulate');
    
    // Check for simulation parameters first
    if (simulate === 'auth_error' || apiKey === 'invalid-key') {
      return HttpResponse.json({
        error: {
          code: 401,
          message: 'API key not valid',
          status: 'UNAUTHENTICATED'
        }
      }, { status: 401 });
    }
    
    if (simulate === 'rate_limit') {
      return new HttpResponse(null, {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'Retry-After': '60'
        }
      });
    }
    
    if (simulate === 'server_error') {
      return new HttpResponse(null, {
        status: 500,
        statusText: 'Internal Server Error'
      });
    }
    
    if (simulate === 'timeout') {
      // Simulate long delay that will cause timeout
      await new Promise(resolve => setTimeout(resolve, 35000));
      return HttpResponse.json({ success: true });
    }
    
    if (simulate === 'malformed') {
      return HttpResponse.json({
        invalid: 'response structure'
      });
    }
    
    // Default successful response
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return mock PNG data as arraybuffer (since responseType is 'arraybuffer')
    const mockImageBuffer = await fs.readFile(path.join(RESPONSES_DIR, 'sample-generated-image.png'));
    
    return new HttpResponse(mockImageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png'
      }
    });
  }),

  // Additional catch-all handler for any uncaught requests
  http.all('*', ({ request }) => {
    console.error('Unhandled request:', request.method, request.url);
    return HttpResponse.json({ error: 'Not mocked' }, { status: 500 });
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