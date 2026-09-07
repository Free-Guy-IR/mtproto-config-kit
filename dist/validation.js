import { z } from "zod";
const jsonValueSchema = z.lazy(() => z.union([z.string(), z.number().finite(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema)]));
const instanceSchema = z
    .object({
    tag: z.string(),
    port: z.number(),
    mode: z.enum(["faketls", "plain"]).optional(),
    fake_tls_domain: z.string().optional(),
    fake_tls_domains: z.array(z.string()).optional(),
    ad_tag: z.string().optional()
})
    .catchall(jsonValueSchema);
const rawMTProtoCoreConfigSchema = z
    .object({
    instances: z.array(instanceSchema)
})
    .catchall(jsonValueSchema);
export function instanceDomains(instance) {
    const many = (instance.fake_tls_domains ?? []).map(d => d.trim()).filter(Boolean);
    if (many.length > 0)
        return many;
    const one = (instance.fake_tls_domain ?? "").trim();
    return one ? [one] : [];
}
function issue(path, code, message) {
    return { path, code, message };
}
function pathForZod(path) {
    if (path.length === 0)
        return "/";
    return `/${path.map(String).join("/")}`;
}
/** Mirrors `MTProtoConfig._validate_instance`. Mutates `seenTags`/`seenPorts` as it goes, like the Python loop. */
function validateInstance(instance, index, seenTags, seenPorts) {
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
    const mode = instance.mode ?? "faketls";
    const domains = instanceDomains(instance);
    if (mode === "faketls" && domains.length === 0) {
        throw new Error(`${path}/fake_tls_domain: at least one fake-TLS domain is required for faketls mode.`);
    }
    if (new Set(domains).size !== domains.length) {
        throw new Error(`${path}/fake_tls_domains: the fake-TLS domain list contains duplicates.`);
    }
    if (mode === "plain" && (instance.fake_tls_domains ?? []).length > 0) {
        throw new Error(`${path}/fake_tls_domains: plain mode cannot set fake-TLS domains.`);
    }
    if (mode === "plain" && instance.ad_tag) {
        throw new Error(`${path}/ad_tag: plain mode cannot be combined with ad_tag.`);
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
function normalizeConfig(input) {
    if (input.instances.length === 0) {
        throw new Error("/instances: config doesn't have instances.");
    }
    const seenTags = new Set();
    const seenPorts = new Set();
    input.instances.forEach((instance, index) => validateInstance(instance, index, seenTags, seenPorts));
    return input;
}
export function validateMTProtoCoreConfig(input) {
    const parsed = rawMTProtoCoreConfigSchema.safeParse(input);
    if (!parsed.success) {
        return {
            ok: false,
            issues: parsed.error.issues.map(zodIssue => issue(pathForZod(zodIssue.path.filter((part) => typeof part === "string" || typeof part === "number")), "MT_SCHEMA_INVALID_CORE_CONFIG", zodIssue.message))
        };
    }
    const issues = [];
    let config;
    try {
        config = normalizeConfig(parsed.data);
    }
    catch (error) {
        const rawMessage = error instanceof Error ? error.message : "Invalid MTProto core config.";
        const match = rawMessage.match(/^(\/[^:]*):\s*(.+)$/);
        issues.push(issue(match?.[1] ?? "/", "MT_SEMANTIC_INVALID_CORE_CONFIG", match?.[2] ?? rawMessage));
    }
    if (!config)
        return { ok: false, issues };
    return { ok: true, config, issues: [] };
}
export function assertValidMTProtoCoreConfig(input) {
    const result = validateMTProtoCoreConfig(input);
    if (!result.ok) {
        const firstIssue = result.issues[0];
        throw new Error(firstIssue ? `${firstIssue.path}: ${firstIssue.message}` : "Invalid MTProto core config.");
    }
    return result.config;
}
export function isMTProtoInstance(value) {
    return !!value && typeof value === "object" && typeof value.tag === "string" && typeof value.port === "number";
}
//# sourceMappingURL=validation.js.map