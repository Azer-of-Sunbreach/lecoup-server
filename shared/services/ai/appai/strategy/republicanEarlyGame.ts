// Republican Early Game Strategy Module
// Scripted behavior for AI Republicans on turns 1-2 to establish defensive positions

import { GameState, FactionId, Army, Location, Road } from '../../../../types';
import { AIBudget } from '../types';
import { RECRUIT_COST, RECRUIT_AMOUNT, FORTIFICATION_LEVELS } from '../../../../constants';

// Target road stages for defensive garrisons
const DEFENSIVE_POSITIONS = {
    HEATHERFIELD: { roadId: 'r_sun_gre', stageIndex: 0, name: 'Heatherfield' },
    LIGHTHOUSE: { roadId: 'r_sun_ord', stageIndex: 0, name: "Sunbreach's Lighthouse" }
};

/**
 * Execute the Republican early game strategy (Turns 1-2).
 * This is a scripted behavior to establish defensive positions.
 * 
 * Turn 1:
 * - Deploy 500 soldiers to Heatherfield + build Pikes and Trenches
 * - Deploy 500 soldiers to Sunbreach Lighthouse + build Pikes and Trenches
 * - Recruit 4 times in Sunbreach Lands
 * - Recruit 4 times in Sunbreach
 * 
 * Turn 2 (if situation is favorable):
 * - Reinforce both positions with 500 more soldiers
 * - Upgrade to Stone Tower (level 2)
 * 
 * @returns Updated state partial
 */
export function executeRepublicanEarlyGame(
    state: GameState,
    faction: FactionId,
    budget: AIBudget
): Partial<GameState> {
    // SECURITY CHECK: Verify we are not running this for a human player
    const isHuman = (state as any).playerFactions?.includes(faction) || state.playerFaction === faction;
    if (isHuman) {
        // console.warn(`[AI EARLY GAME] Attempted to run for HUMAN faction ${faction}. Aborting.`);
        return {};
    }

    if (faction !== FactionId.REPUBLICANS || state.turn > 2) {
        return {};
    }

    console.log(`[AI EARLY GAME ${faction}] === Executing Turn ${state.turn} Strategy ===`);

    const updates: Partial<GameState> = {
        armies: [...state.armies],
        locations: [...state.locations],
        roads: [...state.roads],
        resources: { ...state.resources, [faction]: { ...state.resources[faction] } }
    };

    let currentGold = updates.resources![faction].gold;

    // --- PHASE 1: MAX RECRUITMENT (8 recruits: 4 + 4) ---
    currentGold = forceMaxRecruitment(faction, updates.locations!, updates.armies!, currentGold);

    // --- PHASE 2: DEPLOY DEFENSIVE GARRISONS ---
    if (state.turn === 1) {
        currentGold = deployTurn1Garrisons(state, faction, updates, currentGold);
    } else if (state.turn === 2) {
        currentGold = deployTurn2Reinforcements(state, faction, updates, currentGold);
    }

    // --- PHASE 3: EMERGENCY DEFENSE (Retreat if threatened) ---
    // If Sunbreach Lands are threatened, recall the garrisons!
    const enemiesInHome = updates.armies!.some(a =>
        a.faction !== faction &&
        a.faction !== FactionId.NEUTRAL &&
        (a.locationId === 'sunbreach_lands' || a.locationId === 'sunbreach')
    );

    if (enemiesInHome) {
        retreatGarrisons(state, faction, updates);
    }

    cleanupOrphanConstructions(state, faction, updates);

    updates.resources![faction].gold = currentGold;

    return updates;
}

/**
 * Recall garrisons to Sunbreach Lands if under attack.
 * CRITICAL: Must cancel construction (Ghost Fortification Fix)
 */
function retreatGarrisons(
    state: GameState,
    faction: FactionId,
    updates: Partial<GameState>
): void {
    const positions = [DEFENSIVE_POSITIONS.HEATHERFIELD, DEFENSIVE_POSITIONS.LIGHTHOUSE];

    for (const pos of positions) {
        const garrison = updates.armies!.find(a =>
            a.faction === faction &&
            a.roadId === pos.roadId &&
            a.stageIndex === pos.stageIndex &&
            a.locationType === 'ROAD'
        );

        if (garrison) {
            console.log(`[AI EARLY GAME REPUBLICANS] RETREAT! Recalling garrison from ${pos.name} to defend Sunbreach Lands.`);

            // 1. Cancel Construction (Fix for "Fortifications build themselves")
            const road = updates.roads!.find(r => r.id === pos.roadId);
            if (road) {
                const stage = road.stages[pos.stageIndex];
                if (stage.activeConstruction && stage.activeConstruction.armyId === garrison.id) {
                    console.log(`[AI EARLY GAME REPUBLICANS] Cancelling construction at ${pos.name}`);
                    stage.activeConstruction = undefined; // STOP BUILDING
                }
            }

            // 2. Order Retreat
            // Using "Reverse" logic: Set destination to origin (sunbreach_lands) and direction BACKWARD
            garrison.action = undefined; // Stop fortifying
            garrison.isSieging = false;

            // Movement Logic
            garrison.destinationId = 'sunbreach_lands'; // Legacy field for safety
            garrison.tripDestinationId = 'sunbreach_lands'; // New movement system
            garrison.tripOriginId = garrison.roadId!; // Where we started this move (the road)

            // Assuming we are at stage 0 and 'sunbreach_lands' is the 'from' of the road
            // We need to move BACKWARD to get into the 'from' location
            garrison.direction = 'BACKWARD';
            garrison.turnsUntilArrival = 1;
        }
    }
}

