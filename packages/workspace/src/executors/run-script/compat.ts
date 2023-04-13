import { convertNxExecutor } from '@nx/devkit';

import { default as runScriptExecutor } from './run-script.impl';

export default convertNxExecutor(runScriptExecutor);
