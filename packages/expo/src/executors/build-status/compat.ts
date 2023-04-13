import { convertNxExecutor } from '@nx/devkit';

import buildStatusExecutor from './build-status.impl';

export default convertNxExecutor(buildStatusExecutor);
