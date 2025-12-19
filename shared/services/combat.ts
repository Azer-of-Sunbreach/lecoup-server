// Combat Resolver - Main combat resolution orchestrator
// Refactored to use modular components

import { GameState, FactionId } from '../types';
import { detectBattles } from './combatDetection';

// Import from new modular structure
import {
    applySequentialLosses,
    calculateCombatStrength,
    resolveFight,
    handleAttackerRetreat,
    handleDefenderRetreatToCity,
    handleSiege,
    resolveAIBattleCascade,
    getPlayerBattles
} from './combat/index';

// Re-export for backwards compatibility
export { applySequentialLosses, calculateCombatStrength };

/**
 * Main combat resolution orchestrator.
 * Delegates to specialized handlers based on player choice.
 * 
 * @param prevState - Current game state
 * @param choice - Player's combat choice (FIGHT, RETREAT, RETREAT_CITY, SIEGE)
 * @param siegeCost - Gold cost for siege (only for SIEGE choice)
 * @returns Partial game state updates
 */
export const resolveCombatResult = (
    prevState: GameState,
    choice: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE',
    siegeCost: number = 0
): Partial<GameState> => {

    if (!prevState.combatState) return {};

    const combat = prevState.combatState;

    // Initialize state copies
    let newArmies = [...prevState.armies];
    let newLocations = [...prevState.locations];
    let newRoads = [...prevState.roads];
    let newCharacters = [...prevState.characters];
    let newResources = { ...prevState.resources };
    let newStats = { ...prevState.stats };
    let logMsg = "";

    // Delegate to appropriate handler based on choice
    switch (choice) {
        case 'FIGHT': {
            const result = resolveFight(
                combat,
                newArmies,
                newCharacters,
                newLocations,
                newRoads,
                newStats
            );
            newArmies = result.armies;
            newLocations = result.locations;
            newRoads = result.roads;
            newCharacters = result.characters;
            newStats = result.stats;
            logMsg = result.logMessage;
            break;
        }

        case 'RETREAT': {
            const result = handleAttackerRetreat(
                combat,
                newArmies,
                prevState.armies,
                newRoads,
                newLocations
            );
            newArmies = result.armies;
            newLocations = result.locations;
            logMsg = result.logMessage;
            break;
        }

        case 'RETREAT_CITY': {
            const result = handleDefenderRetreatToCity(
                combat,
                newArmies,
                newLocations
            );
            newArmies = result.armies;
            newLocations = result.locations;
            logMsg = result.logMessage;
            break;
        }

        case 'SIEGE': {
            const result = handleSiege(
                combat,
                siegeCost,
                prevState.playerFaction,
                newArmies,
                newLocations,
                newRoads,
                newResources
            );
            newArmies = result.armies;
            newLocations = result.locations;
            newRoads = result.roads;
            newResources = result.resources;
            logMsg = result.logMessage;
            break;
        }
    }

    // Auto-resolve cascading AI battles
    const cascadeResult = resolveAIBattleCascade(
        prevState.playerFaction,
        newArmies,
        newCharacters,
        newLocations,
        newRoads,
        newStats
    );
    newArmies = cascadeResult.armies;
    newLocations = cascadeResult.locations;
    newRoads = cascadeResult.roads;
    newCharacters = cascadeResult.characters;
    newStats = cascadeResult.stats;
    cascadeResult.logMessages.forEach(msg => logMsg += ` ${msg}`);

    // Detect remaining player battles
    const currentBattles = detectBattles(newLocations, newArmies, newRoads);

    // FIX: Detect server mode by checking for humanFactions array (same as processTurn fix)
    // Previously checked playerFaction === NEUTRAL, but server sets playerFaction to AI faction
    let playerBattles: typeof currentBattles = [];

    const humanFactions = (prevState as any).humanFactions as FactionId[] | undefined;
    const isServerMode = Array.isArray(humanFactions) && humanFactions.length > 0;

    if (isServerMode) {
        // Server sees all battles involving humans
        playerBattles = currentBattles.filter(b =>
            humanFactions.includes(b.attackerFaction) ||
            humanFactions.includes(b.defenderFaction)
        );
        // Additional: Include NEUTRAL vs Human battles (insurrections)
        if (playerBattles.length === 0 && currentBattles.length > 0) {
            // Check for neutral attackers against humans
            playerBattles = currentBattles.filter(b =>
                (b.attackerFaction === FactionId.NEUTRAL && humanFactions.includes(b.defenderFaction)) ||
                (b.defenderFaction === FactionId.NEUTRAL && humanFactions.includes(b.attackerFaction))
            );
        }
    } else {
        playerBattles = getPlayerBattles(currentBattles, prevState.playerFaction);
    }

    const nextBattle = playerBattles.length > 0 ? playerBattles[0] : null;
    const nextQueue = playerBattles.length > 1 ? playerBattles.slice(1) : [];

    if (nextBattle && !prevState.combatState) {
        logMsg += " Another conflict has erupted!";
    }

    return {
        armies: newArmies,
        locations: newLocations,
        roads: newRoads,
        characters: newCharacters,
        resources: newResources,
        stats: newStats,
        combatState: nextBattle,
        combatQueue: nextQueue,
        logs: [...prevState.logs, logMsg]
    };
};
