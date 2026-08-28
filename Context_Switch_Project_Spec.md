# Context Switch

## Complete Hackathon Product Specification and Claude Code Build Contract

**Tagline:** Translate intent into impact.  
**Product type:** Responsive AI-powered web application  
**Build target:** Impressive, reliable hackathon demo  
**Estimated build window:** 4–5 hours  
**Primary build agent:** Claude Code  
**Backend requirement:** No database, authentication system, user accounts, or persistent application backend. A single thin server-side AI relay/API route is allowed and recommended so an API key is never exposed in the browser.

---

## 0. Instructions to Claude Code

This document is the source of truth for building the Context Switch hackathon application from start to finish.

### Required behavior

1. Inspect the current repository before making changes.
2. If an application already exists, adapt to its framework and conventions unless doing so would prevent the required demo.
3. If the repository is empty, use the recommended stack in this document.
4. Implement all **P0** requirements before attempting **P1** features.
5. Favor a complete, polished, reliable demo over broad but unfinished functionality.
6. Integrate a real LLM for live text transformations when a valid API key is available.
7. Provide deterministic fixture responses for every presentation-critical scenario.
8. Never expose an AI provider key in browser-delivered JavaScript.
9. Do not add a database, authentication, payments, automatic message sending, or external account integration.
10. Continuously maintain the separate file `HACKATHON_BUILD_LOG.md` using the requirements and template provided with this specification.
11. Update the build log during the work, not only after the application is complete.
12. Do not write API keys, private messages, screenshots, or other sensitive content into the log.
13. Run relevant validation after each major milestone and record the result.
14. Before finishing, execute the complete demo flow, fix presentation-breaking issues, and complete the final retrospective in the build log.

### Final deliverables

- Working Context Switch application
- `README.md` with install, environment, run, build, and demo instructions
- Continuously maintained `HACKATHON_BUILD_LOG.md`
- Optional `DEMO_SCRIPT.md` if the team wants the judging script separated from this specification
- No committed secrets

---

## 1. Executive Summary

Context Switch is an AI communication translator that helps people communicate across different roles, relationships, expectations, and communication styles.

A user identifies their role and the other person's role, provides a message or raw intent, and selects what they are trying to accomplish. Context Switch then performs one of three jobs:

1. **Say It Better:** Turn an honest but poorly phrased thought into an appropriate, sendable message.
2. **Decode It:** Explain what an incoming message literally says, what it may imply, what cannot be known, and how to respond.
3. **Conflict Lens:** Examine a conversation from both sides, identify the real disagreement and escalation points, and suggest constructive paths forward.

The product can be funny, but it must remain genuinely useful. Humor appears as an optional “unfiltered translation” or playful label. The sendable output must preserve the truth, avoid inventing commitments, and fit the actual relationship and channel.

### Core product idea

> The same words land differently depending on who is speaking, who is listening, what their relationship is, what they need, and where the conversation is happening.

### Product promise

> Context Switch does not claim to read minds. It separates what was said, what may have been meant, what was inferred, and what still needs to be asked.

---

## 2. The Problem

Communication often breaks down because people translate their own intent into words but receive other people's words as impact.

Examples:

- An engineer gives technical detail when a product manager needs risk and timing.
- A manager thinks a request is neutral while a direct report hears a command.
- A spouse tries to communicate frustration but the other person hears contempt.
- A friend expects reassurance but asks an indirect question.
- A neighbor sends a short message that feels hostile even though the tone is ambiguous.

Generic writing assistants can make a message “more professional” or “friendlier,” but they usually do not reason explicitly about the role pair, relationship, communication channel, desired outcome, existing power dynamic, or the difference between evidence and interpretation.

Context Switch treats that context as the product rather than as an optional prompt detail.

---

## 3. Goals and Non-Goals

### Hackathon goals

- Make the premise understandable in under 20 seconds.
- Create an immediate laugh with the engineer-to-product-manager scenario.
- Demonstrate a useful professional translation directly after the laugh.
- Show that the application can interpret incoming communication without pretending to know hidden intent.
- Demonstrate thoughtful conflict analysis in a visually impressive format.
- Use live AI while remaining presentation-safe when the network or model fails.
- Make role-to-role context feel like a meaningful product capability rather than a decorative dropdown.
- Provide enough visual polish that the application feels like a real product.
- Document the build process, decisions, experiments, failures, and results.

### Long-term product goals

- Reduce avoidable communication breakdowns.
- Help users communicate honestly in a form the recipient can use.
- Teach users to distinguish facts, interpretations, needs, and assumptions.
- Help users set boundaries without unnecessary escalation.
- Give users useful response options rather than one supposedly perfect answer.
- Adapt to professional, personal, and community relationships.

### Non-goals

Context Switch is not:

- A mind-reading tool
- A lie generator
- A system for manipulating a recipient
- A therapist, couples counselor, HR representative, attorney, or crisis service
- A psychological diagnosis tool
- An authority deciding which person is morally correct
- A message-sending application
- A monitoring tool for live conversations
- A replacement for direct clarification
- A storage system for private conversations

---

## 4. Target Users and Example Contexts

### Professional users

- Engineer communicating with a product manager
- Employee communicating with a manager
- Manager communicating with a direct report
- Coworker disagreeing with another coworker
- Designer explaining a concern to an engineer
- Client communicating with a service provider
- Team member writing to an executive

### Personal users

- Spouse or partner
- Friend
- Parent
- Teenager
- Adult child
- Roommate
- Neighbor

