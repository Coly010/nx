import { RollupConfigOptions } from '../schema';
import { names } from '@nx/devkit';

export function createOutputString(options: RollupConfigOptions) {
  const output = [];
  for (const format of options.format) {
    output.push({
      format,
      dir: `${options.outputPath}`,
      name: names(options.projectName).className,
      entryFileNames: `[name].${format}.js`,
      chunkFileNames: `[name].${format}.js`,
    });
  }

  return JSON.stringify(output, undefined, 2);
}
