"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAutoCapture = exports.processConstruction = exports.processInsurrections = void 0;
const types_1 = require("../../types");
const constants_1 = require("../../constants");
const logFactory_1 = require("../logs/logFactory");
const makeExamples_1 = require("../domain/governor/makeExamples");
const governorService_1 = require("../domain/governor/governorService");
const leaderStatusUpdates_1 = require("./leaderStatusUpdates");
const SmugglerMissionService_1 = require("../ai/leaders/missions/SmugglerMissionService");
let logIdCounter = 0;
const generateLogId = () => {
    logIdCounter++;
    return `log_actions_${Date.now()}_${logIdCounter}`;
};
const processInsurrections = (locations, characters, armies, playerFaction, currentTurn = 1) => {
    let nextLocations = [...locations];
    let nextCharacters = [...characters];
    let nextArmies = [...armies];
    const logs = [];
    let notification = null;
    const refunds = {};
    nextCharacters = nextCharacters.map(char => {
        if (char.status === types_1.CharacterStatus.ON_MISSION && char.turnsUntilArrival > 0) {
            const newTurns = char.turnsUntilArrival - 1;
            if (newTurns <= 0 && char.missionData) {
                const targetId = char.missionData.targetLocationId;
                const goldInvested = char.missionData.goldSpent;
                const locIndex = nextLocations.findIndex(l => l.id === targetId);
                if (locIndex !== -1) {
                    const loc = nextLocations[locIndex];
                    // FAILSAFE (Spec 5.3.3): If territory is already controlled by the faction, cancel mission
                    if (loc.faction === char.faction) {
                        const cancelLog = (0, logFactory_1.createInsurrectionCancelledLog)(loc.id, loc.faction, currentTurn);
                        logs.push(cancelLog);
                        // Refund Gold
                        refunds[char.faction] = (refunds[char.faction] || 0) + goldInvested;
                        // Leader appears immediately
                        return {
                            ...char,
                            status: types_1.CharacterStatus.AVAILABLE,
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
                    const uprisingLog = (0, logFactory_1.createUprisingLog)(char.id, loc.id, loc.faction, numInsurgents, currentTurn);
                    logs.push(uprisingLog);
                    return {
                        ...char,
                        status: types_1.CharacterStatus.AVAILABLE,
                        locationId: targetId,
                        armyId: insurgentArmyId,
                        turnsUntilArrival: 0,
                        missionData: undefined
                    };
                }
                else {
                    // Target lost (rare edge case if location ID changes or disappears)
                    return { ...char, status: types_1.CharacterStatus.AVAILABLE, locationId: char.faction === types_1.FactionId.REPUBLICANS ? 'sunbreach' : 'windward', turnsUntilArrival: 0 };
                }
            }
            return { ...char, turnsUntilArrival: newTurns };
        }
        return char;
    });
    // --- NEW: NEUTRAL INSURRECTIONS (restored per specs) ---
    nextLocations = nextLocations.map(loc => {
        if (loc.stability < 50 && loc.faction !== types_1.FactionId.NEUTRAL && loc.population > 1000) {
            const existingInsurgents = nextArmies.some(a => a.locationId === loc.id &&
                a.isInsurgent &&
                a.faction === types_1.FactionId.NEUTRAL);
            // Check if neutral insurrections are blocked (e.g. by Make Examples policy)
            const isBlocked = (0, makeExamples_1.isNeutralInsurrectionBlocked)(loc, currentTurn);
            if (!existingInsurgents && !isBlocked) {
                let chance = 0;
                if (loc.stability >= 40)
                    chance = 25;
                else if (loc.stability >= 30)
                    chance = 33;
                else if (loc.stability >= 20)
                    chance = 50;
                else if (loc.stability >= 10)
                    chance = 75;
                else
                    chance = 100;
                if (Math.random() * 100 < chance) {
                    const divisor = loc.type === types_1.LocationType.CITY ? 1000 : 10000;
                    const numInsurgents = Math.floor((50 - loc.stability) * (loc.population / divisor));
                    if (numInsurgents > 0) {
                        const insurgentArmyId = `neutral_rising_${loc.id}_${Math.random()}`;
                        console.log(`[INSURRECTION] Creating Neutral insurgent army at ${loc.name} (${loc.id})`);
                        nextArmies.push({
                            id: insurgentArmyId,
                            faction: types_1.FactionId.NEUTRAL,
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
                        const spontaneousLog = (0, logFactory_1.createSpontaneousUprisingLog)(loc.id, loc.faction, currentTurn);
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
exports.processInsurrections = processInsurrections;
// Construction logs are removed per user request
const processConstruction = (state) => {
    let nextLocations = [...state.locations];
    let nextRoads = state.roads.map(r => ({ ...r, stages: [...r.stages] }));
    let nextArmies = [...state.armies];
    const logs = []; // Empty - construction logs removed
    // Clear orphaned FORTIFY actions
    nextArmies = nextArmies.map(a => {
        if (a.action === 'FORTIFY') {
            const hasLocationConstruction = nextLocations.some(l => l.activeConstruction?.armyId === a.id);
            const hasRoadConstruction = nextRoads.some(r => r.stages.some((s) => s.activeConstruction?.armyId === a.id));
            if (!hasLocationConstruction && !hasRoadConstruction) {
                return { ...a, action: undefined };
            }
        }
        return a;
    });
    // Locations
    nextLocations = nextLocations.map(l => {
        let referenceFaction = l.faction;
        // If construction is active, enemies are those hostile to the builder
        if (l.activeConstruction) {
            const builder = nextArmies.find(a => a.id === l.activeConstruction.armyId);
            if (builder)
                referenceFaction = builder.faction;
        }
        const enemyPresent = nextArmies.some(a => a.locationType === 'LOCATION' &&
            a.locationId === l.id &&
            a.faction !== referenceFaction &&
            a.strength > 0);
        if (enemyPresent && l.activeConstruction) {
            // Log removed per user request
            const builder = nextArmies.find(a => a.id === l.activeConstruction.armyId);
            if (builder) {
                const idx = nextArmies.findIndex(a => a.id === builder.id);
                if (idx !== -1)
                    nextArmies[idx] = { ...builder, action: undefined };
            }
            return { ...l, activeConstruction: undefined };
        }
        if (l.activeConstruction) {
            const remaining = l.activeConstruction.turnsRemaining - 1;
            if (remaining <= 0) {
                const finishedArmy = nextArmies.find(a => a.id === l.activeConstruction.armyId);
                if (finishedArmy) {
                    const idx = nextArmies.findIndex(a => a.id === finishedArmy.id);
                    if (idx !== -1)
                        nextArmies[idx] = { ...finishedArmy, action: undefined };
                }
                // Log removed per user request
                return {
                    ...l,
                    fortificationLevel: l.activeConstruction.targetLevel,
                    defense: constants_1.FORTIFICATION_LEVELS[l.activeConstruction.targetLevel].bonus,
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
            // We verify against the builder's faction to avoid flagging own troops as enemies on neutral/null stages
            let builderFaction = s.faction;
            if (s.activeConstruction) {
                const builder = nextArmies.find(a => a.id === s.activeConstruction.armyId);
                if (builder)
                    builderFaction = builder.faction;
            }
            const hostileArmiesPresent = nextArmies.some(a => a.locationType === 'ROAD' &&
                a.roadId === r.id &&
                a.stageIndex === s.index &&
                (builderFaction ? a.faction !== builderFaction : true) &&
                a.strength > 0);
            // Cancel construction if enemy is present
            if (hostileArmiesPresent && s.activeConstruction) {
                const builder = nextArmies.find(a => a.id === s.activeConstruction.armyId);
                if (builder) {
                    const idx = nextArmies.findIndex(a => a.id === builder.id);
                    if (idx !== -1)
                        nextArmies[idx] = { ...builder, action: undefined };
                }
                return { ...s, activeConstruction: undefined };
            }
            if (s.activeConstruction) {
                const remaining = s.activeConstruction.turnsRemaining - 1;
                if (remaining <= 0) {
                    const finishedArmy = nextArmies.find(a => a.id === s.activeConstruction.armyId);
                    if (finishedArmy) {
                        const idx = nextArmies.findIndex(a => a.id === finishedArmy.id);
                        if (idx !== -1)
                            nextArmies[idx] = { ...finishedArmy, action: undefined };
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
exports.processConstruction = processConstruction;
const processAutoCapture = (locations, roads, armies, characters, playerFaction, currentTurn = 1) => {
    let nextLocations = [...locations];
    let nextRoads = [...roads];
    let nextCharacters = [...characters];
    const logs = [];
    let tradeNotification = null;
    // Locations
    nextLocations = nextLocations.map(loc => {
        const invaders = armies.filter(a => a.locationType === 'LOCATION' && a.locationId === loc.id && a.faction !== loc.faction && a.strength > 0);
        const defenders = armies.filter(a => a.locationType === 'LOCATION' && a.locationId === loc.id && a.faction === loc.faction && a.strength > 0);
        if (invaders.length > 0 && defenders.length === 0) {
            const winner = invaders[0].faction;
            const previousFaction = loc.faction;
            // Create capture log with dynamic severity
            const captureLog = (0, logFactory_1.createCaptureUncontestedLog)(loc.id, previousFaction, winner, currentTurn);
            logs.push(captureLog);
            const newFortLevel = Math.max(0, loc.fortificationLevel - 1);
            const isInsurgentCapture = invaders.some(a => a.isInsurgent);
            let newStability = loc.stability;
            if (isInsurgentCapture && winner !== types_1.FactionId.NEUTRAL) {
                if (newStability < 49) {
                    // DEPRECATED: Stability boost disabled (was +10). Kept for potential rebalancing.
                    newStability = Math.min(49, newStability + 0);
                }
            }
            const updatedLoc = {
                ...loc,
                faction: winner,
                defense: constants_1.FORTIFICATION_LEVELS[newFortLevel].bonus,
                fortificationLevel: newFortLevel,
                stability: newStability,
                activeConstruction: undefined
            };
            // VALIDATE GOVERNOR STATUS FOR PREVIOUS OWNER
            // We search for a governor of the previousFaction in this location
            const governor = nextCharacters.find(c => c.locationId === loc.id && c.status === types_1.CharacterStatus.GOVERNING && c.faction === previousFaction);
            if (governor) {
                // Pass nextLocations as context so they can find friendly territory
                // Use updatedLoc because validateGovernorStatus needs to see the NEW faction to trigger flee/die
                const validationResult = (0, governorService_1.validateGovernorStatus)(governor, updatedLoc, nextLocations, nextRoads, currentTurn);
                if (!validationResult.isValid) {
                    nextCharacters = nextCharacters.map(c => c.id === validationResult.character.id ? validationResult.character : c);
                    if (validationResult.log)
                        logs.push(validationResult.log);
                }
            }
            // NEW: Update status of other leaders (Available <-> Undercover)
            nextCharacters = (0, leaderStatusUpdates_1.handleLeaderStatusOnCapture)(updatedLoc.id, updatedLoc.faction, nextCharacters);
            // SMUGGLER DISPATCH: If a RURAL is captured, check if the linked CITY still belongs to previousFaction
            // If so, that city now needs SMUGGLER support for food
            if (loc.type === types_1.LocationType.RURAL && previousFaction !== types_1.FactionId.NEUTRAL) {
                // Find the linked city (the rural's linkedLocationId points to the city)
                const linkedCity = nextLocations.find(l => l.id === loc.linkedLocationId);
                if (linkedCity && linkedCity.faction === previousFaction) {
                    // The city lost its rural food supply - trigger SMUGGLER dispatch evaluation
                    // Note: This is called during turn processing, so we create a minimal state for evaluation
                    const smugglerContext = {
                        state: {
                            characters: nextCharacters,
                            locations: nextLocations,
                            roads: roads,
                            armies: armies
                        },
                        faction: previousFaction,
                        lostRuralLocationId: loc.id,
                        cityId: linkedCity.id
                    };
                    const smugglerDecision = (0, SmugglerMissionService_1.evaluateSmugglerDispatch)(smugglerContext);
                    if (smugglerDecision) {
                        // Apply the smuggler mission to the selected leader
                        nextCharacters = nextCharacters.map(c => {
                            if (c.id === smugglerDecision.leaderId) {
                                const updated = (0, SmugglerMissionService_1.assignSmugglerMission)(c, smugglerDecision.targetCityId);
                                console.log(`[SMUGGLER DISPATCH] ${c.name} assigned to support ${linkedCity.name}`);
                                return updated;
                            }
                            return c;
                        });
                    }
                }
            }
            return updatedLoc;
        }
        return loc;
    });
    // Check Grain Trade Logic after captures
    const windward = nextLocations.find(l => l.id === 'windward');
    const greatPlains = nextLocations.find(l => l.id === 'great_plains');
    if (windward && greatPlains) {
        if (windward.faction === greatPlains.faction) {
            // Do nothing - same faction control
        }
        else {
            if (!windward.isGrainTradeActive) {
                nextLocations = nextLocations.map(l => {
                    if (l.id === 'windward')
                        return { ...l, isGrainTradeActive: true, stability: Math.min(100, l.stability + 20) };
                    if (l.id === 'great_plains')
                        return { ...l, stability: Math.min(100, l.stability + 20) };
                    return l;
                });
                const tradeLog = (0, logFactory_1.createGrainTradeRestoredLog)(currentTurn);
                logs.push(tradeLog);
                tradeNotification = { type: 'RESTORED', factionName: "Changes in control" };
            }
        }
    }
    // Roads
    nextRoads = nextRoads.map(r => ({
        ...r,
        stages: r.stages.map((s) => {
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
    return { locations: nextLocations, roads: nextRoads, characters: nextCharacters, logs, tradeNotification };
};
exports.processAutoCapture = processAutoCapture;