/**
 * Safety check: Remove constructions on our defensive lines if the building army is gone.
 * Handles the case where the army was destroyed/vanished but construction persisted.
 */
function cleanupOrphanConstructions(
    state: GameState,
    faction: FactionId,
    updates: Partial<GameState>
): void {
    const positions = [DEFENSIVE_POSITIONS.HEATHERFIELD, DEFENSIVE_POSITIONS.LIGHTHOUSE];

    for (const pos of positions) {
        const road = updates.roads!.find(r => r.id === pos.roadId);
        if (!road) continue;

        const stage = road.stages[pos.stageIndex];
        if (stage.activeConstruction && stage.activeConstruction.armyId) {
            // Check if army exists in EITHER state.armies or updates.armies
            // We use updates.armies as the authoritative source since we might have just modified it
            const armyExists = updates.armies!.some(a => a.id === stage.activeConstruction!.armyId);

            if (!armyExists) {
                console.log(`[AI EARLY GAME REPUBLICANS] Cleaning up orphan construction at ${pos.name} (Army ${stage.activeConstruction!.armyId} missing)`);
                stage.activeConstruction = undefined;
            }
        }
    }
}

/**
 * Force maximum recruitments at Sunbreach and Sunbreach Lands.
 */
function forceMaxRecruitment(
    faction: FactionId,
    locations: Location[],
    armies: Army[],
    currentGold: number
): number {
    const homeLocations = ['sunbreach', 'sunbreach_lands'];

    for (const locId of homeLocations) {
        const loc = locations.find(l => l.id === locId && l.faction === faction);
        if (!loc) continue;

        const currentRecruits = loc.actionsTaken?.recruit || 0;
        const remainingRecruits = 4 - currentRecruits;

        for (let i = 0; i < remainingRecruits; i++) {
            if (currentGold < RECRUIT_COST) break;
            if (loc.population < RECRUIT_AMOUNT) break;

            currentGold -= RECRUIT_COST;
            loc.population -= RECRUIT_AMOUNT;

            if (!loc.actionsTaken) {
                loc.actionsTaken = { recruit: 0, seizeGold: 0, seizeFood: 0, incite: 0 };
            }
            loc.actionsTaken.recruit += 1;

            // Merge into existing army or create new one
            const existingArmy = armies.find(a =>
                a.faction === faction &&
                a.locationId === locId &&
                a.locationType === 'LOCATION' &&
                !a.isSpent && !a.isSieging && !a.isInsurgent && !a.action
            );

            if (existingArmy) {
                existingArmy.strength += RECRUIT_AMOUNT;
            } else {
                armies.push({
                    id: `rep_early_${locId}_${Math.random().toString(36).substr(2, 9)}`,
                    faction,
                    locationType: 'LOCATION',
                    locationId: locId,
                    roadId: null,
                    stageIndex: 0,
                    direction: 'FORWARD',
                    originLocationId: locId,
                    destinationId: null,
                    turnsUntilArrival: 0,
                    strength: RECRUIT_AMOUNT,
                    isInsurgent: false,
                    isSpent: false,
                    isSieging: false,
                    foodSourceId: locId,
                    lastSafePosition: { type: 'LOCATION', id: locId }
                });
            }
        }

        console.log(`[AI EARLY GAME REPUBLICANS] Recruited at ${locId}: ${loc.actionsTaken?.recruit}/4`);
    }

    return currentGold;
}

/**
 * Turn 1: Deploy 500 soldiers to each defensive position and start Pikes and Trenches.
 */
