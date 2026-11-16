package repository

import "errors"

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

var CbErrNotFound error = errors.New("General cash balance not found")
