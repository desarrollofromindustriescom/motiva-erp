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

	UsrI18nKeyDeleteSelf      models.I18nKey = "USER_DELETE_SELF"
	UsrI18nKeyDeleteProtected models.I18nKey = "USER_DELETE_PROTECTED"
	UsrI18nKeyAlreadyInactive models.I18nKey = "USER_ALREADY_INACTIVE"

	UsrI18nKeyNotEditable      models.I18nKey = "USER_NOT_EDITABLE"
	UsrI18nKeyGuaranteeRemoval models.I18nKey = "USER_GUARANTEE_REMOVAL"

	UsrI18nKeyPasswordSelf      models.I18nKey = "USER_PASSWORD_SELF"
	UsrI18nKeyPasswordProtected models.I18nKey = "USER_PASSWORD_PROTECTED"

	UsrMaxUsernameAttempts int = 10
	UsrPasswordLength      int = 12

	UsrConstraintUsername string = "users_username_key"

	UsrQryCount string = `--sql
		SELECT COUNT(*)
		FROM users
		INNER JOIN status ON users.status_id = status.id
		WHERE
			users.profile::text = ANY($1::text[]) AND
			($2 = '' OR users.profile::text = $2) AND
			($3 = '' OR status.slug = $3) AND
			(
				$4 = '' OR
				users.curp ILIKE '%' || $4 || '%' OR
				users.username ILIKE '%' || $4 || '%' OR
				users.fullname ILIKE '%' || $4 || '%'
			)
	`
	UsrQryGet string = `--sql
		SELECT
			users.id,
			users.curp,
			users.username,
			users.fullname,
			users.profile,
			users.created_at,
			status.slug,
			status.title
		FROM users
		INNER JOIN status ON users.status_id = status.id
		WHERE
			users.profile::text = ANY($1::text[]) AND
			($2 = '' OR users.profile::text = $2) AND
			($3 = '' OR status.slug = $3) AND
			(
				$4 = '' OR
				users.curp ILIKE '%' || $4 || '%' OR
				users.username ILIKE '%' || $4 || '%' OR
				users.fullname ILIKE '%' || $4 || '%'
			)
		ORDER BY
			CASE WHEN $5 = 'asc' THEN users.curp END ASC NULLS LAST,
			CASE WHEN $5 = 'desc' THEN users.curp END DESC NULLS LAST,
			users.created_at DESC,
			users.id DESC
		LIMIT $6 OFFSET $7
	`
	UsrQryGetByID string = `--sql
		SELECT
			users.id,
			users.fullname,
			users.username,
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
			status.slug,
			status.title
		FROM users
		INNER JOIN status ON users.status_id = status.id
		WHERE
			users.id = $1 AND
			users.profile::text = ANY($2::text[])
	`
	UsrQryDeactivate string = `--sql
		UPDATE users
		SET status_id = (SELECT id FROM status WHERE slug = 'inactive')
		WHERE
			id = $1 AND
			status_id = (SELECT id FROM status WHERE slug = 'active')
	`
	UsrQryUpdate string = `--sql
		UPDATE users
		SET
			phone_number = $2,
			address = $3,
			guarantee_fullname = $4,
			guarantee_phone_number = $5,
			guarantee_address = $6,
			account_clabe = $7,
			account_bank = $8
		WHERE id = $1
	`
	UsrQryRegeneratePassword string = `--sql
		UPDATE users
		SET
			password = $2,
			passwordChanged = FALSE
		WHERE id = $1
	`
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
	// same insert, plus the cash balance of the investor (amount in cents) in one statement,
	// so the user & its balance are both created or none is
	UsrQryCreateInvestor string = `--sql
		WITH new_user AS (
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
		),
		new_balance AS (
			INSERT INTO cash_balances (amount, last_update, user_id)
			SELECT 0, CURRENT_TIMESTAMP, id FROM new_user
		)
		SELECT id FROM new_user
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
 * Every profile, the users a superadmin or administrator can see
 */
var UsrAllProfiles = []string{
	ProfileSuperadmin,
	ProfileAdministrator,
	ProfileManager,
	ProfileInvestor,
	ProfileBorrower,
}

/**
 * Profiles a manager is allowed to create & see
 */
var UsrManagerCreatableProfiles = []string{
	ProfileInvestor,
	ProfileBorrower,
}

var (
	UsrErrUsernameAttempts  error = errors.New("Couldn't generate an unique username")
	UsrErrNotFound          error = errors.New("User not found")
	UsrErrDeleteSelf        error = errors.New("A user can't delete itself")
	UsrErrDeleteProtected   error = errors.New("User profile can't be deleted")
	UsrErrAlreadyInactive   error = errors.New("User is already inactive")
	UsrErrNotEditable       error = errors.New("User profile has no editable data")
	UsrErrPasswordSelf      error = errors.New("A user can't regenerate its own password")
	UsrErrPasswordProtected error = errors.New("Password of this profile can't be regenerated")
	UsrErrGuaranteeRemoval  error = errors.New("Guarantee can't be removed once saved")
)
