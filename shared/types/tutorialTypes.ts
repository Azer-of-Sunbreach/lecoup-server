/**
 * Tutorial System Types
 * 
 * Defines the structure for tutorial steps, highlights, allowed actions,
 * and scripted events used by the guided tutorial system.
 */

/**
 * Types of UI zones that can be highlighted during a tutorial step
 */
export type TutorialHighlightZone =
    | 'TOPBAR'
    | 'MAP'
    | 'MAP_LOCATIONS'
    | 'MAP_ROADS'
    | 'MAP_ARMIES'
    | 'LEFT_PANEL'
    | 'RIGHT_PANEL'
    | 'EVENTS_LOG'
    | 'SPECIFIC_ELEMENT';

/**
 * Highlight configuration for a tutorial step
 */
export interface TutorialHighlight {
    zone: TutorialHighlightZone;
    targets?: string[];
    cssSelector?: string;
}

/**
 * Types of actions the player is allowed to perform during a step
 */
export type TutorialActionType =
    | 'NONE'
    | 'CLICK_LOCATION'
    | 'CLICK_ROAD_STAGE'
    | 'MOVE_ARMY'
    | 'OPEN_MENU'
    | 'CLOSE_MENU'
    | 'OPEN_LEADERS'
    | 'OPEN_GOVERNOR_MENU'
    | 'USE_GOVERNOR_ACTIONS'
    | 'APPOINT_GOVERNOR'
    | 'OPEN_CLANDESTINE_MENU'
    | 'PREPARE_GRAND_INSURRECTION'
    | 'END_TURN'
    | 'RECRUIT'
    | 'REQUISITION'
    | 'FORTIFY'
    | 'INCITE'
    | 'CHANGE_TAX'
    | 'ANY';

/**
 * Defines the single allowed action for a tutorial step
 */
export interface TutorialAllowedAction {
    type: TutorialActionType;
    target?: string;
}

/**
 * Types of scripted events that can occur during the tutorial
 */
export type TutorialEventType =
    | 'INSURRECTION'
    | 'ARMY_MOVE'
    | 'ARMY_SPAWN'
    | 'STABILITY_CHANGE'
    | 'GOLD_CHANGE'
    | 'LEADER_SPAWN'
    | 'NARRATIVE_LOG';

/**
 * When a scripted event should trigger
 */
export type TutorialEventTrigger =
    | 'ON_STEP_ENTER'
    | 'ON_STEP_EXIT'
    | 'ON_NEXT_TURN';

/**
 * A scripted event that occurs during a tutorial step
 */
export interface TutorialScriptedEvent {
    type: TutorialEventType;
    trigger: TutorialEventTrigger;
    params: Record<string, any>;
}

/**
 * A single step in the tutorial sequence
 */
export interface TutorialStep {
    id: string;
    titleKey: string;
    textKey: string;
    highlights?: TutorialHighlight[];
    allowedActions?: TutorialAllowedAction[];
    scriptedEvents?: TutorialScriptedEvent[];
    blockedZones?: TutorialHighlightZone[];
    /** Zones where scrolling is allowed but interactive elements (buttons, selects, links) are disabled */
    scrollOnlyZones?: TutorialHighlightZone[];
    autoAdvanceOn?: string;
    hideNextButton?: boolean;
    /** If set, shows objective text instead of the Previous button */
    objectiveKey?: string;
}

/**
 * Runtime state of the tutorial system
 */
export interface TutorialState {
    isActive: boolean;
    currentStepIndex: number;
    /** Highest step index ever reached (for detecting revisits) */
    maxStepIndexReached: number;
    steps: TutorialStep[];
    completedStepIds: string[];
}

/**
 * Create the default (inactive) tutorial state
 */
export const createInitialTutorialState = (): TutorialState => ({
    isActive: false,
    currentStepIndex: 0,
    maxStepIndexReached: 0,
    steps: [],
    completedStepIds: []
});