### Core jobs to be done

- “Help me say this honestly without making it worse.”
- “Tell me what this message actually says versus what I am assuming.”
- “Help me give an update without sounding careless or evasive.”
- “Help me say no without being hostile.”
- “Help me understand why this argument keeps going in circles.”
- “Help me respond in a way that moves the conversation forward.”

---

## 5. Product Modes

## 5.1 Say It Better

The user enters their raw, honest intent. The application asks only the follow-up questions that would materially affect the result and then generates an appropriate version for the recipient.

### Required inputs

- `I am`: user's role
- `They are`: recipient's role
- Relationship context
- Communication channel
- Desired outcome
- Desired tone
- Raw message or honest intent

### Required results

- Optional funny/unfiltered translation
- Primary sendable version
- Two alternative versions with meaningfully different tones
- “How this may land” preview
- Important information that is still missing
- Brief explanation of what changed and why
- Copy button
- Regenerate button
- Tone adjustment control

### Product rule

The sendable version must preserve material truth. The application may improve framing, order, specificity, empathy, and tone. It must not invent progress, approvals, dates, reasons, promises, consensus, or facts.

---

## 5.2 Decode It

The user pastes an incoming message or, as a stretch feature, uploads a screenshot. The application separates literal content from possible interpretation.

### Required inputs

- User role
- Sender role
- Relationship context
- Communication channel
- Incoming message
- Optional preceding context

### Required results

- Literal meaning
- Likely purpose of the message
- Known facts
- Plausible interpretations
- Unknowns that cannot be determined
- Emotional/tone cues present in the actual language
- What a useful response should contain
- Suggested clarification question
- Three response options

### Interpretation labels

Every inferred interpretation must be visually labeled:

- **Strongly supported:** directly supported by wording or clear context
- **Plausible:** reasonable but not proven
- **Speculative:** possible, with weak evidence

Do not present “speculative” content by default if it is likely to inflame the situation.

---

## 5.3 Conflict Lens

The user pastes or uploads a short conversation, assigns speakers, and identifies their relationship. The application creates a neutral, evidence-aware conflict map.

### Required outputs

- Neutral conversation summary
- Each person's stated position
- Each person's possible underlying concern or need
- Facts both parties appear to agree on
- Disputed facts or incompatible assumptions
- Questions that were asked but not answered
- Escalation points
- “What they may be trying to say” versus “What the other person may be hearing”
- Core unresolved problem
- Shared goal, if one is evident
- Two to four resolution options
- Suggested next conversation structure
- One repair/reset message

### Critical rule

Conflict Lens must not force false equivalence. If the messages contain threats, intimidation, coercion, discriminatory harassment, or an immediate safety concern, the response should not reduce the issue to “both sides need to communicate better.” It should name the observable behavior carefully and recommend appropriate human or professional support without diagnosing the sender.

---

## 6. Context Model

Context is required because it is the product's main differentiator.

### Roles for the MVP

Use a searchable dropdown or visually appealing role cards. Include:

#### Work roles

- Engineer
- Product manager
- Designer
- Manager
- Direct report
- Coworker
- Executive
- Client
- Customer
- HR representative

#### Personal roles

- Spouse/partner
- Friend
- Parent
- Teenager
- Adult child
- Roommate
- Neighbor
- Teacher

Add `Other` with a short custom label. Do not attempt to prebuild special logic for every possible role pair; pass the selected role context to the model.

### Relationship types

- Professional peer
- Reporting relationship
- Cross-functional teammate
- Client/service relationship
- Close personal relationship
- Family relationship
- Casual relationship
- Community relationship

### Channels

- Slack or Teams
- Email
- Text message
- Performance review
- Meeting follow-up
- In-person conversation preparation

### Desired outcomes

- Give a status update
- Ask for clarification
- Ask for help
- Disagree
- Say no
- Set a boundary
- Apologize
- Repair a misunderstanding
- Request accountability
- De-escalate
- Give feedback
- Respond to criticism

### Tone choices

- Balanced
- Warm and collaborative
- Concise and direct
- Diplomatic
- Firm but respectful
- Accountable
- Casual
- Executive-ready

### Optional controls

- Urgency: low, normal, high
- Relationship temperature: calm, tense, already escalating
- Length: short, medium, detailed
- Humor: off, subtle, fully unfiltered internal translation
- Corporate jargon: allow, reduce, remove

---

## 7. Smart Follow-Up Questions

The application should not behave like a chatbot. When required information is missing, display one to three structured follow-up questions in a compact step.

### Ask a follow-up when

- The desired outcome is unclear.
- A status update lacks actual progress.
- A commitment or date would otherwise need to be invented.
- The user may be asking the system to conceal a material fact.
- The role or speaker assignment is ambiguous.
- A screenshot contains more than two speakers.
- A conflict has no clear preceding event.
- The user's relationship to the conversation is unclear.
- A boundary request does not state the intended boundary.

### Do not ask when

- The missing information would not materially affect the output.
- The application can safely state the uncertainty.
- The user selected a prepared demo scenario whose answers are already seeded.

### Follow-up UI

- One question per compact card
- Two to four tappable choices whenever possible
- Optional short custom response
- Visible `Why are we asking?` explanation
- `Skip` allowed unless the answer is required to avoid inventing a fact

### Engineer scenario follow-ups

1. Was the other project assigned or approved?
2. Roughly how much progress has been made on the requested feature?
3. When can you provide a reliable ETA?

