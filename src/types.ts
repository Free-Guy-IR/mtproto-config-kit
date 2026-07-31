export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

/**
 * One MTProto (Telegram proxy) listener: a port plus the fake-TLS domain
 * every connection is validated against. Mirrors the panel's
 * `app/core/mtproto.py::MTProtoConfig` backend, which - unlike OpenVPN's one
 * subprocess per instance - runs every instance as a shared in-process proxy
 * (see the node repo's `backend/mtproto`), with every authorized user
 * multiplexed onto whichever instances they can reach. What the backend
 * calls an "instance" is exposed to the rest of the panel as just another
 * inbound tag, same as OpenVPN.
 *
 * There is no protocol choice (MTProto is TCP-only) and no PKI (MTProto
 * secrets are symmetric, not certificate-based) - the only two things that
 * ever vary between instances are the port and the fake-TLS domain.
 */
export type MTProtoInstance = JsonObject & {
  readonly tag: string;
  readonly port: number;
  readonly fake_tls_domain: string;
};

export type MTProtoCoreConfig = JsonObject & {
  readonly instances: readonly MTProtoInstance[];
};

export type MTProtoCorePayload = {
  readonly name: string;
  readonly type: "mtproto";
  readonly config: MTProtoCoreConfig;
  readonly exclude_inbound_tags: readonly string[];
  /** MTProto cores reject a non-empty fallbacks_inbound_tags server-side; always []. */
  readonly fallbacks_inbound_tags: readonly string[];
};

export type CreateMTProtoInstanceOptions = {
  readonly tag: string;
  readonly port: number;
  readonly fakeTlsDomain: string;
};

export type CreateMTProtoCoreConfigOptions = {
  readonly instances: readonly CreateMTProtoInstanceOptions[];
};

export type CreateMTProtoCorePayloadOptions = CreateMTProtoCoreConfigOptions & {
  readonly name?: string;
};

export type MTProtoValidationIssue = {
  readonly code: string;
  readonly path: string;
  readonly message: string;
};

export type MTProtoValidationResult =
  | {
      readonly ok: true;
      readonly config: MTProtoCoreConfig;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly MTProtoValidationIssue[];
    };
