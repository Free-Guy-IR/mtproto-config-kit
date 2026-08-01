import { z } from "zod";
import type { JsonValue, MTProtoCoreConfig, MTProtoInstance, MTProtoValidationIssue, MTProtoValidationResult } from "./types.js";

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number().finite(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema)])
);

const instanceSchema = z
  .object({
    tag: z.string(),
    port: z.number(),
    fake_tls_domain: z.string(),
    ad_tag: z.string().optional()
  })
  .catchall(jsonValueSchema);

const rawMTProtoCoreConfigSchema = z
  .object({
    instances: z.array(instanceSchema)
  })
  .catchall(jsonValueSchema);

function issue(path: string, code: string, message: string): MTProtoValidationIssue {
  return { path, code, message };
}

function pathForZod(path: readonly (string | number)[]): string {
  if (path.length === 0) return "/";
  return `/${path.map(String).join("/")}`;
}

/** Mirrors `MTProtoConfig._validate_instance`. Mutates `seenTags`/`seenPorts` as it goes, like the Python loop. */
function validateInstance(instance: z.infer<typeof instanceSchema>, index: number, seenTags: Set<string>, seenPorts: Set<number>): void {
  const path = `/instances/${index}`;

  const tag = instance.tag.trim();
  if (!tag) {
    throw new Error(`${path}/tag: all instances must have a unique tag.`);
  }
  if (seenTags.has(tag)) {
    throw new Error(`${path}/tag: duplicate instance tag: ${tag}.`);
  }
  seenTags.add(tag);

  if (!Number.isInteger(instance.port) || instance.port < 1 || instance.port > 65535) {
    throw new Error(`${path}/port: port must be an integer between 1 and 65535.`);
  }
  if (seenPorts.has(instance.port)) {
    throw new Error(`${path}/port: duplicate port ${instance.port} within this core config.`);
  }
  seenPorts.add(instance.port);

  if (!instance.fake_tls_domain.trim()) {
    throw new Error(`${path}/fake_tls_domain: fake_tls_domain is required.`);
  }

  if (instance.ad_tag) {
    if (!/^[0-9a-fA-F]+$/.test(instance.ad_tag) || instance.ad_tag.length % 2 !== 0) {
      throw new Error(`${path}/ad_tag: ad_tag must be a valid hex string.`);
    }
    const byteLength = instance.ad_tag.length / 2;
    if (byteLength < 1 || byteLength > 255) {
      throw new Error(`${path}/ad_tag: ad_tag must decode to 1-255 bytes.`);
    }
  }
}

/** Mirrors `MTProtoConfig._validate`: non-empty instances, unique tags/ports. */
function normalizeConfig(input: z.infer<typeof rawMTProtoCoreConfigSchema>): MTProtoCoreConfig {
  if (input.instances.length === 0) {
    throw new Error("/instances: config doesn't have instances.");
  }

  const seenTags = new Set<string>();
  const seenPorts = new Set<number>();
  input.instances.forEach((instance, index) => validateInstance(instance, index, seenTags, seenPorts));

  return input as MTProtoCoreConfig;
}

export function validateMTProtoCoreConfig(input: unknown): MTProtoValidationResult {
  const parsed = rawMTProtoCoreConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(zodIssue =>
        issue(
          pathForZod(zodIssue.path.filter((part): part is string | number => typeof part === "string" || typeof part === "number")),
          "MT_SCHEMA_INVALID_CORE_CONFIG",
          zodIssue.message
        )
      )
    };
  }

  const issues: MTProtoValidationIssue[] = [];
  let config: MTProtoCoreConfig | undefined;

  try {
    config = normalizeConfig(parsed.data);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Invalid MTProto core config.";
    const match = rawMessage.match(/^(\/[^:]*):\s*(.+)$/);
    issues.push(issue(match?.[1] ?? "/", "MT_SEMANTIC_INVALID_CORE_CONFIG", match?.[2] ?? rawMessage));
  }

  if (!config) return { ok: false, issues };
  return { ok: true, config, issues: [] };
}

export function assertValidMTProtoCoreConfig(input: unknown): MTProtoCoreConfig {
  const result = validateMTProtoCoreConfig(input);
  if (!result.ok) {
    const firstIssue = result.issues[0];
    throw new Error(firstIssue ? `${firstIssue.path}: ${firstIssue.message}` : "Invalid MTProto core config.");
  }
  return result.config;
}

export function isMTProtoInstance(value: unknown): value is MTProtoInstance {
  return !!value && typeof value === "object" && typeof (value as Record<string, unknown>).tag === "string" && typeof (value as Record<string, unknown>).fake_tls_domain === "string";
}
