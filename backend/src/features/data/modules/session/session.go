package session

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/models"
)

var (
	navigators []string = []string{
		"OPR",
		"Chrome",
		"Safari",
		"Firefox",
		"Edg",
	}
)

/**
 *
 */
func generateBearerToken() string {
	bytes := make([]byte, 32)

	rand.Read(bytes)

	token := hex.EncodeToString(bytes)

	return token
}

/**
 *
 */
func parseUserAgent(agent string) (string, error) {
	if agent == "" || !strings.HasPrefix(agent, "Mozilla/5.0") {
		return "", repository.SsErrUserAgentRequired
	}

	var navigator string

	for _, value := range navigators {
		if strings.Contains(agent, value) {
			if navigator != "" {
				navigator += ";"
			}

			navigator += value
		}
	}

	if navigator == "" {
		return "", repository.SsErrUserAgentRequired
	}

	iStart := strings.Index(agent, "(")
	iEnd := strings.Index(agent, ")")

	if iStart == -1 || iEnd == -1 || iStart >= iEnd {
		return "", repository.SsErrUserAgentRequired
	}

	osInfo := agent[iStart+1 : iEnd]
	osParts := strings.Split(osInfo, ";")

	if len(osParts) < 2 {
		return "", repository.SsErrUserAgentRequired
	}

	os := strings.ReplaceAll(osParts[1], " ", "_")
	device := "Desktop"

	if strings.Contains(agent, "Mobile") {
		device = "Mobile"
	}

	return fmt.Sprintf("Navigator/(%s),%s,%s", navigator, os, device), nil
}

/**
 *
 */
func CreateNewSession(user *models.User, request *http.Request) (*models.Session, error) {
	agent := request.Header.Get(repository.HeadUserAgent)
	ctx := request.Context()

	device, err := parseUserAgent(agent)

	if err != nil {
		return nil, err
	}

	session := &models.Session{
		Token:       generateBearerToken(),
		TokenExp:    time.Now().AddDate(0, 0, 7),
		DeviceAgent: device,
		LastLogin:   time.Now(),
		User:        user,
	}

	_, err = database.GetPool().Exec(
		ctx,
		repository.SsQryNewSession,
		session.Token,
		session.TokenExp,
		session.DeviceAgent,
		session.LastLogin,
		session.User.ID,
	)

	if err != nil {
		return nil, err
	}

	return session, nil
}
