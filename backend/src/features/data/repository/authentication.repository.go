package repository

import (
	"errors"
	"motiva-erp/backend/src/interfaces/models"
)

const (
	AuthI18nKeyUserNotFound models.I18nKey = "USER_NOT_FOUND"

	AuthQryGetUserXUsername string = `--sql
		SELECT
			users.id,
			users.fullname,
			users.username,
			users.password,
			users.profile,
			users.phone_number,
			users.curp,
			users.address,
			users.guarantee_fullname,
			users.guarantee_phone_number,
			users.guarantee_address,
			users.account_clabe,
			users.account_bank,
			users.created_at,
			status.id,
			status.slug,
			status.title
		FROM users
		INNER JOIN status
		ON users.status_id = status.id
		WHERE
			users.username = $1 AND
			status.slug = 'active'
	`
)

var (
	AuthErrPasswordMismatch error = errors.New("Password mismatch")
)
