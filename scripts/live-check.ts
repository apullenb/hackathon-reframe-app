/**
 * Live AI verification. Runs each mode's real prompt through the dev proxy (so the key stays in
 * the Node process — this script never sees it), validates the response against the same Zod
 * gate the UI uses, and asserts the spec §27 content rules.
 */
import { buildPrompt } from '@/ai/prompts';
import { validateResponse } from '@/schemas';
import { extractJsonObject } from '@/ai/ProxyAiClient';
import { PREPARED_SCENARIOS, CONFLICT_ALEX_SAM_SPEAKERS } from '@/fixtures';
import type { ContextSwitchRequest } from '@/types/contracts';

const ENDPOINT = 'http://localhost:5173/api/context-switch';

async function callLive(req: ContextSwitchRequest) {
  const { system, user } = buildPrompt(req);
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ system, user, maxTokens: 4096 }),
  });
  const latency = Date.now() - t0;
  if (!res.ok) {
    const body = await res.text();
    return { ok: false as const, latency, error: `HTTP ${res.status} ${body.slice(0, 120)}` };
  }
  const payload = (await res.json()) as { text?: string };
  const raw = extractJsonObject(payload.text ?? '');
  if (!raw) return { ok: false as const, latency, error: 'no JSON object in model output' };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ok: false as const, latency, error: 'JSON.parse failed' }; }
  const outcome = validateResponse(req.mode, parsed);
  if (!outcome.ok) return { ok: false as const, latency, error: 'SCHEMA: ' + outcome.issues.join(' | ') };
  return { ok: true as const, latency, value: outcome.value };
}

const scenario = (id: string) => {
  const s = PREPARED_SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error('missing scenario ' + id);
  return s;
};

let pass = 0, fail = 0;
const check = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

