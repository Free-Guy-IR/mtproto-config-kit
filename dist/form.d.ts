import type { MTProtoCoreConfig, MTProtoValidationIssue } from "./types.js";
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
export declare function createDefaultMTProtoInstanceDraft(existingTags?: readonly string[]): MTProtoInstanceDraft;
export declare function createDefaultMTProtoCoreDraft(): MTProtoCoreDraft;
/** Mirrors the validation.ts semantic rules, at the draft/form level (pre-serialization). */
export declare function validateMTProtoInstanceDraft(draft: MTProtoInstanceDraft, index: number, allTags: readonly string[], allPorts: readonly (number | string)[]): MTProtoValidationIssue[];
/** Mirrors MTProtoConfig._validate: at least one instance, unique tags/ports. */
export declare function validateMTProtoCoreDraft(draft: MTProtoCoreDraft): MTProtoValidationIssue[];
export declare function createMTProtoCoreConfigFromDraft(draft: MTProtoCoreDraft): MTProtoCoreConfig;
export declare function generateMTProtoCoreConfigJsonFromDraft(draft: MTProtoCoreDraft, space?: number): string;
/** Exposed for callers that build a single instance's config JSON without a full draft (e.g. previews). */
export declare function createMTProtoInstanceConfigFromDraft(draft: MTProtoInstanceDraft): import("./types.js").MTProtoInstance;
//# sourceMappingURL=form.d.ts.map