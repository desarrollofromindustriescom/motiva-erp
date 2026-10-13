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
)

var (
	SsErrUserAgentRequired error = errors.New("User agent required")
)
