package repository

import (
	"errors"

	"motiva-erp/backend/src/interfaces/models"
)

const (
	LnFolioPrefix string = "LN"

	LnTypeWeekly  string = "weekly"
	LnTypeMonthly string = "monthly"

	LnMaxMonthlyPayments int = 3
	LnMaxWeeklyPayments  int = 13

	// the most investors one loan can take money from
	LnMaxInvestors int = 100

	LnI18nKeyBorrowerInvalid  models.I18nKey = "LOAN_BORROWER_INVALID"
	LnI18nKeyPaymentsInvalid  models.I18nKey = "LOAN_PAYMENTS_INVALID"
	LnI18nKeyRateNotFound     models.I18nKey = "LOAN_RATE_NOT_FOUND"
	LnI18nKeyAmountTooLarge   models.I18nKey = "LOAN_AMOUNT_TOO_LARGE"
	LnI18nKeyFundsMismatch    models.I18nKey = "LOAN_FUNDS_MISMATCH"
	LnI18nKeyFundsInsufficent models.I18nKey = "LOAN_FUNDS_INSUFFICIENT"
	LnI18nKeyNotPending       models.I18nKey = "LOAN_NOT_PENDING"

	LnQryNextFolio string = `--sql
		SELECT nextval('loans_folio_seq')
	`

	// the borrower must be an active borrower
	LnQryActiveBorrower string = `--sql
		SELECT 1
		FROM users
		INNER JOIN status ON users.status_id = status.id
		WHERE
			users.id = $1 AND
			users.profile = 'borrower' AND
			status.slug = 'active'
	`

	// active setting of a slug: its id & its stored value (percentage x1000)
	LnQryActiveSetting string = `--sql
		SELECT
			settings.id,
			settings.value
		FROM settings
		INNER JOIN status ON settings.status_id = status.id
		WHERE
			settings.slug = $1 AND
			status.slug = 'active'
	`

	// stored value of a setting even when it isn't active anymore
	LnQrySettingByID string = `--sql
		SELECT settings.value
		FROM settings
		WHERE settings.id = $1
	`

	// the borrower is the user that requests the loan, the one that approves it is the resolver
	LnQryInsert string = `--sql
		INSERT INTO loans (
			folio,
			request_date,
			amount,
			type,
			no_payments,
			rate_settings_id,
			request_user_id
		) VALUES (
			$1, $2, $3, $4::loan_type, $5, $6, $7
		)
		RETURNING id
	`

	// the loan is locked so it can't be approved twice at the same time
	LnQryLockPending string = `--sql
		SELECT
			loans.id,
			loans.folio,
			loans.amount,
			loans.type::text,
			loans.no_payments,
			loans.rate_settings_id
		FROM loans
		INNER JOIN status ON loans.status_id = status.id
		WHERE
			loans.id = $1 AND
			status.slug = 'pending'
		FOR UPDATE OF loans
	`

	LnQryActivate string = `--sql
		UPDATE loans
		SET
			status_id = (SELECT id FROM status WHERE slug = 'active'),
			resolution_date = $2,
			resolution_user_id = $3
		WHERE id = $1
	`

	// the payments of a loan, pending by default
	LnQryInsertPayments string = `--sql
		INSERT INTO payments (amount, expected_payment_date, loan_id)
		SELECT item.amount, item.expected, $3
		FROM unnest($1::integer[], $2::timestamp[]) AS item(amount, expected)
	`

	LnQryInsertDetail string = `--sql
		INSERT INTO loan_details (
			amount,
			percentage_settings_id,
			cash_balance_detail_id,
			cash_balance_id,
			loan_id
		) VALUES (
			$1, $2, $3, $4, $5
		)
	`

	// movement of money that leaves a balance to fund a loan
	LnQryInsertMovement string = `--sql
		INSERT INTO movements (
			folio,
			amount,
			type,
			cash_balance_id,
			cash_balance_detail_id,
			recipient_loan_id,
			user_id
		) VALUES (
			$1, $2, 'withdrawal'::movement_type, $3, $4, $5, $6
		)
	`

	// the money an investment gives to a loan leaves it
	LnQryUpdateInvestment string = `--sql
		UPDATE cash_balance_details
		SET
			current_amount = current_amount - $1,
			last_update = $2
		WHERE id = $3
	`

	// an investor that can lend: active investor with an active balance
	LnQryLockInvestorBalance string = `--sql
		SELECT
			cash_balances.id,
			cash_balances.amount
		FROM cash_balances
		INNER JOIN status AS balance_status ON cash_balances.status_id = balance_status.id
		INNER JOIN users ON cash_balances.user_id = users.id
		INNER JOIN status AS user_status ON users.status_id = user_status.id
		WHERE
			cash_balances.user_id = $1 AND
			balance_status.slug = 'active' AND
			users.profile = 'investor' AND
			user_status.slug = 'active'
		FOR UPDATE OF cash_balances
	`

	// Investments of an investor a loan can take money from: active, not in a pending
	// cancellation request & closing after the last payment of the loan (if they close
	// before it isn't known if the investor renews them). Free money is what they hold
	// minus the reward, which belongs to the investor. The longest terms go first.
	LnQryEligibleInvestments string = `--sql
		SELECT
			cash_balance_details.id,
			cash_balance_details.current_amount - cash_balance_details.current_reward
		FROM cash_balance_details
		INNER JOIN status ON cash_balance_details.status_id = status.id
		INNER JOIN cash_balance_cycles ON cash_balance_details.cash_balance_cycle_id = cash_balance_cycles.id
		WHERE
			cash_balance_details.cash_balance_id = $1 AND
			status.slug = 'active' AND
			cash_balance_details.closed_at >= $2 AND
			cash_balance_details.current_amount - cash_balance_details.current_reward > 0 AND
			NOT EXISTS (
				SELECT 1
				FROM cancel_request_details
				INNER JOIN cancel_request ON cancel_request_details.cancel_request_id = cancel_request.id
				INNER JOIN status AS request_status ON cancel_request.status_id = request_status.id
				WHERE
					cancel_request_details.cash_balance_detail_id = cash_balance_details.id AND
					request_status.slug = 'pending'
			)
		ORDER BY
			cash_balance_cycles.reward_cycle DESC,
			cash_balance_details.closed_at DESC,
			cash_balance_details.id ASC
		FOR UPDATE OF cash_balance_details
	`

	// investors with money they can lend to a loan that ends on $1
	LnQryFundsInvestors string = `--sql
		SELECT
			users.id,
			users.fullname,
			SUM(cash_balance_details.current_amount - cash_balance_details.current_reward)::bigint
		FROM cash_balance_details
		INNER JOIN status AS detail_status ON cash_balance_details.status_id = detail_status.id
		INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
		INNER JOIN status AS balance_status ON cash_balances.status_id = balance_status.id
		INNER JOIN users ON cash_balances.user_id = users.id
		INNER JOIN status AS user_status ON users.status_id = user_status.id
		WHERE
			detail_status.slug = 'active' AND
			balance_status.slug = 'active' AND
			user_status.slug = 'active' AND
			users.profile = 'investor' AND
			cash_balance_details.closed_at >= $1 AND
			cash_balance_details.current_amount - cash_balance_details.current_reward > 0 AND
			NOT EXISTS (
				SELECT 1
				FROM cancel_request_details
				INNER JOIN cancel_request ON cancel_request_details.cancel_request_id = cancel_request.id
				INNER JOIN status AS request_status ON cancel_request.status_id = request_status.id
				WHERE
					cancel_request_details.cash_balance_detail_id = cash_balance_details.id AND
					request_status.slug = 'pending'
			)
		GROUP BY users.id, users.fullname
		ORDER BY users.fullname ASC, users.id ASC
	`
)

