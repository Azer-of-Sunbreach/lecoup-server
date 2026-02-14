import { BaseMapRules } from './BaseMapRules';
import { CHARACTERS_NEW } from '../../data/characters';

/**
 * LarionMapRules — Rules for the Larion map.
 *
 * Economy calculation is inherited from BaseMapRules, which delegates to
 * territorialStats.ts (single source of truth). All Larion-specific features
 * (Sunbreach, Port de Sable, Windward embargo, Saltcraw fishing, etc.) are
 * handled by the territorialStats.ts calculation functions.
 */
export class LarionMapRules extends BaseMapRules {
    getInitialCharacters(): any[] {
        return CHARACTERS_NEW;
    }
}

