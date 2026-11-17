package users

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	mrand "math/rand/v2"
	"strings"
	"unicode"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"

	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

const (
	passwordUpper   string = "ABCDEFGHJKLMNPQRSTUVWXYZ"
	passwordLower   string = "abcdefghijkmnopqrstuvwxyz"
	passwordDigits  string = "23456789"
	passwordSpecial string = "!@#$%&*?-_"
)

var accents = strings.NewReplacer(
	"á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n",
	"Á", "a", "É", "e", "Í", "i", "Ó", "o", "Ú", "u", "Ü", "u", "Ñ", "n",
)

/**
 * Lowercase word with only ascii letters & digits
 */
func normalizeWord(word string) string {
	var builder strings.Builder

	for _, char := range strings.ToLower(accents.Replace(word)) {
		if (char >= 'a' && char <= 'z') || unicode.IsDigit(char) {
			builder.WriteRune(char)
		}
	}

	return builder.String()
}

/**
 * Builds the username: first letter of the name, first surname
 * (second word from the right, or the last word when there are
 * only two), a dot, a random number between 1111 & 9999 and the
 * first letter of the profile, ex: igarcia.4821a
 */
func buildUsername(fullname string, profile string) string {
	words := strings.Fields(fullname)

	name := normalizeWord(words[0])
	surname := normalizeWord(words[len(words)-1])

	if len(words) > 2 {
		surname = normalizeWord(words[len(words)-2])
	}

	if name == "" {
		name = "u"
	}

	return fmt.Sprintf("%s%s.%d%s", name[:1], surname, mrand.IntN(8889)+1111, profile[:1])
}

/**
 * Random index with a crypto source
 */
func randomIndex(limit int) (int, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(int64(limit)))

	if err != nil {
		return 0, err
	}

	return int(value.Int64()), nil
}

/**
 * Random password with at least one uppercase, lowercase,
 * digit & special character (satisfies the secure password rule)
 */
func generatePassword() (string, error) {
	groups := []string{passwordUpper, passwordLower, passwordDigits, passwordSpecial}
	all := strings.Join(groups, "")
	chars := make([]byte, 0, repository.UsrPasswordLength)

	for _, group := range groups {
		index, err := randomIndex(len(group))

		if err != nil {
			return "", err
		}

		chars = append(chars, group[index])
	}

	for len(chars) < repository.UsrPasswordLength {
		index, err := randomIndex(len(all))

		if err != nil {
			return "", err
		}

		chars = append(chars, all[index])
	}

	for i := len(chars) - 1; i > 0; i-- {
		j, err := randomIndex(i + 1)

		if err != nil {
			return "", err
		}

		chars[i], chars[j] = chars[j], chars[i]
	}

	return string(chars), nil
}

/**
 * Value stored only when the profile uses the field
 */
func optional(use bool, value string) *string {
	if !use || value == "" {
		return nil
	}

	return &value
}

/**
 * Creates a user with a generated username & password. Only the
 * fields that belong to the profile are stored: guarantee data
 * is ignored unless the borrower has guarantee
 */
func Create(ctx context.Context, payload *controller.CreateUserPayload) (*controller.CreatedUserPreview, error) {
	isInvestor := payload.Profile == repository.ProfileInvestor
	isBorrower := payload.Profile == repository.ProfileBorrower
	withGuarantee := isBorrower && payload.WithGuarantee

	password, err := generatePassword()

	if err != nil {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return nil, err
	}

	preview := &controller.CreatedUserPreview{Password: password}

	for range repository.UsrMaxUsernameAttempts {
		username := buildUsername(payload.Fullname, payload.Profile)

		err = database.GetPool().QueryRow(
			ctx,
			repository.UsrQryCreate,
			payload.Fullname,
			username,
			string(hash),
			payload.Profile,
			optional(isInvestor || isBorrower, payload.PhoneNumber),
			optional(isInvestor || isBorrower, strings.ToUpper(payload.CURP)),
			optional(isBorrower, payload.Address),
			optional(withGuarantee, payload.GuaranteeFullname),
			optional(withGuarantee, payload.GuaranteePhoneNumber),
			optional(withGuarantee, payload.GuaranteeAddress),
			optional(isInvestor, payload.AccountClabe),
			optional(isInvestor, payload.AccountBank),
		).Scan(&preview.ID)

		if err == nil {
			preview.Username = username
			return preview, nil
		}

		var pgErr *pgconn.PgError

		if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == repository.UsrConstraintUsername {
			continue
		}

		return nil, err
	}

	return nil, repository.UsrErrUsernameAttempts
}
