import { RollupConfigOptions } from '../schema';
import { parse } from 'path';

export function createInputString(options: RollupConfigOptions) {
  const input: Record<string, string> = {};
  const mainEntryFileName = options.outputFileName || options.main;
  input[parse(mainEntryFileName).name] = options.main;
  options.additionalEntryPoints.forEach((entry) => {
    input[parse(entry).name] = entry;
  });

  return JSON.stringify(input, undefined, 2);
}
