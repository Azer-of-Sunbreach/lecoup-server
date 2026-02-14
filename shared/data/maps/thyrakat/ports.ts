/**
 * Thyrakat Map Ports
 * Coastal cities that can send/receive naval convoys
 */

// List of location IDs that are ports
export const THYRAKAT_PORTS: string[] = [
    'faith_pier',
    'harabour',
    'yehid',
    'Maqom',
    'het-yod',
    'saphir',
];

// Naval travel times between ports
export const THYRAKAT_NAVAL_TIMES: Record<string, Record<string, number>> = {
    faith_pier: {
        harabour: 3,
        yehid: 6,
        Maqom: 7,
        'het-yod': 10,
        saphir: 12
    },
    harabour: {
        yehid: 3,
        Maqom: 4,
        'het-yod': 7,
        saphir: 9
    },
    yehid: {
        Maqom: 1,
        'het-yod': 4,
        saphir: 6
    },
    Maqom: {
        'het-yod': 3,
        saphir: 5
    },
    'het-yod': {
        saphir: 2
    },
};
