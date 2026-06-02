export const IP_ORG_MAP: Record<string, string> = {
  "216.239.": "Google",
  "142.250.": "Google",
  "142.251.": "Google",
  "172.217.": "Google",
  "151.101.": "Fastly",
  "104.18.": "Cloudflare",
  "104.20.": "Cloudflare",
  "172.224.": "Akamai",
  "150.171.": "Microsoft",
  "23.57.": "Akamai",
  "57.144.": "Meta",
};

export function resolveOrg(ip: string): string {
  for (const [prefix, org] of Object.entries(IP_ORG_MAP)) {
    if (ip.startsWith(prefix)) return org;
  }
  return ip; // fall back to raw IP
}
