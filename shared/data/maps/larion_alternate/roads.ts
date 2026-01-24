/**
 * Generated Map Roads for Larion Alternate
 * Created by Map Positioner Dev Tool
 */

import { Road, RoadQuality } from '../../../types';

export const NEW_ROADS: Road[] = [
    // Local (Instant) - City-Rural links - mostly matching original IDs
    { id: 'r_sun_loc', from: 'sunbreach_lands', to: 'sunbreach', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_sto_loc', from: 'order_lands', to: 'stormbay', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_win_loc', from: 'great_plains', to: 'windward', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_por_loc', from: 'northern_barony', to: 'port_de_sable', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_mir_loc', from: 'esmarch_duchy', to: 'mirebridge', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_kar_loc', from: 'thane_duchy', to: 'karamos', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_gul_loc', from: 'gullwing_duchy', to: 'gullwing', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_wid_loc', from: 'thane_peaks', to: 'windle', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_hor_loc', from: 'hornvale_duchy', to: 'hornvale', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },

    // Regional routes - matching original IDs
    {
        id: 'r_sun_ord', from: 'sunbreach_lands', to: 'order_lands', quality: RoadQuality.GOOD, travelTurns: 3, stages: [
            { index: 0, position: { x: 257, y: 415 }, backgroundPosition: { x: 257, y: 415 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Sunbreach's Lighthouse", flavorText: "The tower lights signal the dangerous, rocky shores underneath." },
            { index: 1, position: { x: 296, y: 456 }, backgroundPosition: { x: 296, y: 456 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Bridge over Forcorant River", flavorText: "The only path for crossing the river." },
            { index: 2, position: { x: 343, y: 512 }, backgroundPosition: { x: 343, y: 512 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Southern monastery", flavorText: "A place of rest for travelers." }
        ]
    },
    {
        id: 'r_ord_hor', from: 'order_lands', to: 'hornvale_duchy', quality: RoadQuality.GOOD, travelTurns: 2, stages: [
            { index: 0, position: { x: 425, y: 548 }, backgroundPosition: { x: 425, y: 548 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "The Order's training fields", flavorText: "Where the knights of the Order maneuver." },
            { index: 1, position: { x: 490, y: 564 }, backgroundPosition: { x: 490, y: 564 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "The southern tip of the Great Plains", flavorText: "The vast wheat fields are visible from here." }
        ]
    },
    {
        id: 'r_hor_gul', from: 'hornvale_duchy', to: 'gullwing_duchy', quality: RoadQuality.MEDIOCRE, travelTurns: 4, stages: [
            { index: 0, position: { x: 563, y: 635 }, backgroundPosition: { x: 563, y: 635 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Hornvale's wine fields", flavorText: "The finest wine of the south." },
            { index: 1, position: { x: 621, y: 641 }, backgroundPosition: { x: 621, y: 641 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Straggletooth", flavorText: "A rural hamlet." },
            { index: 2, position: { x: 669, y: 612 }, backgroundPosition: { x: 669, y: 612 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Istryr Baronny", flavorText: "Hamlets and manors dot the hilly landscape." },
            { index: 3, position: { x: 723, y: 588 }, backgroundPosition: { x: 723, y: 588 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Gullwing southern coast", flavorText: "Poor, cold, muddy roads." }
        ]
    },
    {
        id: 'r_sun_gre', from: 'sunbreach_lands', to: 'great_plains', quality: RoadQuality.MEDIOCRE, travelTurns: 3, stages: [
            { index: 0, position: { x: 298, y: 350 }, backgroundPosition: { x: 298, y: 350 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Heatherfield", flavorText: "A rural hamlet in the shadows of the White Mountains." },
            { index: 1, position: { x: 347, y: 355 }, backgroundPosition: { x: 347, y: 355 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Ynyr's Inn", flavorText: "A lone, welcoming inn at the feet of the White Mountains." },
            { index: 2, position: { x: 415, y: 350 }, backgroundPosition: { x: 415, y: 350 }, fortificationLevel: 0, naturalDefense: 2000, faction: null, name: "Blackbird's Bend", flavorText: "Winding roads deep into sloped forests, dangerous terrain." }
        ]
    },
    {
        id: 'r_gre_tha', from: 'great_plains', to: 'thane_duchy', quality: RoadQuality.MEDIOCRE, travelTurns: 3, stages: [
            { index: 0, position: { x: 544, y: 338 }, backgroundPosition: { x: 544, y: 338 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Windward's mills", flavorText: "From here, the Great Plains feed the Kingdom." },
            { index: 1, position: { x: 594, y: 348 }, backgroundPosition: { x: 594, y: 348 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Hope Spring Chapel", flavorText: "A pilgrimage site among the wheat fields." },
            { index: 2, position: { x: 654, y: 347 }, backgroundPosition: { x: 654, y: 347 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Bridge over Esmarch River", flavorText: "The bridge between the Great Plains and Thane." }
        ]
    },
    {
        id: 'r_tha_pea', from: 'thane_duchy', to: 'thane_peaks', quality: RoadQuality.BAD, travelTurns: 3, stages: [
            { index: 0, position: { x: 718, y: 276 }, backgroundPosition: { x: 718, y: 276 }, fortificationLevel: 0, naturalDefense: 2000, faction: null, name: "Highlands of Thane", flavorText: "Inhospitable lands, thin dusty paths on the mountainside." },
            { index: 1, position: { x: 753, y: 226 }, backgroundPosition: { x: 753, y: 226 }, fortificationLevel: 0, naturalDefense: 2000, faction: null, name: "The lands of the clans", flavorText: "Narrow paths between cliffs, « Larion » is a distant concept here." },
            { index: 2, position: { x: 820, y: 171 }, backgroundPosition: { x: 820, y: 171 }, fortificationLevel: 0, naturalDefense: 3000, faction: null, name: "The Peaks of Thane", flavorText: "Impracticable paths at the end of the world." }
        ]
    },
    {
        id: 'r_tha_esm', from: 'thane_duchy', to: 'esmarch_duchy', quality: RoadQuality.BAD, travelTurns: 3, stages: [
            { index: 0, position: { x: 669, y: 296 }, backgroundPosition: { x: 669, y: 296 }, fortificationLevel: 0, naturalDefense: 1000, faction: null, name: "Esmarch River road", flavorText: "Muddy road along the Esmarch river." },
            { index: 1, position: { x: 653, y: 222 }, backgroundPosition: { x: 653, y: 222 }, fortificationLevel: 0, naturalDefense: 1500, faction: null, name: "Esmarch forests", flavorText: "The road disappears here." },
            { index: 2, position: { x: 598, y: 177 }, backgroundPosition: { x: 598, y: 177 }, fortificationLevel: 0, naturalDefense: 2000, faction: null, name: "Esmarch River delta", flavorText: "Vast marches where the river meet the sea." }
        ]
    },
    {
        id: 'r_esm_nor', from: 'esmarch_duchy', to: 'northern_barony', quality: RoadQuality.MEDIOCRE, travelTurns: 2, stages: [
            { index: 0, position: { x: 481, y: 195 }, backgroundPosition: { x: 481, y: 195 }, fortificationLevel: 0, naturalDefense: 1500, faction: null, name: "County of Rivenberg", flavorText: "Dreary, sullen marshes, swamps and morasses." },
            { index: 1, position: { x: 406, y: 168 }, backgroundPosition: { x: 406, y: 168 }, fortificationLevel: 0, naturalDefense: 1500, faction: null, name: "Esmarch swamps", flavorText: "Mist and fog, forests and bogs." }
        ]
    },
    {
        id: 'r_nor_gre', from: 'northern_barony', to: 'great_plains', quality: RoadQuality.MEDIOCRE, travelTurns: 3, stages: [
            { index: 0, position: { x: 360, y: 198 }, backgroundPosition: { x: 360, y: 198 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Lys Castelleny", flavorText: "Prosperous land under an industrious but harsh lord." },
            { index: 1, position: { x: 411, y: 233 }, backgroundPosition: { x: 411, y: 233 }, fortificationLevel: 0, naturalDefense: 1500, faction: null, name: "Northern Forests", flavorText: "Natural defensive position for the northern lords." },
            { index: 2, position: { x: 477, y: 272 }, backgroundPosition: { x: 477, y: 272 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Spelttiller Castelleny", flavorText: "A prosperous land." }
        ]
    },
    {
        id: 'r_gul_tha', from: 'gullwing_duchy', to: 'thane_duchy', quality: RoadQuality.BAD, travelTurns: 4, stages: [
            { index: 0, position: { x: 792, y: 543 }, backgroundPosition: { x: 792, y: 543 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Gullwing eastern coast", flavorText: "Dirt roads along a rocky shore." },
            { index: 1, position: { x: 791, y: 498 }, backgroundPosition: { x: 791, y: 498 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Gullwing fishers villages", flavorText: "Dirt roads along a rocky shore." },
            { index: 2, position: { x: 733, y: 475 }, backgroundPosition: { x: 733, y: 475 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Shorclyff Castelleny", flavorText: "A small fiefdom, sparsely populated." },
            { index: 3, position: { x: 722, y: 404 }, backgroundPosition: { x: 722, y: 404 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Thane's wine fields", flavorText: "The richest land in all of Thane." }
        ]
    },

    // Southwest and Northwest - matching original IDs
    { id: 'r_sal_loc', from: 'saltcraw_viscounty', to: 'brinewaith', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    { id: 'r_lar_loc', from: 'larion_islands', to: 'gre_au_vent', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    {
        id: 'r_iol_nor', from: 'larion_islands', to: 'northern_barony', quality: RoadQuality.BAD, travelTurns: 2, stages: [
            { index: 0, position: { x: 248, y: 87 }, backgroundPosition: { x: 248, y: 87 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Granterre Island", flavorText: "Every ship leaving or returning from Westland passes here... and under the heavy taxes of Baron Lekal." },
            { index: 1, position: { x: 166, y: 134 }, backgroundPosition: { x: 166, y: 134 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Cent-collines Island", flavorText: "Hamlets of independent-mind in sun-drenched valleys with gentle slopes." }
        ]
    },
    {
        id: 'r_sun_sal', from: 'sunbreach_lands', to: 'saltcraw_viscounty', quality: RoadQuality.BAD, travelTurns: 2, stages: [
            { index: 0, position: { x: 101, y: 394 }, backgroundPosition: { x: 101, y: 394 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "The Harbour Defender", flavorText: "A rocky islet protecting Sunbreach's harbour from the south." },
            { index: 1, position: { x: 100, y: 464 }, backgroundPosition: { x: 100, y: 464 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Sigmend's Veil", flavorText: "Legends say that the ghost of the first king of Larion still wanders this small cay." }
        ]
    },
    {
        id: 'r_ord_sal', from: 'order_lands', to: 'saltcraw_viscounty', quality: RoadQuality.BAD, travelTurns: 2, stages: [
            { index: 0, position: { x: 151, y: 645 }, backgroundPosition: { x: 151, y: 645 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Whales' bane", flavorText: "Many creatures of the abyssal seas have been stranded on these rocky fangs." },
            { index: 1, position: { x: 117, y: 614 }, backgroundPosition: { x: 117, y: 614 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "The weeping coast", flavorText: "Nothing protect ships from the western sea's storms here." }
        ]
    },

    // NEW ROADS - Specific to Larion Alternate (Fairemere Island region)
    { id: 'r_cat_loc', from: 'cathair', to: 'fairemere_viscounty', quality: RoadQuality.LOCAL, travelTurns: 0, stages: [] },
    {
        id: 'fairemere_viscounty_gullwing_duchy_road', from: 'fairemere_viscounty', to: 'gullwing_duchy', quality: RoadQuality.BAD, travelTurns: 2, stages: [
            { index: 0, position: { x: 899, y: 511 }, backgroundPosition: { x: 899, y: 511 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Fairemere Island", flavorText: "The rebellious locals never truly submitted to the lords from the Kingdom of Larion." },
            { index: 1, position: { x: 907, y: 557 }, backgroundPosition: { x: 907, y: 557 }, fortificationLevel: 0, naturalDefense: 0, faction: null, name: "Clavecombe Castelleny", flavorText: "A small port on the southern part of the island." }
        ]
    }
];