// Rows of the loans table. The state shown is derived: an active loan with a pending
// payment already due is expired. The settlement date is the last expected payment.
// The total is the amount with the interest applied once (same math as the creation).
const lnFrom string = `--sql
	FROM loans
	INNER JOIN status ON loans.status_id = status.id
	INNER JOIN users AS borrowers ON loans.request_user_id = borrowers.id
	LEFT JOIN settings ON loans.rate_settings_id = settings.id
	CROSS JOIN LATERAL (
		SELECT
			CASE
				WHEN status.slug = 'active' AND EXISTS (
					SELECT 1
					FROM payments
					INNER JOIN status AS payment_status ON payments.status_id = payment_status.id
					WHERE
						payments.loan_id = loans.id AND
						payment_status.slug = 'pending' AND
						payments.expected_payment_date::date < CURRENT_DATE
				) THEN 'expired'
				ELSE status.slug
			END AS slug,
			((loans.amount::bigint * (100000 + COALESCE(settings.value, 0)) + 50000) / 100000) AS total,
			(SELECT MAX(payments.expected_payment_date) FROM payments WHERE payments.loan_id = loans.id) AS settlement
	) AS derived
	WHERE
		(
			$1 = '' OR
			loans.folio ILIKE '%' || $1 || '%' OR
			borrowers.fullname ILIKE '%' || $1 || '%' OR
			borrowers.username ILIKE '%' || $1 || '%' OR
			borrowers.curp ILIKE '%' || $1 || '%'
		) AND
		(cardinality($2::uuid[]) = 0 OR loans.request_user_id = ANY($2::uuid[])) AND
		($3::date IS NULL OR loans.request_date >= $3::date) AND
		($4::date IS NULL OR loans.request_date < $4::date + 1) AND
		($5::date IS NULL OR derived.settlement >= $5::date) AND
		($6::date IS NULL OR derived.settlement < $6::date + 1) AND
		($7::numeric IS NULL OR COALESCE(settings.value, 0) >= $7::numeric * 1000) AND
		($8::numeric IS NULL OR COALESCE(settings.value, 0) <= $8::numeric * 1000) AND
		($9::int IS NULL OR loans.no_payments >= $9::int) AND
		($10::int IS NULL OR loans.no_payments <= $10::int) AND
		(
			cardinality($11::int[]) = 0 OR
			EXISTS (
				SELECT 1 FROM payments
				WHERE
					payments.loan_id = loans.id AND
					EXTRACT(ISODOW FROM payments.expected_payment_date)::int = ANY($11::int[])
			)
		) AND
		(
			cardinality($12::int[]) = 0 OR
			EXISTS (
				SELECT 1 FROM payments
				WHERE
					payments.loan_id = loans.id AND
					EXTRACT(DAY FROM payments.expected_payment_date)::int = ANY($12::int[])
			)
		) AND
		(
			NOT $13::boolean OR
			EXISTS (
				SELECT 1 FROM payments
				INNER JOIN payment_extras ON payment_extras.payment_id = payments.id
				WHERE payments.loan_id = loans.id AND payment_extras.concept = 'visit'
			)
		) AND
		(
			NOT $14::boolean OR
			EXISTS (
				SELECT 1 FROM payments
				INNER JOIN payment_extras ON payment_extras.payment_id = payments.id
				WHERE payments.loan_id = loans.id AND payment_extras.concept = 'mora'
			)
		) AND
		($15 = '' OR loans.type::text = $15) AND
		(cardinality($16::int[]) = 0 OR loans.no_payments = ANY($16::int[])) AND
		(cardinality($17::text[]) = 0 OR derived.slug = ANY($17::text[])) AND
		($18::numeric IS NULL OR loans.amount >= $18::numeric * 100) AND
		($19::numeric IS NULL OR loans.amount <= $19::numeric * 100) AND
		($20::numeric IS NULL OR derived.total >= $20::numeric * 100) AND
		($21::numeric IS NULL OR derived.total <= $21::numeric * 100)
`

