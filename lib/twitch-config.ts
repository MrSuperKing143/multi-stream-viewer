const FALLBACK_PARENT_DOMAINS = ["localhost"];

function sanitizeParentDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

export function normalizeParentDomains(value: string[] | string | null | undefined) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,]+/)
      : [];

  const domains = rawValues
    .map(sanitizeParentDomain)
    .filter(Boolean)
    .filter((domain, index, all) => all.indexOf(domain) === index);

  return domains.length > 0 ? domains : [...FALLBACK_PARENT_DOMAINS];
}

export const TWITCH_EMBED_SCRIPT_SRC = "https://player.twitch.tv/js/embed/v1.js";

export const TWITCH_DEFAULT_PARENT_DOMAINS = normalizeParentDomains(
  process.env.NEXT_PUBLIC_TWITCH_PARENTS,
);

export function resolveParentDomains() {
  const currentHost =
    typeof window === "undefined"
      ? null
      : sanitizeParentDomain(window.location.hostname);

  return normalizeParentDomains([
    ...(currentHost ? [currentHost] : []),
    ...TWITCH_DEFAULT_PARENT_DOMAINS,
  ]);
}

export function buildTwitchChatUrl(channel: string) {
  const params = new URLSearchParams();

  resolveParentDomains().forEach((domain) => {
    params.append("parent", domain);
  });

  params.set("darkpopout", "");

  return `https://www.twitch.tv/embed/${channel}/chat?${params.toString()}`;
}
