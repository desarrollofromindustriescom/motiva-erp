package session

import (
	"context"
	"log"
	"motiva-erp/backend/internal/core/database"
	"motiva-erp/backend/internal/models"
)

func saveNewSession(session *models.Session, ctx context.Context) error {
	if _, err := database.GetPool().Exec(ctx, saveSession, session.Token, session.TokenExp, session.DeviceAgent, session.LastLogin, session.UserID, session.StatusID); err != nil {
		log.Printf("Error saving user session: %v", err)
		return err
	}

	return nil
}