/**
 * Initial Locations Data - Starting state of all territories
 * Derived from Spec 2.1 (Locations) and 7.6 (Initial Forces)
 */

import { Location, FactionId, RuralCategory } from '../types';

export const INITIAL_LOCATIONS: Location[] = [
    // --- Republicans (Spec 3.1.1) ---
    {
        id: 'sunbreach_lands', name: 'Sunbreach Lands', type: 'RURAL', linkedLocationId: 'sunbreach', faction: FactionId.REPUBLICANS,
        population: 600000, ruralCategory: RuralCategory.ORDINARY, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 65, defense: 0, fortificationLevel: 0,
        position: { x: 150, y: 350 },
        backgroundPosition: { x: 261, y: 358 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'sunbreach', name: 'Sunbreach', type: 'CITY', linkedLocationId: 'sunbreach_lands', faction: FactionId.REPUBLICANS,
        population: 150000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 300, stability: 51, defense: 4000, fortificationLevel: 3,
        position: { x: 120, y: 380 },
        backgroundPosition: { x: 186, y: 343 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    // --- Conspirators (Spec 3.1.2) ---
    {
        id: 'order_lands', name: 'Lands of the Order', type: 'RURAL', linkedLocationId: 'stormbay', faction: FactionId.CONSPIRATORS,
        population: 600000, ruralCategory: RuralCategory.ORDINARY, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 100, defense: 0, fortificationLevel: 0,
        position: { x: 200, y: 550 },
        backgroundPosition: { x: 357, y: 574 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'stormbay', name: 'Stormbay', type: 'CITY', linkedLocationId: 'order_lands', faction: FactionId.CONSPIRATORS,
        population: 120000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 350, stability: 100, defense: 10000, fortificationLevel: 4,
        position: { x: 230, y: 580 },
        backgroundPosition: { x: 285, y: 660 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    {
        id: 'great_plains', name: 'Great Plains', type: 'RURAL', linkedLocationId: 'windward', faction: FactionId.CONSPIRATORS,
        population: 350000, ruralCategory: RuralCategory.FERTILE, isCoastal: false, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 100, defense: 0, fortificationLevel: 0,
        position: { x: 450, y: 350 },
        backgroundPosition: { x: 488, y: 327 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'windward', name: 'Windward', type: 'CITY', linkedLocationId: 'great_plains', faction: FactionId.CONSPIRATORS,
        population: 35000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL', isGrainTradeActive: true,
        goldIncome: 0, foodIncome: 0, foodStock: 350, stability: 100, defense: 4000, fortificationLevel: 3,
        position: { x: 450, y: 310 },
        backgroundPosition: { x: 505, y: 363 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    {
        id: 'hornvale_viscounty', name: 'Hornvale Viscounty', type: 'RURAL', linkedLocationId: 'hornvale', faction: FactionId.CONSPIRATORS,
        population: 250000, ruralCategory: RuralCategory.FERTILE, isCoastal: false, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 50, defense: 0, fortificationLevel: 0,
        position: { x: 380, y: 500 },
        backgroundPosition: { x: 519, y: 564 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'hornvale', name: 'Hornvale', type: 'CITY', linkedLocationId: 'hornvale_viscounty', faction: FactionId.CONSPIRATORS,
        population: 35000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 275, stability: 50, defense: 4000, fortificationLevel: 3,
        position: { x: 350, y: 530 },
        backgroundPosition: { x: 503, y: 610 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    // --- Nobles (Spec 3.1.3) ---
    {
        id: 'northern_barony', name: 'Northern Barony', type: 'RURAL', linkedLocationId: 'port_de_sable', faction: FactionId.NOBLES,
        population: 600000, ruralCategory: RuralCategory.ORDINARY, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 50, defense: 0, fortificationLevel: 0,
        position: { x: 250, y: 150 },
        backgroundPosition: { x: 312, y: 160 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'port_de_sable', name: 'Port-de-Sable', type: 'CITY', linkedLocationId: 'northern_barony', faction: FactionId.NOBLES,
        population: 80000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL', isCoastal: true,
        goldIncome: 0, foodIncome: 0, foodStock: 250, stability: 50, defense: 4000, fortificationLevel: 3,
        position: { x: 220, y: 120 },
        backgroundPosition: { x: 231, y: 196 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    {
        id: 'esmarch_duchy', name: 'Esmarch Duchy', type: 'RURAL', linkedLocationId: 'mirebridge', faction: FactionId.NOBLES,
        population: 300000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 64, defense: 0, fortificationLevel: 0,
        position: { x: 500, y: 180 },
        backgroundPosition: { x: 550, y: 198 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'mirebridge', name: 'Mirebridge', type: 'CITY', linkedLocationId: 'esmarch_duchy', faction: FactionId.NOBLES,
        population: 50000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL', isCoastal: true,
        goldIncome: 0, foodIncome: 0, foodStock: 120, stability: 75, defense: 4000, fortificationLevel: 3,
        position: { x: 530, y: 150 },
        backgroundPosition: { x: 528, y: 140 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    {
        id: 'thane_duchy', name: 'Thane Duchy', type: 'RURAL', linkedLocationId: 'karamos', faction: FactionId.NOBLES,
        population: 350000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: false, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 64, defense: 0, fortificationLevel: 0,
        position: { x: 700, y: 300 },
        backgroundPosition: { x: 715, y: 337 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'karamos', name: 'Karamos', type: 'CITY', linkedLocationId: 'thane_duchy', faction: FactionId.NOBLES,
        population: 45000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 125, stability: 75, defense: 4000, fortificationLevel: 3,
        position: { x: 690, y: 270 },
        backgroundPosition: { x: 777, y: 314 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    {
        id: 'gullwing_duchy', name: 'Gullwing Duchy', type: 'RURAL', linkedLocationId: 'gullwing', faction: FactionId.NOBLES,
        population: 270000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 64, defense: 0, fortificationLevel: 0,
        position: { x: 750, y: 500 },
        backgroundPosition: { x: 771, y: 574 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'gullwing', name: 'Gullwing', type: 'CITY', linkedLocationId: 'gullwing_duchy', faction: FactionId.NOBLES,
        population: 45000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 150, stability: 75, defense: 4000, fortificationLevel: 3,
        position: { x: 780, y: 530 },
        backgroundPosition: { x: 800, y: 649 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    {
        id: 'thane_peaks', name: 'Thane Peaks', type: 'RURAL', linkedLocationId: 'windle', faction: FactionId.NOBLES,
        population: 80000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: false, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 75, defense: 0, fortificationLevel: 0,
        position: { x: 850, y: 200 },
        backgroundPosition: { x: 884, y: 167 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'windle', name: 'Windle', type: 'CITY', linkedLocationId: 'thane_peaks', faction: FactionId.NOBLES,
        population: 10000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 80, stability: 80, defense: 4000, fortificationLevel: 3,
        position: { x: 880, y: 170 },
        backgroundPosition: { x: 872, y: 114 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    // --- New Nobles Territories (Southwest and Northwest) ---
    {
        id: 'saltcraw_viscounty', name: 'Saltcraw Viscounty', type: 'RURAL', linkedLocationId: 'brinewaith', faction: FactionId.NOBLES,
        population: 20000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 50, defense: 0, fortificationLevel: 0,
        position: { x: 80, y: 480 },
        backgroundPosition: { x: 97, y: 525 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'brinewaith', name: 'Brinewaith', type: 'CITY', linkedLocationId: 'saltcraw_viscounty', faction: FactionId.NOBLES,
        population: 12000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 135, stability: 50, defense: 4000, fortificationLevel: 3,
        position: { x: 50, y: 510 },
        backgroundPosition: { x: 48, y: 521 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },

    {
        id: 'larion_islands', name: 'Islands of Larion', type: 'RURAL', linkedLocationId: 'gre_au_vent', faction: FactionId.NOBLES,
        population: 41000, ruralCategory: RuralCategory.FERTILE, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 50, defense: 0, fortificationLevel: 0,
        position: { x: 150, y: 80 },
        backgroundPosition: { x: 298, y: 58 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
    {
        id: 'gre_au_vent', name: 'Gré-au-vent', type: 'CITY', linkedLocationId: 'larion_islands', faction: FactionId.NOBLES,
        population: 10000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 135, stability: 50, defense: 4000, fortificationLevel: 3,
        position: { x: 180, y: 50 },
        backgroundPosition: { x: 259, y: 18 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 }
    },
];

// Initial garrison strengths per location (Spec 7.6)
export const INITIAL_GARRISONS: Record<string, number> = {
    'sunbreach': 2000,
    'sunbreach_lands': 2500,
    'stormbay': 1000,
    'order_lands': 1000,
    'port_de_sable': 1000,
    'northern_barony': 1000,
    'mirebridge': 1000,
    'esmarch_duchy': 1000,
    'gullwing': 1000,
    'gullwing_duchy': 1000,
    'karamos': 2500,
    'thane_duchy': 1500,
    'windward': 2500,
    'great_plains': 1500,
    'hornvale': 2500,
    'hornvale_viscounty': 1500,
    'windle': 1000,
    'thane_peaks': 500,
    'saltcraw_viscounty': 500,
    'brinewaith': 500,
    'larion_islands': 500,
    'gre_au_vent': 500
};
