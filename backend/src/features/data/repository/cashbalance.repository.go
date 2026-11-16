package repository

import (
	"errors"

	"motiva-erp/backend/src/interfaces/models"
)

const (
	CbQryGetGeneralBalance string = `--sql
		SELECT
			cash_balances.amount,
			cash_balances.last_update
		FROM cash_balances
		INNER JOIN status ON cash_balances.status_id = status.id
		WHERE
			cash_balances.user_id IS NULL AND
			status.slug = 'active'
	`
)

const (
	CbMovementDeposit    string = "deposit"
	CbMovementWithdrawal string = "withdrawal"
	CbFolioPrefix        string = "MV"
	CbMaxAmountCents     int    = 2_147_483_647

	CbQryLockGeneralBalance string = `--sql
		SELECT
			cash_balances.id,
			cash_balances.amount
		FROM cash_balances
		INNER JOIN status ON cash_balances.status_id = status.id
		WHERE
			cash_balances.user_id IS NULL AND
			status.slug = 'active'
		FOR UPDATE OF cash_balances
	`
	CbQryUpdateBalance string = `--sql
		UPDATE cash_balances
		SET
			amount = $1,
			last_update = $2
		WHERE id = $3
	`
	CbQryCountMovements string = `--sql
		SELECT COUNT(*)
		FROM movements
		WHERE cash_balance_id IN (SELECT id FROM cash_balances WHERE user_id IS NULL)
	`
	CbQryGetMovements string = `--sql
		SELECT
			movements.id,
			movements.folio,
			movements.amount,
			movements.type,
			movements.created_at,
			status.slug,
			status.title,
			users.fullname,
			users.username,
			users.profile
		FROM movements
		INNER JOIN status ON movements.status_id = status.id
		INNER JOIN users ON movements.user_id = users.id
		WHERE movements.cash_balance_id IN (SELECT id FROM cash_balances WHERE user_id IS NULL)
		ORDER BY movements.created_at DESC, movements.id DESC
		LIMIT $1 OFFSET $2
	`
	CbQryNextMovementFolio string = `--sql
		SELECT nextval('movements_folio_seq')
	`
	CbQryInsertMovement string = `--sql
		INSERT INTO movements (
			folio,
			amount,
			type,
			cash_balance_id,
			user_id
		) VALUES (
			$1, $2, $3::movement_type, $4, $5
		)
	`

	CbI18nKeyInsufficient models.I18nKey = "CASH_BALANCE_INSUFFICIENT"
	CbI18nKeyLimit        models.I18nKey = "CASH_BALANCE_LIMIT_EXCEEDED"
)

var (
	CbErrInsufficient error = errors.New("Amount greater than cash balance")
	CbErrLimit        error = errors.New("Cash balance limit exceeded")
)

var CbErrNotFound error = errors.New("General cash balance not found")
