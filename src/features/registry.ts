import {
  ArrowLeftRight, Gauge, Bug, Layers, Braces, AudioLines, GitBranch,
  CirclePause, ListChecks, Bandage, Activity, ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ToolId, WorkspaceId } from '@/situation/types';

/**
 * The twelve named features (brief §4). Names are approved copy and must appear exactly as
 * written — do not paraphrase a label.
 *
 * This registry is the single source for navigation, the command palette, the all-tools strip and
 * the cross-feature trace, so a feature cannot exist in one surface and be missing from another.
 */

export type FeatureDefinition = {
  id: ToolId;
  /** Approved name. Exact copy from brief §4. */
  name: string;
  workspace: WorkspaceId;
  icon: LucideIcon;
  /** One line, user-facing, in the product voice. */
  summary: string;
  /** Plain-language phrases that should find this feature in the palette (brief §6.6). */
  aliases: string[];
  /** Opens as an overlay from anywhere rather than as a workspace screen. */
  overlay?: boolean;
};

export const FEATURES: readonly FeatureDefinition[] = [
  {
    id: 'context_switch',
    name: 'Context Switch',
    workspace: 'home',
    icon: ArrowLeftRight,
    summary: 'Change which version of you is active, and who you are talking to.',
    aliases: ['switch role', 'change role', 'who am i', 'recipient', 'runtime'],
    overlay: true,
  },
  {
    id: 'state_inspector',
    name: 'State Inspector',
    workspace: 'inspect',
    icon: Gauge,
    summary: 'Check thoughts, feelings, body signals, and action urges.',
    aliases: ['i do not know what i feel', "i don't know what i feel", 'how do i feel', 'check in'],
  },
  {
    id: 'thought_debugger',
    name: 'Thought Debugger',
    workspace: 'inspect',
    icon: Bug,
    summary: 'Separate facts from assumptions.',
    aliases: ['am i overthinking', 'is this true', 'facts', 'assumptions'],
  },
  {
    id: 'stack_trace',
    name: 'Stack Trace',
    workspace: 'inspect',
    icon: Layers,
    summary: 'See how the situation became a reaction.',
    aliases: ['how did i get here', 'why did i react', 'what happened'],
  },
  {
    id: 'message_compiler',
    name: 'Message Compiler',
    workspace: 'communicate',
    icon: Braces,
    summary: 'Convert raw intent into usable communication.',
    aliases: ['help me say this', 'rewrite', 'say it better', 'draft a message'],
  },
  {
    id: 'unit_tests',
    name: 'Unit Tests',
    workspace: 'communicate',
    icon: ListChecks,
    summary: 'Check whether a message is honest, clear, and complete.',
    aliases: ['is this message ok', 'check my message', 'test my draft'],
  },
  {
    id: 'signal_decoder',
    name: 'Signal Decoder',
    workspace: 'understand',
    icon: AudioLines,
    summary: 'Interpret an incoming message without pretending to read minds.',
    aliases: ['what does this mean', 'what did they mean', 'decode', 'they sent me this'],
  },
  {
    id: 'conflict_trace',
    name: 'Conflict Trace',
    workspace: 'understand',
    icon: GitBranch,
    summary: 'Find where a conversation broke.',
    aliases: ['we keep having the same argument', 'where did this go wrong', 'argument'],
  },
  {
    id: 'breakpoint',
    name: 'Breakpoint',
    workspace: 'inspect',
    icon: CirclePause,
    summary: 'Pause before responding.',
    aliases: ['i am about to say something stupid', 'stop me', 'pause', 'wait'],
    overlay: true,
  },
  {
    id: 'patch',
    name: 'Patch',
    workspace: 'repair',
    icon: Bandage,
    summary: 'Repair a message already sent.',
    aliases: ['i already sent it', 'help me apologize', 'apologise', 'fix what i said'],
  },
  {
    id: 'health_check',
    name: 'Health Check',
    workspace: 'patterns',
    icon: Activity,
    summary: 'Review recurring communication patterns.',
    aliases: ['what keeps happening', 'patterns', 'again'],
  },
  {
    id: 'postmortem',
    name: 'Postmortem',
    workspace: 'patterns',
    icon: ScrollText,
    summary: 'Reflect on what worked and what failed.',
    aliases: ['what did i learn', 'review', 'retro'],
  },
] as const;

export const WORKSPACES: ReadonlyArray<{
  id: WorkspaceId;
  label: string;
  question: string;
}> = [
  { id: 'home', label: 'Home', question: 'What needs debugging?' },
  { id: 'inspect', label: 'Inspect', question: 'What is happening inside me?' },
  { id: 'communicate', label: 'Communicate', question: 'How do I say what I actually mean?' },
  { id: 'understand', label: 'Understand', question: 'What did they say, and what am I adding?' },
  { id: 'repair', label: 'Repair', question: 'What do I do after it went wrong?' },
  { id: 'patterns', label: 'Patterns', question: 'What keeps happening, and what can I learn?' },
] as const;

export function featureById(id: ToolId): FeatureDefinition {
  const found = FEATURES.find((feature) => feature.id === id);
  if (!found) throw new Error(`Unknown feature: ${id}`);
  return found;
}

export function featuresForWorkspace(workspace: WorkspaceId): FeatureDefinition[] {
  return FEATURES.filter((feature) => feature.workspace === workspace);
}
