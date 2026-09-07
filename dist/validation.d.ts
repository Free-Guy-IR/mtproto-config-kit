import type { MTProtoCoreConfig, MTProtoInstance, MTProtoValidationResult } from "./types.js";
export declare function instanceDomains(instance: {
    fake_tls_domain?: string;
    fake_tls_domains?: readonly string[];
}): string[];
export declare function validateMTProtoCoreConfig(input: unknown): MTProtoValidationResult;
export declare function assertValidMTProtoCoreConfig(input: unknown): MTProtoCoreConfig;
export declare function isMTProtoInstance(value: unknown): value is MTProtoInstance;
//# sourceMappingURL=validation.d.ts.map