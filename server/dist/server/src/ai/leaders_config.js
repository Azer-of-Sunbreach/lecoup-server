"use strict";
/**
 * @deprecated This file is OBSOLETE. Use shared/services/ai/leaders_config.ts instead.
 * This local copy is missing recent updates including:
 * - governorQuality property
 * - AGENT role (renamed from INSURRECTION)
 * - GOVERNOR role
 * - New utility functions
 *
 * This file is kept for backward compatibility only and will be removed in a future version.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasCommanderRole = exports.isRoleValidForSituation = exports.getLeaderProfile = exports.LEADER_PROFILES = void 0;
const types_1 = require("../../../shared/types");
exports.LEADER_PROFILES = [
    // REPUBLICANS
    {
        id: 'azer', name: 'Sir Azer', faction: types_1.FactionId.REPUBLICANS, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: null, exceptional: 'INSURRECTION' }
    },
    {
        id: 'argo', name: 'Argo', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'MANAGER', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'alia', name: 'Alia', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null } // Fallback to INSURRECTION
    },
    {
        id: 'lain', name: 'Lain', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'caelan', name: 'Caelan', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'tordis', name: 'Tordis', faction: types_1.FactionId.REPUBLICANS, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: null, exceptional: 'INSURRECTION' }
    },
    {
        id: 'averic', name: 'Sir Averic', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'COMMANDER', tertiary: null, exceptional: null }
    },
    {
        id: 'gebren', name: 'Sir Gebren', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'COMMANDER', tertiary: null, exceptional: null }
    },
    {
        id: 'odeke', name: 'Sir Odeke', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'COMMANDER', tertiary: null, exceptional: null }
    },
    // CONSPIRATORS
    {
        id: 'rivenberg', name: 'Count Rivenberg', faction: types_1.FactionId.CONSPIRATORS, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'MANAGER', tertiary: 'COMMANDER', exceptional: 'INSURRECTION' }
    },
    {
        id: 'barrett', name: 'Sir Barrett', faction: types_1.FactionId.CONSPIRATORS, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: 'PROTECTOR', exceptional: 'INSURRECTION' }
    },
    {
        id: 'jadis', name: 'Jadis', faction: types_1.FactionId.CONSPIRATORS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'STABILIZER', tertiary: 'MANAGER', exceptional: null }
    },
    {
        id: 'tymon', name: 'Sir Tymon', faction: types_1.FactionId.CONSPIRATORS, isVIP: false,
        priorities: { primary: 'STABILIZER', secondary: 'INSURRECTION', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'ethell', name: 'Lady Ethell', faction: types_1.FactionId.CONSPIRATORS, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    // NOBLES
    {
        id: 'lekal', name: 'Baron Lekal', faction: types_1.FactionId.NOBLES, isVIP: true,
        priorities: { primary: 'STABILIZER', secondary: 'MANAGER', tertiary: null, exceptional: 'INSURRECTION' }
    },
    {
        id: 'thane', name: 'Duke of Thane', faction: types_1.FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: 'INSURRECTION', exceptional: null }
    },
    {
        id: 'wrenfield', name: 'Lord Wrenfield', faction: types_1.FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'STABILIZER', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'haraldic', name: 'Sir Haraldic', faction: types_1.FactionId.NOBLES, isVIP: true,
        priorities: { primary: 'COMMANDER', secondary: 'PROTECTOR', tertiary: null, exceptional: 'INSURRECTION' }
    },
    {
        id: 'gullwing_duke', name: 'Duke of Gullwing', faction: types_1.FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'COMMANDER', tertiary: null, exceptional: null }
    },
    {
        id: 'lys', name: 'Castellan Lys', faction: types_1.FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'saltcraw', name: 'Viscount of Saltcraw', faction: types_1.FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    },
    {
        id: 'shorclyff', name: 'Castellan Shorclyff', faction: types_1.FactionId.NOBLES, isVIP: false,
        priorities: { primary: 'INSURRECTION', secondary: 'INSURRECTION', tertiary: null, exceptional: null }
    }
];
const getLeaderProfile = (name, id) => {
    if (id) {
        const byId = exports.LEADER_PROFILES.find(p => p.id === id);
        if (byId)
            return byId;
    }
    return exports.LEADER_PROFILES.find(p => p.name === name);
};
exports.getLeaderProfile = getLeaderProfile;
// Logic helpers for Leader evaluation
const isRoleValidForSituation = (role, leader, state) => {
    // Placeholder for complex validation logic described in specs
    return true;
};
exports.isRoleValidForSituation = isRoleValidForSituation;
/**
 * Check if a leader has any COMMANDER role in their priorities.
 * Leaders without COMMANDER should always be detached for insurrections.
 */
const hasCommanderRole = (profile) => {
    if (!profile)
        return true; // Unknown leaders assumed to have commander role (safe default)
    const { primary, secondary, tertiary, exceptional } = profile.priorities;
    return primary === 'COMMANDER' || secondary === 'COMMANDER' ||
        tertiary === 'COMMANDER' || exceptional === 'COMMANDER';
};
exports.hasCommanderRole = hasCommanderRole;
