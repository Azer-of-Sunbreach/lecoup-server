
import { GameState, Character, Location, Army, CharacterStatus, FactionId, FACTION_NAMES, LocationType, LogEntry, LogType, LogSeverity } from '../../types';
import { FORTIFICATION_LEVELS } from '../../constants';
import {
    createInsurrectionCancelledLog,
    createUprisingLog,
    createSpontaneousUprisingLog,
    createCaptureUncontestedLog,
    createGrainTradeRestoredLog
} from '../logs/logFactory';

let logIdCounter = 0;
const generateLogId = (): string => {
    logIdCounter++;
    return `log_actions_${Date.now()}_${logIdCounter}`;
};

export const processInsurrections = (
    locations: Location[],
    characters: Character[],
    armies: Army[],
    playerFaction: FactionId,
    currentTurn: number = 1
): {
    locations: Location[],
    characters: Character[],
    armies: Army[],
    logs: LogEntry[],
    notification: any | null,
    refunds: { [key in FactionId]?: number }
} => {
    let nextLocations = [...locations];
    let nextCharacters = [...characters];
    let nextArmies = [...armies];
    const logs: LogEntry[] = [];
    let notification = null;
    const refunds: { [key in FactionId]?: number } = {};

    nextCharacters = nextCharacters.map(char => {
        if (char.status === CharacterStatus.ON_MISSION && char.turnsUntilArrival > 0) {
            const newTurns = char.turnsUntilArrival - 1;

            if (newTurns <= 0 && char.missionData) {
                const targetId = char.missionData.targetLocationId;
                const goldInvested = char.missionData.goldSpent;
                const locIndex = nextLocations.findIndex(l => l.id === targetId);

                if (locIndex !== -1) {
                    const loc = nextLocations[locIndex];

                    // FAILSAFE (Spec 5.3.3): If territory is already controlled by the faction, cancel mission
                    if (loc.faction === char.faction) {
                        const cancelLog = createInsurrectionCancelledLog(loc.name, loc.faction, currentTurn);
                        logs.push(cancelLog);

                        // Refund Gold
                        refunds[char.faction] = (refunds[char.faction] || 0) + goldInvested;

                        // Leader appears immediately
                        return {
                            ...char,
                            status: CharacterStatus.AVAILABLE,
                            locationId: targetId,
                            turnsUntilArrival: 0,
                            missionData: undefined
                        };
                    }

                    // 1. Stability Hit
                    const stabHit = Math.abs(char.stats.insurrectionValue);
                    const newStability = Math.max(0, loc.stability - stabHit);
                    nextLocations[locIndex] = { ...loc, stability: newStability };

                    // 2. Generate Insurgents
                    const popFactor = loc.population / 100000;
                    const stabFactor = 100 - newStability;
                    let numInsurgents = Math.floor(((goldInvested / 25) * popFactor) * stabFactor) + 100;

                    if (char.stats.ability.includes('FIREBRAND')) {
                        numInsurgents = Math.floor(numInsurgents * 1.33);
                    }

                    // 3. Deduct Population
                    nextLocations[locIndex].population = Math.max(0, loc.population - numInsurgents);

                    // 4. Create Insurgent Army
                    const insurgentArmyId = `insurgent_${char.id}_${Math.random()}`;
                    nextArmies.push({
                        id: insurgentArmyId,
                        faction: char.faction,
                        locationType: 'LOCATION',
                        locationId: targetId,
                        roadId: null,
                        stageIndex: 0,
                        direction: 'FORWARD',
                        originLocationId: targetId,
                        destinationId: null,
                        turnsUntilArrival: 0,
                        strength: numInsurgents,
                        isInsurgent: true,
                        isSpent: true,
                        isSieging: false,
                        foodSourceId: targetId,
                        lastSafePosition: { type: 'LOCATION', id: targetId }
                    });

                    // 5. Attach Leader & Log - Using structured LogEntry
                    const uprisingLog = createUprisingLog(
                        char.name,
                        loc.name,
                        loc.id,
                        loc.faction,
                        numInsurgents,
                        currentTurn
                    );
                    logs.push(uprisingLog);

                    return {
                        ...char,
                        status: CharacterStatus.AVAILABLE,
                        locationId: targetId,
                        armyId: insurgentArmyId,
                        turnsUntilArrival: 0,
                        missionData: undefined
                    };
                } else {
                    // Target lost (rare edge case if location ID changes or disappears)
                    return { ...char, status: CharacterStatus.AVAILABLE, locationId: char.faction === FactionId.REPUBLICANS ? 'sunbreach' : 'windward', turnsUntilArrival: 0 };
                }
            }
            return { ...char, turnsUntilArrival: newTurns };
        }
        return char;
    });

    // --- NEW: NEUTRAL INSURRECTIONS (restored per specs) ---
    nextLocations = nextLocations.map(loc => {
        if (loc.stability < 50 && loc.faction !== FactionId.NEUTRAL && loc.population > 1000) {
            const existingInsurgents = nextArmies.some(a =>
                a.locationId === loc.id &&
                a.isInsurgent &&
                a.faction === FactionId.NEUTRAL
            );

            if (!existingInsurgents) {
                let chance = 0;
                if (loc.stability >= 40) chance = 25;
                else if (loc.stability >= 30) chance = 33;
                else if (loc.stability >= 20) chance = 50;
                else if (loc.stability >= 10) chance = 75;
                else chance = 100;

                if (Math.random() * 100 < chance) {
                    const divisor = loc.type === LocationType.CITY ? 1000 : 10000;
                    const numInsurgents = Math.floor((50 - loc.stability) * (loc.population / divisor));

                    if (numInsurgents > 0) {
                        const insurgentArmyId = `neutral_rising_${loc.id}_${Math.random()}`;

                        console.log(`[INSURRECTION] Creating Neutral insurgent army at ${loc.name} (${loc.id})`);

                        nextArmies.push({
                            id: insurgentArmyId,
                            faction: FactionId.NEUTRAL,
                            locationType: 'LOCATION',
                            locationId: loc.id,
                            roadId: null,
                            stageIndex: 0,
                            direction: 'FORWARD',
                            originLocationId: loc.id,
                            destinationId: null,
                            turnsUntilArrival: 0,
                            strength: numInsurgents,
                            isInsurgent: true,
                            isSpent: true,
                            isSieging: false,
                            foodSourceId: loc.id,
                            lastSafePosition: { type: 'LOCATION', id: loc.id }
                        });

                        // Spontaneous uprising log - without risk percentage per user request
                        const spontaneousLog = createSpontaneousUprisingLog(
                            loc.name,
                            loc.id,
                            loc.faction,
                            currentTurn
                        );
                        logs.push(spontaneousLog);

                        return { ...loc, population: Math.max(0, loc.population - numInsurgents) };
                    }
                }
            }
        }
        return loc;
    });

    return { locations: nextLocations, characters: nextCharacters, armies: nextArmies, logs, notification, refunds };
};

