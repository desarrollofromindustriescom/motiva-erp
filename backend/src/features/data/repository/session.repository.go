package repository

import (
	"errors"
	"motiva-erp/backend/src/interfaces/models"
)

const (
	SsI18nKeyErrorOnSessionGeneration models.I18nKey = "ERROR_ON_SESSION_GENERATION"
	SsQryNewSession                   string         = `--sql
		INSERT INTO sessions (
			token,
			token_exp,
			device_agent,
			last_login,
			user_id
		) VALUES (
			$1, $2, $3, $4, $5
		);
	`
	SsQryGetActiveSession string = `--sql
		SELECT
			sessions.id,
			sessions.token_exp,
			sessions.last_login,
			sessions.created_at,
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
			status.id,
			status.slug,
			status.title
		FROM sessions
		INNER JOIN status ON sessions.status_id = status.id
		INNER JOIN users ON sessions.user_id = users.id AND users.status_id = status.id
		WHERE
			sessions.token = $1 AND
			sessions.device_agent = $2 AND
			status.slug = 'active'
	`
	SsQryUpdateExpired string = `--sql
		UPDATE sessions
		SET status_id = (SELECT id FROM status WHERE slug = 'expired')
		WHERE id = $1
	`
	SsQryRevokeOtherSessions string = `--sql
		UPDATE sessions
		SET status_id = (SELECT id FROM status WHERE slug = 'revoked')
		WHERE
			user_id = $1 AND
			id <> $2 AND
			status_id = (SELECT id FROM status WHERE slug = 'active')
	`
	SsQryRevokeSessionByToken string = `--sql
		UPDATE sessions
		SET status_id = (SELECT id FROM status WHERE slug = 'revoked')
		WHERE token = $1
	`
	SsQryUpdateExpTime string = `--sql
		UPDATE sessions
		SET
			token_exp = $1,
			last_login = $2
		WHERE id = $3
	`
)

var (
	SsErrUserAgentRequired error = errors.New("User agent required")
	SsErrExpired           error = errors.New("Session expired")
)
