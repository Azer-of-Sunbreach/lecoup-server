// Famine Module - Process food shortages and their consequences

import { GameState, Location, Army, FactionId, LocationType, LogEntry } from '../../types';
import { applySequentialLosses } from '../combat';
import { FamineProcessingResult } from './types';
import { createFamineLog, createLowFoodWarningLog } from '../logs/logFactory';

/**
 * Process famine effects for all cities.
 * 
 * Famine occurs when a city's projected food stock (current + income) is <= 0.
 * Effects:
 * - Stability drops by 30 (or 5 if stock is just low: < 50)
 * - Population dies (1000-5000 randomly)
 * - Armies in the city take losses (0-2500 randomly)
 * - If linked rural area also has no food, it suffers the same effects
 * 
 * @param state - Current game state
 * @returns Updated locations, armies, stats and famine notification
 */
export function processFamine(state: GameState): FamineProcessingResult {
    const logs: LogEntry[] = [];
    let locations = state.locations.map(l => ({ ...l }));
    let armies = [...state.armies];
    let stats = { ...state.stats };
    let famineNotification: { cityName: string; ruralName: string } | null = null;

    const cityIdsInFamine: string[] = [];

    // First pass: Apply food consumption and detect famine
    locations = locations.map(loc => {
        if (loc.type === LocationType.CITY) {
            const projectedStock = loc.foodStock + loc.foodIncome;

            if (projectedStock <= 0) {
                // Severe famine
                cityIdsInFamine.push(loc.id);
                const newStab = Math.max(0, loc.stability - 30);
                if (loc.stability > 0) {
                    // Updated message per user request
                    const famineLog = createFamineLog(loc.id, loc.faction, state.turn);
                    logs.push(famineLog);
                }
                return { ...loc, foodStock: 0, stability: newStab };
            } else if (projectedStock < 50) {
                // Low food warning - only generate log for human-controlled cities
                const newStab = Math.max(0, loc.stability - 5);
                // Generate warning log for low food stocks
                if (loc.faction !== FactionId.NEUTRAL) {
                    const lowFoodLog = createLowFoodWarningLog(loc.id, loc.faction, state.turn);
                    logs.push(lowFoodLog);
                }
                return { ...loc, foodStock: projectedStock, stability: newStab };
            } else {
                // Normal food levels
                return { ...loc, foodStock: projectedStock };
            }
        }
        return loc;
    });

    // Second pass: Apply famine deaths to population and armies
    for (const cityId of cityIdsInFamine) {
        const cityIndex = locations.findIndex(l => l.id === cityId);
        if (cityIndex === -1) continue;

        const city = locations[cityIndex];

        // Population deaths and refugees (separate random values)
        if (city.population > 2500) {
            const maxLoss = city.population > 10000 ? 5000 : 1000;
            const deaths = Math.floor(Math.random() * maxLoss) + 1;
            const refugees = Math.floor(Math.random() * maxLoss) + 1;
            const totalLoss = deaths + refugees;

            locations[cityIndex].population = Math.max(0, city.population - totalLoss);
            stats.deathToll += deaths;

            if (city.linkedLocationId) {
                const ruralIdx = locations.findIndex(l => l.id === city.linkedLocationId);
                if (ruralIdx !== -1) {
                    locations[ruralIdx].population += refugees;
                }
            }
        }

        // Army deaths in city
        const cityArmies = armies.filter(a =>
            a.locationId === cityId &&
            a.locationType === 'LOCATION' &&
            (a.faction === FactionId.REPUBLICANS ||
                a.faction === FactionId.CONSPIRATORS ||
                a.faction === FactionId.NOBLES)
        );

        if (cityArmies.length > 0) {
            const armyDeaths = Math.floor(Math.random() * 2500) + 1;
            const { updatedArmies, deadArmyIds } = applySequentialLosses(cityArmies, armyDeaths);
            stats.deathToll += Math.min(armyDeaths, cityArmies.reduce((s, a) => s + a.strength, 0));
            armies = armies
                .map(a => updatedArmies.find(ua => ua.id === a.id) || a)
                .filter(a => !deadArmyIds.includes(a.id));
        }

        // Process linked rural area if it's also starving
        if (city.linkedLocationId) {
            const rural = locations.find(l => l.id === city.linkedLocationId);

            if (rural && rural.foodIncome <= 0) {
                famineNotification = { cityName: city.name, ruralName: rural.name };

                if (rural.population > 2500) {
                    const maxLoss = rural.population > 10000 ? 5000 : 1000;
                    const rDeaths = Math.floor(Math.random() * maxLoss) + 1;
                    const ruralIdx = locations.findIndex(l => l.id === rural.id);
                    if (ruralIdx !== -1) {
                        locations[ruralIdx].population = Math.max(0, locations[ruralIdx].population - rDeaths);
                        stats.deathToll += rDeaths;
                    }
                }

                const ruralArmies = armies.filter(a =>
                    a.locationId === rural.id &&
                    a.locationType === 'LOCATION' &&
                    (a.faction === FactionId.REPUBLICANS ||
                        a.faction === FactionId.CONSPIRATORS ||
                        a.faction === FactionId.NOBLES)
                );

                if (ruralArmies.length > 0) {
                    const rArmyDeaths = Math.floor(Math.random() * 2500) + 1;
                    const { updatedArmies: rUpdated, deadArmyIds: rDead } = applySequentialLosses(ruralArmies, rArmyDeaths);
                    stats.deathToll += Math.min(rArmyDeaths, ruralArmies.reduce((s, a) => s + a.strength, 0));
                    armies = armies
                        .map(a => rUpdated.find(ua => ua.id === a.id) || a)
                        .filter(a => !rDead.includes(a.id));
                }
            }
        }
    }

    return {
        locations,
        armies,
        stats,
        famineNotification,
        logs
    };
}
