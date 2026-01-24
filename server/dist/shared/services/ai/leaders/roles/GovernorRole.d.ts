/**
 * Governor Role - AI decision logic for territory governance
 *
 * Handles policy selection for governors based on:
 * - Territory stability and threats
 * - Economic conditions
 * - Enemy agent presence
 * - Leader capabilities (MANAGER, MAN_OF_CHURCH, PARANOID, IRON_FIST)
 *
 * @module shared/services/ai/leaders/roles
 */
import { Character, Location, FactionId } from '../../../../types';
import { GovernorDecision, FactionStrategy, TerritoryStatus } from '../types';
/**
 * Generate governor decisions for a leader at a location.
 */
export declare function makeGovernorDecisions(leader: Character, location: Location, territory: TerritoryStatus, strategy: FactionStrategy, availableGold: number, availableFood: number, turn: number): GovernorDecision;
/**
 * Analyze a territory for governor AI decisions.
 */
export declare function analyzeTerritoryForGovernor(location: Location, characters: Character[], faction: FactionId, garrisonStrength: number, logs: {
    message: string;
    turn: number;
    baseSeverity: string;
}[]): TerritoryStatus;
