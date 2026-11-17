package repository

import (
	"errors"

	"motiva-erp/backend/src/interfaces/models"
)

const (
	UsrI18nKeyFieldPhone     models.I18nKey = "FIELD_PHONE"
	UsrI18nKeyFieldCURP      models.I18nKey = "FIELD_CURP"
	UsrI18nKeyFieldClabe     models.I18nKey = "FIELD_CLABE"
	UsrI18nKeyFieldMaxLength models.I18nKey = "FIELD_MAX_LENGTH"
	UsrI18nKeyFieldOneOf     models.I18nKey = "FIELD_ONE_OF"

	UsrMaxUsernameAttempts int = 10
	UsrPasswordLength      int = 12

	UsrConstraintUsername string = "users_username_key"

	UsrQryCreate string = `--sql
		INSERT INTO users (
			fullname,
			username,
			password,
			profile,
			phone_number,
			curp,
			address,
			guarantee_fullname,
			guarantee_phone_number,
			guarantee_address,
			account_clabe,
			account_bank
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`
)

/**
 * Profiles that can be created from the users module
 */
var UsrCreatableProfiles = []string{
	ProfileAdministrator,
	ProfileManager,
	ProfileInvestor,
	ProfileBorrower,
}

/**
 * Profiles a manager is allowed to create
 */
var UsrManagerCreatableProfiles = []string{
	ProfileInvestor,
	ProfileBorrower,
}

var (
	UsrErrUsernameAttempts error = errors.New("Couldn't generate an unique username")
)
