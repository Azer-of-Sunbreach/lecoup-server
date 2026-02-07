/**
 * Generated Map Locations for Larion Alternate
 * Created by Map Positioner Dev Tool
 */

import { Location, FactionId, RuralCategory } from '../../../types';

export const NEW_LOCATIONS: Location[] = [
    {
        id: 'sunbreach_lands', name: 'Sunbreach Lands', type: 'RURAL', linkedLocationId: 'sunbreach', faction: FactionId.REPUBLICANS,
        population: 600000, ruralCategory: RuralCategory.ORDINARY, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 65, defense: 0, fortificationLevel: 0,
        position: { x: 252, y: 367 },
        backgroundPosition: { x: 252, y: 367 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 6000, wealthyCommoners: 30000, labouringFolks: 564000 },
        resentment: { [FactionId.NOBLES]: 35, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 30 }
    },
    {
        id: 'sunbreach', name: 'Sunbreach', type: 'CITY', linkedLocationId: 'sunbreach_lands', faction: FactionId.REPUBLICANS,
        population: 150000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 300, stability: 56, defense: 4000, fortificationLevel: 3,
        position: { x: 188, y: 338 },
        backgroundPosition: { x: 188, y: 338 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 7500, wealthyCommoners: 30000, labouringFolks: 112500 },
        resentment: { [FactionId.NOBLES]: 35, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 30 }
    },
    {
        id: 'order_lands', name: 'Lands of the Order', type: 'RURAL', linkedLocationId: 'stormbay', faction: FactionId.CONSPIRATORS,
        population: 600000, ruralCategory: RuralCategory.ORDINARY, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 100, defense: 0, fortificationLevel: 0,
        position: { x: 370, y: 588 },
        backgroundPosition: { x: 370, y: 588 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 6000, wealthyCommoners: 30000, labouringFolks: 564000 },
        resentment: { [FactionId.NOBLES]: 10, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 10 }
    },
    {
        id: 'stormbay', name: 'Stormbay', type: 'CITY', linkedLocationId: 'order_lands', faction: FactionId.CONSPIRATORS,
        population: 120000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 350, stability: 100, defense: 10000, fortificationLevel: 4,
        position: { x: 296, y: 662 },
        backgroundPosition: { x: 296, y: 662 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 6000, wealthyCommoners: 18000, labouringFolks: 96000 },
        resentment: { [FactionId.NOBLES]: 10, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 10 }
    },
    {
        id: 'great_plains', name: 'Great Plains', type: 'RURAL', linkedLocationId: 'windward', faction: FactionId.CONSPIRATORS,
        population: 350000, ruralCategory: RuralCategory.FERTILE, isCoastal: false, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 100, defense: 0, fortificationLevel: 0,
        position: { x: 494, y: 323 },
        backgroundPosition: { x: 494, y: 323 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 3500, wealthyCommoners: 17500, labouringFolks: 329000 },
        resentment: { [FactionId.NOBLES]: 25, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 40 }
    },
    {
        id: 'windward', name: 'Windward', type: 'CITY', linkedLocationId: 'great_plains', faction: FactionId.CONSPIRATORS,
        population: 35000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL', isGrainTradeActive: true,
        goldIncome: 0, foodIncome: 0, foodStock: 350, stability: 100, defense: 4000, fortificationLevel: 3,
        position: { x: 504, y: 372 },
        backgroundPosition: { x: 504, y: 372 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 700, wealthyCommoners: 3500, labouringFolks: 30800 },
        resentment: { [FactionId.NOBLES]: 25, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 40 }
    },
    {
        id: 'hornvale_duchy', name: 'Hornvale Duchy', type: 'RURAL', linkedLocationId: 'hornvale', faction: FactionId.CONSPIRATORS,
        population: 500000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: false, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 50, defense: 0, fortificationLevel: 0,
        position: { x: 557, y: 574 },
        backgroundPosition: { x: 557, y: 574 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 5000, wealthyCommoners: 25000, labouringFolks: 470000 },
        resentment: { [FactionId.NOBLES]: 25, [FactionId.CONSPIRATORS]: 35, [FactionId.REPUBLICANS]: 25 }
    },
    {
        id: 'hornvale', name: 'Hornvale', type: 'CITY', linkedLocationId: 'hornvale_duchy', faction: FactionId.CONSPIRATORS,
        population: 35000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 275, stability: 50, defense: 4000, fortificationLevel: 3,
        position: { x: 493, y: 616 },
        backgroundPosition: { x: 493, y: 616 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 700, wealthyCommoners: 3500, labouringFolks: 30800 },
        resentment: { [FactionId.NOBLES]: 25, [FactionId.CONSPIRATORS]: 35, [FactionId.REPUBLICANS]: 25 }
    },
    {
        id: 'northern_barony', name: 'Northern Barony', type: 'RURAL', linkedLocationId: 'port_de_sable', faction: FactionId.NOBLES,
        population: 600000, ruralCategory: RuralCategory.ORDINARY, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 60, defense: 0, fortificationLevel: 0,
        position: { x: 307, y: 158 },
        backgroundPosition: { x: 307, y: 158 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 12000, wealthyCommoners: 42000, labouringFolks: 546000 },
        resentment: { [FactionId.NOBLES]: 40, [FactionId.CONSPIRATORS]: 10, [FactionId.REPUBLICANS]: 10 }
    },
    {
        id: 'port_de_sable', name: 'Port-de-Sable', type: 'CITY', linkedLocationId: 'northern_barony', faction: FactionId.NOBLES,
        population: 80000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 250, stability: 50, defense: 4000, fortificationLevel: 3,
        position: { x: 232, y: 202 },
        backgroundPosition: { x: 232, y: 202 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 4000, wealthyCommoners: 16000, labouringFolks: 60000 },
        resentment: { [FactionId.NOBLES]: 40, [FactionId.CONSPIRATORS]: 10, [FactionId.REPUBLICANS]: 10 }
    },
    {
        id: 'esmarch_duchy', name: 'Esmarch Duchy', type: 'RURAL', linkedLocationId: 'mirebridge', faction: FactionId.NOBLES,
        population: 300000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 64, defense: 0, fortificationLevel: 0,
        position: { x: 547, y: 203 },
        backgroundPosition: { x: 547, y: 203 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 3000, wealthyCommoners: 15000, labouringFolks: 282000 },
        resentment: { [FactionId.NOBLES]: 33, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 40 }
    },
    {
        id: 'mirebridge', name: 'Mirebridge', type: 'CITY', linkedLocationId: 'esmarch_duchy', faction: FactionId.NOBLES,
        population: 50000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 120, stability: 75, defense: 4000, fortificationLevel: 3,
        position: { x: 514, y: 159 },
        backgroundPosition: { x: 514, y: 159 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 1500, wealthyCommoners: 6000, labouringFolks: 42500 },
        resentment: { [FactionId.NOBLES]: 33, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 40 }
    },
    {
        id: 'thane_duchy', name: 'Thane Duchy', type: 'RURAL', linkedLocationId: 'karamos', faction: FactionId.NOBLES,
        population: 350000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: false, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 64, defense: 0, fortificationLevel: 0,
        position: { x: 743, y: 340 },
        backgroundPosition: { x: 743, y: 340 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 7000, wealthyCommoners: 10500, labouringFolks: 332500 },
        resentment: { [FactionId.NOBLES]: 10, [FactionId.CONSPIRATORS]: 10, [FactionId.REPUBLICANS]: 60 }
    },
    {
        id: 'karamos', name: 'Karamos', type: 'CITY', linkedLocationId: 'thane_duchy', faction: FactionId.NOBLES,
        population: 55000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 125, stability: 75, defense: 4000, fortificationLevel: 3,
        position: { x: 774, y: 297 },
        backgroundPosition: { x: 774, y: 297 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 450, wealthyCommoners: 2700, labouringFolks: 41850 },
        resentment: { [FactionId.NOBLES]: 10, [FactionId.CONSPIRATORS]: 10, [FactionId.REPUBLICANS]: 60 }
    },
    {
        id: 'gullwing_duchy', name: 'Gullwing Duchy', type: 'RURAL', linkedLocationId: 'gullwing', faction: FactionId.NOBLES,
        population: 270000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 64, defense: 0, fortificationLevel: 0,
        position: { x: 765, y: 585 },
        backgroundPosition: { x: 765, y: 585 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 5400, wealthyCommoners: 8100, labouringFolks: 256500 },
        resentment: { [FactionId.NOBLES]: 25, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 60 }
    },
    {
        id: 'gullwing', name: 'Gullwing', type: 'CITY', linkedLocationId: 'gullwing_duchy', faction: FactionId.NOBLES,
        population: 45000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 150, stability: 75, defense: 4000, fortificationLevel: 3,
        position: { x: 794, y: 648 },
        backgroundPosition: { x: 794, y: 648 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 900, wealthyCommoners: 3150, labouringFolks: 40950 },
        resentment: { [FactionId.NOBLES]: 10, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 60 }
    },
    {
        id: 'thane_peaks', name: 'Thane Peaks', type: 'RURAL', linkedLocationId: 'windle', faction: FactionId.NOBLES,
        population: 80000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: false, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 75, defense: 0, fortificationLevel: 0,
        position: { x: 866, y: 185 },
        backgroundPosition: { x: 866, y: 185 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 800, wealthyCommoners: 1600, labouringFolks: 77600 },
        resentment: { [FactionId.NOBLES]: 0, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 90 }
    },
    {
        id: 'windle', name: 'Windle', type: 'CITY', linkedLocationId: 'thane_peaks', faction: FactionId.NOBLES,
        population: 10000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 80, stability: 80, defense: 4000, fortificationLevel: 3,
        position: { x: 868, y: 134 },
        backgroundPosition: { x: 868, y: 134 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 100, wealthyCommoners: 300, labouringFolks: 9600 },
        resentment: { [FactionId.NOBLES]: 0, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 90 }
    },
    {
        id: 'saltcraw_viscounty', name: 'Saltcraw Viscounty', type: 'RURAL', linkedLocationId: 'brinewaith', faction: FactionId.NOBLES,
        population: 20000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 50, defense: 0, fortificationLevel: 0,
        position: { x: 119, y: 532 },
        backgroundPosition: { x: 119, y: 532 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 200, wealthyCommoners: 600, labouringFolks: 19200 },
        resentment: { [FactionId.NOBLES]: 33, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 40 }
    },
    {
        id: 'brinewaith', name: 'Brinewaith', type: 'CITY', linkedLocationId: 'saltcraw_viscounty', faction: FactionId.NOBLES,
        population: 12000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 135, stability: 50, defense: 4000, fortificationLevel: 3,
        position: { x: 63, y: 541 },
        backgroundPosition: { x: 63, y: 541 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 120, wealthyCommoners: 480, labouringFolks: 11400 },
        resentment: { [FactionId.NOBLES]: 33, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 40 }
    },
    {
        id: 'larion_islands', name: 'Islands of Larion', type: 'RURAL', linkedLocationId: 'gre_au_vent', faction: FactionId.NOBLES,
        population: 41000, ruralCategory: RuralCategory.FERTILE, isCoastal: true, foodCollectionLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 50, defense: 0, fortificationLevel: 0,
        position: { x: 305, y: 60 },
        backgroundPosition: { x: 305, y: 60 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 410, wealthyCommoners: 2870, labouringFolks: 37720 },
        resentment: { [FactionId.NOBLES]: 33, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 40 }
    },
    {
        id: 'gre_au_vent', name: 'Gré-au-vent', type: 'CITY', linkedLocationId: 'larion_islands', faction: FactionId.NOBLES,
        population: 10000, taxLevel: 'NORMAL', tradeTaxLevel: 'NORMAL',
        goldIncome: 0, foodIncome: 0, foodStock: 135, stability: 50, defense: 4000, fortificationLevel: 3,
        position: { x: 249, y: 29 },
        backgroundPosition: { x: 249, y: 29 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 200, wealthyCommoners: 1500, labouringFolks: 8300 },
        resentment: { [FactionId.NOBLES]: 33, [FactionId.CONSPIRATORS]: 0, [FactionId.REPUBLICANS]: 40 }
    },
    {
        id: 'fairemere_viscounty', name: 'Fairemere Viscounty', type: 'RURAL', linkedLocationId: 'Highwall', faction: FactionId.NOBLES,
        population: 230000, ruralCategory: RuralCategory.INHOSPITABLE, isCoastal: true, foodCollectionLevel: 'LOW',
        goldIncome: 0, foodIncome: 0, foodStock: 0, stability: 50, defense: 0, fortificationLevel: 0,
        position: { x: 887, y: 465 },
        backgroundPosition: { x: 887, y: 465 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 4600, wealthyCommoners: 11500, labouringFolks: 213900 },
        resentment: { [FactionId.NOBLES]: 65, [FactionId.CONSPIRATORS]: 15, [FactionId.REPUBLICANS]: 15 }
    },
    {
        id: 'cathair', name: 'Cathair', type: 'CITY', linkedLocationId: 'fairemere_viscounty', faction: FactionId.NOBLES,
        population: 25000, taxLevel: 'LOW', tradeTaxLevel: 'LOW',
        goldIncome: 0, foodIncome: 0, foodStock: 150, stability: 50, defense: 4000, fortificationLevel: 3,
        position: { x: 923, y: 424 },
        backgroundPosition: { x: 923, y: 424 },
        actionsTaken: { seizeGold: 0, seizeFood: 0, recruit: 0, incite: 0 },
        demographics: { nobles: 500, wealthyCommoners: 1500, labouringFolks: 23000 },
        resentment: { [FactionId.NOBLES]: 65, [FactionId.CONSPIRATORS]: 15, [FactionId.REPUBLICANS]: 15 }
    }
];

export const NEW_GARRISONS: Record<string, number> = {
    'sunbreach_lands': 2500,
    'sunbreach': 2000,
    'order_lands': 1000,
    'stormbay': 1000,
    'great_plains': 1500,
    'windward': 2500,
    'hornvale_duchy': 1500,
    'hornvale': 2500,
    'northern_barony': 1000,
    'port_de_sable': 1000,
    'esmarch_duchy': 1000,
    'mirebridge': 1000,
    'thane_duchy': 1500,
    'karamos': 2500,
    'gullwing_duchy': 1000,
    'gullwing': 1000,
    'thane_peaks': 500,
    'windle': 1000,
    'saltcraw_viscounty': 500,
    'brinewaith': 500,
    'larion_islands': 500,
    'gre_au_vent': 500,
    'fairemere_viscounty': 500,
    'cathair': 500
};
