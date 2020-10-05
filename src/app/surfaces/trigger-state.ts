import * as Tone from 'tone';

export type TriggerStateType = 'down' | 'pressed' | 'released';

export interface TriggerBaseState {
  /** An surfance independent id of the trigger. */
  id: number;
  /** The frequency of the trigger. */
  frequency: number;
  /** The current state of trigger */
  stateType: TriggerStateType;
}

export interface TriggerDownState extends TriggerBaseState {
  stateType: 'down' | 'pressed';
  /** How hard the trigger was hit, between 0 and 1 */
  velocity: number;
}
export interface TriggerReleasedState extends TriggerBaseState {
  stateType: 'released';
}

export type TriggerState = TriggerDownState | TriggerReleasedState;

/** Gets lowest integer starting from 0 that isn't the id in a collection of TriggerStates */
export function getFirstAvailableTriggerId(states: TriggerState[]) {
  const sortedIds = states.map(x => x.id).sort((a, b) => a - b);
  let testId = 0;
  for (const id of sortedIds) {
    if (id !== testId) {
      return testId;
    }
    testId++;
  }
  return testId;
}

export function isTriggerDown(trigger: TriggerState): trigger is TriggerDownState {
  return trigger.stateType === 'down';
}
export function isTriggerDownOrPressed(trigger: TriggerState): trigger is TriggerDownState {
  return trigger.stateType === 'down' || trigger.stateType === 'pressed';
}
export function isTriggerPressed(trigger: TriggerState): trigger is TriggerDownState {
  return trigger.stateType === 'pressed';
}
export function isTriggerReleased(trigger: TriggerState): trigger is TriggerReleasedState {
  return trigger.stateType === 'released';
}