// Construction logs are removed per user request
export const processConstruction = (state: GameState): { locations: Location[], roads: any[], armies: Army[], logs: LogEntry[] } => {
    let nextLocations = [...state.locations];
    let nextRoads = state.roads.map(r => ({ ...r, stages: [...r.stages] }));
    let nextArmies = [...state.armies];
    const logs: LogEntry[] = []; // Empty - construction logs removed

    // Clear orphaned FORTIFY actions
    nextArmies = nextArmies.map(a => {
        if (a.action === 'FORTIFY') {
            const hasLocationConstruction = nextLocations.some(l => l.activeConstruction?.armyId === a.id);
            const hasRoadConstruction = nextRoads.some(r => r.stages.some((s: any) => s.activeConstruction?.armyId === a.id));
            if (!hasLocationConstruction && !hasRoadConstruction) {
                return { ...a, action: undefined };
            }
        }
        return a;
    });

    // Locations
    nextLocations = nextLocations.map(l => {
        const enemyPresent = nextArmies.some(a =>
            a.locationType === 'LOCATION' &&
            a.locationId === l.id &&
            a.faction !== l.faction &&
            a.strength > 0
        );

        if (enemyPresent && l.activeConstruction) {
            // Log removed per user request
            const builder = nextArmies.find(a => a.id === l.activeConstruction!.armyId);
            if (builder) {
                const idx = nextArmies.findIndex(a => a.id === builder.id);
                if (idx !== -1) nextArmies[idx] = { ...builder, action: undefined };
            }
            return { ...l, activeConstruction: undefined };
        }

        if (l.activeConstruction) {
            const remaining = l.activeConstruction.turnsRemaining - 1;
            if (remaining <= 0) {
                const finishedArmy = nextArmies.find(a => a.id === l.activeConstruction!.armyId);
                if (finishedArmy) {
                    const idx = nextArmies.findIndex(a => a.id === finishedArmy.id);
                    if (idx !== -1) nextArmies[idx] = { ...finishedArmy, action: undefined };
                }
                // Log removed per user request
                return {
                    ...l,
                    fortificationLevel: l.activeConstruction.targetLevel,
                    defense: FORTIFICATION_LEVELS[l.activeConstruction.targetLevel].bonus,
                    activeConstruction: undefined
                };
            }
            return { ...l, activeConstruction: { ...l.activeConstruction, turnsRemaining: remaining } };
        }
        return l;
    });

    // Roads
    nextRoads = nextRoads.map(r => ({
        ...r,
        stages: r.stages.map(s => {
            // Check for enemy presence on this road stage
            const enemyPresent = nextArmies.some(a =>
                a.locationType === 'ROAD' &&
                a.roadId === r.id &&
                a.stageIndex === s.index &&
                a.faction !== s.faction &&
                a.strength > 0
            );

            // Cancel construction if enemy is present
            if (enemyPresent && s.activeConstruction) {
                const builder = nextArmies.find(a => a.id === s.activeConstruction!.armyId);
                if (builder) {
                    const idx = nextArmies.findIndex(a => a.id === builder.id);
                    if (idx !== -1) nextArmies[idx] = { ...builder, action: undefined };
                }
                return { ...s, activeConstruction: undefined };
            }

            if (s.activeConstruction) {
                const remaining = s.activeConstruction.turnsRemaining - 1;
                if (remaining <= 0) {
                    const finishedArmy = nextArmies.find(a => a.id === s.activeConstruction!.armyId);
                    if (finishedArmy) {
                        const idx = nextArmies.findIndex(a => a.id === finishedArmy.id);
                        if (idx !== -1) nextArmies[idx] = { ...finishedArmy, action: undefined };
                    }
                    // Log removed per user request
                    return {
                        ...s,
                        fortificationLevel: s.activeConstruction.targetLevel,
                        activeConstruction: undefined
                    };
                }
                return { ...s, activeConstruction: { ...s.activeConstruction, turnsRemaining: remaining } };
            }
            return s;
        })
    }));

    return { locations: nextLocations, roads: nextRoads, armies: nextArmies, logs };
};

