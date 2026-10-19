CREATE TABLE IF NOT EXISTS status (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   slug VARCHAR(64) NOT NULL UNIQUE,
   title VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   fullname VARCHAR(128) NOT NULL,
   username VARCHAR(128) NOT NULL UNIQUE,
   password VARCHAR(256) NOT NULL,
   passwordChanged BOOLEAN NOT NULL DEFAULT FALSE,
   profile user_profile NOT NULL,
   phone_number VARCHAR(13),
   curp CHARACTER(18),
   address VARCHAR(512),
   guarantee_fullname VARCHAR(256),
   guarantee_phone_number VARCHAR(13),
   guarantee_address VARCHAR(512),
   account_clabe VARCHAR(18),
   account_bank VARCHAR(128),
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '9e150222-2e27-464d-9356-f4e2515d5755'
);

CREATE TABLE IF NOT EXISTS sessions (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   token CHARACTER(64) NOT NULL,
   token_exp TIMESTAMP NOT NULL,
   device_agent VARCHAR(256) NOT NULL,
   last_login TIMESTAMP NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   user_id UUID NOT NULL REFERENCES users (id),
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '9e150222-2e27-464d-9356-f4e2515d5755'
);

CREATE TABLE IF NOT EXISTS settings (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   slug VARCHAR(64) NOT NULL,
   VALUE INTEGER NOT NULL,
   unit settings_unit NOT NULL,
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '9e150222-2e27-464d-9356-f4e2515d5755'
);

CREATE TABLE IF NOT EXISTS cash_balance_cycles (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   reward_cycle INTEGER NOT NULL,
   weight INTEGER NOT NULL,
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '9e150222-2e27-464d-9356-f4e2515d5755'
);

CREATE TABLE IF NOT EXISTS cash_balances (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   amount INTEGER NOT NULL,
   last_update TIMESTAMP NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   user_id UUID UNIQUE REFERENCES users (id),
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '9e150222-2e27-464d-9356-f4e2515d5755'
);

CREATE TABLE IF NOT EXISTS cash_balance_details (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   folio CHARACTER(32) NOT NULL UNIQUE,
   initial_amount INTEGER NOT NULL,
   current_amount INTEGER NOT NULL,
   current_reward INTEGER NOT NULL,
   last_update TIMESTAMP NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   closed_at TIMESTAMP,
   cash_balance_cycle_id UUID NOT NULL REFERENCES cash_balance_cycles (id),
   cash_balance_id UUID NOT NULL REFERENCES cash_balances (id),
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '9e150222-2e27-464d-9356-f4e2515d5755'
);

CREATE TABLE IF NOT EXISTS cancel_request (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   response_date TIMESTAMP,
   document UUID NOT NULL UNIQUE,
   message VARCHAR(1024) NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '71408795-67e0-46a0-821d-ccdc6e126d59'
);

CREATE TABLE IF NOT EXISTS cancel_request_details (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   cash_balance_detail_id UUID NOT NULL REFERENCES cash_balance_details (id),
   cancel_request_id UUID NOT NULL REFERENCES cancel_request (id)
);

CREATE TABLE IF NOT EXISTS notifications (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   title VARCHAR(128) NOT NULL,
   message VARCHAR(512) NOT NULL,
   important BOOLEAN NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   user_id UUID NOT NULL REFERENCES users (id),
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT 'dab9d4a3-e641-443b-a6df-c0839ab190d9'
);

CREATE TABLE IF NOT EXISTS loans (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   folio CHARACTER(32) NOT NULL UNIQUE,
   request_date TIMESTAMP NOT NULL,
   resolution_date TIMESTAMP,
   amount INTEGER,
   type loan_type,
   no_payments INTEGER,
   rate_settings_id UUID REFERENCES settings (id),
   request_user_id UUID NOT NULL REFERENCES users (id),
   resolution_user_id UUID REFERENCES users (id),
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '71408795-67e0-46a0-821d-ccdc6e126d59'
);

CREATE TABLE IF NOT EXISTS loan_details (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   amount INTEGER NOT NULL,
   percentage_settings_id UUID NOT NULL REFERENCES settings (id),
   cash_balance_detail_id UUID REFERENCES cash_balance_details (id),
   cash_balance_id UUID NOT NULL REFERENCES cash_balances (id),
   loan_id UUID NOT NULL REFERENCES loans (id)
);

CREATE TABLE IF NOT EXISTS agreements (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   folio CHARACTER(32) NOT NULL UNIQUE,
   base_amount INTEGER NOT NULL,
   weeks INTEGER NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   percentage_settings_id UUID NOT NULL REFERENCES settings (id),
   user_id UUID NOT NULL REFERENCES users (id),
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '9e150222-2e27-464d-9356-f4e2515d5755'
);

CREATE TABLE IF NOT EXISTS agreement_details (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   amount INTEGER NOT NULL,
   loan_id UUID UNIQUE REFERENCES loans (id),
   unfulfilled_agreement_id UUID UNIQUE REFERENCES agreements (id),
   agreement_id UUID NOT NULL REFERENCES agreements (id)
);

CREATE TABLE IF NOT EXISTS payments (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   amount INTEGER NOT NULL,
   expected_payment_date TIMESTAMP NOT NULL,
   loan_id UUID REFERENCES loans (id),
   agreement_id UUID REFERENCES agreements (id),
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '71408795-67e0-46a0-821d-ccdc6e126d59'
);

CREATE TABLE IF NOT EXISTS payment_details (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   amount INTEGER NOT NULL,
   type loan_payment_type NOT NULL,
   payment_date TIMESTAMP NOT NULL,
   payment_id UUID NOT NULL REFERENCES payments (id)
);

CREATE TABLE IF NOT EXISTS payment_extras (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   extra_amount INTEGER NOT NULL,
   concept payment_extra_concept NOT NULL,
   payment_date TIMESTAMP,
   settings_id UUID NOT NULL REFERENCES settings (id),
   payment_id UUID NOT NULL REFERENCES payments (id)
);

CREATE TABLE IF NOT EXISTS movements (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
   folio CHARACTER(32) NOT NULL,
   amount INTEGER NOT NULL,
   type movement_type NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   cash_balance_id UUID NOT NULL REFERENCES cash_balances (id),
   cash_balance_detail_id UUID REFERENCES cash_balance_details (id),
   recipient_loan_id UUID REFERENCES loans (id),
   origin_payment_id UUID REFERENCES payments (id),
   origin_payment_extra_id UUID REFERENCES payment_extras (id),
   user_id UUID NOT NULL REFERENCES users (id),
   status_id UUID NOT NULL REFERENCES status (id) DEFAULT '97469771-106a-4b3e-a2c6-ee0e0d8fa6d5'
);
