package repository

import (
	"errors"
	"motiva-erp/backend/src/interfaces/models"
)

const (
	AuthI18nKeyUserNotFound             models.I18nKey = "USER_NOT_FOUND"
	AuthI18nKeyCurrentPasswordFailed    models.I18nKey = "CURRENT_PASSWORD_MISMATCH"
	AuthI18nKeyNewPasswordSameAsCurrent models.I18nKey = "NEW_PASSWORD_SAME_AS_CURRENT"
	AuthI18nKeyNewPasswordsFailed       models.I18nKey = "NEW_PASSWORDS_MISMATCH"

	AuthQryUpdatePassword string = `--sql
		UPDATE users
		SET password = $1
		WHERE id = $2
	`
	AuthQryGetUserXUsername string = `--sql
		SELECT
			users.id,
			users.fullname,
			users.username,
			users.password,
			users.passwordChanged,
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
	AuthErrPasswordMismatch         error = errors.New("Password mismatch")
	AuthErrNewPasswordSameAsCurrent error = errors.New("New password same as current password")
	AuthErrNewPasswordsMismatch     error = errors.New("New passwords mismatch")
)
