"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRoleValidForSituation = exports.getRoleScoreBonus = exports.getRolePriority = exports.hasCommanderRole = exports.hasRole = exports.getLeaderProfilesForFaction = exports.getLeaderProfile = exports.LEADER_PROFILES = void 0;
const types_1 = require("../../types");
/**
 * Leader profiles with updated classifications per user specifications.
 *
 * Key changes from previous version:
 * - Added governorQuality (GREAT/ACCEPTABLE/WEAK)
 * - Renamed INSURRECTION → AGENT
 * - Added GOVERNOR role for territory management
 * - Updated priorities based on detailed analysis
 */
exports.LEADER_PROFILES = [
    // ========================================================================
    // REPUBLICANS
    // ========================================================================
    {
        id: 'azer', name: 'Sir Azer', faction: types_1.FactionId.REPUBLICANS, isVIP: true,
        governorQuality: 'GREAT',
        // Only Republican with positive stability bonus (+5/turn)
        priorities: { primary: 'STABILIZER', secondary: 'GOVERNOR', tertiary: 'COMMANDER', exceptional: 'AGENT' }
    },
    {
        id: 'argo', name: 'Argo', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'GREAT',
        // Has MANAGER ability, less statesmanship than Tordis
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: null, exceptional: null }
    },
    {
        id: 'alia', name: 'Alia', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'WEAK',
        // Exceptional clandestine ops + FIREBRAND (+33% insurgents)
        priorities: { primary: 'AGENT', secondary: null, tertiary: null, exceptional: null }
    },
    {
        id: 'lain', name: 'Lain', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'WEAK',
        // Pure agent
        priorities: { primary: 'AGENT', secondary: null, tertiary: null, exceptional: null }
    },
    {
        id: 'caelan', name: 'Caelan', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'WEAK',
        // Pure agent
        priorities: { primary: 'AGENT', secondary: null, tertiary: null, exceptional: null }
    },
    {
        id: 'tordis', name: 'Tordis', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        // Higher statesmanship than Argo but no MANAGER
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'averic', name: 'Sir Averic', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'gebren', name: 'Sir Gebren', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        // PARANOID (good for hunting agents) + IRON_FIST (generates resentment)
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'odeke', name: 'Sir Odeke', faction: types_1.FactionId.REPUBLICANS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },
    // ========================================================================
    // CONSPIRATORS
    // ========================================================================
    {
        id: 'rivenberg', name: 'Count Rivenberg', faction: types_1.FactionId.CONSPIRATORS, isVIP: true,
        governorQuality: 'GREAT',
        // +10 stability/turn, +30% command, MANAGER, GHOST
        priorities: { primary: 'STABILIZER', secondary: 'GOVERNOR', tertiary: 'COMMANDER', exceptional: 'AGENT' }
    },
    {
        id: 'barrett', name: 'Sir Barrett', faction: types_1.FactionId.CONSPIRATORS, isVIP: true,
        governorQuality: 'GREAT',
        // +10 stability/turn, +30% command, LEGENDARY
        priorities: { primary: 'STABILIZER', secondary: 'GOVERNOR', tertiary: 'COMMANDER', exceptional: 'PROTECTOR' }
    },
    {
        id: 'jadis', name: 'Jadis', faction: types_1.FactionId.CONSPIRATORS, isVIP: false,
        governorQuality: 'GREAT',
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: null, exceptional: null }
    },
    {
        id: 'tymon', name: 'Sir Tymon', faction: types_1.FactionId.CONSPIRATORS, isVIP: false,
        governorQuality: 'GREAT',
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: 'COMMANDER', exceptional: null }
    },
    {
        id: 'ethell', name: 'Lady Ethell', faction: types_1.FactionId.CONSPIRATORS, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        // DAREDEVIL - chance to escape death, ideal for early game agent
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: null, exceptional: null }
    },
    // ========================================================================
    // NOBLES
    // ========================================================================
    {
        id: 'lekal', name: 'Baron Lekal', faction: types_1.FactionId.NOBLES, isVIP: true,
        governorQuality: 'GREAT',
        // +5 stability/turn, MANAGER, PARANOID
        priorities: { primary: 'STABILIZER', secondary: 'GOVERNOR', tertiary: null, exceptional: 'AGENT' }
    },
    {
        id: 'thane', name: 'Duke of Thane', faction: types_1.FactionId.NOBLES, isVIP: true,
        governorQuality: 'WEAK',
        // +5 stability/turn, +30% command, IRON_FIST
        priorities: { primary: 'STABILIZER', secondary: 'COMMANDER', tertiary: 'GOVERNOR', exceptional: 'AGENT' }
    },
    {
        id: 'wrenfield', name: 'Lord Wrenfield', faction: types_1.FactionId.NOBLES, isVIP: false,
        governorQuality: 'GREAT',
        // +5 stability/turn bonus
        priorities: { primary: 'GOVERNOR', secondary: 'AGENT', tertiary: null, exceptional: null }
    },
    {
        id: 'haraldic', name: 'Sir Haraldic', faction: types_1.FactionId.NOBLES, isVIP: false,
        governorQuality: 'GREAT',
        // LEGENDARY, FIREBRAND, PARANOID, DAREDEVIL + IRON_FIST, SCORCHED_EARTH
        // Excellent in all domains but has negative traits
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: 'COMMANDER', exceptional: 'PROTECTOR' }
    },
    {
        id: 'gullwing_duke', name: 'Duke of Gullwing', faction: types_1.FactionId.NOBLES, isVIP: false,
        governorQuality: 'WEAK',
        // PARANOID
        priorities: { primary: 'AGENT', secondary: 'COMMANDER', tertiary: 'GOVERNOR', exceptional: null }
    },
    {
        id: 'lys', name: 'Castellan Lys', faction: types_1.FactionId.NOBLES, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        // FIREBRAND - ideal for GRAND_INSURRECTION, PARANOID
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: null, exceptional: null }
    },
    {
        id: 'saltcraw', name: 'Viscount of Saltcraw', faction: types_1.FactionId.NOBLES, isVIP: false,
        governorQuality: 'WEAK',
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: null, exceptional: null }
    },
    {
        id: 'shorclyff', name: 'Castellan Shorclyff', faction: types_1.FactionId.NOBLES, isVIP: false,
        governorQuality: 'ACCEPTABLE',
        priorities: { primary: 'AGENT', secondary: 'GOVERNOR', tertiary: null, exceptional: null }
    }
];
/**
 * Get leader profile by ID or name.
 */
