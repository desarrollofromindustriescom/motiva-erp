package repository

import (
	"errors"
	"motiva-erp/backend/src/interfaces/models"
)

const (
	AuthI18nKeyUserNotFound models.I18nKey = "USER_NOT_FOUND"

	AuthQryGetUserXUsername string = `--sql
		SELECT
			user.id,
			user.fullname,
			user.username,
			user.password,
			user.profile,
			user.phone_number,
			user.curp,
			user.address,
			user.guarantee_fullname,
			user.guarantee_phone_number,
			user.guarantee_address,
			user.account_clabe,
			user.account_bank,
			user.created_at,
			status.id,
			status.slug,
			status.title
		FROM Users AS user
		INNER JOIN Status AS status
		ON user.status_id = status.id
		WHERE
			user.username = $1 AND
			status.slug = 'active'
	`
)

var (
	AuthErrPasswordMismatch error = errors.New("Password mismatch")
)
