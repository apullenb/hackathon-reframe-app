import type { ContextSwitchError } from '@/types/contracts';
import { screenshotExtractionSchema, type ScreenshotExtraction } from '@/schemas/screenshot';
import { buildScreenshotExtractionPrompt } from './prompts';
import { extractJsonObject } from './ProxyAiClient';
import { PROXY_ENDPOINT, aiError } from './types';

/**
 * Screenshot transcription (spec §19).
 *
 * Goes through the same protected relay as everything else, so the image is sent to the provider
 * by the Node process and no key touches the browser. The image is held in memory for the duration
 * of the request and nothing writes it anywhere — spec §19 step 7.
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
    const response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system: prompt.system,
        user: prompt.user,
        maxTokens: 2048,
        images: [image],
      }),
    });

    if (!response.ok) {
      const failure = (await response.json().catch(() => ({}))) as RelayFailure;
      const code = typeof failure.error === 'string' ? failure.error : `http_${response.status}`;
      if (response.status === 503 && code === 'no_key_configured') {
        return {
          ok: false,
          error: aiError('no_client_available', {
            userMessage:
              'Reading a screenshot needs a live AI connection, which is not configured right now. You can paste the conversation as text instead.',
          }),
        };
      }
      const providerMessage =
        typeof failure.providerMessage === 'string' ? ` — ${failure.providerMessage}` : '';
      return {
        ok: false,
        error: aiError('provider_error', {
          userMessage:
            'The screenshot could not be read. You can try again, or paste the conversation as text instead.',
          detail: `${response.status}:${code}${providerMessage}`,
        }),
      };
    }

    const payload = (await response.json()) as RelaySuccess;
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
      return {
        ok: false,
        error: aiError('provider_error', {
          userMessage:
            'The screenshot could not be read. You can try again, or paste the conversation as text instead.',
          detail: 'relay returned no text',
        }),
      };
    }

    const raw = extractJsonObject(payload.text);
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