const getLeaderProfile = (name, id) => {
    if (id) {
        const byId = exports.LEADER_PROFILES.find(p => p.id === id);
        if (byId)
            return byId;
    }
    return exports.LEADER_PROFILES.find(p => p.name === name || p.id === name.toLowerCase().replace(/\s+/g, '_'));
};
exports.getLeaderProfile = getLeaderProfile;
/**
 * Get all leader profiles for a faction.
 */
const getLeaderProfilesForFaction = (faction) => {
    return exports.LEADER_PROFILES.filter(p => p.faction === faction);
};
exports.getLeaderProfilesForFaction = getLeaderProfilesForFaction;
/**
 * Check if a leader has a specific role in their priorities.
 */
const hasRole = (profile, role) => {
    if (!profile)
        return false;
    const { primary, secondary, tertiary, exceptional } = profile.priorities;
    return primary === role || secondary === role || tertiary === role || exceptional === role;
};
exports.hasRole = hasRole;
/**
 * Check if a leader has COMMANDER role in their priorities.
 * Leaders without COMMANDER should always be detached for clandestine operations.
 */
const hasCommanderRole = (profile) => {
    return (0, exports.hasRole)(profile, 'COMMANDER');
};
exports.hasCommanderRole = hasCommanderRole;
/**
 * Get the priority level of a role for a leader (1=primary, 2=secondary, 3=tertiary, 4=exceptional, 0=not found).
 */
const getRolePriority = (profile, role) => {
    if (!profile)
        return 0;
    const { primary, secondary, tertiary, exceptional } = profile.priorities;
    if (primary === role)
        return 1;
    if (secondary === role)
        return 2;
    if (tertiary === role)
        return 3;
    if (exceptional === role)
        return 4;
    return 0;
};
exports.getRolePriority = getRolePriority;
/**
 * Get role score bonus based on priority (for scoring algorithms).
 * Higher bonus for preferred roles, penalty for exceptional roles.
 */
const getRoleScoreBonus = (profile, role) => {
    const priority = (0, exports.getRolePriority)(profile, role);
    switch (priority) {
        case 1: return 50; // Primary role - strong bonus
        case 2: return 25; // Secondary role - moderate bonus
        case 3: return 10; // Tertiary role - small bonus
        case 4: return -30; // Exceptional role - penalty (use as last resort)
        default: return 0; // Role not in priorities
    }
};
exports.getRoleScoreBonus = getRoleScoreBonus;
// Legacy compatibility
const isRoleValidForSituation = (role, leader, state) => {
    return true; // Placeholder
};
exports.isRoleValidForSituation = isRoleValidForSituation;
