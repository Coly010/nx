import * as chalk from 'chalk';
import { EOL } from 'os';
import * as readline from 'readline';
import { isCI } from './is-ci';
import type { TaskStatus } from '../tasks-runner/tasks-runner';

const GH_GROUP_PREFIX = '::group::';
const GH_GROUP_SUFFIX = '::endgroup::';

export interface CLIErrorMessageConfig {
  title: string;
  bodyLines?: string[];
  slug?: string;
}

export interface CLIWarnMessageConfig {
  title: string;
  bodyLines?: string[];
  slug?: string;
}

export interface CLINoteMessageConfig {
  title: string;
  bodyLines?: string[];
}

export interface CLISuccessMessageConfig {
  title: string;
  bodyLines?: string[];
}

/**
 * Automatically disable styling applied by chalk if CI=true
 */
const forceColor =
  process.env.FORCE_COLOR === '' || process.env.FORCE_COLOR === 'true';
if (isCI() && !forceColor) {
  (chalk as any).level = 0;
}

class CLIOutput {
  cliName = 'NX';
  formatCommand = (taskId: string) => `${chalk.dim('nx run')} ${taskId}`;

  /**
   * Longer dash character which forms more of a continuous line when place side to side
   * with itself, unlike the standard dash character
   */
  private get VERTICAL_SEPARATOR() {
    let divider = '';
    for (let i = 0; i < process.stdout.columns - 1; i++) {
      divider += '\u2014';
    }
    return divider;
  }

  /**
   * Expose some color and other utility functions so that other parts of the codebase that need
   * more fine-grained control of message bodies are still using a centralized
   * implementation.
   */
  colors = {
    gray: chalk.gray,
    green: chalk.green,
    red: chalk.red,
    cyan: chalk.cyan,
    white: chalk.white,
  };
  bold = chalk.bold;
  underline = chalk.underline;
  dim = chalk.dim;

  private writeToStdOut(str: string) {
    process.stdout.write(str);
  }

  overwriteLine(lineText: string = '') {
    // this replaces the existing text up to the new line length
    process.stdout.write(lineText);
    // clear whatever text might be left to the right of the cursor (happens
    // when existing text was longer than new one)
    readline.clearLine(process.stdout, 1);
    process.stdout.write(EOL);
  }

  private writeOutputTitle({
    color,
    title,
  }: {
    color: string;
    title: string;
  }): void {
    this.writeToStdOut(`${this.applyNxPrefix(color, title)}${EOL}`);
  }

  private writeOptionalOutputBody(bodyLines?: string[]): void {
    if (!bodyLines) {
      return;
    }
    this.addNewline();
    bodyLines.forEach((bodyLine) => this.writeToStdOut(`${bodyLine}${EOL}`));
  }

  applyNxPrefix(color = 'cyan', text: string): string {
    let nxPrefix = '';
    if (chalk[color]) {
      nxPrefix = chalk.reset.inverse.bold[color](` ${this.cliName} `);
    } else {
      nxPrefix = chalk.reset.inverse.bold.keyword(color)(` ${this.cliName} `);
    }
    return `${nxPrefix}  ${text}`;
  }

  addNewline() {
    this.writeToStdOut(EOL);
  }

  addVerticalSeparator(color = 'gray') {
    this.addNewline();
    this.addVerticalSeparatorWithoutNewLines(color);
    this.addNewline();
  }

  addVerticalSeparatorWithoutNewLines(color = 'gray') {
    this.writeToStdOut(`${this.getVerticalSeparator(color)}${EOL}`);
  }

  getVerticalSeparatorLines(color = 'gray') {
    return ['', this.getVerticalSeparator(color), ''];
  }

  private getVerticalSeparator(color: string): string {
    return chalk.dim[color](this.VERTICAL_SEPARATOR);
  }

