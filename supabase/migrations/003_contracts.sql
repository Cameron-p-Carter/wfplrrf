-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Contract type and status enums
CREATE TYPE contract_type AS ENUM ('permanent', 'contractor', 'fixed_term');
CREATE TYPE contract_status AS ENUM ('active', 'expired', 'renewed', 'cancelled');

-- Contracts table
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  contract_type contract_type NOT NULL,
  status contract_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  length_months INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_person_id ON contracts(person_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select" ON contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contracts_insert" ON contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contracts_update" ON contracts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "contracts_delete" ON contracts FOR DELETE TO authenticated USING (true);