Prepared answers for the demo:

- Other project: `Exploratory and related, but not formally prioritized`
- Progress: `Initial setup only; implementation has not meaningfully started`
- Next update: `By 3:00 PM today`

---

## 8. Flagship Demo Scenario

### Input

**I am:** Engineer  
**They are:** Product manager  
**Channel:** Slack  
**Outcome:** Give a status update  
**Tone:** Accountable, professional, concise  

> I haven't really worked on it much because I got distracted working on a more interesting project.

### Funny internal translation

> I followed the dopamine instead of the roadmap.

### Example sendable result

> Progress is behind where I expected it to be. I shifted some time to explore a related project, which reduced the progress I made on this feature. I'm refocusing on it now and will send a realistic scope and ETA by 3:00 PM today.

### How it may land

- Honest about the lack of progress
- Takes responsibility without unnecessary self-criticism
- Explains the context without presenting it as an excuse
- Gives the product manager a concrete next checkpoint

### What changed

- Replaced dismissive wording with an accountable status
- Preserved the fact that focus shifted
- Added the next action and timing supplied by the user
- Did not claim that the alternate work was approved

### Recommended demo transition

After the audience laughs at the internal translation, immediately show that the sendable version is honest rather than deceptive. This is the moment that establishes the product as useful instead of gimmicky.

---

## 9. Additional Prepared Demo Scenarios

Every prepared scenario must work in both live-AI and deterministic-demo modes.

## 9.1 Decode a product-manager message

**Message:**

> Just checking in. Do we have an update on this yet?

Expected output themes:

- Literal: request for current status
- Plausible: sender may need information for planning or may be answering to someone else
- Unknown: frustration cannot be reliably determined from this message alone
- Useful reply should include progress, blocker, next milestone, and next update time

## 9.2 Spouse/partner conflict

Use a short fictional conversation with no abuse, threats, or crisis content.

**Alex:** “I asked you twice if you could take care of the kitchen.”  
**Sam:** “I said I would do it. You don't have to keep reminding me.”  
**Alex:** “But when you say that, it usually doesn't happen until I do it.”  
**Sam:** “Fine. Just do it yourself then.”

Expected analysis themes:

- Surface issue: kitchen task
- Alex's concern: reliability and carrying follow-up responsibility
- Sam's concern: feeling monitored or assumed incapable
- Escalation: “You don't have to keep reminding me,” generalized history, and “Just do it yourself”
- Core problem: no shared definition of when the task will be complete and low trust in follow-through
- Possible resolution: agree on a specific completion time and avoid repeated reminders before that time
- Repair message must acknowledge impact without declaring one person entirely correct

## 9.3 Firm neighbor boundary

**Raw intent:**

> Your dog wakes me up every morning and I'm sick of it. Do something about it.

Expected output themes:

- Preserve a clear boundary
- Include observable behavior and timeframe
- Request a concrete change
- Avoid personal attack
- Offer direct, firm, and neighborly variants

---

## 10. Feature Priorities

## 10.1 P0 — Required for the hackathon demo

### Shared application

- Responsive application shell
- Context Switch branding
- Three primary mode cards or tabs
- Persistent but local current-session state
- Reset Demo control
- Prepared Scenario control
- Clear live-AI/demo-fallback indicator in a discreet developer/demo area
- Useful loading, retry, and error states

### Say It Better

- Role pair selection
- Channel, outcome, and tone selection
- Raw message input
- Structured follow-up step
- Live AI request through one protected server-side route
- Deterministic response fallback
- Funny internal translation
- Primary sendable result
- Two alternative tones
- How-it-may-land section
- What-changed section
- Copy action with visible success state

### Decode It

- Incoming text input
- Role and relationship context
- Literal meaning
- Known facts
- Plausible interpretations with support labels
- Unknowns
- Suggested clarification
- Three response options

### Conflict Lens

- Pasted two-speaker conversation
- Speaker assignment
- Neutral summary
- Side-by-side positions and possible concerns
- Agree/disagree/unknown structure
- Escalation timeline or markers
- Core problem
- Resolution options
- Repair message

### Demo reliability

- All three prepared scenarios available
- Fixtures return the expected shape without network access
- Live request timeout and fallback
- No presentation-critical blank states
- Application can reset to the beginning in one action

### Documentation

- README
- Build and decision log updated throughout work
- Final demo verification recorded

## 10.2 P1 — Add only after P0 is complete and polished

- Single screenshot upload with AI vision/OCR
- Extracted text review and correction before analysis
- Tone slider from softer to firmer
- `Remove corporate nonsense` control
- Editable generated result
- Regenerate only one section
- Download results as text
- Additional animations
- Example gallery
- Custom role descriptions
- Multi-speaker conflict support

## 10.3 P2 — Future product ideas, not for this build

- Multiple screenshots and conversation ordering
- Saved private history
- User preferences
- Slack, Teams, Gmail, or SMS integrations
- Browser extension
- Live meeting assistance
- Shared mediation sessions
- Organization-specific tone guides
- Personal communication profile
- On-device private inference
- Multilingual translation combined with context translation

---

## 11. User Experience Flows

## 11.1 Say It Better flow

1. User selects `Say It Better`.
2. User chooses self and recipient roles.
3. User selects relationship, channel, outcome, and tone.
4. User enters raw intent.
5. Application evaluates whether a follow-up is necessary.
6. User answers structured questions.
7. Application displays a staged loading sequence:
   - Understanding the role pair
   - Checking for missing facts
   - Preserving your intent
   - Shaping the message for the recipient