  error({ title, slug, bodyLines }: CLIErrorMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'red',
      title: chalk.red(title),
    });

    this.writeOptionalOutputBody(bodyLines);

    /**
     * Optional slug to be used in an Nx error message redirect URL
     */
    if (slug && typeof slug === 'string') {
      this.addNewline();
      this.writeToStdOut(
        `${chalk.grey(
          '  Learn more about this error: '
        )}https://errors.nx.dev/${slug}${EOL}`
      );
    }

    this.addNewline();
  }

  warn({ title, slug, bodyLines }: CLIWarnMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'yellow',
      title: chalk.yellow(title),
    });

    this.writeOptionalOutputBody(bodyLines);

    /**
     * Optional slug to be used in an Nx warning message redirect URL
     */
    if (slug && typeof slug === 'string') {
      this.addNewline();
      this.writeToStdOut(
        `${chalk.grey(
          '  Learn more about this warning: '
        )}https://errors.nx.dev/${slug}${EOL}`
      );
    }

    this.addNewline();
  }

  note({ title, bodyLines }: CLINoteMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'orange',
      title: chalk.keyword('orange')(title),
    });

    this.writeOptionalOutputBody(bodyLines);

    this.addNewline();
  }

  success({ title, bodyLines }: CLISuccessMessageConfig) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'green',
      title: chalk.green(title),
    });

    this.writeOptionalOutputBody(bodyLines);

    this.addNewline();
  }

  logSingleLine(message: string) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'gray',
      title: message,
    });

    this.addNewline();
  }

  logCommand(message: string, taskStatus?: TaskStatus) {
    this.addNewline();
    this.writeToStdOut(this.getCommandWithStatus(message, taskStatus));
    this.addNewline();
    this.addNewline();
  }

  logCommandOutput(message: string, taskStatus: TaskStatus, output: string) {
    let commandOutputWithStatus = this.getCommandWithStatus(
      message,
      taskStatus
    );

    if (
      process.env.NX_SKIP_LOG_GROUPING !== 'true' &&
      process.env.GITHUB_ACTIONS
    ) {
      const icon = this.getStatusIcon(taskStatus);
      commandOutputWithStatus = `${GH_GROUP_PREFIX}${icon} ${commandOutputWithStatus}`;
    }

    this.addNewline();
    this.writeToStdOut(commandOutputWithStatus);
    this.addNewline();
    this.addNewline();
    this.writeToStdOut(output);

    if (
      process.env.NX_SKIP_LOG_GROUPING !== 'true' &&
      process.env.GITHUB_ACTIONS
    ) {
      this.writeToStdOut(GH_GROUP_SUFFIX);
    }
  }

  private getCommandWithStatus(
    message: string,
    taskStatus: TaskStatus
  ): string {
    const commandOutput =
      chalk.dim('> ') + this.formatCommand(this.normalizeMessage(message));
    return this.addTaskStatus(taskStatus, commandOutput);
  }

  private getStatusIcon(taskStatus: TaskStatus) {
    switch (taskStatus) {
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      case 'skipped':
      case 'local-cache-kept-existing':
        return '⏩';
      case 'local-cache':
      case 'remote-cache':
        return '🔁';
    }
  }

  private normalizeMessage(message: string) {
    if (message.startsWith('nx run ')) {
      return message.substring('nx run '.length);
    } else if (message.startsWith('run ')) {
      return message.substring('run '.length);
    } else {
      return message;
    }
  }

  private addTaskStatus(
    taskStatus:
      | 'success'
      | 'failure'
      | 'skipped'
      | 'local-cache-kept-existing'
      | 'local-cache'
      | 'remote-cache',
    commandOutput: string
  ) {
    if (taskStatus === 'local-cache') {
      return `${commandOutput}  ${chalk.dim('[local cache]')}`;
    } else if (taskStatus === 'remote-cache') {
      return `${commandOutput}  ${chalk.dim('[remote cache]')}`;
    } else if (taskStatus === 'local-cache-kept-existing') {
      return `${commandOutput}  ${chalk.dim(
        '[existing outputs match the cache, left as is]'
      )}`;
    } else {
      return commandOutput;
    }
  }

  log({ title, bodyLines, color }: CLIWarnMessageConfig & { color?: string }) {
    this.addNewline();

    this.writeOutputTitle({
      color: 'cyan',
      title: color ? chalk[color](title) : title,
    });

    this.writeOptionalOutputBody(bodyLines);

    this.addNewline();
  }

  drain(): Promise<void> {
    return new Promise((resolve) => {
      if (process.stdout.writableNeedDrain) {
        process.stdout.once('drain', resolve);
      } else {
        resolve();
      }
    });
  }
}

export const output = new CLIOutput();
