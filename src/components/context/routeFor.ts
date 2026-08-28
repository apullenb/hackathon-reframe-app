import type { CommunicationContext, ContextSwitchMode } from '@/types/contracts';

/**
 * Which direction the role route points, by mode.
 *
 * `selfRole` is always the user. In Say It Better the user is the sender, so the route reads
 * user → recipient. In Decode It the user is the *recipient*, so the route reverses and reads
 * PRODUCT MANAGER → ENGINEER when decoding a PM's message (spec §29, Prompt 4). Getting this
 * backwards would make the signature element lie about who is talking.
 */
export function routeFor(
  mode: ContextSwitchMode | null,
  context: Partial<CommunicationContext>,
): { from: string | undefined; to: string | undefined } {
  if (mode === 'decode_it') {
    return { from: context.otherRole, to: context.selfRole };
  }
  return { from: context.selfRole, to: context.otherRole };
}

/** Labels for the two role selectors, which change meaning by mode. */
export function roleLabelsFor(mode: ContextSwitchMode | null): {
  self: string;
  other: string;
  selfHint: string;
  otherHint: string;
} {
  if (mode === 'decode_it') {
    return {
      self: 'I am',
      other: 'They are (the sender)',
      selfHint: 'You received this message.',
      otherHint: 'Who sent the message you are decoding.',
    };
  }
  if (mode === 'conflict_lens') {
    return {
      self: 'I am',
      other: 'They are',
      selfHint: 'Your role in the conversation.',
      otherHint: "The other participant's role.",
    };
  }
  return {
    self: 'I am',
    other: 'They are',
    selfHint: 'Your role.',
    otherHint: 'Who will receive this message.',
  };
}
