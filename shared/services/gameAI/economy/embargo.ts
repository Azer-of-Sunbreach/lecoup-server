// Embargo Module - Grain trade embargo logic

import { GameState, FactionId, Location, CharacterStatus, FACTION_NAMES, LocationType } from '../../../types';
import { FactionPersonality } from '../types';

export interface EmbargoResult {
    locations: Location[];
    logs: string[];
    grainTradeNotification?: GameState['grainTradeNotification'];
}

/**
 * Handle grain embargo logic for Windward.
 * 
 * FACTION-SPECIFIC RULES:
 * 
 * - REPUBLICANS: NEVER apply embargo, even if they control Windward and Great Plains.
 * 
 * - CONSPIRATORS: Can apply embargo if:
 *   - Control both Windward and Great Plains
 *   - Count Rivenberg is alive (for political cover)
 *   - Embargo chance increases each turn (10% + 10%/turn, max 80%)
 *   - Windward stability > 60
 * 
 * - NOBLES: Can apply embargo if:
 *   - Control both Windward and Great Plains
 *   - Baron Lekal AND/OR Sir Haraldic are alive
 *   - Embargo is economically advantageous:
 *     (Food Production > Food Consumption + (10 * number of controlled cities))
 * 
 * @param state - Current game state
 * @param faction - Faction to process
 * @param profile - Faction personality
 * @param locations - Locations array (modified in place)
 * @returns Embargo result with logs and notification
 */
export function handleGrainEmbargo(
    state: GameState,
    faction: FactionId,
    profile: FactionPersonality,
    locations: Location[]
): EmbargoResult {
    const logs: string[] = [];
    let grainTradeNotification: GameState['grainTradeNotification'] | undefined;

    const windward = locations.find(l => l.id === 'windward');
    if (!windward || windward.faction !== faction) {
        return { locations, logs };
    }

    // Republicans NEVER apply embargo
    if (faction === FactionId.REPUBLICANS) {
        return { locations, logs };
    }

    if (!profile.canUseGrainEmbargo) {
        return { locations, logs };
    }

    const gp = locations.find(l => l.id === 'great_plains');
    const controlsGreatPlains = gp && gp.faction === faction;

    if (!controlsGreatPlains) {
        return { locations, logs };
    }

    // Handle based on faction
    if (faction === FactionId.CONSPIRATORS) {
        handleConspiratorEmbargo(state, windward, gp!, logs, (notif) => {
            grainTradeNotification = notif;
        });
    } else if (faction === FactionId.NOBLES) {
        handleNobleEmbargo(state, faction, locations, windward, gp!, logs, (notif) => {
            grainTradeNotification = notif;
        });
    }

    return { locations, logs, grainTradeNotification };
}

/**
 * Conspirator embargo logic:
 * - Requires Count Rivenberg alive
 * - Gradual chance: 10% + 10%/turn, max 80%
 * - Requires stability > 60
 */
function handleConspiratorEmbargo(
    state: GameState,
    windward: Location,
    greatPlains: Location,
    logs: string[],
    setNotification: (notif: GameState['grainTradeNotification']) => void
): void {
    if (windward.isGrainTradeActive) {
        // Check if Rivenberg is alive
        const rivenberg = state.characters.find(c =>
            c.id === 'rivenberg' && c.status !== CharacterStatus.DEAD
        );

        if (!rivenberg) return; // No political cover

        const embargoChance = Math.min(0.1 + (state.turn * 0.1), 0.8);

        if (windward.stability > 60 && Math.random() < embargoChance) {
            applyEmbargo(windward, greatPlains, FactionId.CONSPIRATORS, logs, setNotification);
        }
    } else {
        // Lift embargo if stability is too low
        if (windward.stability < 30) {
            liftEmbargo(windward, greatPlains);
        }
    }
}

/**
 * Noble embargo logic:
 * - Requires Baron Lekal AND/OR Sir Haraldic alive
 * - Must be economically advantageous:
 *   Production > Consumption + (10 * number of controlled cities)
 */
function handleNobleEmbargo(
    state: GameState,
    faction: FactionId,
    locations: Location[],
    windward: Location,
    greatPlains: Location,
    logs: string[],
    setNotification: (notif: GameState['grainTradeNotification']) => void
): void {
    if (windward.isGrainTradeActive) {
        // Check if Baron Lekal OR Sir Haraldic are alive
        const lekal = state.characters.find(c =>
            c.id === 'lekal' && c.status !== CharacterStatus.DEAD
        );
        const haraldic = state.characters.find(c =>
            c.id === 'haraldic' && c.status !== CharacterStatus.DEAD
        );

        if (!lekal && !haraldic) return; // No political cover

        // Check if embargo is economically advantageous
        if (isEmbargoAdvantageousForNobles(faction, locations)) {
            applyEmbargo(windward, greatPlains, FactionId.NOBLES, logs, setNotification);
        }
    } else {
        // Lift embargo if stability is too low
        if (windward.stability < 30) {
            liftEmbargo(windward, greatPlains);
        }
    }
}

/**
 * Check if embargo is economically advantageous for Nobles.
 * 
 * Condition: (Production + 60) > (Consumption + 10 * number of controlled cities)
 * 
 * The +60 represents the increased production from Great Plains when embargo is active.
 * The +10×cities simulates the increased food demand on their own cities.
 */
function isEmbargoAdvantageousForNobles(faction: FactionId, locations: Location[]): boolean {
    const myLocations = locations.filter(l => l.faction === faction);
    const myCities = myLocations.filter(l => l.type === LocationType.CITY);
    const myRurals = myLocations.filter(l => l.type === LocationType.RURAL);

    // Total food production (from rurals)
    const totalProduction = myRurals.reduce((sum, r) => sum + (r.foodIncome || 0), 0);

    // Total food consumption (negative foodIncome on cities)
    const totalConsumption = myCities.reduce((sum, c) => {
        const income = c.foodIncome || 0;
        return sum + (income < 0 ? Math.abs(income) : 0);
    }, 0);

    // Embargo bonus: +60 production from Great Plains
    const embargoProductionBonus = 60;

    // Embargo impact: +10 consumption per controlled city
    const embargoConsumptionImpact = 10 * myCities.length;

    // Embargo is advantageous if: (production + 60) > (consumption + 10×cities)
    return (totalProduction + embargoProductionBonus) > (totalConsumption + embargoConsumptionImpact);
}

/**
 * Apply embargo: deactivate grain trade and reduce stability.
 */
function applyEmbargo(
    windward: Location,
    greatPlains: Location,
    faction: FactionId,
    logs: string[],
    setNotification: (notif: GameState['grainTradeNotification']) => void
): void {
    windward.isGrainTradeActive = false;
    windward.stability -= 20;
    greatPlains.stability -= 20;

    const msg = `Embargo applied on Grain Trade by ${FACTION_NAMES[faction]}!`;
    logs.push(msg);

    setNotification({
        type: 'EMBARGO',
        factionName: FACTION_NAMES[faction]
    });
}

/**
 * Lift embargo: reactivate grain trade and restore stability.
 */
function liftEmbargo(windward: Location, greatPlains: Location): void {
    windward.isGrainTradeActive = true;
    windward.stability += 20;
    greatPlains.stability += 20;
}
