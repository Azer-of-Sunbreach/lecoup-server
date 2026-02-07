import { BaseMapRules } from './BaseMapRules';

export class ValisMapRules extends BaseMapRules {
    getInitialCharacters(): any[] {
        // No characters for Valis yet
        return [];
    }

    // Uses BaseMapRules.calculateEconomy for now (standard logic)
}
