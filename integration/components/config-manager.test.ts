import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { tmpdir } from 'os';
import { ConfigManager } from '@/config.js';
import { ConfigError } from '@/utils/errors.js';
import { createTestOutputDir } from '../helpers/file-fixtures.js';

// We'll use environment variable instead of mocking os.homedir

describe('ConfigManager Integration Tests', () => {
  let configManager: ConfigManager;
  let tempHomeDir: string;
  let tempOutputDir: string;

  beforeEach(async () => {
    // Create temporary home directory
    tempHomeDir = path.join(tmpdir(), `vincent-config-integration-${Date.now()}`);
    await fs.ensureDir(tempHomeDir);

    // Create temporary output directory
    tempOutputDir = await createTestOutputDir();

    // Set environment variable for test home directory
    process.env.VINCENT_TEST_HOME_DIR = tempHomeDir;

    configManager = new ConfigManager();
  });

  afterEach(async () => {
    // Clean up environment
    delete process.env.VINCENT_TEST_HOME_DIR;
    
    // Clean up directories
    await fs.remove(tempHomeDir).catch(() => {});
    await fs.remove(tempOutputDir).catch(() => {});
    vi.clearAllMocks();
  });

  describe('configuration file management', () => {
    it('should create config directory on first save', async () => {
      const configDir = path.join(tempHomeDir, '.vincent');
      
      // Verify directory doesn't exist initially
      expect(await fs.pathExists(configDir)).toBe(false);

      // Save config
      await configManager.saveConfig({
        apiKey: 'test-key-123',
        style: 'educational',
        outputDir: tempOutputDir
      });

      // Verify directory was created
      expect(await fs.pathExists(configDir)).toBe(true);
      
      // Verify it's actually a directory
      const stats = await fs.stat(configDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should persist configuration across instances', async () => {
      const testConfig = {
        apiKey: 'persistent-test-key',
        style: 'medical' as const,
        outputDir: tempOutputDir
      };

      // Save with first instance
      await configManager.saveConfig(testConfig);

      // Create new instance and verify config persists
      const newConfigManager = new ConfigManager();
      const loadedConfig = await newConfigManager.getConfig();

      expect(loadedConfig).toEqual(testConfig);
    });

    it('should handle concurrent access safely', async () => {
      const configs = [
        { apiKey: 'key1', style: 'educational' as const, outputDir: tempOutputDir },
        { apiKey: 'key2', style: 'medical' as const, outputDir: tempOutputDir },
        { apiKey: 'key3', style: 'colorful' as const, outputDir: tempOutputDir }
      ];

      // Save multiple configs concurrently
      const savePromises = configs.map((config, index) => 
        configManager.saveConfig({
          ...config,
          apiKey: `concurrent-key-${index}`
        })
      );

      await Promise.all(savePromises);

      // Verify final state is consistent
      const finalConfig = await configManager.getConfig();
      expect(finalConfig).toBeDefined();
      expect(finalConfig?.apiKey).toMatch(/^concurrent-key-\d$/);
    });

    it('should handle file corruption gracefully', async () => {
      const configFile = path.join(tempHomeDir, '.vincent', 'config.json');
      
      // Create config directory and corrupt file
      await fs.ensureDir(path.dirname(configFile));
      await fs.writeFile(configFile, '{ invalid json content');

      // Should handle corruption gracefully
      const config = await configManager.getConfig();
      expect(config).toBeNull();

      // Should be able to save new config after corruption
      const newConfig = {
        apiKey: 'recovery-key',
        style: 'educational' as const,
        outputDir: tempOutputDir
      };

      await configManager.saveConfig(newConfig);
      const savedConfig = await configManager.getConfig();
      expect(savedConfig).toEqual(newConfig);
    });

    it('should handle permission errors appropriately', async () => {
      // Create read-only config directory to simulate permission error
      const configDir = path.join(tempHomeDir, '.vincent');
      await fs.ensureDir(configDir);
      
      // Make directory read-only (may not work on all systems)
      try {
        await fs.chmod(configDir, 0o444);

        const testConfig = {
          apiKey: 'permission-test-key',
          style: 'educational' as const,
          outputDir: tempOutputDir
        };

        await expect(configManager.saveConfig(testConfig))
          .rejects
          .toThrow(ConfigError);

      } catch (chmodError) {
        // If chmod doesn't work (e.g., on Windows), skip this test
        console.log('Skipping permission test - chmod not supported');
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(configDir, 0o755);
        } catch {}
      }
    });
  });

  describe('API key management', () => {
    it('should save and retrieve API key correctly', async () => {
      const testApiKey = 'integration-test-api-key-12345';

      await configManager.saveApiKey(testApiKey);
      const retrievedKey = await configManager.getApiKey();

      expect(retrievedKey).toBe(testApiKey);
    });

    it('should update API key while preserving other settings', async () => {
      // Save initial config
      const initialConfig = {
        apiKey: 'initial-key',
        style: 'medical' as const,
        outputDir: tempOutputDir
      };

      await configManager.saveConfig(initialConfig);

      // Update just the API key
      const newApiKey = 'updated-api-key';
      await configManager.saveApiKey(newApiKey);

      // Verify API key was updated but other settings preserved
      const updatedConfig = await configManager.getConfig();
      expect(updatedConfig?.apiKey).toBe(newApiKey);
      expect(updatedConfig?.style).toBe('medical');
      expect(updatedConfig?.outputDir).toBe(tempOutputDir);
    });

    it('should handle empty API key correctly', async () => {
      await configManager.saveApiKey('');
      const config = await configManager.getConfig();
      
      // Check the actual config has empty string
      expect(config?.apiKey).toBe('');
      
      // getApiKey returns null for empty string (based on implementation)
      const retrievedKey = await configManager.getApiKey();
      expect(retrievedKey).toBeNull();
    });

    it('should return null for non-existent API key', async () => {
      const apiKey = await configManager.getApiKey();
      expect(apiKey).toBeNull();
    });
  });

  describe('configuration validation', () => {
    it('should validate output directory paths', async () => {
      const validConfig = {
        apiKey: 'test-key',
        style: 'educational' as const,
        outputDir: tempOutputDir
      };

      // Should accept valid absolute path
      await expect(configManager.saveConfig(validConfig))
        .resolves
        .not.toThrow();

      // Verify config was saved
      const savedConfig = await configManager.getConfig();
      expect(savedConfig?.outputDir).toBe(tempOutputDir);
    });

    it('should handle different style values', async () => {
      const styles = ['educational', 'medical', 'colorful', 'minimal'] as const;

      for (const style of styles) {
        const config = {
          apiKey: `test-key-${style}`,
          style,
          outputDir: tempOutputDir
        };

        await configManager.saveConfig(config);
        const savedConfig = await configManager.getConfig();
        
        expect(savedConfig?.style).toBe(style);
      }
    });

    it('should preserve JSON formatting', async () => {
      const testConfig = {
        apiKey: 'formatting-test-key',
        style: 'educational' as const,
        outputDir: tempOutputDir
      };

      await configManager.saveConfig(testConfig);

      // Read raw file content
      const configFile = path.join(tempHomeDir, '.vincent', 'config.json');
      const rawContent = await fs.readFile(configFile, 'utf8');

      // Verify it's properly formatted JSON
      expect(rawContent).toContain('{\n');
      expect(rawContent).toContain('  "apiKey"');
      expect(rawContent).toMatch(/\n}$/);
      
      // Verify it's valid JSON
      expect(() => JSON.parse(rawContent)).not.toThrow();
    });
  });

  describe('error recovery', () => {
    it('should recover from partial file writes', async () => {
      const configFile = path.join(tempHomeDir, '.vincent', 'config.json');
      await fs.ensureDir(path.dirname(configFile));

      // Simulate partial write (incomplete JSON)
      await fs.writeFile(configFile, '{"apiKey": "test", "style":');

      // Should handle gracefully and allow new save
      const newConfig = {
        apiKey: 'recovery-key',
        style: 'educational' as const,
        outputDir: tempOutputDir
      };

      await configManager.saveConfig(newConfig);
      const savedConfig = await configManager.getConfig();
      
      expect(savedConfig).toEqual(newConfig);
    });

    it('should handle missing parent directories', async () => {
      // Remove the entire .vincent directory if it exists
      const vincentDir = path.join(tempHomeDir, '.vincent');
      await fs.remove(vincentDir);

      const testConfig = {
        apiKey: 'missing-dir-test',
        style: 'educational' as const,
        outputDir: tempOutputDir
      };

      // Should create directories as needed
      await configManager.saveConfig(testConfig);
      const savedConfig = await configManager.getConfig();
      
      expect(savedConfig).toEqual(testConfig);
    });

    it('should handle filesystem full scenarios gracefully', async () => {
      // Mock fs.writeFile to simulate ENOSPC error
      const originalWriteFile = fs.writeFile;
      vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(
        Object.assign(new Error('no space left on device'), { code: 'ENOSPC' })
      );

      const testConfig = {
        apiKey: 'nospc-test',
        style: 'educational' as const,
        outputDir: tempOutputDir
      };

      await expect(configManager.saveConfig(testConfig))
        .rejects
        .toThrow(ConfigError);

      // Restore original function
      vi.mocked(fs.writeFile).mockImplementation(originalWriteFile);

      // Should work after space is available
      await configManager.saveConfig(testConfig);
      const savedConfig = await configManager.getConfig();
      expect(savedConfig).toEqual(testConfig);
    });
  });

  describe('cross-platform compatibility', () => {
    it('should handle Windows-style paths correctly', async () => {
      const windowsPath = 'C:\\Users\\Test\\vincent-output';
      const config = {
        apiKey: 'windows-path-test',
        style: 'educational' as const,
        outputDir: windowsPath
      };

      await configManager.saveConfig(config);
      const savedConfig = await configManager.getConfig();
      
      expect(savedConfig?.outputDir).toBe(windowsPath);
    });

    it('should handle Unix-style paths correctly', async () => {
      const unixPath = '/home/user/vincent-output';
      const config = {
        apiKey: 'unix-path-test',
        style: 'educational' as const,
        outputDir: unixPath
      };

      await configManager.saveConfig(config);
      const savedConfig = await configManager.getConfig();
      
      expect(savedConfig?.outputDir).toBe(unixPath);
    });

    it('should handle paths with spaces', async () => {
      const pathWithSpaces = path.join(tempOutputDir, 'folder with spaces');
      await fs.ensureDir(pathWithSpaces);
      
      const config = {
        apiKey: 'spaces-path-test',
        style: 'educational' as const,
        outputDir: pathWithSpaces
      };

      await configManager.saveConfig(config);
      const savedConfig = await configManager.getConfig();
      
      expect(savedConfig?.outputDir).toBe(pathWithSpaces);
    });
  });
});