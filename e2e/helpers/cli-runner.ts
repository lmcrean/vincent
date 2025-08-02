import { execa, type ExecaReturnValue } from 'execa'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to the compiled Vincent CLI
const CLI_PATH = path.resolve(__dirname, '../../dist/cli.js')

export interface CLIResult {
  stdout: string
  stderr: string
  exitCode: number
  failed: boolean
  command: string
}

export interface CLIOptions {
  input?: string[]
  timeout?: number
  env?: Record<string, string>
  cwd?: string
  reject?: boolean
}

export class CLIRunner {
  private defaultOptions: CLIOptions = {
    timeout: 30000,
    reject: false,
    env: {
      NODE_ENV: 'test',
      CI: 'true',
      // Isolate test config from user's actual config
      VINCENT_TEST_HOME_DIR: path.join(os.tmpdir(), `vincent-test-${Date.now()}`)
    }
  }

  /**
   * Run Vincent CLI with specified arguments
   */
  async run(args: string[] = [], options: CLIOptions = {}): Promise<CLIResult> {
    const mergedOptions = { ...this.defaultOptions, ...options }
    
    try {
      const result: ExecaReturnValue = await execa('node', [CLI_PATH, ...args], {
        timeout: mergedOptions.timeout,
        env: { ...process.env, ...mergedOptions.env },
        cwd: mergedOptions.cwd,
        input: mergedOptions.input?.join('\n'),
        reject: mergedOptions.reject,
        encoding: 'utf8'
      })

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        failed: result.failed,
        command: result.command
      }
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        exitCode: error.exitCode || 1,
        failed: true,
        command: error.command || `node ${CLI_PATH} ${args.join(' ')}`
      }
    }
  }

  /**
   * Run Vincent CLI in interactive mode with predefined inputs
   */
  async runInteractive(args: string[] = [], inputs: string[] = [], options: CLIOptions = {}): Promise<CLIResult> {
    return this.run(args, {
      ...options,
      input: inputs,
      env: {
        ...options.env,
        NODE_ENV: 'test',
        // Disable TTY detection to prevent interactive prompts from hanging
        CI: 'true'
      }
    })
  }

  /**
   * Run Vincent with mock mode (no actual API calls)
   */
  async runMockMode(deckPath: string, inputs: string[] = ['y', 'mock'], options: CLIOptions = {}): Promise<CLIResult> {
    return this.runInteractive([deckPath], inputs, {
      ...options,
      env: {
        ...options.env,
        // Don't set GEMINI_API_KEY so the CLI will prompt for it
      }
    })
  }

  /**
   * Run Vincent with non-interactive mode (requires API key in env)
   */
  async runNonInteractive(args: string[] = [], options: CLIOptions = {}): Promise<CLIResult> {
    return this.run(args, {
      ...options,
      env: {
        ...options.env,
        GEMINI_API_KEY: options.env?.GEMINI_API_KEY || 'mock',
        NODE_ENV: 'test',
        CI: 'true'
      }
    })
  }

  /**
   * Helper to check if CLI binary exists and is executable
   */
  static async checkCLIExists(): Promise<boolean> {
    try {
      const result = await execa('node', [CLI_PATH, '--version'], {
        timeout: 5000,
        reject: false
      })
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * Helper to get CLI version
   */
  static async getCLIVersion(): Promise<string> {
    try {
      const result = await execa('node', [CLI_PATH, '--version'], {
        timeout: 5000
      })
      return result.stdout.trim()
    } catch (error) {
      throw new Error(`Failed to get CLI version: ${error}`)
    }
  }
}