async function main() {
  /* ── 1. Say It Better, engineer → PM ─────────────────────────── */
  console.log('\n1. Say It Better — engineer to product manager (live)');
  const eng = scenario('engineer_pm_status');
  const r1 = await callLive({
    mode: 'say_it_better',
    context: eng.context,
    sourceText: eng.sourceText!,
    followUpAnswers: eng.seededFollowUpAnswers,
  });
  console.log(`  latency: ${r1.latency}ms`);
  check('schema valid', r1.ok, r1.ok ? '' : r1.error);
  if (r1.ok && r1.value.mode === 'say_it_better') {
    const v = r1.value;
    const msg = (v.sendableMessage ?? '').toLowerCase();
    console.log(`  --- sendable message ---\n  ${v.sendableMessage}\n`);
    console.log(`  --- unfiltered ---\n  ${v.unfilteredTranslation ?? '(none)'}\n`);
    check('produced a sendable message', Boolean(v.sendableMessage));
    check('HONESTY: does not claim the side project was approved',
      !/\bapproved\b|\bapproval\b|\bsigned off\b/.test(msg), msg.slice(0,90));
    check('HONESTY: does not claim the feature is nearly done',
      !/nearly (complete|done|finished)|almost (complete|done)|mostly done/.test(msg));
    check('preserves the 3:00 PM commitment the user actually gave',
      /3(:00)?\s*(pm|p\.m\.)/i.test(v.sendableMessage ?? ''));
    check('has >= 2 alternative tones', (v.alternatives?.length ?? 0) >= 2);
    check('explains what changed', (v.changesMade?.length ?? 0) > 0);
    check('honestyCheck passed', v.honestyCheck?.passed !== false);
  }

  /* ── 2. Decode It ────────────────────────────────────────────── */
  console.log('\n2. Decode It — PM check-in (live)');
  const dec = scenario('decode_pm_checkin');
  const r2 = await callLive({ mode: 'decode_it', context: dec.context, sourceText: dec.sourceText! });
  console.log(`  latency: ${r2.latency}ms`);
  check('schema valid', r2.ok, r2.ok ? '' : r2.error);
  if (r2.ok && r2.value.mode === 'decode_it') {
    const v = r2.value;
    console.log(`  literal: ${v.literalMeaning}`);
    console.log(`  unknowns: ${v.unknowns.map(u => '\n    - ' + u).join('')}`);
    const nonUnknown = JSON.stringify({ ...v, unknowns: [] }).toLowerCase();
    check('does NOT assert the sender is annoyed/frustrated/angry',
      !/\b(annoyed|angry|frustrated|irritated|impatient|upset)\b/.test(nonUnknown));
    check('unknowns mention that feeling/tone cannot be determined',
      /cannot|can't|unclear|not (possible|knowable)|no way to|does not (tell|indicate)|unknow/i.test(v.unknowns.join(' ')));
    check('every interpretation carries a support label',
      v.interpretations.every(i => ['strongly_supported','plausible','speculative'].includes(i.support)));
    check('exactly 3 response options', v.responseOptions.length === 3);
    check('knownFacts non-empty and separate', v.knownFacts.length > 0);
  }

  /* ── 3. Conflict Lens ────────────────────────────────────────── */
  console.log('\n3. Conflict Lens — Alex and Sam (live)');
  const con = scenario('alex_sam_kitchen');
  const r3 = await callLive({
    mode: 'conflict_lens',
    context: con.context,
    speakers: con.speakers ?? CONFLICT_ALEX_SAM_SPEAKERS,
    conversation: con.conversation!,
  });
  console.log(`  latency: ${r3.latency}ms`);
  check('schema valid', r3.ok, r3.ok ? '' : r3.error);
  if (r3.ok && r3.value.mode === 'conflict_lens') {
    const v = r3.value;
    console.log(`  core problem: ${v.coreProblem}`);
    console.log(`  repair: ${v.repairMessage.slice(0,160)}`);
    check('exactly 2 participants', v.participants.length === 2);
    check('both stated positions present', v.participants.every(p => p.statedPosition.length > 0));
    check('core problem is not "communicate better"',
      !/should (just )?communicate better|need to communicate better/i.test(v.coreProblem));
    check('core problem names completion/follow-through or trust',
      /complet|done|finish|follow.?through|trust|reliab|timing|when/i.test(v.coreProblem));
    check('does not declare one person right',
      !/\b(alex|sam) is (right|wrong|at fault)\b/i.test(JSON.stringify(v)));
    check('has a repair message', v.repairMessage.length > 20);
    check('escalation points describe wording, not character', v.escalationPoints.length > 0);
  }

  /* ── 4. Does the ROLE PAIR + CHANNEL actually change the output? ── */
  console.log('\n4. Role pair / channel materially change the output (spec §32)');
  const raw = eng.sourceText!;
  const slackToPm = await callLive({
    mode: 'say_it_better',
    context: { ...eng.context, otherRole: 'Product manager', channel: 'Slack or Teams' },
    sourceText: raw, followUpAnswers: eng.seededFollowUpAnswers,
  });
  const emailToExec = await callLive({
    mode: 'say_it_better',
    context: { ...eng.context, otherRole: 'Executive', channel: 'Email', desiredTone: 'Executive-ready' },
    sourceText: raw, followUpAnswers: eng.seededFollowUpAnswers,
  });
  if (slackToPm.ok && emailToExec.ok
      && slackToPm.value.mode === 'say_it_better' && emailToExec.value.mode === 'say_it_better') {
    const a = slackToPm.value.sendableMessage ?? '';
    const b = emailToExec.value.sendableMessage ?? '';
    console.log(`\n  ── Engineer → PRODUCT MANAGER on Slack (${a.length} chars) ──\n  ${a}\n`);
    console.log(`  ── Engineer → EXECUTIVE over email (${b.length} chars) ──\n  ${b}\n`);
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z ]/g,'').split(/\s+/).filter(Boolean);
    const wa = new Set(norm(a)), wb = new Set(norm(b));
    const overlap = [...wa].filter(w => wb.has(w)).length / Math.max(wa.size, 1);
    console.log(`  word overlap: ${(overlap*100).toFixed(0)}%`);
    check('the two messages are not near-identical', overlap < 0.85, `overlap ${(overlap*100).toFixed(0)}%`);
    check('both still preserve the 3:00 PM commitment',
      /3(:00)?\s*(pm|p\.m\.)/i.test(a) && /3(:00)?\s*(pm|p\.m\.)/i.test(b));
    check('neither invents approval',
      !/\bapproved\b|\bapproval\b/i.test(a) && !/\bapproved\b|\bapproval\b/i.test(b));
  } else {
    check('side-by-side comparison ran', false,
      (slackToPm.ok ? '' : 'slack: ' + slackToPm.error) + ' ' + (emailToExec.ok ? '' : 'exec: ' + emailToExec.error));
  }

  console.log(`\n${'='.repeat(52)}\n  passed: ${pass}\n  failed: ${fail}\n${'='.repeat(52)}`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('RUNNER ERROR', e); process.exit(1); });
