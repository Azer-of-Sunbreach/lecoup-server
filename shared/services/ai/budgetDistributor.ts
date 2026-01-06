import { GameState, FactionId, Character } from '../../types';

export interface AIBudget {
    allocations: {
        diplomacy: number;
        [key: string]: any;
    };
    [key: string]: any;
}

/**
 * Distributes diplomacy budget to leaders for clandestine operations.
 * Transfers gold from faction treasury to leader.clandestineBudget.
 */
export function distributeClandestineBudget(
    state: GameState,
    faction: FactionId,
    budget: AIBudget
): Partial<GameState> {
    const factionLeaders = state.characters.filter(c => c.faction === faction && !c.isDead);
    if (factionLeaders.length === 0) return {};

    const availableGold = state.resources[faction]?.gold || 0;
    const diplomacyAlloc = budget.allocations.diplomacy || 0;

    // Safety check: Don't spend more than we have
    const actualTransfer = Math.min(availableGold, diplomacyAlloc);

    // FIX Bug #1: ALWAYS normalize budget for existing UNDERCOVER agents
    // Starting agents (Alia, Caelan, Lys, Ethell) have `budget` set but not `clandestineBudget`
    // The AI reads `clandestineBudget` first, so we must copy it over
    // This MUST happen even if there's no diplomacy budget to distribute
    const updatedCharsPreNormalize = [...state.characters];
    let normalizationOccurred = false;
    for (let i = 0; i < updatedCharsPreNormalize.length; i++) {
        const c = updatedCharsPreNormalize[i];
        if (c.faction === faction && c.status === 'UNDERCOVER' && !c.clandestineBudget && c.budget) {
            updatedCharsPreNormalize[i] = {
                ...c,
                clandestineBudget: c.budget
            };
            normalizationOccurred = true;
        }
    }

    // If no budget to distribute, still return normalized characters (if any were normalized)
    if (actualTransfer <= 0) {
        if (normalizationOccurred) {
            console.log(`[AI BUDGET ${faction}] Normalized budget for existing UNDERCOVER agents (no new transfers).`);
            return { characters: updatedCharsPreNormalize };
        }
        return {};
    }

    // Score candidates based on suitability for clandestine ops
    // User requirement: Rankings based on clandestineOps, discretion, and traits (Firebrand, Daredevil)
    const scoredCandidates = updatedCharsPreNormalize.filter(c => c.faction === faction && !c.isDead)
        .filter(c => c.status !== 'UNDERCOVER') // Existing agents manage their own budget
        .map(leader => {
            let score = 0;
            const stats = leader.stats;

            // Base Stats (1-5 scale)
            score += (stats?.clandestineOps || 0) * 2;
            score += (stats?.discretion || 0);

            // Traits & Abilities
            if (stats?.ability?.includes('FIREBRAND')) score += 3; // Bonus for insurrection
            if (stats?.ability?.includes('DAREDEVIL')) score += 2; // Bonus for survival
            if (stats?.ability?.includes('GHOST')) score += 2; // Bonus for entry/exit
            if (stats?.traits?.includes('SCORCHED_EARTH')) score += 2; // Bonus for destructive potential

            // Active ops bonus (always fund active agents)
            if (leader.activeClandestineActions && leader.activeClandestineActions.length > 0) {
                score += 10;
            }

            return { leader, score };
        })
        .sort((a, b) => b.score - a.score);

    // Filter out completely unfit leaders (extremely low score)
    // But pretty much everyone should be eligible if they are the best available
    let candidates = scoredCandidates
        .filter(c => c.score > 3) // Minimal threshold to avoid sending complete incompetents unless necessary
        .map(c => c.leader);

    if (candidates.length === 0) {
        // Fallback: if everyone is incompetent, take the top 3 best of the worst
        candidates = scoredCandidates.slice(0, 3).map(c => c.leader);
    }

    // Logic: GREEDY ALLOCATION (Quality over Quantity)
    // Goal: Give 500g (Max effective) to top rankers.
    // Falls back to smaller amounts (min 100g) if budget runs low.

    let remainingTransferBudget = actualTransfer;
    let totalTransferred = 0;
    const updatedCharacters = [...updatedCharsPreNormalize];
    const fundedCandidates: Character[] = [];

    // Iterate through ranked candidates and give them chunks of budget
    for (const leader of candidates) {
        if (remainingTransferBudget < 100) break; // No viable budget left

        // Determine ideal amount: 500g for full capability
        let amountToGive = 500;

        // If we don't have 500, check what we have
        if (remainingTransferBudget < 500) {
            // Round down to nearest 100
            amountToGive = Math.floor(remainingTransferBudget / 100) * 100;
        }

        if (amountToGive < 100) break; // Should be handled by check above, but safety

        // Execute changes
        const idx = updatedCharacters.findIndex(c => c.id === leader.id);
        if (idx > -1) {
            const currentBudget = updatedCharacters[idx].clandestineBudget || 0;
            updatedCharacters[idx] = {
                ...updatedCharacters[idx],
                clandestineBudget: currentBudget + amountToGive
            };

            remainingTransferBudget -= amountToGive;
            totalTransferred += amountToGive;
            fundedCandidates.push(leader);
        }
    }

    // Logging only (removed unused variable logic for candidates slice to be accurate in log)
    candidates = fundedCandidates;

    // Update treasury
    const updatedResources = {
        ...state.resources,
        [faction]: {
            ...state.resources[faction],
            gold: state.resources[faction].gold - totalTransferred
        }
    };

    console.log(`[AI BUDGET ${faction}] Transferred ${totalTransferred} gold to ${candidates.length} leaders for Clandestine Ops.`);

    return {
        characters: updatedCharacters,
        resources: updatedResources
    };
}
