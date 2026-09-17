CREATE TABLE IF NOT EXISTS Status (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   slug VARCHAR(64) NOT NULL UNIQUE,
   title VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS Users (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   fullname VARCHAR(128) NOT NULL,
   username VARCHAR(128) NOT NULL UNIQUE,
   password VARCHAR(256) NOT NULL,
   profile USER_PROFILE NOT NULL,
   phone_number VARCHAR(13),
   curp CHARACTER(18),
   address VARCHAR(512),
   guarantee_fullname VARCHAR(256),
   guarantee_phone_number VARCHAR(13),
   guarantee_address VARCHAR(512),
   account_clabe VARCHAR(18),
   account_bank VARCHAR(128),
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS Sessions (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   token CHARACTER(64) NOT NULL,
   token_exp TIMESTAMP NOT NULL,
   device_agent VARCHAR(256) NOT NULL,
   last_login TIMESTAMP NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   user_id UUID NOT NULL REFERENCES Users(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS Settings (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   title VARCHAR(64) NOT NULL,
   slug VARCHAR(64) NOT NULL,
   value INTEGER NOT NULL,
   unit SETTINGS_UNIT NOT NULL,
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS CashBalanceCycles (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   reward_cycle INTEGER NOT NULL,
   weight INTEGER NOT NULL,
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS CashBalances (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   amount INTEGER NOT NULL,
   last_update TIMESTAMP NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   user_id UUID UNIQUE REFERENCES Users(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS CashBalanceDetails (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   folio CHARACTER(32) NOT NULL UNIQUE,
   initial_amount INTEGER NOT NULL,
   current_amount INTEGER NOT NULL,
   current_reward INTEGER NOT NULL,
   last_update TIMESTAMP NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   closed_at TIMESTAMP,
   cash_balance_cycle_id UUID NOT NULL REFERENCES CashBalanceCycles(id),
   cash_balance_id UUID NOT NULL REFERENCES CashBalances(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS CancelRequest (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   response_date TIMESTAMP,
   document UUID NOT NULL UNIQUE,
   message VARCHAR(1024) NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS CancelRequestDetails (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   cash_balance_detail_id UUID NOT NULL REFERENCES CashBalanceDetails(id),
   cancel_request_id UUID NOT NULL REFERENCES CancelRequest(id)
);

CREATE TABLE IF NOT EXISTS Notifications (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   title VARCHAR(128) NOT NULL,
   message VARCHAR(512) NOT NULL,
   important BOOLEAN NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   user_id UUID NOT NULL REFERENCES Users(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS Loans (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   folio CHARACTER(32) NOT NULL UNIQUE,
   request_date TIMESTAMP NOT NULL,
   resolution_date TIMESTAMP,
   amount INTEGER,
   type LOAN_TYPE,
   no_payments INTEGER,
   rate_settings_id UUID REFERENCES Settings(id),
   request_user_id UUID NOT NULL REFERENCES Users(id),
   resolution_user_id UUID REFERENCES Users(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS LoanDetails (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   amount INTEGER NOT NULL,
   percentage_settings_id UUID NOT NULL REFERENCES Settings(id),
   cash_balance_detail_id UUID REFERENCES CashBalanceDetails(id),
   cash_balance_id UUID NOT NULL REFERENCES CashBalances(id),
   loan_id UUID NOT NULL REFERENCES Loans(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS Agreements (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   folio CHARACTER(32) NOT NULL UNIQUE,
   base_amount INTEGER NOT NULL,
   weeks INTEGER NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   percentage_settings_id UUID NOT NULL REFERENCES Settings(id),
   user_id UUID NOT NULL REFERENCES Users(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS AgreementDetails (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   amount INTEGER NOT NULL,
   loan_id UUID UNIQUE REFERENCES Loans(id),
   unfulfilled_agreement_id UUID UNIQUE REFERENCES Agreements(id),
   agreement_id UUID NOT NULL REFERENCES Agreements(id)
);

CREATE TABLE IF NOT EXISTS Payments (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   amount INTEGER NOT NULL,
   expected_payment_date TIMESTAMP NOT NULL,
   loan_id UUID REFERENCES Loans(id),
   agreement_id UUID REFERENCES Agreements(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS PaymentDetails (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   amount INTEGER NOT NULL,
   type LOAN_PAYMENT_TYPE NOT NULL,
   payment_date TIMESTAMP NOT NULL,
   payment_id UUID NOT NULL REFERENCES Payments(id)
);

CREATE TABLE IF NOT EXISTS PaymentExtras (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   extra_amount INTEGER NOT NULL,
   concept PAYMENT_EXTRA_CONCEPT NOT NULL,
   payment_date TIMESTAMP,
   settings_id UUID NOT NULL REFERENCES Settings(id),
   payment_id UUID NOT NULL REFERENCES Payments(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);

CREATE TABLE IF NOT EXISTS Movements (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   folio CHARACTER(32) NOT NULL,
   amount INTEGER NOT NULL,
   type MOVEMENT_TYPE NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   cash_balance_id UUID NOT NULL REFERENCES CashBalances(id),
   cash_balance_detail_id UUID REFERENCES CashBalanceDetails(id),
   recipient_loan_id UUID REFERENCES Loans(id),
   origin_payment_id UUID REFERENCES Payments(id),
   origin_payment_extra_id UUID REFERENCES Payments(id),
   user_id UUID NOT NULL REFERENCES Users(id),
   status_id UUID NOT NULL REFERENCES Status(id)
);