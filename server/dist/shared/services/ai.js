"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIActionDescription = exports.generateTurnNarrative = void 0;
const genai_1 = require("@google/genai");
const types_1 = require("../types");
// === FEATURE FLAG ===
// Set to false to disable Gemini AI generation (returns fallback messages)
// Set to true to re-enable when ready to work on AI messages
const AI_ENABLED = false;
let aiClient = null;
if (AI_ENABLED && process.env.API_KEY) {
    aiClient = new genai_1.GoogleGenAI({ apiKey: process.env.API_KEY });
}
const generateTurnNarrative = async (turn, events, playerFaction, context) => {
    if (!aiClient)
        return "The war continues...";
    const contextStr = context ? `
    Key Context:
    Major Leaders: ${context.leaders.filter(l => ['Count Rivenberg', 'Sir Azer', 'Baron Lekal'].includes(l.name)).map(l => `${l.name} is ${l.status}`).join(', ')}.
    Key Cities: ${context.cities.filter(c => ['Sunbreach', 'Stormbay', 'Port-de-Sable'].includes(c.name)).map(c => `${c.name} (Held by ${c.faction}, Food: ${c.foodStock})`).join(' | ')}.
    Military Balance: ${context.armies.map(a => `${a.faction}: ${a.totalStrength} troops`).join(', ')}.
  ` : "";
    let personalityDescription = "";
    let focusDescription = "";
    switch (playerFaction) {
        case types_1.FactionId.REPUBLICANS:
            personalityDescription = "Narrative Perspective: Idealistic and empathetic. Frame events to highlight the struggle against feudal oppression (Nobles) and potential tyranny (Conspirators).";
            focusDescription = "the suffering of the people, or the prospect for a just peace.";
            break;
        case types_1.FactionId.CONSPIRATORS:
            personalityDescription = "Narrative Perspective: Revolutionary and iron-willed. Frame events to highlight the necessity of crushing the parasitic Nobles and the incompetence of the Republicans.";
            focusDescription = "the cost of the greater good, or the necessity to keep moving forward.";
            break;
        case types_1.FactionId.NOBLES:
            personalityDescription = "Narrative Perspective: Traditionalist and aristocratic. Frame events to highlight the legitimacy of the old order against usurpers (Conspirators) and the rabble (Republicans).";
            focusDescription = "the deep roots of your legitimacy, or the sanctity of the natural hierarchies.";
            break;
        default:
            personalityDescription = "Narrative Perspective: Strict military strategist determined to win the civil war.";
            focusDescription = "the shifting tides of war.";
            break;
    }
    const prompt = `
    You are a narrator for a grimdark fantasy strategy game set in the Kingdom of Larion.
    The current turn is ${turn}. The player controls the ${playerFaction === types_1.FactionId.NOBLES ? "Aristocratic faction" : playerFaction === types_1.FactionId.CONSPIRATORS ? "Conspirators faction" : "Republican faction"}. 
    
    ${personalityDescription}
    
    ${contextStr}

    Here are the significant events that happened this turn:
    ${events.join('\n')}
    
    Write a short, atmospheric paragraph (max 3 sentences) summarizing the state of the realm based on the events.
    Be factual and descriptive about the events, but subtly color the language to reflect the Narrative Perspective.
    Avoid flowery roleplay; do not say "As a leader" or start with "I".
    
    Focus on the shift in power, and then briefly either on the weather, ${focusDescription}
    Do not use JSON. Just plain text.
  `;
    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "News from the front is scarce due to the storm.";
    }
    catch (error) {
        console.error("AI Generation failed", error);
        return "The messenger was lost in the blizzard. No detailed report available.";
    }
};
exports.generateTurnNarrative = generateTurnNarrative;
const getAIActionDescription = async (faction, action, target) => {
    if (!aiClient)
        return `${faction} moves against ${target}.`;
    const prompt = `
      Describe a military maneuver in one short sentence.
      Faction: ${faction}
      Action: ${action}
      Target City: ${target}
      Context: Civil war in Larion.
    `;
    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || `${faction} is marching towards ${target}.`;
    }
    catch (e) {
        return `${faction} is marching towards ${target}.`;
    }
};
exports.getAIActionDescription = getAIActionDescription;
