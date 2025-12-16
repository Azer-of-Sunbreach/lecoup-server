// Recruitment Module - AI troop recruitment logic

import { GameState, FactionId, Location, Army } from '../../../../shared/types';
import { AIBudget, FactionPersonality } from '../types';
import { RECRUIT_COST, RECRUIT_AMOUNT } from '../../../../shared/constants';

/**
 * Handle troop recruitment for AI faction.
 * 
 * Priority: Locations with existing armies > High threat zones > High income
 * Merges new recruits into existing armies when possible.
 * 
 * @param faction - Faction recruiting
 * @param locations - Locations array (modified in place)
 * @param armies - Armies array (modified in place)
 * @param budget - AI budget
 * @param profile - Faction personality
 * @param turn - Current game turn
 * @param currentGold - Available gold for spending
 * @returns Remaining gold after recruitment
 */
export function handleRecruitment(
    faction: FactionId,
    locations: Location[],
    armies: Army[],
    budget: AIBudget,
    profile: FactionPersonality,
    turn: number,
    currentGold: number
): number {
    // Priority: Massing locations > Threatened zones
    const recruitmentTargets = locations
        .filter(l =>
            l.faction === faction &&
            l.population >= 2000 &&
            (!l.actionsTaken || l.actionsTaken.recruit < 4)
        )
        .sort((a, b) => {
            // Cities over rural
            if (a.type === 'CITY' && b.type !== 'CITY') return -1;
            if (b.type === 'CITY' && a.type !== 'CITY') return 1;

            // Prioritize locations with existing armies (Massing)
            const garrisonA = armies
                .filter(reg => reg.locationId === a.id && reg.faction === faction)
                .reduce((s, r) => s + r.strength, 0);
            const garrisonB = armies
                .filter(reg => reg.locationId === b.id && reg.faction === faction)
                .reduce((s, r) => s + r.strength, 0);

            // Threat level based on stability
            const threatA = 100 - a.stability;
            const threatB = 100 - b.stability;

            return (garrisonB + threatB * 10) - (garrisonA + threatA * 10);
        });

    for (const loc of recruitmentTargets) {
        // FIX: Use actual gold, not allocation
        // Keep minimal reserve (100 gold) for emergencies
        let minReserve = 100;

        // REPUBLICANS EARLY GAME OVERRIDE (Turns 1-3): Ignore reserve to mass troops
        const isRepublicanEarlyGame = faction === FactionId.REPUBLICANS && turn <= 3;
        if (isRepublicanEarlyGame) {
            minReserve = 0; // Use ALL gold for recruitment
        }

        if (currentGold < RECRUIT_COST + minReserve) break;

        // Aggressive factions and Republicans early game can dip into reserve
        const canUseReserve = (profile.aggressiveness > 0.7 || isRepublicanEarlyGame);

        if (!canUseReserve && currentGold < RECRUIT_COST + 200) break;

        // Spend gold
        currentGold -= RECRUIT_COST;

        // Reduce population
        loc.population -= RECRUIT_AMOUNT;
        if (!loc.actionsTaken) {
            loc.actionsTaken = { recruit: 0, seizeGold: 0, seizeFood: 0, incite: 0 };
        }
        loc.actionsTaken.recruit += 1;

        // MERGE LOGIC: Check if an eligible army exists
        const existingArmy = armies.find(a =>
            a.faction === faction &&
            a.locationId === loc.id &&
            a.locationType === 'LOCATION' &&
            !a.isSpent && !a.isSieging && !a.isInsurgent && !a.action
        );

        if (existingArmy) {
            existingArmy.strength += RECRUIT_AMOUNT;
        } else {
            armies.push({
                id: `ai_reg_${Math.random()}`,
                faction,
                locationType: 'LOCATION',
                locationId: loc.id,
                roadId: null,
                stageIndex: 0,
                direction: 'FORWARD',
                originLocationId: loc.id,
                destinationId: null,
                turnsUntilArrival: 0,
                strength: RECRUIT_AMOUNT,
                isInsurgent: false,
                isSpent: false,
                isSieging: false,
                foodSourceId: loc.id,
                lastSafePosition: { type: 'LOCATION', id: loc.id }
            });
        }
    }

    return currentGold;
}
