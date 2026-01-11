
import { Character, CharacterStatus, FactionId } from '../../types';

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
export function handleLeaderStatusOnCapture(
    locationId: string,
    winnerFaction: FactionId,
    characters: Character[]
): Character[] {
    let nextCharacters = [...characters];

    // 1. Identify leaders present at the location (excluding Governors)
    // Governors are handled separately by validateGovernorStatus
    const leadersAtLocation = nextCharacters.filter(c =>
        c.locationId === locationId &&
        c.status !== CharacterStatus.GOVERNING &&
        c.status !== CharacterStatus.DEAD
    );

    if (leadersAtLocation.length === 0) return nextCharacters;

    // 2. Count existing undercover agents per faction in this location
    // We need this to enforce "Max 1 Undercover per faction" rule
    const undercoverCounts = new Map<FactionId, number>();

    leadersAtLocation.forEach(c => {
        if (c.status === CharacterStatus.UNDERCOVER) {
            undercoverCounts.set(c.faction, (undercoverCounts.get(c.faction) || 0) + 1);
        }
    });

    // 3. Process each leader
    nextCharacters = nextCharacters.map(c => {
        // Only process leaders at this location who are not governing/dead/prisoner
        if (c.locationId !== locationId ||
            c.status === CharacterStatus.GOVERNING ||
            c.status === CharacterStatus.DEAD) {
            return c;
        }

        // A. WINNER FACTION (Liberation)
        if (c.faction === winnerFaction) {
            // Undercover agents reveal themselves as liberators
            if (c.status === CharacterStatus.UNDERCOVER) {
                return {
                    ...c,
                    status: CharacterStatus.AVAILABLE,
                    detectionLevel: 0,
                    activeClandestineActions: [] // Clear active missions
                };
            }
            // Available agents stay available but get detection reset (new regime)
            if (c.status === CharacterStatus.AVAILABLE) {
                return {
                    ...c,
                    detectionLevel: 0
                };
            }
        }
        // B. LOSER/OTHER FACTION (Occupation)
        else if (c.faction !== FactionId.NEUTRAL) {
            // Available agents try to go underground
            if (c.status === CharacterStatus.AVAILABLE) {
                const currentUndercover = undercoverCounts.get(c.faction) || 0;

                if (currentUndercover < 1) { // MAX 1 PER FACTION
                    // Success: Became Undercover
                    undercoverCounts.set(c.faction, currentUndercover + 1);
                    return {
                        ...c,
                        status: CharacterStatus.UNDERCOVER,
                        detectionLevel: 0, // Reset detection
                        activeClandestineActions: []
                    };
                } else {
                    // Failed: Stranded (remain AVAILABLE)
                    return {
                        ...c,
                        detectionLevel: 0 // Reset detection anyway (new police)
                    };
                }
            }
            // Existing Undercover agents stay undercover, reset detection
            if (c.status === CharacterStatus.UNDERCOVER) {
                return {
                    ...c,
                    detectionLevel: 0
                };
            }
        }

        return c;
    });

    return nextCharacters;
}
