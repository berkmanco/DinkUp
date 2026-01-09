-- Venmo Transactions Table
-- Stores parsed Venmo email transactions for automatic payment reconciliation

-- Transaction type enum
CREATE TYPE venmo_transaction_type AS ENUM ('payment_sent', 'payment_received', 'request_sent', 'request_received');

-- Transactions table
CREATE TABLE venmo_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  
  -- Parsed data from Venmo email
  transaction_type venmo_transaction_type NOT NULL,
  amount numeric(10, 2) NOT NULL,
  sender_name text NOT NULL,
  recipient_name text NOT NULL,
  note text,
  hashtag text, -- Extracted hashtag like #dinkup-xxx
  venmo_transaction_id text, -- If we can extract it from the email
  transaction_date timestamptz,
  
  -- Link to our payments (matched via hashtag or manual)
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  matched_at timestamptz,
  match_method text, -- 'auto_hashtag', 'auto_amount', 'manual'
  
  -- Raw data for debugging
  raw_json jsonb NOT NULL,
  email_subject text,
  email_from text,
  
  -- Processing status
  processed boolean DEFAULT false,
  processing_error text
);

-- Indexes
CREATE INDEX idx_venmo_transactions_hashtag ON venmo_transactions(hashtag) WHERE hashtag IS NOT NULL;
CREATE INDEX idx_venmo_transactions_payment_id ON venmo_transactions(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_venmo_transactions_processed ON venmo_transactions(processed) WHERE processed = false;
CREATE INDEX idx_venmo_transactions_created ON venmo_transactions(created_at);

-- RLS Policies
ALTER TABLE venmo_transactions ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert (from edge function)
-- Pool owners can view transactions linked to their payments
CREATE POLICY "Service role can insert transactions"
  ON venmo_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Pool owners can view linked transactions"
  ON venmo_transactions FOR SELECT
  USING (
    payment_id IN (
      SELECT p.id FROM payments p
      JOIN session_participants sp ON p.session_participant_id = sp.id
      JOIN sessions s ON sp.session_id = s.id
      JOIN pools po ON s.pool_id = po.id
      WHERE po.owner_id = auth.uid()
    )
  );

-- Comment
COMMENT ON TABLE venmo_transactions IS 'Parsed Venmo email transactions for automatic payment reconciliation';