const lnFromOne string = `--sql
	FROM loans
	INNER JOIN status ON loans.status_id = status.id
	INNER JOIN users AS borrowers ON loans.request_user_id = borrowers.id
	LEFT JOIN settings ON loans.rate_settings_id = settings.id
	CROSS JOIN LATERAL (
		SELECT
			CASE
				WHEN status.slug = 'active' AND EXISTS (
					SELECT 1
					FROM payments
					INNER JOIN status AS payment_status ON payments.status_id = payment_status.id
					WHERE
						payments.loan_id = loans.id AND
						payment_status.slug = 'pending' AND
						payments.expected_payment_date::date < CURRENT_DATE
				) THEN 'expired'
				ELSE status.slug
			END AS slug,
			((loans.amount::bigint * (100000 + COALESCE(settings.value, 0)) + 50000) / 100000) AS total,
			(SELECT MAX(payments.expected_payment_date) FROM payments WHERE payments.loan_id = loans.id) AS settlement
	) AS derived
	WHERE loans.id = $1
`

const (
	LnQryCount string = `--sql
		SELECT COUNT(*)` + lnFrom

	LnQryGet string = `--sql
		SELECT
			loans.id,
			loans.folio,
			borrowers.id,
			borrowers.fullname,
			derived.slug,
			loans.type::text,
			loans.amount,
			derived.total,
			COALESCE(settings.value, 0),
			loans.no_payments,
			loans.request_date` + lnFrom + `
		ORDER BY
			CASE WHEN $22 = 'asc' THEN loans.folio END ASC,
			CASE WHEN $22 = 'desc' THEN loans.folio END DESC,
			loans.request_date DESC,
			loans.id DESC
		LIMIT $23 OFFSET $24
	`
)