8. Results animate into view.
9. User copies the primary version or selects an alternative.

## 11.2 Decode It flow

1. User selects `Decode It`.
2. User sets their role and the sender's role.
3. User pastes a message.
4. Application analyzes literal language before inference.
5. Results display in layers: Said, May Mean, Unknown, Best Next Question.
6. User opens response options.

## 11.3 Conflict Lens flow

1. User selects `Conflict Lens`.
2. User selects the relationship and identifies themselves.
3. User pastes a labeled conversation.
4. Application confirms speaker parsing.
5. Conflict map appears.
6. User reviews each side, the escalation sequence, and the core issue.
7. User selects a resolution path.
8. Application displays a repair/reset message.

---

## 12. UI Direction Options

Claude should implement one cohesive direction, not combine unrelated visual styles. Use **Option A** unless the existing repository already has a strong design system.

## Option A — Context Switchboard (recommended)

### Concept

A polished “translation control panel” that visually routes a message from one role to another.

### Characteristics

- Clean modern SaaS interface with playful moments
- Role chips connected by an animated directional line
- Large central mode switcher
- Split input/output workspace on desktop
- Stacked cards on mobile
- Results organized as layers rather than one block of AI text
- Subtle switch, route, and signal motifs

### Suggested palette

- Background: warm off-white or very pale cool gray
- Primary: deep indigo
- Secondary: electric violet or cobalt
- Accent: bright chartreuse or lime used sparingly
- Warm accent: coral for conflict markers
- Success: teal
- Text: near-black navy

### Typography

- Modern rounded or humanist sans-serif for UI
- Optional monospaced accent for role routes and the funny internal translation
- Clear hierarchy; avoid tiny gray text

### Signature element

At the top of the workspace, show:

`ENGINEER  →  PRODUCT MANAGER`

Animate the central arrow during generation as if the message is moving through a translation circuit.

## Option B — Message Lab

### Concept

A communication experiment workspace with cards labeled Input, Context, Interpretation, and Output.

### Characteristics

- Slightly more serious and analytical
- Notebook/lab visual language
- Evidence tags and confidence chips
- Excellent for Decode It and Conflict Lens
- Less immediately funny than Option A

### Palette

- Navy, pale blue, white, amber, and coral

## Option C — Human Protocol

### Concept

A playful technology interface that treats each relationship as a communication protocol.

### Characteristics

- More technical and hackathon-oriented
- Recipient compatibility meter
- Message packets and protocol badges
- Can become gimmicky if overused
- Best if the audience is mostly engineers

### Palette

- Dark navy, cyan, violet, and lime

---

## 13. Recommended Page and Component Design

## 13.1 Landing / Mode Selection

### Content

- Logo: Context Switch
- Tagline: Translate intent into impact.
- One-sentence explanation
- Three large mode cards
- Prepared demo dropdown

### Mode cards

#### Say It Better

> Turn the honest version in your head into the version another person can actually hear.

#### Decode It

> Separate what a message says from what it might mean and what still needs to be asked.

#### Conflict Lens

> See both sides, find the real problem, and choose a better next move.

## 13.2 Context Builder

- Step heading: `Set the context`
- Two prominent role selectors with directional connection
- Relationship and channel beneath the role pair
- Tone and outcome as selectable chips
- Context summary pinned above the message field
- Smart defaults based on the prepared scenario

## 13.3 Input Composer

- Large comfortable textarea
- Example prompt link
- Character count only if useful
- Privacy note: state only what is technically true
- Continue button disabled until required context and message exist
- For future screenshot support, use a secondary upload action

## 13.4 Follow-Up Questions

- Modal, drawer, or focused step
- Brief explanation that the system will not invent missing facts
- Question cards with tap targets
- Progress such as `1 of 3`

## 13.5 Say It Better Results

Use an impressive, layered result view:

1. **Unfiltered Translation** — playful monospaced card
2. **Ready to Send** — largest card and primary copy action
3. **Try Another Tone** — two smaller alternative cards
4. **How It May Land** — compact impact tags
5. **What Changed** — transparent explanation
6. **Still Missing** — only visible when relevant

## 13.6 Decode Results

Use four visually distinct layers:

1. **What it literally says**
2. **What it may be trying to accomplish**
3. **What you cannot know from this message**
4. **Best next question**

Below these, show three reply cards.

## 13.7 Conflict Lens Results

Desktop:

- Two equal-width participant columns
- Shared center column or lower panel for the core problem
- Horizontal escalation timeline
- Resolution path cards

Mobile:

- Participant cards stacked
- “What was meant / what was heard” pairs
- Vertical escalation timeline

Recommended visual sections:

- Person A's position
- Person B's position
- What each may need
- Shared facts
- Assumptions and unknowns
- Escalation moments
- Core unresolved problem
- Possible next moves
- Repair message

---

## 14. Interaction and Motion Guidance

- Use motion to communicate transformation, not decoration.
- Animate the role-to-role route while AI is running.
- Reveal results in logical order.
- Use subtle scale or glow on the primary sendable message.
- Provide immediate Copy success feedback.
- Respect `prefers-reduced-motion`.
- Do not use long typewriter animations that slow the demo.
- Avoid chat-style token streaming unless it is stable and visually intentional.
- Prefer skeleton cards or staged status text during generation.

---

## 15. Tone and Copy Guidelines

### Brand voice

