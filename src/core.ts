import { assertValidMTProtoCoreConfig } from "./validation.js";
import type {
  CreateMTProtoCoreConfigOptions,
  CreateMTProtoCorePayloadOptions,
  CreateMTProtoInstanceOptions,
  JsonValue,
  MTProtoCoreConfig,
  MTProtoCorePayload,
  MTProtoInstance
} from "./types.js";

export function createMTProtoInstanceConfig(options: CreateMTProtoInstanceOptions): MTProtoInstance {
  const instance: Record<string, JsonValue> = {
    tag: options.tag,
    port: options.port,
    fake_tls_domain: options.fakeTlsDomain
  };

  if (options.adTag) {
    instance.ad_tag = options.adTag;
  }

  return instance as MTProtoInstance;
}

function configFromOptions(options: CreateMTProtoCoreConfigOptions): Record<string, JsonValue> {
  return {
    instances: options.instances.map(createMTProtoInstanceConfig) as unknown as JsonValue
  };
}

export function createMTProtoCoreConfig(options: CreateMTProtoCoreConfigOptions): MTProtoCoreConfig {
  return assertValidMTProtoCoreConfig(configFromOptions(options));
}

export function generateMTProtoCoreConfigJson(options: CreateMTProtoCoreConfigOptions, space = 2): string {
  return JSON.stringify(createMTProtoCoreConfig(options), null, space);
}

export function createMTProtoCorePayload(options: CreateMTProtoCorePayloadOptions): MTProtoCorePayload {
  const { name = "mtproto_core", ...configOptions } = options;
  return {
    name,
    type: "mtproto",
    config: createMTProtoCoreConfig(configOptions),
    exclude_inbound_tags: [],
    fallbacks_inbound_tags: []
  };
}