const (
	LnQryGetByID string = `--sql
		SELECT
			loans.id,
			loans.folio,
			derived.slug,
			loans.type::text,
			loans.amount,
			derived.total,
			COALESCE(settings.value, 0),
			loans.no_payments,
			loans.request_date,
			loans.resolution_date,
			borrowers.fullname,
			borrowers.phone_number,
			borrowers.curp,
			borrowers.address` + lnFromOne + `
	`

	// payments already fulfilled & what has been paid back (every payment detail)
	LnQryPaid string = `--sql
		SELECT
			COUNT(*) FILTER (WHERE status.slug = 'executed'),
			COALESCE(SUM((SELECT SUM(payment_details.amount) FROM payment_details WHERE payment_details.payment_id = payments.id)), 0)::bigint
		FROM payments
		INNER JOIN status ON payments.status_id = status.id
		WHERE payments.loan_id = $1
	`

	// the places that lent money to a loan: the general cash balance has no user
	LnQryLenders string = `--sql
		SELECT
			users.fullname,
			users.username,
			SUM(loan_details.amount)::bigint,
			MAX(investor_rate.value)
		FROM loan_details
		INNER JOIN cash_balances ON loan_details.cash_balance_id = cash_balances.id
		INNER JOIN settings AS investor_rate ON loan_details.percentage_settings_id = investor_rate.id
		LEFT JOIN users ON cash_balances.user_id = users.id
		WHERE loan_details.loan_id = $1
		GROUP BY users.id, users.fullname, users.username
		ORDER BY users.fullname ASC NULLS FIRST
	`
)

// state titles of the table
var LnStatusTitles map[string]string = map[string]string{
	"pending":  "Pendiente",
	"active":   "Al corriente",
	"rejected": "Rechazado",
	"finished": "Terminado",
	"expired":  "Expirado",
}

var (
	LnErrNotFound         error = errors.New("Loan not found")
	LnErrBorrowerInvalid  error = errors.New("Borrower doesn't exist or isn't active")
	LnErrPaymentsInvalid  error = errors.New("Number of payments not allowed for the loan type")
	LnErrRateNotFound     error = errors.New("Interest rate of the loan not found")
	LnErrAmountTooLarge   error = errors.New("Loan amount too large")
	LnErrFundsMismatch    error = errors.New("Funds don't add up to the loan amount")
	LnErrFundsInsufficent error = errors.New("Funds greater than what is available")
	LnErrNotPending       error = errors.New("Loan doesn't exist or isn't pending")
)
