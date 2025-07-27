import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Config, ImageStyle } from './types.js';
import { ConfigError } from './utils/errors.js';

export class ConfigManager {
  private get configDir(): string {
    return path.join(os.homedir(), '.vincent');
  }

  private get configFile(): string {
    return path.join(this.configDir, 'config.json');
  }

  async getConfig(): Promise<Config | null> {
    try {
      if (await fs.pathExists(this.configFile)) {
        const content = await fs.readFile(this.configFile, 'utf8');
        return JSON.parse(content);
      }
      return null;
    } catch {
      return null;
    }
  }

  async saveConfig(config: Config): Promise<void> {
    try {
      await fs.ensureDir(this.configDir);
      await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new ConfigError(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    const config = await this.getConfig() || {
      apiKey: '',
      style: 'educational' as ImageStyle,
      outputDir: 'vincent-output'
    };
    
    config.apiKey = apiKey;
    await this.saveConfig(config);
  }

  async getApiKey(): Promise<string | null> {
    const config = await this.getConfig();
    return config?.apiKey || null;
  }
}