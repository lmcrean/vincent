import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.blue(`ℹ️  ${msg}`)),
  warn: (msg: string) => console.error(chalk.yellow(`⚠️  ${msg}`)),
  error: (msg: string) => console.error(chalk.red(`❌ ${msg}`)),
  success: (msg: string) => console.log(chalk.green(`✅ ${msg}`)),
  progress: (msg: string) => console.log(chalk.cyan(`🔄 ${msg}`)),
  header: (msg: string) => console.log(chalk.bold.magenta(`🎨 ${msg}`))
};