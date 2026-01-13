# Supabase Vault Integration für Token-Verschlüsselung

## Überblick

Statt manueller Verschlüsselung mit Node.js Crypto sollten wir Supabase Vault für die sichere Speicherung von Access Tokens verwenden. Supabase Vault bietet:

- ✅ Hardware Security Module (HSM) Unterstützung
- ✅ Automatische Key Rotation
- ✅ Audit Logging
- ✅ DSGVO-konforme Speicherung

## Implementierung

### 1. Supabase Vault Setup

```sql
-- Enable vault extension (in Supabase Dashboard SQL Editor)
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Create vault key (nur einmal ausführen)
-- WICHTIG: Key sicher speichern!
SELECT vault.create_secret('whatsapp-tokens-key', 'your-encryption-key-here');
```

### 2. Migration: Encrypted Column hinzufügen

```sql
-- Migration: Add encrypted token column
ALTER TABLE bots 
ADD COLUMN IF NOT EXISTS whatsapp_token_encrypted TEXT;

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_bots_whatsapp_token_encrypted 
ON bots(whatsapp_token_encrypted) 
WHERE whatsapp_token_encrypted IS NOT NULL;
```

### 3. API Route Update

```typescript
// app/api/auth/bsp/callback/route.ts
import { createClient } from '@supabase/supabase-js';

// Use Service Role Key for Vault operations (server-side only!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Secret!
);

async function storeTokenInVault(botId: string, token: string): Promise<string> {
  // Store encrypted token in Vault
  const { data, error } = await supabaseAdmin.rpc('vault_encrypt', {
    secret_name: 'whatsapp-tokens-key',
    plaintext: token,
  });

  if (error) throw error;
  return data.encrypted; // Returns encrypted blob ID
}

async function retrieveTokenFromVault(encryptedTokenId: string): Promise<string> {
  // Retrieve and decrypt token from Vault
  const { data, error } = await supabaseAdmin.rpc('vault_decrypt', {
    secret_name: 'whatsapp-tokens-key',
    encrypted_data: encryptedTokenId,
  });

  if (error) throw error;
  return data.plaintext;
}
```

### 4. Alternative: Supabase Vault Functions (empfohlen)

Supabase Vault bietet auch direkte SQL-Funktionen:

```sql
-- Store token
SELECT vault.create_secret(
  'whatsapp-token-' || bot_id,
  access_token
);

-- Retrieve token
SELECT vault.retrieve_secret('whatsapp-token-' || bot_id);
```

## Migration Strategy

1. **Phase 1:** Behalte alte Verschlüsselung parallel
2. **Phase 2:** Migriere bestehende Tokens zu Vault
3. **Phase 3:** Entferne alte Verschlüsselung

## Sicherheit

- ✅ Service Role Key niemals im Frontend verwenden!
- ✅ Vault Keys niemals in Git committen
- ✅ Separate Vault-Keys pro Environment (Development/Production)
- ✅ Regelmäßige Key Rotation

## TODO

- [ ] Supabase Vault Extension aktivieren
- [ ] Vault Key erstellen und sicher speichern
- [ ] Migration für bestehende Tokens
- [ ] API Routes auf Vault umstellen
- [ ] Tests für Vault-Integration
- [ ] Dokumentation aktualisieren

## Referenzen

- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [PostgreSQL Vault Extension](https://github.com/supabase/vault)

