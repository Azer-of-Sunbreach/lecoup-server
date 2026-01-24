"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBattles = void 0;
const constants_1 = require("../constants");
const detectBattles = (locations, armies, roads) => {
    const battles = [];
    // 1. Check Locations (Cities & Rural)
    locations.forEach(loc => {
        // Must check armies type carefully
        const armiesHere = armies.filter(a => a.locationType === 'LOCATION' && a.locationId === loc.id && a.strength > 0);
        const factions = Array.from(new Set(armiesHere.map(a => a.faction)));
        // Conflict if > 1 faction OR 1 faction present that isn't the owner
        // Note: We check if ANY army is present. If factions.length === 0, no battle.
        if (factions.length > 1 || (factions.length === 1 && factions[0] !== loc.faction)) {
            let defenderFaction = loc.faction;
            // Scenario 1: Owner Present + Invader(s)
            if (factions.includes(loc.faction)) {
                defenderFaction = loc.faction;
            }
            // Scenario 2: Multiple Invaders, Owner Not Present (Battle Royale)
            else if (factions.length > 1) {
                defenderFaction = factions[0]; // Arbitrary first defender among invaders
            }
            // Scenario 3: Single Invader, Owner Not Present
            else {
                defenderFaction = loc.faction;
            }
            // Fix Anomaly (Round 2): Support multiple attacker factions (Battle Royale / 3-way fight)
            // Instead of picking just one attacker, we create a battle state for EACH invader faction against the defender.
            // This ensures that if the Player is one of the invaders, their battle is detected and returned.
            // The game engine handles queuing these battles.
            const invaderFactions = factions.filter(f => f !== defenderFaction);
            // If no invaders (e.g. only defender present), no battle (logic handled by factions check above, but safe to filter)
            // If defender is NOT present (Scenario 3), then the invader is the attacker against the 'Owner' (who has no troops). 
            // In Scenario 3, defenderFaction is loc.faction. Invader is factions[0]. invaderFactions has 1 element.
            // If Scenario 3 and loc.faction is in factions? No, covered by Scenario 1.
            // Scenario 3 Correction: If loc.faction is Neutral and Insurgents are Neutral, they are "Invaders" against the "Owner" (if owner is not Neutral)?
            // No, Insurgents have their own property `isInsurgent`.
            // If `isInsurgent` is true, they effectively act as an aggressive faction against the location controller.
            const insurgentArmies = armiesHere.filter(a => a.isInsurgent);
            if (insurgentArmies.length > 0) {
                // Even if faction is same (e.g. Civil War or Neutral Instability), they fight.
                const insurgentFactions = Array.from(new Set(insurgentArmies.map(a => a.faction)));
                insurgentFactions.forEach(insFa => {
                    // Prevent duplicate if already in invaderFactions
                    if (!invaderFactions.includes(insFa) && insFa !== defenderFaction) {
                        invaderFactions.push(insFa);
                    }
                    // Special case: Rebel vs Same Faction (Civil War) - rare in this design but possible
                    // The logic below filters `attackerFaction !== defenderFaction`.
                    // If we need Same-Faction combat (Rebels), we might need to adjust logic.
                    // But for Neutral vs Human, they are different, so valid.
                });
            }
            invaderFactions.forEach(attackerFaction => {
                // STRICT FILTERING: Only include armies belonging to the designated attacker or defender.
                // Third parties wait for the next resolution cycle.
                // Fix Anomaly (Siege Loop): Ignore GARRISONED invaders, UNLESS they are Insurgents (who must fight).
                const attackers = armiesHere.filter(a => a.faction === attackerFaction && (!a.isGarrisoned || a.isInsurgent));
                const defenders = armiesHere.filter(a => a.faction === defenderFaction);
                // Spec 7.5.1: If entering enemy zone without troops, no combat.
                // Control changes immediately (handled by turnProcessor post-processing).
                // Fortifications are ignored if no soldiers are there to hold them.
                if (attackers.length > 0 && defenders.length > 0) {
                    battles.push({
                        locationId: loc.id,
                        attackerFaction: attackerFaction,
                        defenderFaction: defenderFaction,
                        attackers: attackers,
                        defenders: defenders,
                        defenseBonus: loc.defense,
                        isInsurgentBattle: armiesHere.some(a => a.isInsurgent && (a.faction === attackerFaction || a.faction === defenderFaction))
                    });
                }
            });
        }
    });
    // 2. Check Roads
    roads.forEach(road => {
        road.stages.forEach(stage => {
            const armiesHere = armies.filter(a => a.locationType === 'ROAD' && a.roadId === road.id && a.stageIndex === stage.index && a.strength > 0);
            const factions = Array.from(new Set(armiesHere.map(a => a.faction)));
            if (factions.length > 1) {
                // Fix Anomaly (COMBAT SUR LES ROUTES 2): Correct Role Assignment
                // Priority 1: The faction that is STATIONARY (Garrisoned). They are holding the ground.
                // Priority 2: The faction that owns the stage (if present).
                // Priority 3: Arbitrary (Meeting engagement).
                const garrisonedFaction = factions.find(f => armiesHere.some(a => a.faction === f && a.isGarrisoned));
                // Fix Anomaly 4: Prioritize Stationary Armies (arrived in previous turns)
                // If one army is "justMoved" and the other is not, the one that is NOT justMoved is the defender.
                const stationaryFaction = factions.find(f => armiesHere.some(a => a.faction === f && !a.justMoved));
                const ownerIsPresent = stage.faction && factions.includes(stage.faction);
                // Determine defender
                let defenderFac;
                if (garrisonedFaction) {
                    defenderFac = garrisonedFaction;
                }
                else if (stationaryFaction) {
                    defenderFac = stationaryFaction;
                }
                else if (ownerIsPresent) {
                    defenderFac = stage.faction;
                }
                else {
                    // Both moving (Meeting Engagement) - Arbitrary, usually first faction in list
                    defenderFac = factions[0];
                }
                const finalDefenderFac = defenderFac;
                // Support multiple attacker factions
                // CRITICAL FIX: Ensure we don't accidentally select the defender as an invader
                // The filter `f !== finalDefenderFac` handles this, but if we have [A, B] and A is defender, B is invader.
                // If we have [A, B] and neither is stationary/garrison/owner, A becomes defender, B becomes invader.
                // This correctly creates a battle for B attacking A.
                // Note: For PvP meeting engagement, WHO attacks WHOM matters for UI triggering.
                // If B attacks A, B gets "Battle Imminent" (Attacker) and A gets "Battle Imminent" (Defender).
                // This is correct.
                const invaderFactions = factions.filter(f => f !== finalDefenderFac);
                invaderFactions.forEach(attackerFac => {
                    // Fix Anomaly (COMBAT SUR LES ROUTES 1): Defense Bonus Application
                    // User Rule: Defender ALWAYS benefits from fortifications and natural defense.
                    // Ownership of the stage is not required to use the walls if you are holding the ground.
                    const fortBonus = constants_1.FORTIFICATION_LEVELS[stage.fortificationLevel || 0].bonus;
                    const natBonus = stage.naturalDefense || 0;
                    const appliedDefense = fortBonus + natBonus;
                    battles.push({
                        roadId: road.id, stageIndex: stage.index,
                        attackerFaction: attackerFac,
                        defenderFaction: finalDefenderFac,
                        // Fix for Roads: Include armies even if they are "Garrisoned" if it's a road?
                        // Usually road armies aren't garrisoned unless strictly "Camped".
                        // Use !isGarrisoned generally, but ensure "Just Moved" ones are active.
                        attackers: armiesHere.filter(a => a.faction === attackerFac && (!a.isGarrisoned || a.justMoved)),
                        defenders: armiesHere.filter(a => a.faction === finalDefenderFac),
                        defenseBonus: appliedDefense,
                        isInsurgentBattle: false
                    });
                });
            }
        });
    });
    return battles;
};
exports.detectBattles = detectBattles;
