import { type Tree, joinPathFragments } from '@nx/devkit';
import { createPluginsString } from './create-plugins-string';
import { createInputString } from './create-input-string';
import { createOutputString } from './create-output-string';
import { RollupConfigOptions } from '../schema';

export function generateConfig(tree: Tree, options: RollupConfigOptions) {
  const { pluginImports, plugins } = createPluginsString(options);
  const input = createInputString(options);
  const output = createOutputString(options);

  tree.write(
    joinPathFragments(options.projectRoot, 'rollup.config.js'),
    `${pluginImports}
  
  export default {
    input: ${input},
    output: ${output},
    plugins: [${plugins}]
  };`
  );
}
