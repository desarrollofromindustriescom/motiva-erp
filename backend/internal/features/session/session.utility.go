package session

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"motiva-erp/backend/internal/models"
	"strings"
	"time"
)

func generateBearerToken() string {
	bytes := make([]byte, 32)

	rand.Read(bytes)

	token := hex.EncodeToString(bytes)
	
	return token
}

func parseUserAgent(agent string) (string, error) {
	const errorMessage string = "Invalid user agent format"

	if agent == "" || !strings.HasPrefix(agent, "Mozilla/5.0") {
		return "", fmt.Errorf(errorMessage)
	}

	var navigator string
	navigators := []string{
		"OPR",
		"Chrome",
		"Safari",
		"Firefox",
		"Edg",
	}

	for _, value := range navigators {
		if strings.Contains(agent, value) {
			if navigator != "" {
				navigator += ";"
			}

			navigator += value
		}
	}

	if navigator == "" {
		return "", fmt.Errorf(errorMessage)
	}

	iStart := strings.Index(agent, "(")
	iEnd := strings.Index(agent, ")")

	if iStart == -1 || iEnd == -1 || iStart >= iEnd {
		return "", fmt.Errorf(errorMessage)
	}

	osInfo := agent[iStart+1 : iEnd]
	osParts := strings.Split(osInfo, ";")

	if len(osParts) < 2 {
		return "", fmt.Errorf(errorMessage)
	}

	os := strings.ReplaceAll(osParts[1], " ", "_")
	device := "Desktop"

	if strings.Contains(agent, "Mobile") {
		device = "Mobile"
	}

	return fmt.Sprintf("Navigator/(%s),%s,%s", navigator, os, device), nil
}

func CreateNewSession(user *models.User, agent string, ctx context.Context) (*models.Session, error) {
	device, err := parseUserAgent(agent)

	if err != nil {
		log.Printf("Error generating session: %v", err)
		return nil, err
	}

	session := &models.Session{
		Token: generateBearerToken(),
		TokenExp: time.Now().AddDate(0, 0, 7),
		DeviceAgent: device,
		LastLogin: time.Now(),
		User: &models.User{
			ID:user.ID,
		},
		Status: &models.Status{
			ID: user.Status.ID,
		},
	}

	if err = saveNewSession(session, ctx); err != nil {
		return nil, err;
	}

	return session, nil
}

func updateTimeSession(session *models.Session, ctx context.Context) *models.Session {
	update := false
	threshold := time.Now().Add(-12 * time.Hour)

	if session.LastLogin.Before(threshold) {
		update = true
		session.LastLogin = time.Now()
	}

	threshold = time.Now().Add(24 * time.Hour)

	if session.TokenExp.Before(threshold) {
		update = true
		session.TokenExp = time.Now().AddDate(0, 0, 7)
	}

	if update {
		updateSession(session, ctx)
	}
	
	return session
}

func VerifySession(token string, agent string, ctx context.Context) (*models.Session, error) {
	device, err := parseUserAgent(agent)

	if err != nil {
		log.Printf("Error parsing device agent: %v", err)
		return nil, err
	}

	session, err := getActiveSession(token, device, ctx)

	if err != nil {
		return nil, err
	}

	if session.TokenExp.Before(time.Now()) {
		updateExpireSession(session, ctx)
		return nil, fmt.Errorf("Expired session")
	}

	session = updateTimeSession(session, ctx)
	return session, nil
}