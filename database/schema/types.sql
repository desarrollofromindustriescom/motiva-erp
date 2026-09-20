CREATE TYPE USER_PROFILE AS ENUM ('superadmin', 'administrator', 'borrower', 'investor');

CREATE TYPE SETTINGS_UNIT AS ENUM ('percentage', 'monetary', 'weeks');

CREATE TYPE LOAN_TYPE AS ENUM ('weekly', 'monthly');

CREATE TYPE LOAN_PAYMENT_TYPE AS ENUM ('capital', 'regular', 'late');

CREATE TYPE PAYMENT_EXTRA_CONCEPT AS ENUM ('mora', 'visit');

CREATE TYPE MOVEMENT_TYPE AS ENUM ('deposit', 'withdrawal');
