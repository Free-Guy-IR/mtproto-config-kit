import { describe, expect, test } from "bun:test";
import { createMTProtoInstanceConfig, validateMTProtoCoreConfig } from "../src/index.js";
import { instanceDomains } from "../src/validation.js";
import { splitDomains, joinDomains, validateMTProtoInstanceDraft } from "../src/form.js";

describe("fake-tls domain lists", () => {
  test("a single domain round-trips through the legacy key", () => {
    const instance = createMTProtoInstanceConfig({ tag: "one", port: 8445, fakeTlsDomains: ["Example.ORG"] });
    expect(instance.fake_tls_domain).toBe("Example.ORG");
    expect(instance.fake_tls_domains).toBeUndefined();
    expect(instanceDomains(instance)).toEqual(["Example.ORG"]);
  });

  test("several domains round-trip through the list key", () => {
    const instance = createMTProtoInstanceConfig({ tag: "many", port: 443, fakeTlsDomains: ["a.example", "b.example"] });
    expect(instance.fake_tls_domains).toEqual(["a.example", "b.example"]);
    expect(instance.fake_tls_domain).toBeUndefined();
    expect(instanceDomains(instance)).toEqual(["a.example", "b.example"]);
  });

  test("plain mode carries no domain at all", () => {
    const instance = createMTProtoInstanceConfig({ tag: "p", port: 8449, mode: "plain" });
    expect(instance.fake_tls_domain).toBeUndefined();
    expect(instance.fake_tls_domains).toBeUndefined();
    expect(instanceDomains(instance)).toEqual([]);
  });

  test("separators, case and trailing dots are normalised", () => {
    expect(splitDomains("A.example\n b.example,c.example; d.example.  ")).toEqual([
      "a.example",
      "b.example",
      "c.example",
      "d.example",
    ]);
    expect(splitDomains("   ")).toEqual([]);
    expect(joinDomains(["a.example", "b.example"])).toBe("a.example\nb.example");
  });

  test("the validator rejects the shapes the panel rejects", () => {
    const bad = [
      { instances: [{ tag: "a", port: 1 }] },
      { instances: [{ tag: "a", port: 1, fake_tls_domains: ["x.example", "x.example"] }] },
      { instances: [{ tag: "a", port: 1, mode: "plain", fake_tls_domains: ["x.example"] }] },
      { instances: [{ tag: "a", port: 1, mode: "plain", ad_tag: "aa" }] },
    ];
    for (const config of bad) {
      expect(validateMTProtoCoreConfig(config).ok).toBe(false);
    }
    expect(validateMTProtoCoreConfig({ instances: [{ tag: "a", port: 1, fake_tls_domains: ["x.example"] }] }).ok).toBe(true);
  });

  test("draft validation flags an empty list and duplicates", () => {
    const base = { tag: "a", port: 443, mode: "faketls" as const, adTag: "" };
    const empty = validateMTProtoInstanceDraft({ ...base, fakeTlsDomains: "" }, 0, ["a"], [443]);
    expect(empty.some(i => i.code === "MT_FORM_DOMAIN_REQUIRED")).toBe(true);

    const dupes = validateMTProtoInstanceDraft({ ...base, fakeTlsDomains: "x.example\nx.example" }, 0, ["a"], [443]);
    expect(dupes.some(i => i.code === "MT_FORM_DOMAIN_DUPLICATE")).toBe(true);

    const plainWithTag = validateMTProtoInstanceDraft(
      { ...base, mode: "plain", fakeTlsDomains: "", adTag: "aabb" },
      0,
      ["a"],
      [443],
    );
    expect(plainWithTag.some(i => i.code === "MT_FORM_ADTAG_PLAIN")).toBe(true);
  });
});