- Smart
- Perceptive
- Direct
- Occasionally funny
- Never smug
- Never judgmental
- Comfortable admitting uncertainty

### Use language such as

- “One possible interpretation is…”
- “The wording supports…”
- “The message does not tell us whether…”
- “This version preserves the same boundary while removing the personal attack.”
- “Before I rewrite this, I need one fact so I don't invent a commitment.”

### Avoid language such as

- “Here is what they really mean.”
- “Your spouse is manipulating you.”
- “Your boss secretly wants to fire you.”
- “You are overreacting.”
- “Both sides are equally responsible.”
- “This is guaranteed to work.”

---

## 16. AI Integration Architecture

The application must integrate AI but does not need a conventional application backend.

### Recommended architecture

- Client-side responsive web application
- One thin server-side route or serverless function for model requests
- No database
- No authentication
- No message persistence
- No analytics containing message content
- Provider adapter isolated behind one interface
- Strict structured JSON responses
- Deterministic fixture fallback

### If the repository is empty

Recommended stack:

- Next.js with TypeScript
- Tailwind CSS
- Server route such as `/api/context-switch`
- Zod or equivalent runtime schema validation
- Lucide or another coherent icon set
- CSS/SVG for simple visualizations

Next.js is recommended because the same repository can serve the polished client and protect the AI key in one server-side route. No database or other backend service is required.

If the repository already uses React/Vite, preserve it and add a minimal local serverless function or development proxy. Do not place the provider key in a `VITE_*` variable because those values are exposed to the browser.

### Environment variables

Use provider-appropriate server-only names. Document the actual names in `README.md`.

Example abstraction:

```text
AI_PROVIDER=anthropic|openai|compatible
AI_API_KEY=server-only-secret
AI_MODEL=provider-model-name
AI_MODE=live|fixture|auto
```

Behavior:

- `live`: fail visibly with retry if live AI is unavailable
- `fixture`: always use deterministic prepared responses
- `auto`: attempt live AI, then offer or automatically use a fixture for prepared scenarios

Do not commit `.env` files containing secrets. Provide `.env.example` with placeholder values only.

### Required service interface

```ts
type ContextSwitchMode = 'say_it_better' | 'decode_it' | 'conflict_lens';

interface ContextSwitchAiClient {
  analyze(request: ContextSwitchRequest): Promise<ContextSwitchResponse>;
}
```

Implement:

- `LiveAiClient`
- `FixtureAiClient`
- A small router choosing the correct client based on environment and scenario

### Timeout and fallback

- Use a reasonable request timeout suitable for a live demo.
- On failure, preserve the user's inputs.
- Show `Try again`.
- For a prepared scenario, show `Use demo response`.
- Never silently replace a custom live response with unrelated fixture content.
- Record live/fallback behavior in the build log during testing.

---

## 17. Data Contracts

Use strict discriminated unions so each mode has a predictable response shape.

### Shared context

```ts
type CommunicationContext = {
  selfRole: string;
  otherRole: string;
  relationship: string;
  channel: string;
  desiredOutcome?: string;
  desiredTone?: string;
  urgency?: 'low' | 'normal' | 'high';
  relationshipTemperature?: 'calm' | 'tense' | 'escalating';
  lengthPreference?: 'short' | 'medium' | 'detailed';
  humorLevel?: 'off' | 'subtle' | 'unfiltered';
  reduceJargon?: boolean;
};
```

### Follow-up question

```ts
type FollowUpQuestion = {
  id: string;
  question: string;
  reason: string;
  required: boolean;
  options?: Array<{ id: string; label: string }>;
};
```

### Say It Better request

```ts
type SayItBetterRequest = {
  mode: 'say_it_better';
  context: CommunicationContext;
  sourceText: string;
  followUpAnswers?: Record<string, string>;
};
```

### Say It Better response

```ts
type SayItBetterResponse = {
  mode: 'say_it_better';
  needsFollowUp: boolean;
  followUpQuestions: FollowUpQuestion[];
  unfilteredTranslation?: string;
  sendableMessage?: string;
  alternatives?: Array<{
    id: string;
    label: string;
    tone: string;
    message: string;
  }>;
  howItMayLand?: Array<{
    label: string;
    sentiment: 'positive' | 'neutral' | 'caution';
  }>;
  changesMade?: string[];
  missingInformation?: string[];
  honestyCheck?: {
    passed: boolean;
    concerns: string[];
  };
  safety?: SafetyResult;
};
```

### Decode request

```ts
type DecodeRequest = {
  mode: 'decode_it';
  context: CommunicationContext;
  sourceText: string;
  precedingContext?: string;
};
```

### Decode response

```ts
type Interpretation = {
  text: string;
  support: 'strongly_supported' | 'plausible' | 'speculative';
  evidence?: string;
};

type DecodeResponse = {
  mode: 'decode_it';
  literalMeaning: string;
  likelyPurpose: Interpretation[];
  knownFacts: string[];
  interpretations: Interpretation[];
  unknowns: string[];
  toneCues: Array<{ cue: string; observation: string }>;
  usefulResponseShouldInclude: string[];
  clarificationQuestion: string;
  responseOptions: Array<{
    id: string;
    label: string;
    message: string;
  }>;
  safety?: SafetyResult;
};
```

### Conflict request

```ts
type ConflictSpeaker = {
  id: string;
  label: string;
  role: string;
  isUser: boolean;
};

type ConflictLensRequest = {
  mode: 'conflict_lens';
  context: CommunicationContext;
  speakers: ConflictSpeaker[];
  conversation: string;
};
```

