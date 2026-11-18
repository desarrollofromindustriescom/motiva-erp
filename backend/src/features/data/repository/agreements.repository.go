package repository

import (
	"errors"

	"motiva-erp/backend/src/interfaces/models"
)

const (
	AgFolioPrefix string = "CV"

	// weeks an agreement can last
	AgMinWeeks int = 25
	AgMaxWeeks int = 100

	AgI18nKeyLoans models.I18nKey = "AGREEMENT_LOANS_INVALID"
	AgI18nKeyFunds models.I18nKey = "AGREEMENT_FUNDS_INSUFFICIENT"
	AgI18nKeyRate  models.I18nKey = "AGREEMENT_RATE_NOT_FOUND"
	AgI18nKeyVisit models.I18nKey = "AGREEMENT_NO_VISITS"

	AgQryNextFolio string = `--sql
		SELECT nextval('agreements_folio_seq')
	`

	// Active loans of a borrower with at least one week of delay: the weeks are counted from the oldest payment
	// that is late & not paid in full (the first day of delay is already the first week) & the debt is what
	// the unpaid payments still owe, with their mora & visits. $2 limits the loans to some of them (empty: all).
	agEligibleFrom string = `--sql
		FROM loans
		INNER JOIN status ON loans.status_id = status.id
		CROSS JOIN LATERAL (
			SELECT CEIL((CURRENT_DATE - MIN(payments.expected_payment_date::date)) / 7.0)::int AS weeks
			FROM payments
			WHERE
				payments.loan_id = loans.id AND
				payments.expected_payment_date::date < CURRENT_DATE AND
				payments.amount > COALESCE((SELECT SUM(payment_details.amount) FROM payment_details WHERE payment_details.status_id = '052c0113-4293-4619-880a-f158aecdd476' AND payment_details.payment_id = payments.id), 0)
		) AS late
		CROSS JOIN LATERAL (
			SELECT COALESCE(SUM(payments.amount - COALESCE((SELECT SUM(payment_details.amount) FROM payment_details WHERE payment_details.status_id = '052c0113-4293-4619-880a-f158aecdd476' AND payment_details.payment_id = payments.id), 0)), 0)::bigint AS total
			FROM payments
			WHERE payments.loan_id = loans.id
		) AS debt
		WHERE
			loans.request_user_id = $1 AND
			status.slug = 'active' AND
			late.weeks >= 1 AND
			(cardinality($2::uuid[]) = 0 OR loans.id = ANY($2::uuid[]))
	`
	AgQryEligible string = `--sql
		SELECT loans.id, loans.folio, late.weeks, debt.total` + agEligibleFrom + `
		ORDER BY late.weeks DESC, loans.folio ASC
	`
	// the loans of the agreement are locked so they can't change while it is created
	AgQryLockLoans string = `--sql
		SELECT loans.id, loans.folio, late.weeks, debt.total` + agEligibleFrom + `
		ORDER BY loans.id ASC
		FOR UPDATE OF loans
	`

	// the agreement is locked so its payments are paid one by one
	AgQryLockActive string = `--sql
		SELECT agreements.id
		FROM agreements
		INNER JOIN status ON agreements.status_id = status.id
		WHERE
			agreements.id = $1 AND
			status.slug = 'active'
		FOR UPDATE OF agreements
	`
	AgQryFinish string = `--sql
		UPDATE agreements
		SET status_id = (SELECT id FROM status WHERE slug = 'finished')
		WHERE id = $1
	`

	// header of an agreement, same columns as LnQryGetByID: the state is derived, a payment that is late and
	// not paid in full makes it expired; the total is what its payments add up to
	AgQryGetByID string = `--sql
		SELECT
			agreements.id,
			agreements.folio,
			CASE
				WHEN status.slug = 'active' AND EXISTS (
					SELECT 1
					FROM payments
					WHERE
						payments.agreement_id = agreements.id AND
						payments.expected_payment_date::date < CURRENT_DATE AND
						COALESCE((SELECT SUM(payment_details.amount) FROM payment_details WHERE payment_details.status_id = '052c0113-4293-4619-880a-f158aecdd476' AND payment_details.payment_id = payments.id), 0) < payments.amount
				) THEN 'expired'
				ELSE status.slug
			END,
			agreements.base_amount,
			(SELECT COALESCE(SUM(payments.amount), 0) FROM payments WHERE payments.agreement_id = agreements.id)::bigint,
			COALESCE(settings.value, 0),
			agreements.weeks,
			agreements.created_at,
			borrowers.id,
			borrowers.fullname,
			borrowers.username,
			borrowers.phone_number,
			borrowers.curp,
			borrowers.address
		FROM agreements
		INNER JOIN status ON agreements.status_id = status.id
		LEFT JOIN settings ON agreements.percentage_settings_id = settings.id
		INNER JOIN users AS borrowers ON agreements.user_id = borrowers.id
		WHERE agreements.id = $1
	`
	AgQryLoansOf string = `--sql
		SELECT loans.id, loans.folio, agreement_details.amount
		FROM agreement_details
		INNER JOIN loans ON agreement_details.loan_id = loans.id
		WHERE agreement_details.agreement_id = $1
		ORDER BY loans.folio ASC
	`
	AgQryOfLoan string = `--sql
		SELECT agreements.id, agreements.folio
		FROM agreement_details
		INNER JOIN agreements ON agreement_details.agreement_id = agreements.id
		WHERE agreement_details.loan_id = $1
	`

	AgQryInsert string = `--sql
		INSERT INTO agreements (folio, base_amount, weeks, percentage_settings_id, user_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	AgQryInsertDetail string = `--sql
		INSERT INTO agreement_details (amount, loan_id, agreement_id)
		VALUES ($1, $2, $3)
	`
	AgQryCancelLoans string = `--sql
		UPDATE loans
		SET status_id = (SELECT id FROM status WHERE slug = 'cancelled')
		WHERE id = ANY($1::uuid[])
	`
	// the payments of an agreement: they belong to it, not to a loan
	AgQryInsertPayments string = `--sql
		INSERT INTO payments (amount, original_amount, expected_payment_date, agreement_id)
		SELECT item.amount, item.amount, item.expected, $3
		FROM unnest($1::integer[], $2::timestamp[]) AS item(amount, expected)
	`

	// What the investors lent in some loans & have not got back yet: every investment the loans took money
	// from with what they lent & what the payments of the loan already deposited in it.
	AgQryRestorations string = `--sql
		SELECT
			loan_details.loan_id,
			loan_details.amount,
			loan_details.cash_balance_id,
			loan_details.cash_balance_detail_id,
			cash_balances.user_id,
			COALESCE((
				SELECT SUM(movements.amount)
				FROM movements
				INNER JOIN payments ON movements.origin_payment_id = payments.id
				WHERE
					payments.loan_id = loan_details.loan_id AND
					movements.type = 'deposit' AND
					movements.cash_balance_detail_id = loan_details.cash_balance_detail_id
			), 0)::bigint
		FROM loan_details
		INNER JOIN cash_balances ON loan_details.cash_balance_id = cash_balances.id
		WHERE
			loan_details.loan_id = ANY($1::uuid[]) AND
			loan_details.cash_balance_detail_id IS NOT NULL
		ORDER BY cash_balances.user_id ASC, loan_details.id ASC
	`
)

var (
	AgErrLoans error = errors.New("Loans of the agreement not valid")
	AgErrFunds error = errors.New("General cash balance can't restore the investors")
	AgErrVisit error = errors.New("Agreements have no visits")
	AgErrRate  error = errors.New("Agreement percentage not found")
)
