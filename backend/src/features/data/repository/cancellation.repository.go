package repository

import (
	"errors"

	"motiva-erp/backend/src/interfaces/models"
)

const (
	CcMaxMessageLength  int    = 1000
	CcMaxInvestments    int    = 100
	CcDocumentsDir      string = "cancellations"
	CcDefaultUploadsDir string = "uploads"

	CcI18nKeyPending              models.I18nKey = "CANCELLATION_PENDING"
	CcI18nKeyInvestmentsInvalid   models.I18nKey = "CANCELLATION_INVESTMENTS_INVALID"
	CcI18nKeyFileNotPDF           models.I18nKey = "CANCELLATION_FILE_NOT_PDF"
	CcI18nKeyFileTooLarge         models.I18nKey = "CANCELLATION_FILE_TOO_LARGE"
	CcI18nKeyFieldsFormat         models.I18nKey = "CANCELLATION_FIELDS_FORMAT"
	CcI18nKeyGeneralInsufficient  models.I18nKey = "CANCELLATION_GENERAL_INSUFFICIENT"
	CcI18nKeyInvestorInsufficient models.I18nKey = "CANCELLATION_INVESTOR_INSUFFICIENT"

	// pending request of the investor (only one can exist at a time)
	CcQryGetPending string = `--sql
		SELECT
			cancel_request.id,
			cancel_request.document,
			cancel_request.message,
			cancel_request.created_at
		FROM cancel_request
		INNER JOIN status ON cancel_request.status_id = status.id
		WHERE
			status.slug = 'pending' AND
			EXISTS (
				SELECT 1
				FROM cancel_request_details
				INNER JOIN cash_balance_details ON cancel_request_details.cash_balance_detail_id = cash_balance_details.id
				INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
				WHERE
					cancel_request_details.cancel_request_id = cancel_request.id AND
					cash_balances.user_id = $1
			)
		ORDER BY cancel_request.created_at DESC
		LIMIT 1
	`
	// the pending request is locked so it can't be answered twice at the same time
	CcQryLockPending string = `--sql
		SELECT cancel_request.id
		FROM cancel_request
		INNER JOIN status ON cancel_request.status_id = status.id
		WHERE
			cancel_request.id = $1 AND
			status.slug = 'pending' AND
			EXISTS (
				SELECT 1
				FROM cancel_request_details
				INNER JOIN cash_balance_details ON cancel_request_details.cash_balance_detail_id = cash_balance_details.id
				INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
				WHERE
					cancel_request_details.cancel_request_id = cancel_request.id AND
					cash_balances.user_id = $2
			)
		FOR UPDATE OF cancel_request
	`
	// request of the investor in any status (its document can always be read)
	CcQryDocumentOfOwner string = `--sql
		SELECT cancel_request.document
		FROM cancel_request
		WHERE
			cancel_request.id = $1 AND
			EXISTS (
				SELECT 1
				FROM cancel_request_details
				INNER JOIN cash_balance_details ON cancel_request_details.cash_balance_detail_id = cash_balance_details.id
				INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
				WHERE
					cancel_request_details.cancel_request_id = cancel_request.id AND
					cash_balances.user_id = $2
			)
	`
	CcQryRequestInvestments string = `--sql
		SELECT
			cash_balance_details.id,
			cash_balance_details.folio,
			cash_balance_details.initial_amount,
			cash_balance_details.current_amount,
			cash_balance_details.current_reward,
			cash_balance_details.created_at,
			cash_balance_details.last_update,
			cash_balance_details.closed_at,
			cash_balance_cycles.reward_cycle,
			status.slug,
			status.title
		FROM cancel_request_details
		INNER JOIN cash_balance_details ON cancel_request_details.cash_balance_detail_id = cash_balance_details.id
		INNER JOIN cash_balance_cycles ON cash_balance_details.cash_balance_cycle_id = cash_balance_cycles.id
		INNER JOIN status ON cash_balance_details.status_id = status.id
		WHERE cancel_request_details.cancel_request_id = $1
		ORDER BY cash_balance_details.created_at ASC, cash_balance_details.id ASC
	`
	CcQryLockRequestInvestments string = `--sql
		SELECT
			cash_balance_details.id,
			cash_balance_details.folio,
			cash_balance_details.initial_amount,
			cash_balance_details.current_amount,
			cash_balance_details.current_reward,
			cash_balance_details.created_at,
			cash_balance_details.last_update,
			cash_balance_details.closed_at,
			cash_balance_cycles.reward_cycle,
			status.slug,
			status.title
		FROM cancel_request_details
		INNER JOIN cash_balance_details ON cancel_request_details.cash_balance_detail_id = cash_balance_details.id
		INNER JOIN cash_balance_cycles ON cash_balance_details.cash_balance_cycle_id = cash_balance_cycles.id
		INNER JOIN status ON cash_balance_details.status_id = status.id
		WHERE cancel_request_details.cancel_request_id = $1
		ORDER BY cash_balance_details.created_at ASC, cash_balance_details.id ASC
		FOR UPDATE OF cash_balance_details
	`
	CcQryRespond string = `--sql
		UPDATE cancel_request
		SET
			status_id = (SELECT id FROM status WHERE slug = $2),
			response_date = $3
		WHERE id = $1
	`
	// investments cancelled by an approved request keep their amounts as history
	CcQryCancelInvestments string = `--sql
		UPDATE cash_balance_details
		SET
			status_id = (SELECT id FROM status WHERE slug = 'revoked'),
			last_update = $2
		WHERE id = ANY($1::uuid[])
	`

	// a cancellation request is pending while nobody has answered it
	CcQryPendingByUser string = `--sql
		SELECT EXISTS (
			SELECT 1
			FROM cancel_request
			INNER JOIN status ON cancel_request.status_id = status.id
			INNER JOIN cancel_request_details ON cancel_request_details.cancel_request_id = cancel_request.id
			INNER JOIN cash_balance_details ON cancel_request_details.cash_balance_detail_id = cash_balance_details.id
			INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
			WHERE
				cash_balances.user_id = $1 AND
				status.slug = 'pending'
		)
	`
	CcQryActiveInvestmentsByUser string = `--sql
		SELECT COUNT(*)
		FROM cash_balance_details
		INNER JOIN status ON cash_balance_details.status_id = status.id
		INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
		WHERE
			cash_balances.user_id = $1 AND
			status.slug = 'active'
	`
	// how many of the given investments belong to the investor & are active
	CcQryCountActiveOwned string = `--sql
		SELECT COUNT(*)
		FROM cash_balance_details
		INNER JOIN status ON cash_balance_details.status_id = status.id
		INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
		WHERE
			cash_balance_details.id = ANY($1::uuid[]) AND
			cash_balances.user_id = $2 AND
			status.slug = 'active'
	`
	// the status is the default one: pending, & the response date stays empty
	CcQryInsert string = `--sql
		INSERT INTO cancel_request (document, message)
		VALUES ($1, $2)
		RETURNING id
	`
	CcQryInsertDetails string = `--sql
		INSERT INTO cancel_request_details (cash_balance_detail_id, cancel_request_id)
		SELECT unnest($1::uuid[]), $2
	`
)

var (
	CcErrPending              error = errors.New("There is already a pending cancellation request")
	CcErrNoPending            error = errors.New("Pending cancellation request not found")
	CcErrDocumentMissing      error = errors.New("Cancellation document not found")
	CcErrGeneralInsufficient  error = errors.New("The general cash balance can't cover the request")
	CcErrInvestorInsufficient error = errors.New("The balance of the investor can't cover the request")
	CcErrInvestmentsInvalid   error = errors.New("Investments don't exist, aren't active or aren't from the investor")
)
