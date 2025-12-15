/**
 * Characters Data - All leaders and their initial state
 * Derived from Spec 3.4 (Roster des Leaders)
 */

import { Character, FactionId, CharacterStatus } from '../types';

export const CHARACTERS: Character[] = [
    // Republicans (Spec 3.4 - Faction: Républicains)
    {
        id: 'azer', name: 'Sir Azer', title: 'Knight of the Republic', faction: FactionId.REPUBLICANS, status: CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Between Honor and Duty.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0.15, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'argo', name: 'Argo', title: 'The Financier', faction: FactionId.REPUBLICANS, status: CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Merchant-prince.',
        bonuses: {},
        stats: { stabilityPerTurn: -3, commandBonus: 0, insurrectionValue: 20, ability: ['MANAGER'] }
    },
    {
        id: 'alia', name: 'Alia', title: 'The Messenger', faction: FactionId.REPUBLICANS, status: CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Daughter of landless nobles.',
        bonuses: {},
        stats: { stabilityPerTurn: -3, commandBonus: 0, insurrectionValue: 30, ability: ['FIREBRAND'] }
    },
    {
        id: 'lain', name: 'Lain', title: 'The Philosopher', faction: FactionId.REPUBLICANS, status: CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Ideologue.',
        bonuses: {},
        stats: { stabilityPerTurn: -3, commandBonus: 0, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'caelan', name: 'Caelan', title: 'The Lawyer', faction: FactionId.REPUBLICANS, status: CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Popular orator.',
        bonuses: {},
        stats: { stabilityPerTurn: -3, commandBonus: 0, insurrectionValue: 30, ability: ['NONE'] }
    },
    {
        id: 'tordis', name: 'Tordis', title: 'Militia Captain', faction: FactionId.REPUBLICANS, status: CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Man of practical mind.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0.15, insurrectionValue: 30, ability: ['NONE'] }
    },
    {
        id: 'averic', name: 'Sir Averic', title: "Azer's aide-de-camp", faction: FactionId.REPUBLICANS, status: CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'A rallied knight.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.10, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'gebren', name: 'Sir Gebren', title: "Azer's bodyguard", faction: FactionId.REPUBLICANS, status: CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The disciplined child of Thane.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.10, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'odeke', name: 'Sir Odeke', title: "Azer's enforcer", faction: FactionId.REPUBLICANS, status: CharacterStatus.AVAILABLE, locationId: 'sunbreach', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The commoner in armor.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.10, insurrectionValue: 20, ability: ['NONE'] }
    },

    // Conspirators (Spec 3.4 - Faction: Conspirateurs)
    {
        id: 'rivenberg', name: 'Count Rivenberg', title: 'The Regent', faction: FactionId.CONSPIRATORS, status: CharacterStatus.AVAILABLE, locationId: 'windward', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Leader of the Coup.',
        bonuses: {},
        stats: { stabilityPerTurn: 10, commandBonus: 0.30, insurrectionValue: 30, ability: ['MANAGER'] }
    },
    {
        id: 'barrett', name: 'Sir Barrett', title: 'Grandmaster', faction: FactionId.CONSPIRATORS, status: CharacterStatus.AVAILABLE, locationId: 'stormbay', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Legendary Knight.',
        bonuses: {},
        stats: { stabilityPerTurn: 10, commandBonus: 0.30, insurrectionValue: 10, ability: ['LEGENDARY'] }
    },
    {
        id: 'jadis', name: 'Jadis', title: 'Royal Advisor', faction: FactionId.CONSPIRATORS, status: CharacterStatus.AVAILABLE, locationId: 'great_plains', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Previous Witch-Finder General.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0, insurrectionValue: 20, ability: ['MANAGER'] }
    },
    {
        id: 'tymon', name: 'Sir Tymon', title: 'Commander', faction: FactionId.CONSPIRATORS, status: CharacterStatus.AVAILABLE, locationId: 'hornvale', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Honorable Knight.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0.15, insurrectionValue: 10, ability: ['NONE'] }
    },
    {
        id: 'ethell', name: 'Lady Ethell', title: "King Fredrik's favorite", faction: FactionId.CONSPIRATORS, status: CharacterStatus.AVAILABLE, locationId: 'stormbay', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'An ear in every noble manor.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0, insurrectionValue: 20, ability: ['NONE'] }
    },

    // Nobles (Spec 3.4 - Faction: Droits des Nobles)
    {
        id: 'lekal', name: 'Baron Lekal', title: 'Lord of Port-de-Sable', faction: FactionId.NOBLES, status: CharacterStatus.AVAILABLE, locationId: 'port_de_sable', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The old lion of the aristocracy.',
        bonuses: {},
        stats: { stabilityPerTurn: 10, commandBonus: 0, insurrectionValue: 10, ability: ['MANAGER'] }
    },
    {
        id: 'thane', name: 'Duke of Thane', title: 'Lord of the Highlands', faction: FactionId.NOBLES, status: CharacterStatus.AVAILABLE, locationId: 'karamos', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The nobility of the sword.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0.30, insurrectionValue: 10, ability: ['NONE'] }
    },
    {
        id: 'wrenfield', name: 'Lord Wrenfield', title: 'Landless noble', faction: FactionId.NOBLES, status: CharacterStatus.AVAILABLE, locationId: 'mirebridge', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'Courtesan.',
        bonuses: {},
        stats: { stabilityPerTurn: 5, commandBonus: 0, insurrectionValue: 30, ability: ['NONE'] }
    },
    {
        id: 'haraldic', name: 'Sir Haraldic', title: 'Rebellious Knight Commander', faction: FactionId.NOBLES, status: CharacterStatus.AVAILABLE, locationId: 'gullwing', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The staunch traditionalist.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.30, insurrectionValue: 10, ability: ['LEGENDARY', 'FIREBRAND'] }
    },
    {
        id: 'gullwing_duke', name: 'Duke of Gullwing', title: 'Lord of the southern lands', faction: FactionId.NOBLES, status: CharacterStatus.AVAILABLE, locationId: 'gullwing', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The narrow and bellicose mind.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0.15, insurrectionValue: 20, ability: ['NONE'] }
    },
    {
        id: 'lys', name: 'Castellan Lys', title: 'Vassal of the Baron Lekal', faction: FactionId.NOBLES, status: CharacterStatus.AVAILABLE, locationId: 'northern_barony', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The emissary-at-arms.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0, insurrectionValue: 20, ability: ['FIREBRAND'] }
    },
    {
        id: 'saltcraw', name: 'Viscount of Saltcraw', title: 'Lord of the archipelago', faction: FactionId.NOBLES, status: CharacterStatus.AVAILABLE, locationId: 'brinewaith', destinationId: null, turnsUntilArrival: 0, armyId: null, description: "The rigid wit of a ship's captain.",
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0, insurrectionValue: 10, ability: ['NONE'] }
    },
    {
        id: 'shorclyff', name: 'Castellan Shorclyff', title: 'Vassal of the Duke of Thane', faction: FactionId.NOBLES, status: CharacterStatus.AVAILABLE, locationId: 'brinewaith', destinationId: null, turnsUntilArrival: 0, armyId: null, description: 'The exile from Sunbreach.',
        bonuses: {},
        stats: { stabilityPerTurn: 0, commandBonus: 0, insurrectionValue: 10, ability: ['NONE'] }
    },
];
