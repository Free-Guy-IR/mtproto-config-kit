import { assertValidMTProtoCoreConfig } from "./validation.js";
export function createMTProtoInstanceConfig(options) {
    const instance = {
        tag: options.tag,
        port: options.port,
        fake_tls_domain: options.fakeTlsDomain
    };
    if (options.adTag) {
        instance.ad_tag = options.adTag;
    }
    return instance;
}
function configFromOptions(options) {
    return {
        instances: options.instances.map(createMTProtoInstanceConfig)
    };
}
export function createMTProtoCoreConfig(options) {
    return assertValidMTProtoCoreConfig(configFromOptions(options));
}
export function generateMTProtoCoreConfigJson(options, space = 2) {
    return JSON.stringify(createMTProtoCoreConfig(options), null, space);
}
export function createMTProtoCorePayload(options) {
    const { name = "mtproto_core", ...configOptions } = options;
    return {
        name,
        type: "mtproto",
        config: createMTProtoCoreConfig(configOptions),
        exclude_inbound_tags: [],
        fallbacks_inbound_tags: []
    };
}
//# sourceMappingURL=core.js.map