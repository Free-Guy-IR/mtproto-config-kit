import { createMTProtoCoreConfig, createMTProtoInstanceConfig } from "./core.js";
import type { CreateMTProtoInstanceOptions, MTProtoCoreConfig, MTProtoValidationIssue } from "./types.js";

/**
 * Form-state shape for a single MTProto instance, distinct from the persisted JSON shape -
 * `port` is `number | string` to match the "random port" generator button pattern already
 * used by the OpenVPN/sing-box/Xray inbound forms.
 */
export type MTProtoInstanceDraft = {
  readonly tag: string;
  readonly port: number | string;
  readonly fakeTlsDomain: string;
  readonly adTag: string;
};

export type MTProtoCoreDraft = {
  readonly instances: readonly MTProtoInstanceDraft[];
};

function issue(path: string, code: string, message: string): MTProtoValidationIssue {
  return { path, code, message };
}

function parsePort(value: number | string): number | undefined {
  if (typeof value === "number") return Number.isInteger(value) ? value : undefined;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

function randomPort(): number {
  return Math.floor(Math.random() * (65535 - 10000 + 1)) + 10000;
}

function uniqueDefaultTag(existingTags: readonly string[]): string {
  const taken = new Set(existingTags.map(t => t.trim()));
  if (!taken.has("MTProto")) return "MTProto";
  let n = 2;
  while (taken.has(`MTProto_${n}`)) n += 1;
  return `MTProto_${n}`;
}

export function createDefaultMTProtoInstanceDraft(existingTags: readonly string[] = []): MTProtoInstanceDraft {
  return {
    tag: uniqueDefaultTag(existingTags),
    port: existingTags.length === 0 ? 443 : randomPort(),
    fakeTlsDomain: "",
    adTag: ""
  };
}

export function createDefaultMTProtoCoreDraft(): MTProtoCoreDraft {
  return {
    instances: [createDefaultMTProtoInstanceDraft([])]
  };
}

/** Mirrors the validation.ts semantic rules, at the draft/form level (pre-serialization). */
export function validateMTProtoInstanceDraft(draft: MTProtoInstanceDraft, index: number, allTags: readonly string[], allPorts: readonly (number | string)[]): MTProtoValidationIssue[] {
  const issues: MTProtoValidationIssue[] = [];
  const base = `/instances/${index}`;

  const tag = draft.tag.trim();
  if (!tag) {
    issues.push(issue(`${base}/tag`, "MT_FORM_TAG_REQUIRED", "Tag is required."));
  } else if (allTags.filter(t => t.trim() === tag).length > 1) {
    issues.push(issue(`${base}/tag`, "MT_FORM_TAG_DUPLICATE", `Duplicate instance tag: ${tag}.`));
  }

  const port = parsePort(draft.port);
  if (port === undefined || port < 1 || port > 65535) {
    issues.push(issue(`${base}/port`, "MT_FORM_PORT_INVALID", "Port must be an integer between 1 and 65535."));
  } else {
    const parsedPorts = allPorts.map(parsePort);
    if (parsedPorts.filter(p => p === port).length > 1) {
      issues.push(issue(`${base}/port`, "MT_FORM_PORT_DUPLICATE", `Duplicate port ${port} within this core config.`));
    }
  }

  if (!draft.fakeTlsDomain.trim()) {
    issues.push(issue(`${base}/fakeTlsDomain`, "MT_FORM_DOMAIN_REQUIRED", "Fake-TLS domain is required."));
  }

  const adTag = draft.adTag.trim();
  if (adTag) {
    if (!/^[0-9a-fA-F]+$/.test(adTag) || adTag.length % 2 !== 0) {
      issues.push(issue(`${base}/adTag`, "MT_FORM_ADTAG_INVALID", "Ad tag must be a valid hex string."));
    } else {
      const byteLength = adTag.length / 2;
      if (byteLength < 1 || byteLength > 255) {
        issues.push(issue(`${base}/adTag`, "MT_FORM_ADTAG_INVALID", "Ad tag must decode to 1-255 bytes."));
      }
    }
  }

  return issues;
}

/** Mirrors MTProtoConfig._validate: at least one instance, unique tags/ports. */
export function validateMTProtoCoreDraft(draft: MTProtoCoreDraft): MTProtoValidationIssue[] {
  const issues: MTProtoValidationIssue[] = [];

  if (draft.instances.length === 0) {
    issues.push(issue("/instances", "MT_FORM_NO_INSTANCES", "At least one instance is required."));
  }

  const allTags = draft.instances.map(i => i.tag);
  const allPorts = draft.instances.map(i => i.port);
  draft.instances.forEach((instance, index) => {
    issues.push(...validateMTProtoInstanceDraft(instance, index, allTags, allPorts));
  });

  return issues;
}

function instanceOptionsFromDraft(draft: MTProtoInstanceDraft): CreateMTProtoInstanceOptions {
  const port = parsePort(draft.port);
  if (port === undefined) {
    throw new Error(`/port: port must be an integer between 1 and 65535 (tag: ${draft.tag || "?"}).`);
  }

  return {
    tag: draft.tag.trim(),
    port,
    fakeTlsDomain: draft.fakeTlsDomain.trim(),
    adTag: draft.adTag.trim() || undefined
  };
}

export function createMTProtoCoreConfigFromDraft(draft: MTProtoCoreDraft): MTProtoCoreConfig {
  const issues = validateMTProtoCoreDraft(draft);
  if (issues.length > 0) {
    const firstIssue = issues[0]!;
    throw new Error(`${firstIssue.path}: ${firstIssue.message}`);
  }
  return createMTProtoCoreConfig({
    instances: draft.instances.map(instanceOptionsFromDraft)
  });
}

export function generateMTProtoCoreConfigJsonFromDraft(draft: MTProtoCoreDraft, space = 2): string {
  return JSON.stringify(createMTProtoCoreConfigFromDraft(draft), null, space);
}

/** Exposed for callers that build a single instance's config JSON without a full draft (e.g. previews). */
export function createMTProtoInstanceConfigFromDraft(draft: MTProtoInstanceDraft) {
  return createMTProtoInstanceConfig(instanceOptionsFromDraft(draft));
}