### Conflict response

```ts
type ConflictLensResponse = {
  mode: 'conflict_lens';
  neutralSummary: string;
  participants: Array<{
    speakerId: string;
    statedPosition: string[];
    possibleConcerns: Interpretation[];
    whatTheyMayBeTryingToSay: string;
    whatTheOtherPersonMayHear: string;
  }>;
  sharedFacts: string[];
  disputedOrUnclear: string[];
  unansweredQuestions: string[];
  escalationPoints: Array<{
    excerpt: string;
    observation: string;
    effect: string;
  }>;
  coreProblem: string;
  sharedGoal?: string;
  resolutionOptions: Array<{
    title: string;
    description: string;
    tradeoff?: string;
  }>;
  suggestedConversationStructure: string[];
  repairMessage: string;
  falseEquivalenceWarning?: string;
  safety?: SafetyResult;
};
```

### Safety result

```ts
type SafetyResult = {
  category:
    | 'none'
    | 'high_stakes_professional'
    | 'threat_or_intimidation'
    | 'possible_abuse_or_coercion'
    | 'self_harm_or_immediate_danger'
    | 'illegal_or_deceptive_request';
  userMessage?: string;
  allowStandardOutput: boolean;
};
```

Validate all live model responses before passing them to the UI. If validation fails, retry once with a repair instruction or show the fallback/error state.

---

## 18. AI Prompting Requirements

Use separate prompt templates for each mode. Do not ask one giant prompt to handle every behavior.

### Shared system principles

The model should be instructed to:

- Preserve material truth.
- Never invent facts, commitments, approvals, deadlines, motivations, or history.
- Treat roles and power dynamics as context, not stereotypes.
- Distinguish literal content from inference.
- Mark uncertainty clearly.
- Avoid diagnosing people or assigning hidden motives.
- Avoid inflaming a conflict.
- Avoid false equivalence when observable harmful conduct is present.
- Prefer clarification when missing facts would change the result.
- Produce concise, useful output that matches the requested channel.
- Return only the required structured format.

### Say It Better prompt objectives

- Identify the user's actual communicative goal.
- Determine whether a fact is missing.
- Preserve accountability.
- Remove insults, contempt, unnecessary defensiveness, evasion, and distracting detail without removing the underlying boundary or concern.
- Generate alternatives that differ meaningfully in directness and warmth.
- Explain how the primary version may land.
- Produce funny internal translation only when requested and safe.

### Decode prompt objectives

- Begin with literal meaning.
- Identify grammatical and contextual tone cues.
- Separate evidence from plausible interpretation.
- Explicitly list unknowns.
- Never claim access to the sender's internal state.
- Recommend clarification when ambiguity matters.

### Conflict Lens prompt objectives

- Parse speaker statements accurately.
- Avoid taking a side merely because the user is one participant.
- Separate stated positions, inferred concerns, facts, assumptions, and unanswered questions.
- Identify the sequence of escalation.
- Describe communication behavior without labeling a person's character.
- Offer several resolution options rather than one verdict.
- Preserve firm boundaries when appropriate.

### Honesty Guard

When a user asks for wording that would materially mislead the recipient, the application should not simply comply. It should state what fact is missing or being obscured and ask for truthful information.

Example:

> I can help make this concise and professional, but I should not imply the feature is nearly complete if it has not been started. What progress has actually been made, and when can you provide a reliable estimate?

---

## 19. Screenshot Upload Strategy

Screenshot support is **P1**, not P0. Do not allow it to delay the text-based demo.

If implemented:

1. Accept one image initially.
2. Display a local preview.
3. Send the image to a vision-capable model through the protected route.
4. Extract message text and speaker ordering.
5. Show extracted text to the user for correction.
6. Require speaker confirmation before analysis.
7. Discard the image after the request; do not persist it.
8. Do not make privacy claims that are not technically true for the selected model provider.

Future multi-image support should handle ordering explicitly. Never assume that upload order equals chronological message order without confirmation.

---

## 20. Safety, Privacy, and Responsible Use

### Mandatory behavior

- Do not diagnose narcissism, personality disorders, manipulation, abuse, or mental illness from ordinary messages.
- Do not claim certainty about hidden intent.
- Do not help fabricate workplace progress or false excuses.
- Do not generate threats, harassment, discriminatory content, or coercive messages.
- Do not automatically send any message.
- Do not store message content in logs.
- Do not add analytics containing raw messages.
- Do not claim messages are private or unretained unless the implementation and provider configuration make that true.

### High-stakes professional content

For messages involving termination, formal discipline, legal threats, discrimination complaints, medical issues, or HR investigations:

- The app may help organize or clarify wording.
- It should display that the output is communication assistance, not legal or HR advice.
- It should avoid asserting rights or policies not supplied by the user.

### Threat, coercion, or safety content

- Do not mediate immediate danger as a normal disagreement.
- Do not recommend confronting someone when doing so may be unsafe.
- Encourage contact with an appropriate trusted person, professional, workplace channel, or emergency service based on context.
- Keep the message concise and do not bury it beneath ordinary tone suggestions.

### Privacy UI

In the prototype, use accurate restrained copy such as:

> Avoid pasting information you would not want processed by the configured AI provider. This demo does not intentionally save message history.

Do not say “Your messages never leave your device” when live AI is enabled.

---

## 21. Local State and Fixtures

No database is required.

### Store locally

