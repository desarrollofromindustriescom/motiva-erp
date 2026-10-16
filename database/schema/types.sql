CREATE TYPE user_profile AS ENUM ('superadmin', 'administrator', 'manager', 'borrower', 'investor');

CREATE TYPE settings_unit AS ENUM ('percentage', 'monetary', 'weeks');

CREATE TYPE loan_type AS ENUM ('weekly', 'monthly');

CREATE TYPE loan_payment_type AS ENUM ('capital', 'regular', 'late');

CREATE TYPE payment_extra_concept AS ENUM ('mora', 'visit');

CREATE TYPE movement_type AS ENUM ('deposit', 'withdrawal');
