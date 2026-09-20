package authentication

import (
	"context"
	"log"
	"motiva-erp/backend/internal/core/database"
	"motiva-erp/backend/internal/models"
)

func getUserData(username string, ctx context.Context) (*models.User, error) {
	user := &models.User{}
	err := database.GetPool().QueryRow(
		ctx,
		getUserDataByUsernameQuery,
		username,
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
		log.Printf("Error on user data query: %v", err)
		return nil, err
	}

	return user, nil
}
