import type { CurrentSituation } from '@/situation/types';
import { createSituation } from '@/situation/reducer';

/**
 * The three prepared demo scenarios (brief §12, §7.5).
 *
 * Each builds a complete `CurrentSituation`, so loading one puts every tool into a coherent state
 * at once rather than seeding a single screen. Suggested claims arrive as `suggested` — the demo
 * still has to confirm them on stage, which is the point being demonstrated.
 */

export type PreparedScenario = {
  id: string;
  title: string;
  /** What this scenario is there to prove, shown on the card. */
  proves: string;
  build: () => CurrentSituation;
};

export const SCENARIOS: readonly PreparedScenario[] = [
  {
    id: 'husband',
    title: 'The technically correct husband',
    proves: 'Role context, Stack Trace, Message Compiler, and the humour landing before the point does.',
    build: () =>
      createSituation({
        id: 'situation-husband',
        title: 'An agreed task is still not done',
        scenarioId: 'husband',
        activeTool: 'stack_trace',
        activeWorkspace: 'inspect',
        roles: {
          user: 'Husband',
          recipient: 'Wife',
          relationship: 'Close personal relationship',
          channel: 'Text message',
        },
        goal: 'Acknowledge and resolve an unfinished task',
        originalEvent: 'A task I agreed to do is still not done, and I was reminded about it again.',
        rawOutgoingMessage:
          'I was going to do it, but then you kept reminding me and it made me not want to do it.',
        facts: [
          { id: 'f-h1', text: 'I said I would handle it.', state: 'suggested', source: 'stack_trace' },
          { id: 'f-h2', text: 'It is still not done.', state: 'suggested', source: 'stack_trace' },
        ],
        assumptions: [
          { id: 'a-h1', text: 'She thinks I am irresponsible.', state: 'suggested', source: 'stack_trace' },
        ],
        feelings: [
          { id: 'e-h1', text: 'Embarrassed', state: 'suggested', source: 'state_inspector' },
          { id: 'e-h2', text: 'Defensive', state: 'suggested', source: 'state_inspector' },
        ],
        actionUrge: 'Defend',
        intensity: 4,
        desiredOutcome: 'Close this out without starting a second argument.',
        trace: [
          { tool: 'context_switch', status: 'complete' },
          { tool: 'stack_trace', status: 'active' },
          { tool: 'message_compiler', status: 'recommended' },
          { tool: 'unit_tests', status: 'available' },
        ],
      }),
  },
  {
    id: 'engineer',
    title: 'The engineer avoiding the status update',
    proves: 'Signal Decoder, Thought Debugger, Message Compiler, and Unit Tests.',
    build: () =>
      createSituation({
        id: 'situation-engineer',
        title: 'A status request I have been avoiding',
        scenarioId: 'engineer',
        activeTool: 'signal_decoder',
        activeWorkspace: 'understand',
        roles: {
          user: 'Engineer',
          recipient: 'Product manager',
          relationship: 'Cross-functional teammate',
          channel: 'Slack or Teams',
        },
        goal: 'Respond to a status request',
        incomingMessage: 'Just checking in again. Do we have an update yet?',
        rawOutgoingMessage:
          'I have not really worked on it because I got distracted by a more interesting project.',
        assumptions: [
          {
            id: 'a-e1',
            text: 'They think I am incompetent because I am behind.',
            state: 'suggested',
            source: 'thought_debugger',
          },
        ],
        feelings: [
          { id: 'e-e1', text: 'Embarrassed', state: 'suggested', source: 'state_inspector' },
          { id: 'e-e2', text: 'Anxious', state: 'suggested', source: 'state_inspector' },
        ],
        actionUrge: 'Withdraw',
        intensity: 3,
        desiredOutcome: 'Give an honest status without sounding careless.',
        trace: [
          { tool: 'context_switch', status: 'complete' },
          { tool: 'signal_decoder', status: 'active' },
          { tool: 'thought_debugger', status: 'recommended' },
          { tool: 'message_compiler', status: 'available' },
          { tool: 'unit_tests', status: 'available' },
        ],
      }),
  },
  {
    id: 'conflict',
    title: 'The argument that created a second argument',
    proves: 'Conflict Trace, Patch, and Postmortem.',
    build: () =>
      createSituation({
        id: 'situation-conflict',
        title: 'A short exchange that forked',
        scenarioId: 'conflict',
        activeTool: 'conflict_trace',
        activeWorkspace: 'understand',
        roles: {
          user: 'Partner',
          recipient: 'Partner',
          relationship: 'Close personal relationship',
          channel: 'Text message',
        },
        goal: 'Find where it went wrong and repair it',
        conversation: [
          { speaker: 'Alex', text: 'I asked you twice if you could take care of the kitchen.' },
          { speaker: 'Sam', text: 'I said I would do it. You don’t have to keep reminding me.' },
          { speaker: 'Alex', text: 'But when you say that, it usually doesn’t happen until I do it.' },
          { speaker: 'Sam', text: 'Fine. Just do it yourself then.' },
        ],
        trace: [
          { tool: 'conflict_trace', status: 'active' },
          { tool: 'patch', status: 'recommended' },
          { tool: 'postmortem', status: 'available' },
        ],
      }),
  },
] as const;

export function scenarioById(id: string): PreparedScenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
