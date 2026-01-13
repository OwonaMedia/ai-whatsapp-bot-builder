const DEFAULT_DOMAIN = '@owona.de';

export function getMonitoringAllowlist(): string[] {
  const allowlist = process.env.MONITORING_ALLOWLIST || process.env.NEXT_PUBLIC_MONITORING_ALLOWLIST;
  if (!allowlist) {
    return [];
  }
  return allowlist
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isMonitoringAllowed(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.toLowerCase();
  const allowlist = getMonitoringAllowlist();

  if (allowlist.length > 0 && allowlist.includes(normalizedEmail)) {
    return true;
  }

  return normalizedEmail.endsWith(DEFAULT_DOMAIN);
}


