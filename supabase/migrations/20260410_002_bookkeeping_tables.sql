-- Tabellen voor de Bookkeeping Agent

-- Category suggestions
CREATE TYPE category_suggestion_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE category_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  suggested_category text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  status category_suggestion_status NOT NULL DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Een suggestie per transactie
  UNIQUE (transaction_id)
);

-- Voeg bookkeeping velden toe aan bank_transactions als ze niet bestaan
ALTER TABLE bank_transactions 
ADD COLUMN IF NOT EXISTS linked_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_receipt_id uuid REFERENCES receipts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_confidence numeric CHECK (match_confidence BETWEEN 0 AND 1),
ADD COLUMN IF NOT EXISTS category text;

-- Voeg linked_transaction_id toe aan invoices als het niet bestaat
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS linked_transaction_id uuid REFERENCES bank_transactions(id) ON DELETE SET NULL;

-- Voeg linked_transaction_id toe aan receipts als het niet bestaat
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS linked_transaction_id uuid REFERENCES bank_transactions(id) ON DELETE SET NULL;

-- RLS voor category_suggestions
ALTER TABLE category_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own category_suggestions"
  ON category_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category_suggestions"
  ON category_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category_suggestions"
  ON category_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own category_suggestions"
  ON category_suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_category_suggestions_user_status ON category_suggestions(user_id, status);
CREATE INDEX idx_bank_transactions_linked_invoice ON bank_transactions(linked_invoice_id) WHERE linked_invoice_id IS NOT NULL;
CREATE INDEX idx_bank_transactions_linked_receipt ON bank_transactions(linked_receipt_id) WHERE linked_receipt_id IS NOT NULL;
CREATE INDEX idx_bank_transactions_category ON bank_transactions(category) WHERE category IS NOT NULL;
CREATE INDEX idx_invoices_linked_transaction ON invoices(linked_transaction_id) WHERE linked_transaction_id IS NOT NULL;
CREATE INDEX idx_receipts_linked_transaction ON receipts(linked_transaction_id) WHERE linked_transaction_id IS NOT NULL;

-- Trigger voor updated_at op category_suggestions
CREATE TRIGGER update_category_suggestions_updated_at 
  BEFORE UPDATE ON category_suggestions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
