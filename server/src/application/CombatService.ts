/**
 * Combat Service - Application Layer
 * Encapsulates combat-related use cases: initiate, handle choices, resolve
 */

import { GameRoomManager, GameRoom, PendingCombat } from '../gameRoom';
import { getClientState } from '../gameLogic';
import { resolveCombatResult } from '../../../shared/services/combat';
import { FactionId, CombatState } from '../../../shared/types';

export interface CombatInitResult {
    initiated: boolean;
    pendingCombat: PendingCombat | null;
    attackerSocketId: string | null;
    defenderSocketId: string | null;
}

export interface CombatChoiceResult {
    ready: boolean;
    resolved: boolean;
    finalChoice?: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE';
    updatedState?: any;
    waitingFor?: 'ATTACKER' | 'DEFENDER';
}

/**
 * CombatService handles all combat-related use cases
 */
export class CombatService {
    constructor(
        private gameRoomManager: GameRoomManager
    ) { }

    /**
     * Initiate a combat between attacker and defender
     */
    initiateCombat(
        code: string,
        combat: CombatState,
        attackerSocketId: string,
        defenderFaction: FactionId
    ): CombatInitResult {
        const defenderSocketId = this.gameRoomManager.getSocketForFaction(code, defenderFaction);

        this.gameRoomManager.initiateCombat(code, combat, attackerSocketId, defenderFaction);

        return {
            initiated: true,
            pendingCombat: this.gameRoomManager.getRoom(code)?.pendingCombat || null,
            attackerSocketId,
            defenderSocketId
        };
    }

    /**
     * Handle a combat choice from attacker or defender
     */
    handleChoice(
        code: string,
        socketId: string,
        choice: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE',
        siegeCost?: number
    ): CombatChoiceResult {
        const room = this.gameRoomManager.getRoom(code);
        if (!room || !room.pendingCombat) {
            return { ready: false, resolved: false };
        }

        const combat = room.pendingCombat;

        // Determine role and set choice
        if (socketId === combat.attackerSocketId) {
            if (['FIGHT', 'RETREAT', 'SIEGE'].includes(choice)) {
                this.gameRoomManager.setAttackerChoice(code, choice as 'FIGHT' | 'RETREAT' | 'SIEGE', siegeCost);

                // If defender is AI (no socket), auto-choose FIGHT
                if (!combat.defenderSocketId) {
                    console.log(`[CombatService] AI defender - auto-choosing FIGHT`);
                    this.gameRoomManager.setDefenderChoice(code, 'FIGHT');
                } else {
                    return { ready: false, resolved: false, waitingFor: 'DEFENDER' };
                }
            }
        } else if (socketId === combat.defenderSocketId) {
            if (['FIGHT', 'RETREAT_CITY'].includes(choice)) {
                this.gameRoomManager.setDefenderChoice(code, choice as 'FIGHT' | 'RETREAT_CITY');
            }
        }

        // Check if ready to resolve
        if (this.gameRoomManager.isCombatReady(code)) {
            return this.resolveCombat(code);
        }

        return { ready: false, resolved: false };
    }

    /**
     * Resolve combat when both choices are made
     */
    resolveCombat(code: string): CombatChoiceResult {
        const room = this.gameRoomManager.getRoom(code);
        if (!room || !room.pendingCombat) {
            return { ready: false, resolved: false };
        }

        const combat = room.pendingCombat;

        // Determine final choice based on precedence
        // Priority: RETREAT_CITY > RETREAT > SIEGE > FIGHT
        let finalChoice: 'FIGHT' | 'RETREAT' | 'RETREAT_CITY' | 'SIEGE' = 'FIGHT';
        const finalSiegeCost = combat.siegeCost || 0;

        if (combat.defenderChoice === 'RETREAT_CITY') {
            finalChoice = 'RETREAT_CITY';
        } else if (combat.attackerChoice === 'RETREAT') {
            finalChoice = 'RETREAT';
        } else if (combat.attackerChoice === 'SIEGE') {
            finalChoice = 'SIEGE';
        } else {
            finalChoice = 'FIGHT';
        }

        console.log(`[CombatService] Resolving combat with choice: ${finalChoice}`);

        // Apply combat resolution
        const updates = resolveCombatResult(room.gameState, finalChoice, finalSiegeCost);
        room.gameState = { ...room.gameState, ...updates };

        // Clear pending combat
        this.gameRoomManager.clearCombat(code);

        return {
            ready: true,
            resolved: true,
            finalChoice,
            updatedState: getClientState(room.gameState)
        };
    }

    /**
     * Set AI attacker choice (always FIGHT)
     */
    setAIAttackerChoice(code: string): void {
        this.gameRoomManager.setAttackerChoice(code, 'FIGHT');
    }

    /**
     * Get pending combat for a room
     */
    getPendingCombat(code: string): PendingCombat | null {
        return this.gameRoomManager.getRoom(code)?.pendingCombat || null;
    }
}