- Current selected mode
- Form selections
- Current result
- Demo scenario identifier
- UI preferences such as selected result tab

Use React state and optionally `sessionStorage`. Avoid storing pasted private messages in persistent `localStorage` by default.

### Fixture requirements

Create typed fixtures for:

- Engineer → Product Manager Say It Better scenario
- Product Manager → Engineer Decode It scenario
- Alex/Sam spouse conflict scenario
- At least one AI error response
- At least one schema-invalid response for validation testing
- At least one safety-escalation response

Fixtures should use the same schemas as live AI responses.

---

## 22. Suggested Routes

If using framework routing:

```text
/
/say-it-better
/decode
/conflict-lens
/api/context-switch
```

A single-page application with mode state is acceptable if it improves build speed and the browser back button is not required for the demo.

---

## 23. Suggested Component Structure

```text
AppShell
├── BrandHeader
├── DemoControls
├── ModeSelector
├── ContextRoute
│   ├── RoleSelector
│   ├── RelationshipSelector
│   ├── ChannelSelector
│   ├── OutcomeSelector
│   └── ToneSelector
├── MessageComposer
├── SmartFollowUp
├── TranslationLoadingState
├── SayItBetterResult
│   ├── UnfilteredCard
│   ├── SendableMessageCard
│   ├── AlternativeToneCards
│   ├── ImpactPreview
│   └── ChangeExplanation
├── DecodeResult
│   ├── LiteralMeaningCard
│   ├── InterpretationList
│   ├── UnknownsCard
│   ├── ClarificationCard
│   └── ResponseOptions
├── ConflictLensResult
│   ├── ParticipantPerspective
│   ├── MeaningVsImpact
│   ├── EscalationTimeline
│   ├── CoreProblemCard
│   ├── ResolutionOptions
│   └── RepairMessageCard
├── CopyButton
├── ConfidenceBadge
├── SafetyNotice
└── ErrorFallback
```

---

## 24. Accessibility Requirements

- Full keyboard access
- Visible focus states
- Semantic labels for all controls
- Minimum 44px pointer targets
- Do not communicate confidence or status by color alone
- Sufficient text contrast
- Screen-reader text for icon-only buttons
- Reduced-motion support
- Avoid auto-advancing a user before they can read a result
- Screenshot upload must have keyboard and screen-reader support if implemented
- Role selectors must not require fine pointer control
- Copy confirmation should be announced accessibly

---

## 25. Error and Loading States

### Loading

Display short staged messages. Do not leave a generic spinner on screen with no explanation.

Example:

- Reading the situation
- Separating facts from assumptions
- Preserving your actual intent
- Shaping the message for this role pair

### Live AI unavailable

For prepared scenario:

> The live translation took too long. Continue with the prepared demo response?

For custom content:

> The translation could not be completed. Your message has been preserved. Try again.

### Invalid structured response

- Attempt one server-side schema-repair request.
- If still invalid, return a safe typed error.
- Never render raw malformed model output.

### Screenshot extraction failure

- Keep the preview.
- Allow manual paste or manual correction.
- Do not block the rest of the application.

---

## 26. Implementation Plan for a 4–5 Hour Build

Claude Code should adapt to actual conditions and document changes in the build log.

### Phase 1 — Foundation and contract (30–45 minutes)

- Inspect repository
- Confirm stack
- Initialize application if needed
- Add design tokens and application shell
- Define TypeScript schemas
- Create fixture data
- Create/update build log
- Verify application runs

### Phase 2 — Flagship Say It Better flow (60–75 minutes)

- Build context selector
- Build composer
- Build structured follow-up step
- Build result cards
- Add engineer/PM fixture
- Implement copy and reset behavior
- Verify mobile and desktop layout

### Phase 3 — Live AI integration (45–60 minutes)

- Add one protected AI route
- Add provider adapter
- Implement per-mode prompt
- Add schema validation
- Add timeout and fixture fallback
- Test live engineer/PM scenario
- Confirm no key is exposed

### Phase 4 — Decode It and Conflict Lens (60–75 minutes)

- Implement Decode result layers
- Implement Conflict Lens side-by-side view
- Add prepared fixtures
- Connect both modes to live AI schema
- Verify safe uncertainty language

### Phase 5 — Polish and demo hardening (45–60 minutes)

- Improve visual hierarchy and responsive layout
- Add intentional transformation motion
- Test all prepared scenarios
- Test error and fallback paths
- Verify copy actions
- Check accessibility basics
- Remove console errors
- Complete README and build log retrospective
- Practice three-minute demo

### Cut order if time is running out

Cut in this order:

1. Screenshot upload
2. Custom roles
3. Tone slider
4. Regenerate-one-section
5. Extra animations
6. Neighbor scenario

Do not cut:

- Engineer/PM Say It Better flow
- Live AI text integration
- Fixture fallback
- Decode distinction between known/inferred/unknown
- Conflict Lens core problem and repair message
- Build log
- Reset Demo control

---

## 27. Testing Strategy

### Functional tests

- Required inputs prevent premature submission.
- Role pair is included in the model request.
- Follow-up answers affect the final request.
- Copy button copies the displayed message.
- Reset restores prepared scenario state.
- Each response passes runtime validation.
- Prepared fixtures work without a key.
- Live mode works with a valid key.
- A timed-out prepared request offers fixture fallback.
- Custom content is never replaced with an unrelated fixture.

### Content tests

