import type { ContextSwitchError } from '@/types/contracts';
import { screenshotExtractionSchema, type ScreenshotExtraction } from '@/schemas/screenshot';
import { buildScreenshotExtractionPrompt, type PromptPair } from './prompts';
import { extractJsonObject } from './ProxyAiClient';
import { PROXY_ENDPOINT, TransportError, aiError } from './types';
import { callPlatformRelay, isPlatformRelay } from './platform';

/**
 * Screenshot transcription (spec §19).
 *
 * Goes through the same protected relay as everything else, so the image is sent to the provider
 * by a server and no key touches the browser. Locally that server is the Vite dev process; on
 * Vibeland it is the platform's own relay (see ./platform.ts). The image is held in memory for
 * the duration of the request and nothing writes it anywhere — spec §19 step 7.
 *
 * PRIVACY, stated plainly because the UI has to say it too: the screenshot leaves the device. It
 * goes to the configured AI provider. There is no on-device OCR here, and the UI must not imply
 * otherwise.
 */

/** Screenshot formats the relay accepts. Kept in sync with ALLOWED_IMAGE_TYPES in the plugin. */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

/** Anything larger is rejected before upload rather than failing at the relay. */
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** Extraction can take longer than a text call: a large image plus a full transcription. */
const EXTRACTION_TIMEOUT_MS = 45_000;

/** Enough for a full transcription of a long screenshot; well under the platform ceiling. */
const EXTRACTION_MAX_TOKENS = 2048;

export type ExtractionResult =
  | { ok: true; value: ScreenshotExtraction }
  | { ok: false; error: ContextSwitchError };

export type ImagePayload = {
  mediaType: string;
  /** Base64 with no `data:` prefix. */
  dataBase64: string;
};

/** Human-readable reason a file was rejected, or null when it is acceptable. */
export function describeImageProblem(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'That file type is not supported. Use a PNG, JPEG, WebP, or GIF screenshot.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `That image is ${mb}MB, which is over the 6MB limit. Try a smaller screenshot or a tighter crop.`;
  }
  return null;
}

/** Read a File into the base64 payload the relay expects. */
export async function fileToImagePayload(file: File): Promise<ImagePayload> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Chunked so a multi-megabyte image does not blow the argument limit of String.fromCharCode.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return { mediaType: file.type, dataBase64: btoa(binary) };
}

interface RelayFailure {
  error?: unknown;
  providerMessage?: unknown;
}

interface RelaySuccess {
  text?: unknown;
  provider?: unknown;
}

/**
 * Send one screenshot for transcription. Returns the parsed extraction or a typed error — never
 * raw model output, and never a thrown exception for an expected failure.
 */
export async function extractConversationFromImage(
  image: ImagePayload,
  options: { signal?: AbortSignal } = {},
): Promise<ExtractionResult> {
  const prompt = buildScreenshotExtractionPrompt();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTRACTION_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort);

  try {
    const text = await requestExtractionText(prompt, image, controller.signal);

    const raw = extractJsonObject(text);
    if (!raw) {
      return {
        ok: false,
        error: aiError('schema_invalid', {
          userMessage:
            'The screenshot was read, but the result could not be understood safely. Paste the conversation as text instead.',
          detail: 'no JSON object in response',
        }),
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        error: aiError('schema_invalid', {
          userMessage:
            'The screenshot was read, but the result could not be understood safely. Paste the conversation as text instead.',
          detail: 'response was not valid JSON',
        }),
      };
    }

    const validated = screenshotExtractionSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: aiError('schema_invalid', {
          userMessage:
            'The screenshot was read, but the result could not be understood safely. Paste the conversation as text instead.',
          // Zod paths and messages only — never model output.
          detail: validated.error.issues
            .slice(0, 3)
            .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('; '),
        }),
      };
    }

    return { ok: true, value: validated.data };
  } catch (error) {
    if (error instanceof TransportError) {
      return { ok: false, error: transportFailure(error) };
    }
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      error: aiError(aborted ? 'timeout' : 'network', {
        userMessage: aborted
          ? 'Reading the screenshot took too long. You can try again, or paste the conversation as text instead.'
          : 'Could not reach the AI service to read the screenshot. You can paste the conversation as text instead.',
      }),
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}


/* ── Transport ───────────────────────────────────────────────────────────── */

/**
 * Sends the image to whichever server relay this build targets and resolves the model's raw
 * text. Throws `TransportError` for every expected failure so both relays land in one place.
 */
async function requestExtractionText(
  prompt: PromptPair,
  image: ImagePayload,
  signal: AbortSignal,
): Promise<string> {
  if (isPlatformRelay()) {
    // The platform route takes a plain Messages API body, so the image goes as a content block
    // rather than the dev relay's `images` array.
    return callPlatformRelay({
      system: prompt.system,
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: image.mediaType, data: image.dataBase64 },
        },
        { type: 'text', text: prompt.user },
      ],
      maxTokens: EXTRACTION_MAX_TOKENS,
      signal,
    });
  }

  let response: Response;
  try {
    response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal,
      body: JSON.stringify({
        system: prompt.system,
        user: prompt.user,
        maxTokens: EXTRACTION_MAX_TOKENS,
        images: [image],
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new TransportError('network', 'dev relay unreachable');
  }

  if (!response.ok) {
    const failure = (await response.json().catch(() => ({}))) as RelayFailure;
    const code = typeof failure.error === 'string' ? failure.error : `http_${response.status}`;
    if (response.status === 503 && code === 'no_key_configured') {
      throw new TransportError('no_client_available', 'relay has no key configured');
    }
    const providerMessage =
      typeof failure.providerMessage === 'string' ? ` — ${failure.providerMessage}` : '';
    throw new TransportError('provider_error', `${response.status}:${code}${providerMessage}`);
  }

  const payload = (await response.json()) as RelaySuccess;
  if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
    throw new TransportError('provider_error', 'relay returned no text');
  }
  return payload.text;
}

/**
 * Screenshot-specific copy for a transport failure. Deliberately does NOT reuse the relay's own
 * `userMessage`: the fallback that matters here is "paste the conversation as text", not the
 * prepared examples, which cannot stand in for someone's own screenshot.
 */
function transportFailure(error: TransportError): ContextSwitchError {
  if (error.kind === 'no_client_available') {
    return aiError('no_client_available', {
      userMessage: isPlatformRelay()
        ? 'Reading a screenshot needs live AI, which is not switched on for this app yet. An owner can add a Claude API key under Manage. You can paste the conversation as text instead.'
        : 'Reading a screenshot needs a live AI connection, which is not configured right now. You can paste the conversation as text instead.',
      detail: error.detail,
    });
  }
  if (error.kind === 'network') {
    return aiError('network', {
      userMessage:
        'Could not reach the AI service to read the screenshot. You can paste the conversation as text instead.',
      detail: error.detail,
    });
  }
  return aiError('provider_error', {
    userMessage:
      error.userMessage ??
      'The screenshot could not be read. You can try again, or paste the conversation as text instead.',
    detail: error.detail,
  });
}
