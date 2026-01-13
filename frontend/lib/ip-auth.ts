import { headers } from 'next/headers';

/**
 * IP-basierte Authentifizierung für das interne Portal
 * Erlaubt Zugriff nur von whitelisted IPs (Fritz!Box & Geräte)
 */

export async function checkIPWhitelist(): Promise<{
  allowed: boolean;
  clientIP: string;
}> {
  const headersList = await headers();
  
  // IP aus verschiedenen Headers extrahieren (Caddy setzt X-Forwarded-For)
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIP = headersList.get('x-real-ip');
  const cfConnectingIP = headersList.get('cf-connecting-ip');
  
  // Erste IP aus X-Forwarded-For ist die echte Client-IP
  const clientIP = 
    forwardedFor?.split(',')[0].trim() || 
    realIP || 
    cfConnectingIP || 
    'unknown';

  // Whitelist aus ENV laden (komma-separiert)
  const allowedIPsStr = process.env.ALLOWED_IPS || '';
  const allowedIPs = allowedIPsStr
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);

  console.log('[IP Auth] Client IP:', clientIP);
  console.log('[IP Auth] Allowed IPs:', allowedIPs);

  // Wenn keine IPs konfiguriert sind, alle blockieren (Failsafe)
  if (allowedIPs.length === 0) {
    console.warn('[IP Auth] Keine ALLOWED_IPS konfiguriert! Zugriff verweigert.');
    return { allowed: false, clientIP };
  }

  // IP-Check mit Wildcard-Support (z.B. 192.168.178.*)
  const allowed = allowedIPs.some(allowedIP => {
    // Exakte Übereinstimmung
    if (allowedIP === clientIP) {
      return true;
    }
    
    // Wildcard-Support: 192.168.178.* matched 192.168.178.x
    if (allowedIP.endsWith('.*')) {
      const prefix = allowedIP.slice(0, -2);
      if (clientIP.startsWith(prefix)) {
        return true;
      }
    }
    
    return false;
  });

  if (!allowed) {
    console.warn(`[IP Auth] Zugriff verweigert für IP: ${clientIP}`);
  } else {
    console.log(`[IP Auth] Zugriff erlaubt für IP: ${clientIP}`);
  }

  return { allowed, clientIP };
}
