import { AssetGlobPattern } from '../executors/rollup/schema';
import { join } from 'path';

export interface RollupCopyAssetOption {
  src: string;
  dest: string;
}

export function convertCopyAssetsToRollupOptions(
  outputPath: string,
  assets: AssetGlobPattern[]
): RollupCopyAssetOption[] {
  return assets
    ? assets.map((a) => ({
        src: join(a.input, a.glob).replace(/\\/g, '/'),
        dest: join(outputPath, a.output).replace(/\\/g, '/'),
      }))
    : undefined;
}
