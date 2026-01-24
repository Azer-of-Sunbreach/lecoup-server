import { Character, FactionId } from '../../types';
/**
 * Handle leader status updates when a territory changes control (Capture or Negotiation).
 *
 * Logic:
 * 1. Winner Faction Leaders:
 *    - UNDERCOVER -> AVAILABLE (Liberated)
 *    - Reset Detection
 *
 * 2. Loser/Other Faction Leaders:
 *    - AVAILABLE -> UNDERCOVER (if slot available, max 1 per faction)
 *    - If no slot -> Remain AVAILABLE (Stranded)
 *    - Reset Detection
 *
 * 3. Governors are NOT handled here (handled by validateGovernorStatus)
 */
export declare function handleLeaderStatusOnCapture(locationId: string, winnerFaction: FactionId, characters: Character[]): Character[];
