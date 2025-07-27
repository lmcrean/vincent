import { TestAnkiCard } from './file-fixtures.js';

/**
 * Sample test cards for different scenarios
 */
export const sampleCards: Record<string, TestAnkiCard[]> = {
  // Basic vocabulary cards
  vocabulary: [
    { id: 1, question: 'What is the capital of France?', answer: 'Paris' },
    { id: 2, question: 'What does "bonjour" mean in English?', answer: 'Hello' },
    { id: 3, question: 'What is the French word for "cat"?', answer: 'Chat' }
  ],
  
  // Medical terminology
  medical: [
    { id: 1, question: 'What is the medical term for high blood pressure?', answer: 'Hypertension' },
    { id: 2, question: 'Which organ produces insulin?', answer: 'Pancreas' },
    { id: 3, question: 'What is the largest bone in the human body?', answer: 'Femur' }
  ],
  
  // Mathematical concepts
  math: [
    { id: 1, question: 'What is the formula for the area of a circle?', answer: 'π × r²' },
    { id: 2, question: 'What is the derivative of x²?', answer: '2x' },
    { id: 3, question: 'What is the value of π to 3 decimal places?', answer: '3.142' }
  ],
  
  // Science facts
  science: [
    { id: 1, question: 'What is the chemical formula for water?', answer: 'H₂O' },
    { id: 2, question: 'What is the speed of light in a vacuum?', answer: '299,792,458 m/s' },
    { id: 3, question: 'What gas makes up approximately 78% of Earth\'s atmosphere?', answer: 'Nitrogen' }
  ],
  
  // Complex HTML content
  htmlContent: [
    { 
      id: 1, 
      question: '<b>What is <i>photosynthesis</i>?</b>', 
      answer: 'The process by which <span style="color: green;">plants</span> convert light energy into chemical energy.' 
    },
    { 
      id: 2, 
      question: 'List the components of <u>DNA</u>:', 
      answer: '<ol><li>Adenine</li><li>Thymine</li><li>Guanine</li><li>Cytosine</li></ol>' 
    }
  ],
  
  // Edge cases
  edgeCases: [
    { id: 1, question: '', answer: 'Empty question test' },
    { id: 2, question: 'Empty answer test', answer: '' },
    { id: 3, question: 'Very long question that exceeds normal length and contains many words to test how the system handles lengthy content that might cause issues with prompt generation or API limits', answer: 'Short answer' },
    { id: 4, question: 'Short', answer: 'Very long answer that contains extensive detail and explanation that goes on for many sentences to test how the image generation system handles verbose content that might exceed token limits or cause processing delays when creating educational illustrations' },
    { id: 5, question: 'Special characters: éñ中文🎯', answer: 'Unicode test ✅' }
  ],
  
  // Single card for simple tests
  single: [
    { id: 1, question: 'What is 2 + 2?', answer: '4' }
  ],
  
  // Large deck simulation
  large: Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    question: `Question ${i + 1}: What is the answer to test question number ${i + 1}?`,
    answer: `Answer ${i + 1}`
  }))
};

/**
 * Configuration presets for different test scenarios
 */
export const testConfigs = {
  basic: {
    style: 'educational' as const,
    dryRun: false,
    concurrency: 1
  },
  
  fastTest: {
    style: 'minimal' as const,
    dryRun: false,
    concurrency: 3
  },
  
  dryRun: {
    style: 'educational' as const,
    dryRun: true,
    concurrency: 1
  },
  
  highConcurrency: {
    style: 'colorful' as const,
    dryRun: false,
    concurrency: 5
  }
};

/**
 * Mock API responses for different scenarios
 */
export const mockResponses = {
  success: {
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
  },
  
  error: {
    error: {
      code: 400,
      message: 'Invalid request',
      status: 'INVALID_ARGUMENT'
    }
  },
  
  rateLimit: {
    error: {
      code: 429,
      message: 'Quota exceeded',
      status: 'RESOURCE_EXHAUSTED'
    }
  }
};

/**
 * Test environment variables
 */
export const testEnv = {
  validApiKey: 'test-valid-api-key-12345',
  invalidApiKey: 'invalid-key',
  emptyApiKey: '',
  testTimeout: 30000,
  shortTimeout: 5000
};