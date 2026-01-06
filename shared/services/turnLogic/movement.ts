
import { GameState, Army, Character, CharacterStatus, RoadQuality, FactionId, LogEntry } from '../../types';
import { calculateEconomyAndFood } from '../../utils/economy';

// Helper to check hostility
const areHostile = (f1: FactionId, f2: FactionId): boolean => {
    if (f1 === f2) return false;
    return true;
};

// Helper to generate a unique key for any position
const getPositionKey = (locationType: 'LOCATION' | 'ROAD', locationId: string | null, roadId: string | null, stageIndex: number): string => {
    if (locationType === 'LOCATION' && locationId) {
        return `LOC:${locationId}`;
    }
    if (locationType === 'ROAD' && roadId) {
        return `ROAD:${roadId}:${stageIndex}`;
    }
    return 'UNKNOWN';
};

export const resolveMovements = (state: GameState): { armies: Army[], characters: Character[], logs: LogEntry[] } => {
    // 0. Snapshot Start of Turn Position for History/Retreat Logic
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
    const logs: LogEntry[] = [];

    // 1. Calculate Intended Moves
    const moves: Map<string, { armyIndex: number, nextLocationId: string | null, nextRoadId: string | null, nextStageIndex: number, isMoveFinished: boolean }> = new Map();

    nextArmies.forEach((army, index) => {
        if (army.justMoved) {
            return;
        }

        if (army.isSpent || army.isSieging || army.action || army.isGarrisoned) return;

        // MOVEMENT FROM ROAD
        if (army.locationType === 'ROAD' && army.roadId) {
            const road = state.roads.find(r => r.id === army.roadId);
            if (!road) return;

            let nextIndex = army.stageIndex + (army.direction === 'FORWARD' ? 1 : -1);

            if (nextIndex < 0 || nextIndex >= road.stages.length) {
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
                moves.set(army.id, {
                    armyIndex: index,
                    nextLocationId: null,
                    nextRoadId: army.roadId,
                    nextStageIndex: nextIndex,
                    isMoveFinished: false
                });
            }
        }
        else if (army.locationType === 'LOCATION' && army.destinationId && army.locationId) {
            const connectingRoad = state.roads.find(r =>
                (r.from === army.locationId && r.to === army.destinationId) ||
                (r.to === army.locationId && r.from === army.destinationId)
            );

            if (connectingRoad && connectingRoad.quality === 'LOCAL') {
                moves.set(army.id, {
                    armyIndex: index,
                    nextLocationId: army.destinationId,
                    nextRoadId: null,
                    nextStageIndex: 0,
                    isMoveFinished: true
                });
            }
        }
    });

    // 2. Detect Collisions & Interceptions
    const collisionsToBlock = new Set<string>();

    nextArmies.forEach(armyA => {
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
            if (posNextA === posCurrentB && posNextB === posCurrentA) {
                if (armyA.id < armyB.id) {
                    // Do not block A
                } else {
                    collisionsToBlock.add(armyA.id);
                }
            }

            // RULE 2: ENGAGEMENT AT CONTACT
            if (posCurrentA === posCurrentB) {
                if (armyA.id < armyB.id) {
                    if (moveA) collisionsToBlock.add(armyA.id);
                }
            }

            // RULE 4: ZONE OF CONTROL
            if (posCurrentA === posCurrentB && !moveB && moveA) {
                collisionsToBlock.add(armyA.id);
            }
        });
    });


    // 3. Execute Valid Moves
    moves.forEach((move, armyId) => {
        if (collisionsToBlock.has(armyId)) {
            return;
        }

        const army = nextArmies[move.armyIndex];

        if (move.isMoveFinished && move.nextLocationId) {
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
                justMoved: true,
                foodSourceId: newFoodSource,
                lastSafePosition: { type: 'LOCATION', id: move.nextLocationId }
            };
        } else {
            nextArmies[move.armyIndex] = {
                ...army,
                roadId: move.nextRoadId,
                stageIndex: move.nextStageIndex,
                turnsUntilArrival: Math.max(0, army.turnsUntilArrival - 1),
                justMoved: true
            };
        }
    });

    // 4. Sync Characters
    nextCharacters = nextCharacters.map(char => {
        if (char.armyId) {
            const army = nextArmies.find(a => a.id === char.armyId);
            if (army) {
                if (army.locationType === 'LOCATION') {
                    // Fix: Preserve GOVERNING status if leader is already governor
                    const newStatus = char.status === CharacterStatus.GOVERNING ? CharacterStatus.GOVERNING : CharacterStatus.AVAILABLE;
                    return { ...char, locationId: army.locationId!, status: newStatus, turnsUntilArrival: 0 };
                } else {
                    return { ...char, status: CharacterStatus.MOVING, turnsUntilArrival: army.turnsUntilArrival };
                }
            }
        }
        return char;
    });

    // 5. Handle Independent Character Movement
    // NOTE: Leaders with undercoverMission are handled by processUndercoverMissionTravel
    // NOTE: Leaders with governorMission are handled here (arrival logic differs)
    nextCharacters = nextCharacters.map(char => {
        // Skip if attached to army
        if (char.armyId) return char;

        // Skip if not MOVING
        if (char.status !== CharacterStatus.MOVING) return char;

        // Handle undercover mission travel separately (processUndercoverMissionTravel)
        if (char.undercoverMission) return char;

        // Handle governor mission travel
        if (char.governorMission) {
            const newTurns = char.governorMission.turnsRemaining - 1;
            if (newTurns <= 0) {
                // Arrived at destination
                const destLocationId = char.governorMission.destinationId;
                const destLocation = state.locations.find(l => l.id === destLocationId);

                // Determine arrival status based on territory faction
                let arrivalStatus: CharacterStatus;
                if (destLocation && destLocation.faction === char.faction) {
                    // Friendly territory - become GOVERNING
                    arrivalStatus = CharacterStatus.GOVERNING;
                } else if (destLocation && destLocation.faction !== char.faction && destLocation.faction !== FactionId.NEUTRAL) {
                    // Enemy territory (region changed hands!) - become UNDERCOVER
                    arrivalStatus = CharacterStatus.UNDERCOVER;
                } else {
                    // Neutral or unknown - become AVAILABLE
                    arrivalStatus = CharacterStatus.AVAILABLE;
                }

                return {
                    ...char,
                    turnsUntilArrival: 0,
                    status: arrivalStatus,
                    locationId: destLocationId,
                    destinationId: null,
                    governorMission: undefined
                };
            }
            // Still traveling
            return {
                ...char,
                turnsUntilArrival: newTurns,
                governorMission: {
                    ...char.governorMission,
                    turnsRemaining: newTurns
                }
            };
        }

        // Standard independent movement (no special mission)
        const newTurns = char.turnsUntilArrival - 1;
        if (newTurns <= 0) {
            const destLocationId = char.destinationId || char.locationId;
            const destLocation = state.locations.find(l => l.id === destLocationId);

            // Determine arrival status based on territory faction
            let arrivalStatus = CharacterStatus.AVAILABLE;
            if (destLocation && destLocation.faction !== char.faction && destLocation.faction !== FactionId.NEUTRAL) {
                // Arriving in enemy territory - check if another undercover leader is already there
                const otherUndercoverThere = state.characters.some(c =>
                    c.id !== char.id &&
                    c.faction === char.faction &&
                    c.status === CharacterStatus.UNDERCOVER &&
                    c.locationId === destLocationId
                );
                if (otherUndercoverThere) {
                    arrivalStatus = CharacterStatus.AVAILABLE;
                    console.log(`[Movement] ${char.name} arrived in enemy territory at ${destLocation.name}, but another undercover leader is already there. Status set to AVAILABLE.`);
                } else {
                    arrivalStatus = CharacterStatus.UNDERCOVER;
                    console.log(`[Movement] ${char.name} arrived in enemy territory at ${destLocation.name}. Status set to UNDERCOVER.`);
                }
            } else {
                console.log(`[Movement] ${char.name} arrived at ${destLocation?.name}. Status set to ${arrivalStatus}.`);
            }

            return {
                ...char,
                turnsUntilArrival: 0,
                status: arrivalStatus,
                locationId: destLocationId,
                destinationId: null
            };
        }
        return { ...char, turnsUntilArrival: newTurns };
    });

    return { armies: nextArmies, characters: nextCharacters, logs };
};
