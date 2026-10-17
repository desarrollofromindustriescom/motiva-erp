package authentication

import (
	"context"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"

	"golang.org/x/crypto/bcrypt"
)

/**
 *
 */
func VerifyUserData(payload *controller.LoginPayload, ctx context.Context) (*models.User, error) {
	user := &models.User{}
	user.Status = &models.Status{}

	err := database.GetPool().QueryRow(
		ctx,
		repository.AuthQryGetUserXUsername,
		(*payload).Username,
	).Scan(
		&user.ID,
		&user.Fullname,
		&user.Username,
		&user.Password,
		&user.Profile,
		&user.PhoneNumber,
		&user.CURP,
		&user.Address,
		&user.GuaranteeFullname,
		&user.GuaranteePhoneNumber,
		&user.GuaranteeAddress,
		&user.AccountClabe,
		&user.AccountBank,
		&user.CreatedAt,
		&user.Status.ID,
		&user.Status.Slug,
		&user.Status.Title,
	)

	if err != nil {
		return nil, err
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(payload.Password)); err != nil {
		return nil, repository.AuthErrPasswordMismatch
	}

	return user, nil
}

/**
 *
 */
func UpdatePassword(ctx context.Context, session *models.Session, payload *controller.ChangePasswordPayload) error {
	if err := bcrypt.CompareHashAndPassword([]byte(session.User.Password), []byte(payload.CurrentPassword)); err != nil {
		return repository.AuthErrPasswordMismatch
	}

	if payload.NewPassword != payload.ConfirmPassword {
		return repository.AuthErrNewPasswordsMismatch
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(payload.NewPassword), bcrypt.DefaultCost)

	if err != nil {
		return err
	}

	_, err = database.GetPool().Exec(ctx, repository.AuthQryUpdatePassword, string(hash), session.User.ID)

	return err
}
