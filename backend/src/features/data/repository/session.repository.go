package repository

import (
	"errors"
	"motiva-erp/backend/src/interfaces/models"
)

const (
	SsI18nKeyErrorOnSessionGeneration models.I18nKey = "ERROR_ON_SESSION_GENERATION"
	SsQryNewSession                   string         = `--sql
		INSERT INTO Sessions (
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
			session.id,
			session.token_exp,
			session.last_login,
			session.created_at,
			user.id,
			user.fullname,
			user.username,
			user.profile,
			user.phone_number,
			user.curp,
			user.address,
			user.guarantee_fullname,
			user.guarantee_phone_number,
			user.guarantee_address,
			user.account_clabe,
			user.account_bank,
			status.id,
			status.slug,
			status.title
		FROM Sessions AS session
		INNER JOIN Status AS status ON session.status_id = status.id
		INNER JOIN Users AS user ON session.user_id = user.id AND user.status_id = status.id
		WHERE
			session.token = $1 AND
			session.device_agent = $2 AND
			status.slug = 'active'
	`
	SsQryUpdateExpired string = `--sql
		UPDATE Sessions
		SET status_id = (SELECT id FROM Status WHERE slug = 'expired')
		WHERE id = $1
	`
	SsQryUpdateExpTime string = `--sql
		UPDATE Sessions
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
