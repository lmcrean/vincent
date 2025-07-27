# Vincent E2E Tests

End-to-end tests for the Vincent CLI application using Vitest and execa.

## Overview

This test suite validates the complete user experience of Vincent from CLI invocation to successful output generation. Tests are designed to work with Iteration 1 functionality, focusing on mock mode and basic CLI operations.

## Setup

Tests are automatically installed when you run the main Vincent setup:

```bash
cd ../   # Go to root Vincent directory
npm install
npm run build  # Required before running E2E tests
```

Or install E2E dependencies separately:

```bash
cd e2e/
npm install
```

## Running Tests

From the root Vincent directory:

```bash
# Run all E2E tests
npm run test:e2e

# Watch mode for development
npm run test:e2e:watch

# Coverage report
npm run test:e2e:coverage

# Run all tests (unit + integration + E2E)
npm run test:all
```

From the e2e directory:

```bash
# Basic test run
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# UI mode
npm run test:ui
```

## Test Structure

```
e2e/
├── vitest.config.ts         # Vitest configuration for E2E
├── package.json            # E2E-specific dependencies
├── fixtures/               # Test data and sample decks
│   ├── sample-deck.txt     # Basic 6-card deck for testing
│   ├── large-deck.txt      # 15-card deck for performance testing
│   ├── invalid-deck.txt    # Malformed deck for error testing
│   ├── empty-deck.txt      # Empty file for edge case testing
│   └── fixture-helpers.ts  # Utilities for working with test data
├── helpers/                # Test utilities and setup
│   ├── cli-runner.ts       # Main CLI testing interface using execa
│   └── test-setup.ts       # Test environment and cleanup utilities
└── tests/                  # Test suites
    ├── happy-path.test.ts      # Complete successful workflows
    ├── cli-interface.test.ts   # CLI parsing and validation
    ├── mock-mode.test.ts       # Mock mode functionality
    └── error-handling.test.ts  # Error scenarios and edge cases
```

## Test Categories

### Happy Path Tests (`happy-path.test.ts`)
- Mock mode processing of sample decks
- Non-interactive mode with environment variables
- Style option handling
- Custom output paths
- Large deck processing
- Version and help commands

### CLI Interface Tests (`cli-interface.test.ts`)
- Command line argument validation
- File validation (existence, format, extension)
- Interactive prompts and user input
- Environment variable handling
- Dry run mode
- Error message quality

### Mock Mode Tests (`mock-mode.test.ts`)
- Mock mode activation and behavior
- Progress indication and timing simulation
- Mock file generation
- Output validation and content preservation
- Different deck sizes
- Completion summaries

### Error Handling Tests (`error-handling.test.ts`)
- File system errors (missing files, permissions)
- Configuration errors (invalid options, missing API key)
- Interactive mode error scenarios
- Malformed input handling
- System resource errors
- Graceful degradation

## Key Features

### CLI Runner Helper
The `CLIRunner` class provides a convenient interface for testing:

```typescript
const cli = new CLIRunner()

// Run Vincent with arguments
await cli.run(['deck.txt', '--style', 'educational'])

// Run in interactive mode with predefined inputs
await cli.runInteractive(['deck.txt'], ['y', 'mock'])

// Run in mock mode specifically
await cli.runMockMode('deck.txt', ['y', 'mock'])

// Run in non-interactive mode
await cli.runNonInteractive(['deck.txt'])
```

### Test Environment
Each test gets an isolated temporary directory:

```typescript
const { getTempDir, cleanup } = setupTestSuite()
const tempDir = getTempDir()  // Unique temp directory per test
```

### Fixture Management
Easy access to test data:

```typescript
// Copy fixture to temp directory
const deckPath = await copyFixture(FIXTURE_FILES.SAMPLE_DECK, tempDir)

// Read fixture content
const content = await readFixture('sample-deck.txt')

// Parse cards from fixture
const cards = await parseFixtureCards('sample-deck.txt')
```

## Requirements

- Vincent must be built (`npm run build`) before running E2E tests
- Tests validate the compiled CLI at `../dist/cli.js`
- Node.js >=18.0.0
- Tests run in isolated environments with proper cleanup

## Testing Approach

### Mock Mode Focus
Iteration 1 tests primarily use mock mode to avoid external API dependencies:
- Mock mode activated with API key 'mock'
- Simulates realistic processing times
- Creates placeholder image files
- Tests complete workflows without external calls

### Environment Isolation
- Each test runs in a temporary directory
- Environment variables controlled per test
- No side effects between tests
- Proper cleanup after each test

### Real CLI Testing
- Tests the actual compiled CLI binary
- Uses `execa` for robust process spawning
- Captures stdout, stderr, and exit codes
- Tests both interactive and non-interactive modes

## Development Notes

### Adding New Tests
1. Create test files in `tests/` directory
2. Use `setupTestSuite()` for environment setup
3. Use `CLIRunner` for CLI interactions
4. Add fixtures to `fixtures/` if needed
5. Follow existing patterns for error handling

### Debugging Tests
- Use `npm run test:e2e:watch` for iterative development
- Check `test:ui` mode for interactive debugging
- Verify CLI builds with `npm run build` before testing
- Use verbose output to see CLI stdout/stderr

### Performance Considerations
- E2E tests have longer timeouts (30+ seconds)
- Mock mode should complete reasonably quickly
- Large deck tests validate performance boundaries
- Tests clean up resources properly

This E2E test suite provides comprehensive validation of Vincent's CLI functionality for Iteration 1, ensuring reliable behavior across different usage scenarios and error conditions.