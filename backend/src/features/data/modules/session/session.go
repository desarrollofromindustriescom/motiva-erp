package session

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/modules/async"
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

/**
 *
 */
func extendTimeSession(ctx context.Context, session *models.Session) {
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

	if !update {
		return
	}

	tokenExp := session.TokenExp
	lastLogin := session.LastLogin
	sessionID := session.ID

	async.RunAsync(ctx, "Update time session", func(asyncCtx context.Context) error {
		_, err := database.GetPool().Exec(
			asyncCtx,
			repository.SsQryUpdateExpTime,
			tokenExp,
			lastLogin,
			sessionID,
		)

		return err
	})
}

/**
 *
 */
func VerifySession(token string, request *http.Request) (*models.Session, error) {
	agent := request.Header.Get(repository.HeadUserAgent)
	ctx := request.Context()

	agent, err := parseUserAgent(agent)

	if err != nil {
		return nil, err
	}

	session := &models.Session{
		Token:       token,
		DeviceAgent: agent,
		User:        &models.User{},
		Status:      &models.Status{},
	}

	err = database.GetPool().QueryRow(
		ctx,
		repository.SsQryGetActiveSession,
		session.Token,
		session.DeviceAgent,
	).Scan(
		&session.ID,
		&session.TokenExp,
		&session.LastLogin,
		&session.CreatedAt,
		&session.User.ID,
		&session.User.Fullname,
		&session.User.Username,
		&session.User.Password,
		&session.User.PasswordChanged,
		&session.User.Profile,
		&session.User.PhoneNumber,
		&session.User.CURP,
		&session.User.Address,
		&session.User.GuaranteeFullname,
		&session.User.GuaranteePhoneNumber,
		&session.User.GuaranteeAddress,
		&session.User.AccountClabe,
		&session.User.AccountBank,
		&session.Status.ID,
		&session.Status.Slug,
		&session.Status.Title,
	)

	if err != nil {
		return nil, err
	}

	if session.TokenExp.Before(time.Now()) {
		sessionID := session.ID

		async.RunAsync(ctx, "Update expired session", func(asyncCtx context.Context) error {
			_, err := database.GetPool().Exec(asyncCtx, repository.SsQryUpdateExpired, sessionID)
			return err
		})

		return nil, repository.SsErrExpired
	}

	extendTimeSession(ctx, session)
	return session, nil
}

/**
 *
 */
func RevokeOtherSessions(ctx context.Context, exec models.Executor, currentSession *models.Session) error {
	_, err := exec.Exec(ctx, repository.SsQryRevokeOtherSessions, currentSession.User.ID, currentSession.ID)

	return err
}

/**
 *
 */
func RevokeSessionByToken(ctx context.Context, token string) error {
	_, err := database.GetPool().Exec(ctx, repository.SsQryRevokeSessionByToken, token)

	return err
}
