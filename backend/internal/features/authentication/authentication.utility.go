package authentication

import (
	"context"
	"log"
	"motiva-erp/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
)

func VerifyUserData(credentials *models.LoginRequest, ctx context.Context) (*models.User, error) {
	user, err := getUserData(credentials.Username, ctx)

	if err != nil {
		return nil, err
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(credentials.Password)); err != nil {
		log.Printf("Error verifying user credentials: %v", err)
		return nil, err
	}

	return user, nil
}
