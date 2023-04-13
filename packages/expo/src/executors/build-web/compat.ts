import { convertNxExecutor } from '@nx/devkit';

import buildWebExecutor from './build-web.impl';

export default convertNxExecutor(buildWebExecutor);
