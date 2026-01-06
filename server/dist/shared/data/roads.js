"use strict";
/**
 * Road Network Data - All roads and road stages connecting territories
 * Derived from Spec 2.3 (Road Network)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROADS = void 0;
const types_1 = require("../types");
const locations_1 = require("./locations");
// Helper to generate stages with explicit background positions
const generateStages = (startLoc, endLoc, stageData) => {
    const count = stageData.length;
    const stages = [];
    for (let i = 1; i <= count; i++) {
        const ratio = i / (count + 1);
        const data = stageData[i - 1];
        const stage = {
            index: i - 1,
            position: {
                x: startLoc.position.x + (endLoc.position.x - startLoc.position.x) * ratio,
                y: startLoc.position.y + (endLoc.position.y - startLoc.position.y) * ratio
            },
            fortificationLevel: 0,
            naturalDefense: data.defense,
            faction: null,
            name: data.name,
            flavorText: data.flavor
        };
        // Use explicit backPos if provided, otherwise don't set backgroundPosition
        if (data.backPos) {
            stage.backgroundPosition = data.backPos;
        }
        stages.push(stage);
    }
    return stages;
};
const getLoc = (id) => locations_1.INITIAL_LOCATIONS.find(l => l.id === id);
exports.ROADS = [
    // Local (Instant) - Spec 2.1: City-Rural links
    { id: 'r_sun_loc', from: 'sunbreach_lands', to: 'sunbreach', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_sto_loc', from: 'order_lands', to: 'stormbay', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_win_loc', from: 'great_plains', to: 'windward', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_hor_loc', from: 'hornvale_viscounty', to: 'hornvale', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_por_loc', from: 'northern_barony', to: 'port_de_sable', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_mir_loc', from: 'esmarch_duchy', to: 'mirebridge', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_kar_loc', from: 'thane_duchy', to: 'karamos', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_gul_loc', from: 'gullwing_duchy', to: 'gullwing', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_wid_loc', from: 'thane_peaks', to: 'windle', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    // Regional (Stages with Names) - Spec 2.3
    // r_sun_ord: Sunbreach Lands -> Lands of the Order
    {
        id: 'r_sun_ord', from: 'sunbreach_lands', to: 'order_lands', quality: types_1.RoadQuality.GOOD, travelTurns: 3, stages: generateStages(getLoc('sunbreach_lands'), getLoc('order_lands'), [
            { name: "Sunbreach's Lighthouse", flavor: "The tower lights signal the dangerous, rocky shores underneath.", backPos: { x: 251, y: 407 } },
            { name: "Bridge over Forcorant River", flavor: "The only path for crossing the river.", backPos: { x: 298, y: 444 } },
            { name: "Southern monastery", flavor: "A place of rest for travelers.", backPos: { x: 335, y: 493 } }
        ])
    },
    // r_ord_hor: Lands of the Order -> Hornvale Viscounty
    {
        id: 'r_ord_hor', from: 'order_lands', to: 'hornvale_viscounty', quality: types_1.RoadQuality.GOOD, travelTurns: 2, stages: generateStages(getLoc('order_lands'), getLoc('hornvale_viscounty'), [
            { name: "The Order's training fields", flavor: "Where the knights of the Order maneuver.", backPos: { x: 411, y: 549 } },
            { name: "The southern tip of the Great Plains", flavor: "The vast wheat fields are visible from here.", backPos: { x: 463, y: 542 } }
        ])
    },
    // r_hor_gul: Hornvale Viscounty -> Gullwing Duchy
    {
        id: 'r_hor_gul', from: 'hornvale_viscounty', to: 'gullwing_duchy', quality: types_1.RoadQuality.MEDIOCRE, travelTurns: 4, stages: generateStages(getLoc('hornvale_viscounty'), getLoc('gullwing_duchy'), [
            { name: "Hornvale's wine fields", flavor: "The finest wine of the south.", backPos: { x: 562, y: 622 } },
            { name: "Straggletooth", flavor: "A rural hamlet.", backPos: { x: 597, y: 622 } },
            { name: "Istryr Baronny", flavor: "Hamlets and manors dot the hilly landscape.", backPos: { x: 656, y: 622 } },
            { name: "Gullwing southern coast", flavor: "Poor, cold, muddy roads.", backPos: { x: 712, y: 568 } }
        ])
    },
    // r_gul_tha: Gullwing Duchy -> Thane Duchy
    {
        id: 'r_gul_tha', from: 'gullwing_duchy', to: 'thane_duchy', quality: types_1.RoadQuality.BAD, travelTurns: 4, stages: generateStages(getLoc('gullwing_duchy'), getLoc('thane_duchy'), [
            { name: "Gullwing eastern coast", flavor: "Dirt roads along a rocky shore.", backPos: { x: 802, y: 549 } },
            { name: "Gullwing fishers villages", flavor: "Small hamlets along the coast.", backPos: { x: 799, y: 501 } },
            { name: "Shorclyff Castelleny", flavor: "A small fiefdom, sparsely populated.", backPos: { x: 756, y: 466 } },
            { name: "Thane's wine fields", flavor: "The richest land in all of Thane.", backPos: { x: 756, y: 385 } }
        ])
    },
    // r_sun_gre: Sunbreach Lands -> Great Plains
    {
        id: 'r_sun_gre', from: 'sunbreach_lands', to: 'great_plains', quality: types_1.RoadQuality.MEDIOCRE, travelTurns: 3, stages: generateStages(getLoc('sunbreach_lands'), getLoc('great_plains'), [
            { name: "Heatherfield", flavor: "A rural hamlet in the shadows of the White Mountains.", backPos: { x: 318, y: 351 } },
            { name: "Ynyr's Inn", flavor: "A lone, welcoming inn at the feet of the White Mountains.", backPos: { x: 371, y: 351 } },
            { name: "Blackbird's Bend", flavor: "Winding roads deep into sloped forests, dangerous terrain.", defense: 2000, backPos: { x: 424, y: 351 } }
        ])
    },
    // r_gre_tha: Great Plains -> Thane Duchy
    {
        id: 'r_gre_tha', from: 'great_plains', to: 'thane_duchy', quality: types_1.RoadQuality.MEDIOCRE, travelTurns: 3, stages: generateStages(getLoc('great_plains'), getLoc('thane_duchy'), [
            { name: "Windward's mills", flavor: "From here, the Great Plains feed the Kingdom.", backPos: { x: 540, y: 329 } },
            { name: "Hope Spring Chapel", flavor: "A pilgrimage site among the wheat fields.", backPos: { x: 590, y: 330 } },
            { name: "Bridge over Esmarch River", flavor: "The bridge between the Great Plains and Thane.", backPos: { x: 653, y: 334 } }
        ])
    },
    // r_tha_pea: Thane Duchy -> Thane Peaks (manual positions)
    {
        id: 'r_tha_pea', from: 'thane_duchy', to: 'thane_peaks', quality: types_1.RoadQuality.BAD, travelTurns: 3, stages: [
            { index: 0, position: { x: 737, y: 275 }, backgroundPosition: { x: 730, y: 267 }, fortificationLevel: 0, naturalDefense: 2000, faction: null, name: "Highlands of Thane", flavorText: "Inhospitable lands, thin dusty paths on the mountainside." },
            { index: 1, position: { x: 775, y: 250 }, backgroundPosition: { x: 771, y: 222 }, fortificationLevel: 0, naturalDefense: 2000, faction: null, name: "The lands of the clans", flavorText: "Narrow paths between cliffs, « Larion » is a distant concept here." },
            { index: 2, position: { x: 812, y: 225 }, backgroundPosition: { x: 844, y: 170 }, fortificationLevel: 0, naturalDefense: 3000, faction: null, name: "The Peaks of Thane", flavorText: "Impracticable paths at the end of the world." }
        ]
    },
    // r_tha_esm: Thane Duchy -> Esmarch Duchy
    {
        id: 'r_tha_esm', from: 'thane_duchy', to: 'esmarch_duchy', quality: types_1.RoadQuality.BAD, travelTurns: 3, stages: generateStages(getLoc('thane_duchy'), getLoc('esmarch_duchy'), [
            { name: "Esmarch River road", flavor: "Muddy road along the Esmarch river.", defense: 1000, backPos: { x: 669, y: 283 } },
            { name: "Esmarch forests", flavor: "The road disappears here.", defense: 1500, backPos: { x: 661, y: 218 } },
            { name: "Esmarch River delta", flavor: "Vast marches where the river meet the sea.", defense: 2000, backPos: { x: 607, y: 178 } }
        ])
    },
    // r_esm_nor: Esmarch Duchy -> Northern Barony
    {
        id: 'r_esm_nor', from: 'esmarch_duchy', to: 'northern_barony', quality: types_1.RoadQuality.MEDIOCRE, travelTurns: 2, stages: generateStages(getLoc('esmarch_duchy'), getLoc('northern_barony'), [
            { name: "County of Rivenberg", flavor: "Dreary, sullen marshes, swamps and morasses.", defense: 1500, backPos: { x: 481, y: 174 } },
            { name: "Esmarch swamps", flavor: "Mist and fog, forests and bogs.", defense: 1500, backPos: { x: 405, y: 173 } }
        ])
    },
    // r_nor_gre: Northern Barony -> Great Plains
    {
        id: 'r_nor_gre', from: 'northern_barony', to: 'great_plains', quality: types_1.RoadQuality.MEDIOCRE, travelTurns: 3, stages: generateStages(getLoc('northern_barony'), getLoc('great_plains'), [
            { name: "Lys Castelleny", flavor: "Prosperous land under an industrious but harsh lord.", backPos: { x: 355, y: 209 } },
            { name: "Northern Forests", flavor: "Natural defensive position for the northern lords.", defense: 1500, backPos: { x: 425, y: 231 } },
            { name: "Spelttiller Castelleny", flavor: "A prosperous land.", backPos: { x: 466, y: 281 } }
        ])
    },
    // --- New Roads for Southwest and Northwest regions ---
    // Local (Instant) - City-Rural links
    { id: 'r_sal_loc', from: 'saltcraw_viscounty', to: 'brinewaith', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_lar_loc', from: 'larion_islands', to: 'gre_au_vent', quality: types_1.RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    // Regional routes
    // r_iol_nor: Islands of Larion -> Northern Barony
    {
        id: 'r_iol_nor', from: 'larion_islands', to: 'northern_barony', quality: types_1.RoadQuality.BAD, travelTurns: 2, stages: generateStages(getLoc('larion_islands'), getLoc('northern_barony'), [
            { name: "Granterre Island", flavor: "Every ship leaving or returning from Westland passes here... and under the heavy taxes of Baron Lekal.", backPos: { x: 250, y: 84 } },
            { name: "Cent-collines Island", flavor: "Hamlets of independent-mind in sun-drenched valleys with gentle slopes.", backPos: { x: 167, y: 132 } }
        ])
    },
    // r_sun_sal: Sunbreach Lands -> Saltcraw Viscounty
    {
        id: 'r_sun_sal', from: 'sunbreach_lands', to: 'saltcraw_viscounty', quality: types_1.RoadQuality.BAD, travelTurns: 2, stages: generateStages(getLoc('sunbreach_lands'), getLoc('saltcraw_viscounty'), [
            { name: "The Harbour Defender", flavor: "A rocky islet protecting Sunbreach's harbour from the south.", backPos: { x: 105, y: 385 } },
            { name: "Sigmend's Veil", flavor: "Legends say that the ghost of the first king of Larion still wanders this small cay.", backPos: { x: 98, y: 457 } }
        ])
    },
    // r_ord_sal: Lands of the Order -> Saltcraw Viscounty
    {
        id: 'r_ord_sal', from: 'order_lands', to: 'saltcraw_viscounty', quality: types_1.RoadQuality.BAD, travelTurns: 2, stages: generateStages(getLoc('order_lands'), getLoc('saltcraw_viscounty'), [
            { name: "Whales' bane", flavor: "Many creatures of the abyssal seas have been stranded on these rocky fangs.", backPos: { x: 152, y: 637 } },
            { name: "The weeping coast", flavor: "Nothing protect ships from the western sea's storms here.", backPos: { x: 114, y: 601 } }
        ])
    },
];
