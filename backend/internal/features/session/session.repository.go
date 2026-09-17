package session

import (
	"context"
	"log"
	"motiva-erp/backend/internal/core/database"
	"motiva-erp/backend/internal/models"
)

func saveNewSession(session *models.Session, ctx context.Context) error {
	_, err := database.GetPool().Exec(
		ctx,
		saveSessionQuery,
		session.Token,
		session.TokenExp,
		session.DeviceAgent,
		session.LastLogin,
		session.User.ID,
		session.Status.ID,
	);

	if err != nil {
		log.Printf("Error saving user session: %v", err)
		return err
	}

	return nil
}

func getActiveSession(token string, agent string, ctx context.Context) (*models.Session, error) {
	session := &models.Session{
		Token: token,
		DeviceAgent: agent,
	}

	err := database.GetPool().QueryRow(
		ctx,
		getActiveSessionQuery,
		token,
		agent,
	).Scan(
		&session.ID,
		&session.TokenExp,
		&session.LastLogin,
		&session.CreatedAt,
	)

	if err != nil {
		log.Printf("Error requesting active session: %v", err)
		return nil, err
	}

	return session, nil
}

func updateExpireSession(session *models.Session, ctx context.Context) error {
	_, err := database.GetPool().Exec(ctx, expireSessionQuery, session.ID)

	if err != nil {
		log.Printf("Error on expire request session: %v", err)
		return err
	}

	return nil
}

func updateSession(session *models.Session, ctx context.Context) error {
	_, err := database.GetPool().Exec(
		ctx,
		updateSessionQuery,
		session.TokenExp,
		session.LastLogin,
	)

	if err != nil {
		log.Printf("Error updating session times: %v", err)
		return err
	}

	return nil
}