import type { ContextSwitchRequest } from '@/types/contracts';
import { toCommunicationContext, type SessionState } from '@/state/sessionState';

/**
 * A request may carry the prepared-scenario id. It is not part of the spec §17 contract, so it
 * rides along as an additive field the AI layer reads defensively — the router uses it to
 * decide whether a fixture may be *offered* on failure (spec §16: never silently substituted,
 * and never offered for custom content).
 */
export type ScenarioTaggedRequest = ContextSwitchRequest & { scenarioId?: string };

/**
 * Assemble the model request from session state. Returns null when the context or input is
 * incomplete, so a half-built request can never be sent.
 *
 * The role pair, relationship, channel, outcome, and tone all travel inside `context` — that is
 * the mechanism by which the context actually changes the output rather than just decorating
 * the screen.
 */
export function buildRequest(state: SessionState): ScenarioTaggedRequest | null {
  const context = toCommunicationContext(state.context);
  if (!context || !state.mode) return null;

  const scenarioId = state.scenarioId ?? undefined;

  switch (state.mode) {
    case 'say_it_better': {
      const sourceText = state.inputs.sourceText.trim();
      if (!sourceText) return null;
      return {
        mode: 'say_it_better',
        context,
        sourceText,
        followUpAnswers:
          Object.keys(state.followUpAnswers).length > 0 ? state.followUpAnswers : undefined,
        scenarioId,
      };
    }

    case 'decode_it': {
      const sourceText = state.inputs.sourceText.trim();
      if (!sourceText) return null;
      return {
        mode: 'decode_it',
        context,
        sourceText,
        precedingContext: state.inputs.precedingContext.trim() || undefined,
        scenarioId,
      };
    }

    case 'conflict_lens': {
      const conversation = state.inputs.conversation.trim();
      if (!conversation || state.inputs.speakers.length !== 2) return null;
      return {
        mode: 'conflict_lens',
        context,
        speakers: state.inputs.speakers,
        conversation,
        scenarioId,
      };
    }

    default: {
      const exhaustive: never = state.mode;
      return exhaustive;
    }
  }
}
