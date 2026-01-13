-- ============================================
-- INVOICE SYSTEM
-- Rechnungserstellung nach Zahlungen
-- ============================================

-- ============================================
-- INVOICES TABLE
-- Speichert alle Rechnungen
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Rechnungsnummer (Format: YYYY-NNNN, z.B. 2025-0001)
  invoice_number TEXT NOT NULL UNIQUE,
  
  -- Rechnungsdaten
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  
  -- Zahlungsinformationen
  amount_net DECIMAL(10, 2) NOT NULL,
  amount_gross DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0, -- 0% für Kleinunternehmer
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Kleinunternehmer-Regelung
  is_small_business BOOLEAN DEFAULT true, -- Kleinunternehmer-Regelung
  tax_exempt BOOLEAN DEFAULT true, -- Keine Umsatzsteuer ausgewiesen
  
  -- Zahlungsstatus
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_provider TEXT, -- 'stripe', 'paypal', etc.
  payment_provider_id TEXT, -- Payment Intent ID, Order ID, etc.
  
  -- Rechnungsinhalt
  description TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]', -- Array von Rechnungspositionen
  
  -- Sprache der Rechnung
  locale TEXT NOT NULL DEFAULT 'de',
  
  -- PDF-Dateipfad
  pdf_path TEXT, -- Pfad auf dem Server
  pdf_url TEXT, -- URL zum Download
  
  -- Kundeninformationen (Snapshot zum Zeitpunkt der Rechnung)
  customer_data JSONB NOT NULL DEFAULT '{}', -- {name, email, address, etc.}
  
  -- Firmeninformationen (Snapshot)
  company_data JSONB NOT NULL DEFAULT '{}', -- {name, address, tax_id, etc.}
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);

-- ============================================
-- INVOICE NUMBER SEQUENCE
-- Verwaltet fortlaufende Rechnungsnummern pro Jahr
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_number_sequence (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCTION: generate_invoice_number
-- Generiert eine neue Rechnungsnummer im Format YYYY-NNNN
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Hole oder erstelle Sequenz für aktuelles Jahr
  INSERT INTO invoice_number_sequence (year, last_number)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO UPDATE
  SET last_number = invoice_number_sequence.last_number + 1,
      updated_at = NOW()
  RETURNING last_number INTO next_number;
  
  -- Wenn INSERT erfolgreich war, next_number ist 0, also setze auf 1
  IF next_number = 0 THEN
    UPDATE invoice_number_sequence
    SET last_number = 1, updated_at = NOW()
    WHERE year = current_year;
    next_number := 1;
  END IF;
  
  -- Formatiere Rechnungsnummer: YYYY-NNNN (4-stellig mit führenden Nullen)
  invoice_num := current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: create_invoice
-- Erstellt eine neue Rechnung
-- ============================================
CREATE OR REPLACE FUNCTION create_invoice(
  p_user_id UUID,
  p_subscription_id UUID,
  p_amount_net DECIMAL,
  p_amount_gross DECIMAL,
  p_currency TEXT,
  p_description TEXT,
  p_items JSONB,
  p_payment_provider TEXT,
  p_payment_provider_id TEXT,
  p_customer_data JSONB,
  p_company_data JSONB,
  p_locale TEXT DEFAULT 'de',
  p_is_small_business BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  invoice_id UUID;
  invoice_num TEXT;
  tax_amount DECIMAL;
BEGIN
  -- Generiere Rechnungsnummer
  invoice_num := generate_invoice_number();
  
  -- Berechne Steuerbetrag (0 für Kleinunternehmer)
  tax_amount := p_amount_gross - p_amount_net;
  
  -- Erstelle Rechnung
  INSERT INTO invoices (
    user_id,
    subscription_id,
    invoice_number,
    invoice_date,
    due_date,
    amount_net,
    amount_gross,
    tax_amount,
    tax_rate,
    currency,
    is_small_business,
    tax_exempt,
    status,
    payment_provider,
    payment_provider_id,
    description,
    items,
    locale,
    customer_data,
    company_data
  ) VALUES (
    p_user_id,
    p_subscription_id,
    invoice_num,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days', -- 14 Tage Zahlungsziel
    p_amount_net,
    p_amount_gross,
    tax_amount,
    CASE WHEN p_is_small_business THEN 0 ELSE 19 END, -- 0% für Kleinunternehmer, sonst 19%
    p_currency,
    p_is_small_business,
    p_is_small_business, -- Kleinunternehmer = steuerfrei
    'paid', -- Status wird auf 'paid' gesetzt, da Zahlung bereits erfolgt
    p_payment_provider,
    p_payment_provider_id,
    p_description,
    p_items,
    p_locale,
    p_customer_data,
    p_company_data
  ) RETURNING id INTO invoice_id;
  
  RETURN invoice_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: get_user_invoices
-- Holt alle Rechnungen eines Users
-- ============================================
CREATE OR REPLACE FUNCTION get_user_invoices(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  invoice_date DATE,
  amount_gross DECIMAL,
  currency TEXT,
  status TEXT,
  pdf_url TEXT,
  locale TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.amount_gross,
    i.currency,
    i.status,
    i.pdf_url,
    i.locale,
    i.created_at
  FROM invoices i
  WHERE i.user_id = p_user_id
  ORDER BY i.invoice_date DESC, i.invoice_number DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: update_invoices_updated_at
-- Aktualisiert updated_at automatisch
-- ============================================
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihre eigenen Rechnungen sehen
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service Role kann alle Rechnungen verwalten
CREATE POLICY "Service role can manage all invoices"
  ON invoices FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- INITIAL DATA: Invoice Number Sequence für aktuelles Jahr
-- ============================================
INSERT INTO invoice_number_sequence (year, last_number)
VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0)
ON CONFLICT (year) DO NOTHING;