export const processAutoCapture = (
    locations: Location[],
    roads: any[],
    armies: Army[],
    playerFaction: FactionId,
    currentTurn: number = 1
): { locations: Location[], roads: any[], logs: LogEntry[], tradeNotification: any } => {
    let nextLocations = [...locations];
    let nextRoads = [...roads];
    const logs: LogEntry[] = [];
    let tradeNotification = null;

    // Locations
    nextLocations = nextLocations.map(loc => {
        const invaders = armies.filter(a => a.locationType === 'LOCATION' && a.locationId === loc.id && a.faction !== loc.faction && a.strength > 0);
        const defenders = armies.filter(a => a.locationType === 'LOCATION' && a.locationId === loc.id && a.faction === loc.faction && a.strength > 0);

        if (invaders.length > 0 && defenders.length === 0) {
            const winner = invaders[0].faction;
            const previousFaction = loc.faction;

            // Create capture log with dynamic severity
            const captureLog = createCaptureUncontestedLog(
                loc.name,
                loc.id,
                previousFaction,
                winner,
                currentTurn
            );
            logs.push(captureLog);

            const newFortLevel = Math.max(0, loc.fortificationLevel - 1);

            const isInsurgentCapture = invaders.some(a => a.isInsurgent);
            let newStability = loc.stability;
            if (isInsurgentCapture && winner !== FactionId.NEUTRAL) {
                if (newStability < 49) {
                    newStability = Math.min(49, newStability + 10);
                }
            }

            return {
                ...loc,
                faction: winner,
                defense: FORTIFICATION_LEVELS[newFortLevel].bonus,
                fortificationLevel: newFortLevel,
                stability: newStability,
                activeConstruction: undefined
            };
        }
        return loc;
    });

    // Check Grain Trade Logic after captures
    const windward = nextLocations.find(l => l.id === 'windward');
    const greatPlains = nextLocations.find(l => l.id === 'great_plains');

    if (windward && greatPlains) {
        if (windward.faction === greatPlains.faction) {
            // Do nothing - same faction control
        } else {
            if (!windward.isGrainTradeActive) {
                nextLocations = nextLocations.map(l => {
                    if (l.id === 'windward') return { ...l, isGrainTradeActive: true, stability: Math.min(100, l.stability + 20) };
                    if (l.id === 'great_plains') return { ...l, stability: Math.min(100, l.stability + 20) };
                    return l;
                });

                const tradeLog = createGrainTradeRestoredLog(currentTurn);
                logs.push(tradeLog);
                tradeNotification = { type: 'RESTORED', factionName: "Changes in control" };
            }
        }
    }

    // Roads
    nextRoads = nextRoads.map(r => ({
        ...r,
        stages: r.stages.map((s: any) => {
            if (s.faction) {
                const invaders = armies.filter(a => a.locationType === 'ROAD' && a.roadId === r.id && a.stageIndex === s.index && a.faction !== s.faction && a.strength > 0);
                const defenders = armies.filter(a => a.locationType === 'ROAD' && a.roadId === r.id && a.stageIndex === s.index && a.faction === s.faction && a.strength > 0);
                if (invaders.length > 0 && defenders.length === 0) {
                    const winner = invaders[0].faction;
                    return { ...s, faction: winner, fortificationLevel: Math.max(0, s.fortificationLevel - 1) };
                }
            }
            return s;
        })
    }));

    return { locations: nextLocations, roads: nextRoads, logs, tradeNotification };
};