- Engineer scenario remains truthful.
- Decode mode does not claim the PM is angry.
- Conflict mode identifies both stated positions accurately.
- Alternative tones preserve core meaning.
- Funny translation is not shown when humor is off.
- High-stakes content produces appropriate limits.
- The model does not diagnose participants.

### Visual tests

- Phone-width viewport
- Tablet-width viewport
- Desktop-width viewport
- Long generated messages
- Empty arrays/optional result sections
- Keyboard focus
- Reduced motion

### Demo rehearsal test

Run the full presentation in order with the network enabled and once in fixture-only mode. Record both outcomes in the build log.

---

## 28. P0 Acceptance Criteria

The hackathon build is complete when:

- The app loads without errors.
- The product premise is understandable from the first screen.
- The user can choose all three modes.
- The engineer/PM prepared scenario completes from input through copyable result.
- The funny translation appears as a secondary feature, not the only value.
- The sendable version is honest and includes only supplied commitments.
- Live text AI works when correctly configured.
- Prepared fixtures work when live AI is unavailable.
- Decode It visibly separates literal meaning, interpretation, and unknowns.
- Conflict Lens shows both perspectives, escalation points, a core problem, resolution options, and a repair message.
- Role pair, channel, outcome, and tone visibly affect the experience.
- All presentation-critical screens work on mobile and desktop.
- Loading and failure states are intentional.
- No API key appears in client code or committed files.
- No raw private message content is written to the build log.
- README contains complete setup and demo instructions.
- `HACKATHON_BUILD_LOG.md` contains milestone history, failures, decisions, verification evidence, and a final retrospective.

---

## 29. Three-Minute Demo Script

### 0:00–0:20 — Hook

> Have you ever known exactly what you meant, sent a message, and discovered that the other person heard something completely different? Context Switch translates between roles, relationships, and expectations—not just languages.

### 0:20–1:15 — Engineer to product manager

- Load prepared scenario.
- Point out the role route `Engineer → Product Manager`.
- Show raw message.
- Answer quick follow-ups.
- Start translation.
- Reveal: `I followed the dopamine instead of the roadmap.`
- Pause for laugh.
- Reveal the honest professional version.
- Point out the next checkpoint and Honesty Guard.

### 1:15–1:55 — Decode the incoming message

- Switch direction to Product Manager → Engineer.
- Paste `Just checking in. Do we have an update on this yet?`
- Show literal meaning.
- Show plausible planning interpretation.
- Emphasize that frustration is unknown.
- Show what a useful response needs to contain.

### 1:55–2:40 — Conflict Lens

- Load Alex/Sam kitchen conversation.
- Show what each person may be trying to say versus what the other hears.
- Reveal the actual unresolved issue: responsibility plus an undefined completion time.
- Show a repair message.

### 2:40–3:00 — Close

> Most communication tools make your words sound better. Context Switch helps make sure they mean the right thing to the person receiving them. It doesn't tell you what someone is secretly thinking. It separates what was said, what was inferred, and what still needs to be asked.

---

## 30. Hackathon Build Log Requirements

Claude Code must maintain the separate file `HACKATHON_BUILD_LOG.md` from the beginning of implementation.

### Update the log

- At project start
- After every major phase
- After a meaningful architectural or product decision
- After any failed attempt that consumes meaningful time
- After changing scope
- After live AI integration testing
- After fallback testing
- After final build verification

### Log what worked

- Successful implementation choices
- Reusable patterns
- AI prompting approaches that produced valid results
- Design choices that improved the demo
- Tests and scenarios that passed

### Log what did not work

- Failed installs or builds
- Model response/schema failures
- Prompt approaches that produced unsafe, vague, or misleading output
- UI approaches that were abandoned
- Features cut due to time
- Network/provider issues
- Workarounds and their limitations

### Decision log

For each meaningful decision, record:

- Decision ID
- Time or phase
- Decision
- Alternatives considered
- Reason
- Tradeoff or consequence
- Whether it should be revisited after the hackathon

### Evidence

Record concise evidence such as:

- Command and result summary
- Test result
- Screen/route manually verified
- Example scenario used
- Build status

Do not paste large raw command output. Do not log secret values or private user messages.

### Final retrospective

The completed log must answer:

- What was built?
- What worked especially well?
- What did not work?
- What was cut and why?
- Which decisions most affected the result?
- How was AI used in the product?
- How was AI used during development?
- What safety or privacy choices were made?
- What would be built next with another day?
- Is the demo ready, and what exact flow should the presenter use?

Use the separately provided build-log template as the initial file and keep it accurate.

---

## 31. README Requirements

The final `README.md` should include:

- Product summary
- Feature overview
- Architecture summary
- Requirements
- Installation
- Environment-variable setup
- How to run in live mode
- How to run in fixture-only mode
- How to build
- How to execute the prepared demo
- AI provider/configuration notes
- Privacy and safety limitations
- Known limitations
- Link to or reference `HACKATHON_BUILD_LOG.md`

---

## 32. Final Instruction to Claude Code

Build Context Switch as a polished product demo, not as a collection of generic AI text boxes. The role route, structured context, evidence-versus-inference distinction, transparency, and conflict map are the product.

Implement P0 end to end. Use live AI through a protected thin route and validate structured output. Keep deterministic fixtures ready for every judging scenario. Preserve truth, state uncertainty, avoid diagnosis, and do not create false equivalence around observable harmful conduct.

Continuously document the build in `HACKATHON_BUILD_LOG.md`. Finish only after the full live demo and full fallback demo have both been tested and the final retrospective is complete.

