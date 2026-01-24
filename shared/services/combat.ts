// Combat Resolver - Main combat resolution orchestrator
// Refactored to use modular components

import { GameState, FactionId } from '../types';
import { detectBattles } from './combatDetection';
import { createCombatLog } from './logs/logFactory';

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
    const combinedLogEntries: any[] = []; // Typed as any[] to avoid strict import issues if types ref differs, or assume inferred

    // Delegate to appropriate handler based on choice
    switch (choice) {
        case 'FIGHT': {
            const result = resolveFight(
                combat,
                newArmies,
                newCharacters,
                newLocations,
                newRoads,
                newStats,
                prevState.turn
            );
            newArmies = result.armies;
            newLocations = result.locations;
            newRoads = result.roads;
            newCharacters = result.characters;
            newStats = result.stats;
            logMsg = result.logMessage;
            if (result.logEntries) combinedLogEntries.push(...result.logEntries);
            break;
        }

        case 'RETREAT': {
            const result = handleAttackerRetreat(
                combat,
                newArmies,
                prevState.armies,
                newRoads,
                newLocations,
                newCharacters
            );
            newArmies = result.armies;
            newLocations = result.locations;
            newCharacters = result.characters;
            logMsg = result.logMessage;
            if (result.logEntries) combinedLogEntries.push(...result.logEntries);
            break;
        }

        case 'RETREAT_CITY': {
            const result = handleDefenderRetreatToCity(
                combat,
                newArmies,
                newLocations,
                newCharacters
            );
            newArmies = result.armies;
            newLocations = result.locations;
            newCharacters = result.characters;
            logMsg = result.logMessage;
            if (result.logEntries) combinedLogEntries.push(...result.logEntries);
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
            if (result.logEntries) combinedLogEntries.push(...result.logEntries);
            break;
        }
    }

    // Auto-resolve cascading AI battles
    // Pass humanFactions so it knows which factions are human in multiplayer
    const humanFactions = (prevState as any).humanFactions as FactionId[] | undefined;
    const cascadeResult = resolveAIBattleCascade(
        prevState.playerFaction,
        newArmies,
        newCharacters,
        newLocations,
        newRoads,
        newStats,
        humanFactions
    );
    newArmies = cascadeResult.armies;
    newLocations = cascadeResult.locations;
    newRoads = cascadeResult.roads;
    newCharacters = cascadeResult.characters;
    newStats = cascadeResult.stats;
    cascadeResult.logMessages.forEach(msg => logMsg += ` ${msg}`);
    if (cascadeResult.logEntries) combinedLogEntries.push(...cascadeResult.logEntries);

    // Detect remaining player battles
    const currentBattles = detectBattles(newLocations, newArmies, newRoads);

    console.log(`[COMBAT_RESOLVE] detectBattles found ${currentBattles.length} total battles after resolution`);
    currentBattles.forEach(b => console.log(`[COMBAT_RESOLVE]   - ${b.locationId || b.roadId}: ${b.attackerFaction} vs ${b.defenderFaction}`));

    // FIX: Detect server mode by checking for humanFactions array (same as processTurn fix)
    // Previously checked playerFaction === NEUTRAL, but server sets playerFaction to AI faction
    let playerBattles: typeof currentBattles = [];

    // humanFactions already defined above
    const isServerMode = Array.isArray(humanFactions) && humanFactions.length > 0;

    console.log(`[COMBAT_RESOLVE] humanFactions=${JSON.stringify(humanFactions)}, isServerMode=${isServerMode}`);

    if (isServerMode) {
        // Server sees all battles involving humans
        playerBattles = currentBattles.filter(b =>
            humanFactions.includes(b.attackerFaction) ||
            humanFactions.includes(b.defenderFaction)
        );
        console.log(`[COMBAT_RESOLVE] After human filter: ${playerBattles.length} battles`);

        // Additional: Include NEUTRAL vs Human battles (insurrections)
        if (playerBattles.length === 0 && currentBattles.length > 0) {
            // Check for neutral attackers against humans
            playerBattles = currentBattles.filter(b =>
                (b.attackerFaction === FactionId.NEUTRAL && humanFactions.includes(b.defenderFaction)) ||
                (b.defenderFaction === FactionId.NEUTRAL && humanFactions.includes(b.attackerFaction))
            );
            console.log(`[COMBAT_RESOLVE] After NEUTRAL fallback: ${playerBattles.length} battles`);
        }
    } else {
        playerBattles = getPlayerBattles(currentBattles, prevState.playerFaction);
        console.log(`[COMBAT_RESOLVE] Client mode: ${playerBattles.length} player battles`);
    }

    const nextBattle = playerBattles.length > 0 ? playerBattles[0] : null;
    const nextQueue = playerBattles.length > 1 ? playerBattles.slice(1) : [];

    console.log(`[COMBAT_RESOLVE] nextBattle=${nextBattle ? `${nextBattle.attackerFaction} vs ${nextBattle.defenderFaction}` : 'NULL'}, queue=${nextQueue.length}`);

    if (nextBattle && !prevState.combatState) {
        logMsg += " Another conflict has erupted!";
    }

    // Construct logs: Prefer structured entries, fallback to legacy msg
    let newLogs = prevState.logs;
    if (combinedLogEntries.length > 0) {
        const entryLogs = combinedLogEntries.map(entry =>
            createCombatLog("Combat Event", prevState.turn, entry.key, entry.params)
        );
        newLogs = [...newLogs, ...entryLogs];
        // If there was a "another conflict" message appended to logMsg, we might miss it if we ignore logMsg entirely?
        // Actually, logMsg isn't used if we have entries?
        // "Another conflict has erupted!" is appended to logMsg.
        // It's not in structured logs.
        // I should probably check if logMsg contains "Another conflict" and append it as a Generic log.
        if (logMsg.includes("Another conflict has erupted!")) {
            newLogs.push(createCombatLog("Another conflict has erupted!", prevState.turn));
        }
    } else if (logMsg) {
        newLogs = [...newLogs, createCombatLog(logMsg, prevState.turn)];
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
        logs: newLogs
    };
};
