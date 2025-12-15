"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSafePath = exports.getDistance = exports.getArmyStrength = void 0;
const getArmyStrength = (armies, characters) => {
    return armies.reduce((total, army) => {
        const leaders = characters.filter(c => c.armyId === army.id);
        let multiplier = 1;
        leaders.forEach(l => multiplier += l.stats.commandBonus);
        return total + (army.strength * multiplier);
    }, 0);
};
exports.getArmyStrength = getArmyStrength;
const getDistance = (startId, endId, roads) => {
    // Simple BFS for distance in hops
    if (startId === endId)
        return 0;
    const queue = [{ id: startId, dist: 0 }];
    const visited = new Set([startId]);
    while (queue.length > 0) {
        const { id, dist } = queue.shift();
        if (id === endId)
            return dist;
        const connected = roads.filter(r => r.from === id || r.to === id);
        for (const r of connected) {
            const nextId = r.from === id ? r.to : r.from;
            if (!visited.has(nextId)) {
                visited.add(nextId);
                queue.push({ id: nextId, dist: dist + 1 });
            }
        }
    }
    return 999; // Unreachable
};
exports.getDistance = getDistance;
const findSafePath = (startId, endId, state, faction) => {
    // BFS to find path - intermediate nodes owned, but DESTINATION can be enemy
    // This allows offensive campaigns to target enemy locations
    const queue = [{ id: startId, path: [] }];
    const visited = new Set([startId]);
    while (queue.length > 0) {
        const { id, path } = queue.shift();
        if (id === endId)
            return path;
        const connected = state.roads.filter(r => r.from === id || r.to === id);
        for (const r of connected) {
            const nextId = r.from === id ? r.to : r.from;
            const nextLoc = state.locations.find(l => l.id === nextId);
            if (!nextLoc || visited.has(nextId))
                continue;
            // Allow if:
            // 1. It's the destination (even if enemy)
            // 2. It's owned by us (intermediate safe node)
            if (nextId === endId || nextLoc.faction === faction) {
                visited.add(nextId);
                queue.push({ id: nextId, path: [...path, r.id] });
            }
        }
    }
    return null;
};
exports.findSafePath = findSafePath;
