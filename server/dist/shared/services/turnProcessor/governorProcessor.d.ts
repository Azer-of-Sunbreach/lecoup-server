/**
 * governorProcessor.ts - Central processor for Governor Policies
 *
 * Symmetrical to clandestineProcessor.ts but for active Governor Policies (Locations).
 *
 * Processes all active governor policies for all locations at turn start:
 * 1. Checks standard disable conditions (revenue=0, no governor)
 * 2. Deducts costs from faction treasury
 * 3. Calls policy handlers (Make Examples, Stabilize Region, etc.)
 * 4. Generates logs
 */
import { Location, Character, FactionId, LogEntry, Army } from '../../types';
export interface GovernorPoliciesResult {
    locations: Location[];
    goldCosts: Record<FactionId, number>;
    foodCosts: Record<string, number>;
    logs: LogEntry[];
}
export declare function processGovernorPolicies(locations: Location[], characters: Character[], armies: Army[], resources: Record<FactionId, {
    gold: number;
}>, turn: number): GovernorPoliciesResult;
