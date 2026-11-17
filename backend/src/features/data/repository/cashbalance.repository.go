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
	// legacy investors may not have a balance yet, so it is created when missing
	CbQryEnsureInvestorBalance string = `--sql
		INSERT INTO cash_balances (amount, last_update, user_id)
		VALUES (0, CURRENT_TIMESTAMP, $1)
		ON CONFLICT (user_id) DO NOTHING
	`
	CbQryGetInvestorBalance string = `--sql
		SELECT
			cash_balances.amount,
			cash_balances.last_update
		FROM cash_balances
		INNER JOIN status ON cash_balances.status_id = status.id
		WHERE
			cash_balances.user_id = $1 AND
			status.slug = 'active'
	`
)

const (
	CbInvestmentFolioPrefix string = "IN"

	// amount (cents) the active investments of a balance have locked
	CbQryInvestedByUser string = `--sql
		SELECT COALESCE(SUM(cash_balance_details.initial_amount), 0)::bigint
		FROM cash_balance_details
		INNER JOIN status ON cash_balance_details.status_id = status.id
		INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
		WHERE
			cash_balances.user_id = $1 AND
			status.slug = 'active'
	`
	CbQryInvestedByBalance string = `--sql
		SELECT COALESCE(SUM(cash_balance_details.initial_amount), 0)::bigint
		FROM cash_balance_details
		INNER JOIN status ON cash_balance_details.status_id = status.id
		WHERE
			cash_balance_details.cash_balance_id = $1 AND
			status.slug = 'active'
	`
	CbQryGetActiveCycles string = `--sql
		SELECT
			cash_balance_cycles.id,
			cash_balance_cycles.reward_cycle,
			cash_balance_cycles.weight
		FROM cash_balance_cycles
		INNER JOIN status ON cash_balance_cycles.status_id = status.id
		WHERE status.slug = 'active'
		ORDER BY cash_balance_cycles.reward_cycle ASC
	`
	CbQryGetActiveCycle string = `--sql
		SELECT cash_balance_cycles.reward_cycle
		FROM cash_balance_cycles
		INNER JOIN status ON cash_balance_cycles.status_id = status.id
		WHERE
			cash_balance_cycles.id = $1 AND
			status.slug = 'active'
	`
	CbQryNextInvestmentFolio string = `--sql
		SELECT nextval('investments_folio_seq')
	`
	// current_amount & current_reward start in 0 (the money will be used on loans)
	CbQryInsertInvestment string = `--sql
		INSERT INTO cash_balance_details (
			folio,
			initial_amount,
			current_amount,
			current_reward,
			last_update,
			closed_at,
			cash_balance_cycle_id,
			cash_balance_id
		) VALUES (
			$1, $2, 0, 0, $3, $4, $5, $6
		)
	`
	// the investment must belong to the balance of the investor
	CbQryInvestmentOfOwner string = `--sql
		SELECT 1
		FROM cash_balance_details
		INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
		WHERE
			cash_balance_details.id = $1 AND
			cash_balances.user_id = $2
	`
	CbQryCountInvestments string = `--sql
		SELECT COUNT(*)
		FROM cash_balance_details
		INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
		WHERE cash_balances.user_id = $1
	`
	// every investment of the investor, the active ones first
	CbQryGetInvestments string = `--sql
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
		FROM cash_balance_details
		INNER JOIN cash_balances ON cash_balance_details.cash_balance_id = cash_balances.id
		INNER JOIN cash_balance_cycles ON cash_balance_details.cash_balance_cycle_id = cash_balance_cycles.id
		INNER JOIN status ON cash_balance_details.status_id = status.id
		WHERE cash_balances.user_id = $1
		ORDER BY
			(status.slug = 'active') DESC,
			cash_balance_details.created_at DESC,
			cash_balance_details.id DESC
		LIMIT $2 OFFSET $3
	`
)

const (
	CbMovementDeposit    string = "deposit"
	CbMovementWithdrawal string = "withdrawal"
	CbFolioPrefix        string = "MV"
	CbMaxAmountCents     int    = 2_147_483_647

	// locks one balance: the general one (no owner) or the one of an investor
	CbQryLockBalance string = `--sql
		SELECT
			cash_balances.id,
			cash_balances.amount
		FROM cash_balances
		INNER JOIN status ON cash_balances.status_id = status.id
		WHERE
			cash_balances.user_id IS NOT DISTINCT FROM $1::uuid AND
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
		WHERE
			cash_balance_id IN (SELECT id FROM cash_balances WHERE user_id IS NOT DISTINCT FROM $1::uuid) AND
			($2::uuid IS NULL OR cash_balance_detail_id = $2::uuid)
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
		WHERE
			movements.cash_balance_id IN (SELECT id FROM cash_balances WHERE user_id IS NOT DISTINCT FROM $1::uuid) AND
			($2::uuid IS NULL OR movements.cash_balance_detail_id = $2::uuid)
		ORDER BY movements.created_at DESC, movements.id DESC
		LIMIT $3 OFFSET $4
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

	CbI18nKeyNotInvestor           models.I18nKey = "USER_NOT_INVESTOR"
	CbI18nKeyInsufficientAvailable models.I18nKey = "CASH_BALANCE_INSUFFICIENT_AVAILABLE"
	CbI18nKeyInvestmentExceeds     models.I18nKey = "INVESTMENT_EXCEEDS_AVAILABLE"
	CbI18nKeyCycleNotFound         models.I18nKey = "INVESTMENT_CYCLE_NOT_FOUND"
	CbI18nKeyInsufficient          models.I18nKey = "CASH_BALANCE_INSUFFICIENT"
	CbI18nKeyLimit                 models.I18nKey = "CASH_BALANCE_LIMIT_EXCEEDED"
)

var (
	CbErrInsufficient          error = errors.New("Amount greater than cash balance")
	CbErrLimit                 error = errors.New("Cash balance limit exceeded")
	CbErrNotInvestor           error = errors.New("User is not an investor")
	CbErrInsufficientAvailable error = errors.New("Amount greater than the available balance")
	CbErrInvestmentExceeds     error = errors.New("Investment greater than the available balance")
	CbErrCycleNotFound         error = errors.New("Investment cycle not found")
	CbErrInvestmentNotFound    error = errors.New("Investment not found")
)

var CbErrNotFound error = errors.New("General cash balance not found")
