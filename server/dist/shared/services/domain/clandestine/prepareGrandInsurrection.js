"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPrepareGrandInsurrection = processPrepareGrandInsurrection;
const types_1 = require("../../../types");
const clandestineTypes_1 = require("../../../types/clandestineTypes");
const generateId = () => 'insurgency_' + Math.random().toString(36).substr(2, 9);
/**
 * Process the 'Prepare Grand Insurrection' action.
 *
 * Timeline:
 * - Turns 0-3: Waiting ("Preparing...").
 * - Turn 4: Execution.
 *
 * Execution Flow:
 * 1. Stability Shock (Ops * 4).
 * 2. Spawn Insurgent Army (Formula).
 * 3. Immediate Combat (No Fortification).
 * 4. Apply Outcome (Victory/Defeat/Death).
 */
function processPrepareGrandInsurrection(leader, location, action, armies, // Need all armies to find garrison
characters, // Need all characters for command bonuses
turn) {
    // 1. Check Timing & Initialization
    if (action.turnStarted === undefined) {
        // Initialize the action starting "now" (so we count this turn as 1)
        const newAction = { ...action, turnStarted: turn - 1 };
        // Deduct One-Time Cost immediately
        const cost = action.oneTimeGoldAmount || 100;
        const currentBudget = leader.clandestineBudget ?? leader.budget ?? 0; // Check both properties
        const newBudget = Math.max(0, currentBudget - cost);
        // Lock leader status immediately and update budget
        // Apply instant detection increase for one-time action
        const actionDef = clandestineTypes_1.CLANDESTINE_ACTIONS[clandestineTypes_1.ClandestineActionId.PREPARE_GRAND_INSURRECTION];
        const detectionIncrease = actionDef?.detectionIncrease ?? 10;
        const finalLeader = {
            ...leader,
            clandestineBudget: newBudget, // Use clandestineBudget for consistency
            budget: newBudget, // Also set budget for backward compatibility
            detectionLevel: (leader.detectionLevel ?? 0) + detectionIncrease,
            status: types_1.CharacterStatus.ON_MISSION,
            activeClandestineActions: leader.activeClandestineActions?.map(a => a.actionId === action.actionId ? newAction : a)
        };
        // Create preparation warning log (CRITICAL for territory owner, INFO for others)
        // This alerts the AI and players that an insurrection is being prepared
        // NOTE: visibleToFactions must explicitly list factions (empty array = no visibility in routeLog)
        const allFactions = [types_1.FactionId.NOBLES, types_1.FactionId.CONSPIRATORS, types_1.FactionId.REPUBLICANS];
        const preparationLog = {
            id: `grand-insurrection-prep-${turn}-${leader.id}`,
            type: types_1.LogType.INSURRECTION,
            message: `${leader.name} is preparing an insurrection in ${location.name}.`,
            turn,
            visibleToFactions: allFactions,
            baseSeverity: types_1.LogSeverity.WARNING,
            criticalForFactions: location.faction !== types_1.FactionId.NEUTRAL ? [location.faction] : undefined,
            highlightTarget: { type: 'LOCATION', id: location.id },
            i18nKey: 'insurrectionPreparing',
            i18nParams: { leader: leader.id, location: location.id }
        };
        return {
            updatedLeader: finalLeader,
            updatedLocation: location,
            updatedAction: newAction,
            log: preparationLog,
            isCompleted: false
        };
    }
    const turnsElapsed = turn - action.turnStarted;
    // Timeline: 
    // Start Turn T (Initialized above). turn - turn = 0.
    // T+1 (Elapsed 1). 
    // T+2 (Elapsed 2). 
    // T+3 (Elapsed 3). 
    // T+4 (Elapsed 4) -> Trigger.
    if (turnsElapsed < 4) {
        // Ensure status is ON_MISSION during preparation
        let finalLeader = leader;
        if (leader.status !== types_1.CharacterStatus.ON_MISSION) {
            finalLeader = { ...leader, status: types_1.CharacterStatus.ON_MISSION };
        }
        return {
            updatedLeader: finalLeader,
            updatedLocation: location,
            updatedAction: action,
            isCompleted: false
        };
    }
    // --- EXECUTION ---
    // 2. Stability Shock
    const opsLevel = leader.stats.clandestineOps || 0;
    const stabilityShock = opsLevel * 4;
    let currentStability = Math.max(0, location.stability - stabilityShock);
    // Apply shock to location immediately for calculations
    let updatedLocation = { ...location, stability: currentStability };
    // 3. Army Creation
    // Formula: (([Gold]/25 * ([Pop]/100000)) * (100 - Stab) * (1 + (Res_Vs_Owner/100) - (Res_Vs_Actor/100))) + 100
    // Firebrand: * 1.33
    const goldInvested = action.oneTimeGoldAmount || 100; // Default 100 if missing
    const population = updatedLocation.population;
    const stabilityFactor = 100 - currentStability;
    const ownerResentment = (updatedLocation.faction !== types_1.FactionId.NEUTRAL && updatedLocation.resentment)
        ? (updatedLocation.resentment[updatedLocation.faction] || 0)
        : 0;
    const actorResentment = (leader.faction !== types_1.FactionId.NEUTRAL && updatedLocation.resentment)
        ? (updatedLocation.resentment[leader.faction] || 0)
        : 0;
    const resentmentFactor = 1 + (ownerResentment / 100) - (actorResentment / 100);
    let insurgentCount = ((goldInvested / 25) * (population / 100000)) * stabilityFactor * resentmentFactor;
    if (leader.stats.ability.includes('FIREBRAND')) {
        insurgentCount *= 1.33;
    }
    insurgentCount = Math.floor(insurgentCount) + 100;
    // Deduct population
    updatedLocation = {
        ...updatedLocation,
        population: Math.max(0, population - insurgentCount)
    };
    // Create Army Object
    const insurgentArmy = {
        id: generateId(),
        faction: leader.faction, // "Sous le contrôle de la faction du joueur" -> Player faction
        strength: insurgentCount,
        locationId: location.id,
        locationType: 'LOCATION',
        // name: `Insurgents of ${leader.name}`, // Army interface has no name
        isInsurgent: true, // Initially true, cleared if victory
        // morale: 100, // Army interface has no morale
        // type: 'REGULAR', // Army interface has no type
        isGarrisoned: false,
        // Defaults for Movement State
        roadId: null,
        stageIndex: 0,
        direction: 'FORWARD',
        originLocationId: location.id,
        destinationId: null,
        turnsUntilArrival: 0,
        foodSourceId: location.id,
        lastSafePosition: { type: 'LOCATION', id: location.id }
    };
    // 4. Attach Leader to Army
    // Leader takes command immediately.
    let finalLeader = {
        ...leader,
        status: types_1.CharacterStatus.AVAILABLE,
        armyId: insurgentArmy.id,
        activeClandestineActions: [], // Clear actions
        pendingAlertEvents: [] // Clear alerts so they don't appear in modal this turn
    };
    // 5. Notification
    // Just a log saying it started. Battle system will handle the "War" log.
    const resultLog = {
        id: `grand-insurrection-start-${turn}-${leader.id}`,
        type: types_1.LogType.CLANDESTINE,
        message: `${leader.faction} has initiated a Grand Insurrection in ${location.name}! ${leader.name} leads the uprising.`,
        turn,
        visibleToFactions: [], // All
        baseSeverity: types_1.LogSeverity.WARNING,
        highlightTarget: { type: 'LOCATION', id: location.id },
        i18nKey: 'grandInsurrectionStart',
        i18nParams: { faction: leader.faction, location: location.id, leader: leader.id }
    };
    return {
        updatedLeader: finalLeader,
        updatedLocation: updatedLocation,
        newArmy: insurgentArmy,
        log: resultLog,
        isCompleted: true
    };
}
