# Integration Tests

This directory contains comprehensive integration tests for the Vincent Anki image generator. These tests are designed to be completely isolated from unit tests and can be run independently.

## Overview

Integration tests verify that Vincent's components work together correctly in real-world scenarios. They test:

- **End-to-end workflows**: Complete deck processing from .apkg input to enhanced output
- **Component integration**: How different modules interact (parser, generator, config, CLI)
- **External service integration**: API calls, file system operations, error handling
- **Real file operations**: Actual .apkg parsing and generation
- **Error scenarios**: Network failures, invalid inputs, permission issues

## Structure

```
integration/
├── vitest.config.ts          # Vitest configuration for integration tests
├── package.json              # Independent package for isolation
├── README.md                 # This file
├── fixtures/                 # Test data and sample files
│   ├── sample-decks/         # Generated .apkg files during tests
│   ├── media/                # Sample media files
│   ├── responses/            # Mock API responses
│   └── create-sample-decks.ts # Script to generate test fixtures
├── helpers/                  # Test utilities and setup
│   ├── test-setup.ts         # Global test configuration
│   ├── api-mocks.ts          # MSW handlers for API mocking
│   ├── file-fixtures.ts      # .apkg file creation utilities
│   └── test-data.ts          # Sample data generators
├── components/               # Component integration tests
│   ├── anki-parser.test.ts   # Anki file parsing tests
│   ├── image-generator.test.ts # Image generation with mocked API
│   ├── config-manager.test.ts # Configuration file handling
│   └── cli-integration.test.ts # CLI argument parsing and execution
├── workflows/                # End-to-end workflow tests
│   └── deck-processing.test.ts # Complete processing pipeline
└── external/                 # External service tests
    ├── gemini-api.test.ts    # API contract and error handling
    └── rate-limiting.test.ts # Rate limiting behavior
```

## Running Tests

### Prerequisites

1. **Install dependencies** (from project root):
   ```bash
   npm install
   ```

2. **Build the project** (required for CLI tests):
   ```bash
   npm run build
   ```

### Running Integration Tests

From the `/integration` directory:

```bash
# Run all integration tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Run specific test file
npx vitest anki-parser.test.ts

# Run specific test suite
npx vitest --grep "CLI Integration"
```

### From Project Root

You can also run integration tests from the main project directory:

```bash
# Change to integration directory and run tests
cd integration && npm test
```

## Test Categories

### 1. Component Integration Tests (`components/`)

**Anki Parser Tests** (`anki-parser.test.ts`):
- Parse real .apkg files with various content types
- Handle corrupted files and edge cases
- Memory management and cleanup
- Performance with large decks

**Image Generator Tests** (`image-generator.test.ts`):
- Generate images with mocked Gemini API
- Handle different image styles
- API error scenarios (rate limiting, auth errors, timeouts)
- File system operations

**Config Manager Tests** (`config-manager.test.ts`):
- File-based configuration persistence
- Cross-platform path handling
- Concurrent access and corruption recovery
- Permission errors

**CLI Integration Tests** (`cli-integration.test.ts`):
- Command-line argument parsing
- Help and version display
- Error handling and user-friendly messages
- Process spawning and output capture

### 2. End-to-End Workflow Tests (`workflows/`)

**Deck Processing Tests** (`deck-processing.test.ts`):
- Complete processing pipeline from input to output
- Different image styles and deck types
- Dry run mode verification
- Performance and progress tracking
- File integrity and validation

### 3. External Service Tests (`external/`)

**Gemini API Tests** (`external/gemini-api.test.ts`):
- API contract validation
- Authentication and error handling
- Response format verification
- Network resilience

**Rate Limiting Tests** (`external/rate-limiting.test.ts`):
- Respect API rate limits
- Retry logic and backoff strategies
- Queue management

## Test Data and Fixtures

### Sample Decks

Tests use dynamically generated .apkg files with various content:

- **Vocabulary**: Basic Q&A pairs for language learning
- **Medical**: Medical terminology with complex content
- **Math**: Mathematical formulas and equations
- **Science**: Scientific facts and concepts
- **HTML Content**: Cards with HTML formatting
- **Edge Cases**: Empty fields, unicode, very long content
- **Large Deck**: 50+ cards for performance testing

### Mock API Responses

MSW (Mock Service Worker) handles API mocking:

- **Successful responses**: Valid image generation
- **Rate limiting**: 429 errors with retry headers
- **Authentication errors**: 401 unauthorized
- **Server errors**: 500 internal server error
- **Network timeouts**: Simulated connection issues
- **Malformed responses**: Invalid JSON or missing fields

### File System Utilities

Helper functions for file operations:

- `createTestApkg()`: Generate valid .apkg files
- `validateApkgContent()`: Verify .apkg file integrity
- `createTestOutputDir()`: Temporary directories for tests
- `createSampleImage()`: Generate test image data

## Configuration

### Environment Variables

Tests use these environment variables:

- `GEMINI_API_KEY`: Set to test API key for mocked requests
- `VINCENT_TEST_TEMP_DIR`: Directory for temporary test files
- `NODE_ENV=test`: Indicates test environment

### Test Timeouts

- **Default timeout**: 30 seconds (longer than unit tests)
- **Hook timeout**: 10 seconds for setup/teardown
- **CLI timeout**: 10 seconds for process spawning
- **Network timeout**: 5 seconds for mocked requests

## Best Practices

### Writing Integration Tests

1. **Use real file operations** where possible
2. **Mock external APIs** with MSW for reliability
3. **Test error scenarios** extensively
4. **Clean up resources** in afterEach hooks
5. **Use descriptive test names** that explain the scenario
6. **Verify both success and failure paths**

### Test Isolation

- Each test creates its own temporary directories
- MSW handlers are reset between tests
- Environment variables are cleaned up
- No shared state between tests

### Performance Considerations

- Tests should complete within reasonable time (< 30s each)
- Use minimal image styles for faster generation
- Limit concurrent requests in tests
- Clean up resources promptly

## Debugging

### Verbose Output

Run tests with verbose output:

```bash
npm test -- --reporter=verbose
```

### Debug Specific Tests

```bash
# Run single test with debugging
npx vitest --run anki-parser.test.ts --reporter=verbose

# Run tests matching pattern
npx vitest --run --grep "should handle corrupted"
```

### Test Failures

Common issues and solutions:

1. **File permission errors**: Ensure temp directories are writable
2. **API timeout errors**: Check network connectivity or increase timeouts
3. **Build errors**: Run `npm run build` before CLI tests
4. **Memory issues**: Increase Node.js memory limit if needed

### Logs and Output

- Test output includes progress indicators
- Failed tests show detailed error messages
- File paths use absolute paths for clarity
- MSW logs API request/response details in verbose mode

## Continuous Integration

These tests are designed to run in CI environments:

- No external dependencies (APIs are mocked)
- Deterministic test data
- Reasonable execution time
- Clear failure messages
- Proper cleanup (no temp files left behind)

For CI setup, ensure:

1. Node.js 18+ is available
2. `npm install && npm run build` before tests
3. Sufficient disk space for temp files
4. Network access for dependency downloads