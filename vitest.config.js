"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const path_1 = __importDefault(require("path"));
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/__tests__/**/*.test.ts'],
        exclude: ['node_modules', 'dist', 'integration'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'src/**/__tests__/**',
                '**/*.d.ts',
                'build/',
                'docs/',
                'integration/'
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            }
        },
        setupFiles: [],
        testTimeout: 10000
    },
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src')
        }
    }
});
//# sourceMappingURL=vitest.config.js.map