function deployTurn1Garrisons(
    state: GameState,
    faction: FactionId,
    updates: Partial<GameState>,
    currentGold: number
): number {
    const positions = [DEFENSIVE_POSITIONS.HEATHERFIELD, DEFENSIVE_POSITIONS.LIGHTHOUSE];
    const fortLevel1 = FORTIFICATION_LEVELS[1]; // Pikes and Trenches

    for (const pos of positions) {
        // Find source army at Sunbreach Lands with enough soldiers
        const sourceArmy = updates.armies!.find(a =>
            a.faction === faction &&
            a.locationId === 'sunbreach_lands' &&
            a.locationType === 'LOCATION' &&
            a.strength >= 500 &&
            !a.isSpent && !a.action
        );

        if (!sourceArmy) {
            console.log(`[AI EARLY GAME REPUBLICANS] No source army available for ${pos.name}`);
            continue;
        }

        // Check if we can afford fortification
        if (currentGold < fortLevel1.cost) {
            console.log(`[AI EARLY GAME REPUBLICANS] Not enough gold for fortification at ${pos.name}`);
            continue;
        }

        // Split 500 soldiers for deployment
        sourceArmy.strength -= 500;
        if (sourceArmy.strength <= 0) {
            // Remove empty army
            const idx = updates.armies!.indexOf(sourceArmy);
            if (idx > -1) updates.armies!.splice(idx, 1);
        }

        // Create deployed garrison army
        const garrisonArmy: Army = {
            id: `rep_garrison_${pos.roadId}_${Math.random().toString(36).substr(2, 9)}`,
            faction,
            locationType: 'ROAD',
            locationId: null,
            roadId: pos.roadId,
            stageIndex: pos.stageIndex,
            direction: 'FORWARD',
            originLocationId: 'sunbreach_lands',
            destinationId: null,
            turnsUntilArrival: 0,
            strength: 500,
            isInsurgent: false,
            isSpent: true, // Just moved
            isSieging: false,
            foodSourceId: 'sunbreach_lands',
            lastSafePosition: { type: 'LOCATION', id: 'sunbreach_lands' },
            action: 'FORTIFY'
        };

        updates.armies!.push(garrisonArmy);

        // Claim road stage and start construction
        const road = updates.roads!.find(r => r.id === pos.roadId);
        if (road) {
            const stage = road.stages[pos.stageIndex];
            stage.faction = faction;
            stage.activeConstruction = {
                targetLevel: 1,
                turnsRemaining: fortLevel1.time,
                armyId: garrisonArmy.id,
                originalGoldCost: fortLevel1.cost,
                name: fortLevel1.name
            };

            currentGold -= fortLevel1.cost;
            console.log(`[AI EARLY GAME REPUBLICANS] Deployed 500 to ${pos.name}, building ${fortLevel1.name}`);
        }
    }

    return currentGold;
}

/**
 * Turn 2: If situation is favorable, reinforce and upgrade to Stone Tower.
 */
function deployTurn2Reinforcements(
    state: GameState,
    faction: FactionId,
    updates: Partial<GameState>,
    currentGold: number
): number {
    // Check if situation is favorable:
    // - No enemy armies in Sunbreach Lands
    // - Both defensive positions are still ours
    const enemiesInHome = state.armies.some(a =>
        a.faction !== faction &&
        a.faction !== FactionId.NEUTRAL &&
        a.locationId === 'sunbreach_lands'
    );

    if (enemiesInHome) {
        console.log(`[AI EARLY GAME REPUBLICANS] Turn 2: Under threat, skipping reinforcements`);
        return currentGold;
    }

    const positions = [DEFENSIVE_POSITIONS.HEATHERFIELD, DEFENSIVE_POSITIONS.LIGHTHOUSE];
    const fortLevel2 = FORTIFICATION_LEVELS[2]; // Stone Tower

    for (const pos of positions) {
        const road = updates.roads!.find(r => r.id === pos.roadId);
        if (!road) continue;

        const stage = road.stages[pos.stageIndex];

        // Only reinforce if we still control and have level 1 fortification
        if (stage.faction !== faction) continue;
        if ((stage.fortificationLevel || 0) < 1) continue;
        if (stage.activeConstruction) continue; // Still building

        // Find source army
        const sourceArmy = updates.armies!.find(a =>
            a.faction === faction &&
            a.locationId === 'sunbreach_lands' &&
            a.locationType === 'LOCATION' &&
            a.strength >= 500 &&
            !a.isSpent && !a.action
        );

        if (!sourceArmy) continue;
        if (currentGold < fortLevel2.cost) continue;

        // Find existing garrison at this position
        const existingGarrison = updates.armies!.find(a =>
            a.faction === faction &&
            a.roadId === pos.roadId &&
            a.stageIndex === pos.stageIndex &&
            a.locationType === 'ROAD'
        );

        // Reinforce
        sourceArmy.strength -= 500;
        if (sourceArmy.strength <= 0) {
            const idx = updates.armies!.indexOf(sourceArmy);
            if (idx > -1) updates.armies!.splice(idx, 1);
        }

        if (existingGarrison) {
            existingGarrison.strength += 500;
            existingGarrison.action = 'FORTIFY';
            existingGarrison.isSpent = true;

            // Start Stone Tower construction
            stage.activeConstruction = {
                targetLevel: 2,
                turnsRemaining: fortLevel2.time,
                armyId: existingGarrison.id,
                originalGoldCost: fortLevel2.cost,
                name: fortLevel2.name
            };

            currentGold -= fortLevel2.cost;
            console.log(`[AI EARLY GAME REPUBLICANS] Reinforced ${pos.name} to 1000, building ${fortLevel2.name}`);
        }
    }

    return currentGold;
}
