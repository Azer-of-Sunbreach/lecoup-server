
import { GameState, Army, Character, CharacterStatus, RoadQuality, FactionId } from '../../types';
import { calculateEconomyAndFood } from '../../utils/economy';

// Helper to check hostility
const areHostile = (f1: FactionId, f2: FactionId): boolean => {
    if (f1 === f2) return false;
    // Assuming everyone is hostile to everyone except Neutral/Self for simplicity in this war logic
    // Adjust if alliances are introduced
    return true;
};

// Helper to generate a unique key for any position (City, Rural, or Road Stage)
const getPositionKey = (locationType: 'LOCATION' | 'ROAD', locationId: string | null, roadId: string | null, stageIndex: number): string => {
    if (locationType === 'LOCATION' && locationId) {
        return `LOC:${locationId}`;
    }
    if (locationType === 'ROAD' && roadId) {
        return `ROAD:${roadId}:${stageIndex}`;
    }
    return 'UNKNOWN';
};

export const resolveMovements = (state: GameState): { armies: Army[], characters: Character[], logs: string[] } => {
    // 0. Snapshot Start of Turn Position for History/Retreat Logic
    // This is critical for robust 'Retreat' and 'Reverse' mechanics.
    const armiesWithSnapshot = state.armies.map(army => ({
        ...army,
        startOfTurnPosition: {
            type: army.locationType,
            id: army.locationType === 'LOCATION' ? army.locationId! : army.roadId!,
            stageIndex: army.stageIndex
        }
    }));

    let nextArmies = armiesWithSnapshot.map(a => ({ ...a }));
    let nextCharacters = state.characters.map(c => ({ ...c }));
    const logs: string[] = [];

    // 1. Calculate Intended Moves
    // We store the intended next state for every army without applying it yet
    const moves: Map<string, { armyIndex: number, nextLocationId: string | null, nextRoadId: string | null, nextStageIndex: number, isMoveFinished: boolean }> = new Map();

    nextArmies.forEach((army, index) => {
        // Skip armies that already moved this turn (e.g., AI moved them in Phase 1)
        // justMoved is reset in Phase 2 of turnProcessor, so this only blocks same-turn double moves
        if (army.justMoved) {
            return; // FIX: Prevent double movement for AI armies
        }

        // Skip if spent, sieging, occupied OR GARRISONED
        if (army.isSpent || army.isSieging || army.action || army.isGarrisoned) return;

        // MOVEMENT FROM ROAD
        if (army.locationType === 'ROAD' && army.roadId) {
            const road = state.roads.find(r => r.id === army.roadId);
            if (!road) return;

            let nextIndex = army.stageIndex + (army.direction === 'FORWARD' ? 1 : -1);

            if (nextIndex < 0 || nextIndex >= road.stages.length) {
                // Arriving at destination
                const destId = army.destinationId;
                if (destId) {
                    moves.set(army.id, {
                        armyIndex: index,
                        nextLocationId: destId,
                        nextRoadId: null,
                        nextStageIndex: 0,
                        isMoveFinished: true
                    });
                }
            } else {
                // Continuing on road
                moves.set(army.id, {
                    armyIndex: index,
                    nextLocationId: null,
                    nextRoadId: army.roadId,
                    nextStageIndex: nextIndex,
                    isMoveFinished: false
                });
            }
        }
        // NOTE: LOCATION-to-ROAD entry is handled by executeArmyMove (UI action) or AI movement.
        // REGIONAL roads should NOT be duplicated here - that causes double movement (2 stages in 1 turn).
        // However, LOCAL roads (city↔rural) ARE instant and should be processed here.
        else if (army.locationType === 'LOCATION' && army.destinationId && army.locationId) {
            const connectingRoad = state.roads.find(r =>
                (r.from === army.locationId && r.to === army.destinationId) ||
                (r.to === army.locationId && r.from === army.destinationId)
            );

            // ONLY process LOCAL roads here. REGIONAL roads are already on the road via UI/AI action.
            if (connectingRoad && connectingRoad.quality === 'LOCAL') {
                moves.set(army.id, {
                    armyIndex: index,
                    nextLocationId: army.destinationId,
                    nextRoadId: null,
                    nextStageIndex: 0,
                    isMoveFinished: true
                });
            }
            // REGIONAL roads: Do NOT process here. Army should already be on road if intended to move.
        }
    });

    // 2. Detect Collisions & Interceptions
    const collisionsToBlock = new Set<string>();

    nextArmies.forEach(armyA => {
        // Even if A isn't moving, it can block B. But strictly we check interactions of moving units mostly.
        // However, standard combat handles static vs moving. 
        // Here we handle:
        // A) SWAP: A moves to B's spot, B moves to A's spot.
        // B) ENGAGEMENT: A and B are ALREADY on the same spot and try to move away.

        const posCurrentA = getPositionKey(armyA.locationType, armyA.locationId, armyA.roadId, armyA.stageIndex);

        let posNextA = posCurrentA;
        const moveA = moves.get(armyA.id);
        if (moveA) {
            posNextA = getPositionKey(
                moveA.isMoveFinished ? 'LOCATION' : 'ROAD',
                moveA.nextLocationId,
                moveA.nextRoadId,
                moveA.nextStageIndex
            );
        }

        nextArmies.forEach(armyB => {
            if (armyA.id === armyB.id) return;
            if (!areHostile(armyA.faction, armyB.faction)) return;

            const posCurrentB = getPositionKey(armyB.locationType, armyB.locationId, armyB.roadId, armyB.stageIndex);

            let posNextB = posCurrentB;
            const moveB = moves.get(armyB.id);
            if (moveB) {
                posNextB = getPositionKey(
                    moveB.isMoveFinished ? 'LOCATION' : 'ROAD',
                    moveB.nextLocationId,
                    moveB.nextRoadId,
                    moveB.nextStageIndex
                );
            }

            // RULE 1: HEAD-ON COLLISION (SWAP)
            // A moves to where B is/was, AND B moves to where A is/was.
            // FIX: Instead of blocking both, let ONE advance to trigger combat.
            // The first one found (A) advances, B is blocked. They meet and fight.
            if (posNextA === posCurrentB && posNextB === posCurrentA) {
                // Block B if A's ID is "smaller" (deterministic tie-breaker), let A advance.
                // This ensures one moves and the other stays, causing them to meet on the same tile -> Combat.
                if (armyA.id < armyB.id) {
                    // Do not block A
                } else {
                    collisionsToBlock.add(armyA.id);
                }
            }

            // RULE 2: ENGAGEMENT AT CONTACT (Co-located Start)
            // A and B start on the same tile (e.g. both entered Road Stage 0).
            // They MUST fight. 
            // FIX: Only block ONE of them (tie-breaker), not both!
            // If both are blocked, Turn 4 stall happens. One must "advance" (stay) to trigger combat.
            if (posCurrentA === posCurrentB) {
                // If they are on the same tile, they are engaged.
                // Block ONE army using tie-breaker. The other "stays" (but can still fight).
                // Actually, if both are trying to move AWAY from each other, we should block both
                // to force the fight. But if they're moving to the same place... complex.
                // Simple fix: Just block the one with higher ID to keep them engaged.
                if (armyA.id < armyB.id) {
                    if (moveA) collisionsToBlock.add(armyA.id);
                } else {
                    // Block B in the other comparison iteration
                }
            }

            // RULE 3: APPROACH DETECTION (NEW FIX)
            // A moves to B's tile, but B is NOT moving (garrisoned, spent, or no move order).
            // Let A advance - they will meet on B's tile and trigger combat.
            // This fixes the bug where both armies were stuck on adjacent tiles.
            if (posNextA === posCurrentB && !moveB) {
                // A is approaching a stationary B. Do NOT block A.
                // Combat detection (combatDetection.ts) will find both on same tile and trigger battle.
                // No action needed here - just don't block A, which is the default.
            }

            // RULE 4: ZONE OF CONTROL (NEW - Fixes pass-through bug)
            // If A is trying to move, and B is STATIONARY at A's CURRENT position,
            // then A is attempting to "escape" from combat. Block A so combat triggers.
            if (posCurrentA === posCurrentB && !moveB && moveA) {
                // A is on the same tile as stationary B and trying to move away.
                // A must fight B before moving. Block A.
                collisionsToBlock.add(armyA.id);
            }
        });
    });


    // 3. Execute Valid Moves
    moves.forEach((move, armyId) => {
        if (collisionsToBlock.has(armyId)) {
            // Move Cancelled due to collision/engagement
            return;
        }

        const army = nextArmies[move.armyIndex];

        if (move.isMoveFinished && move.nextLocationId) {
            // Arrival Logic
            // Update Food Source Logic (Spec: consume from new location if Rural/City)
            const destLoc = state.locations.find(l => l.id === move.nextLocationId);
            let newFoodSource = army.foodSourceId;
            if (destLoc) {
                newFoodSource = destLoc.type === 'CITY' && destLoc.linkedLocationId ? destLoc.linkedLocationId : destLoc.id;
            }

            nextArmies[move.armyIndex] = {
                ...army,
                locationType: 'LOCATION',
                locationId: move.nextLocationId,
                roadId: null,
                stageIndex: 0,
                destinationId: null,
                turnsUntilArrival: 0,
                justMoved: true, // FIX: Army has arrived this turn
                foodSourceId: newFoodSource,
                lastSafePosition: { type: 'LOCATION', id: move.nextLocationId }
            };
        } else {
            // Road Advance Logic
            nextArmies[move.armyIndex] = {
                ...army,
                roadId: move.nextRoadId,
                stageIndex: move.nextStageIndex,
                turnsUntilArrival: Math.max(0, army.turnsUntilArrival - 1),
                justMoved: true // FIX: Army has moved on road this turn
            };
        }
    });

    // 4. Sync Characters
    nextCharacters = nextCharacters.map(char => {
        if (char.armyId) {
            const army = nextArmies.find(a => a.id === char.armyId);
            if (army) {
                if (army.locationType === 'LOCATION') {
                    return { ...char, locationId: army.locationId!, status: CharacterStatus.AVAILABLE, turnsUntilArrival: 0 };
                } else {
                    return { ...char, status: CharacterStatus.MOVING, turnsUntilArrival: army.turnsUntilArrival };
                }
            }
        }
        return char;
    });

    // 5. Handle Independent Character Movement
    nextCharacters = nextCharacters.map(char => {
        if (!char.armyId && char.status === CharacterStatus.MOVING) {
            const newTurns = char.turnsUntilArrival - 1;
            if (newTurns <= 0) {
                return {
                    ...char,
                    turnsUntilArrival: 0,
                    status: CharacterStatus.AVAILABLE,
                    locationId: char.destinationId || char.locationId,
                    destinationId: null
                };
            }
            return { ...char, turnsUntilArrival: newTurns };
        }
        return char;
    });

    return { armies: nextArmies, characters: nextCharacters, logs };
};
