/**
 * Military Domain Services - Barrel File
 */

export { canRecruit, executeRecruitment } from './recruitment';
export type { RecruitResult } from './recruitment';

export { canMoveArmy, executeArmyMove, executeSplitArmy } from './movement';
export type { MoveArmyResult } from './movement';

export { executeFortify } from './fortification';
export type { FortifyResult } from './fortification';

export { executeMergeRegiments } from './mergeRegiments';
export type { MergeResult } from './mergeRegiments';

export { executeGarrison } from './garrison';
