package users

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	mrand "math/rand/v2"
	"slices"
	"strings"
	"unicode"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/modules/session"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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
 * Escapes the LIKE wildcards so the search term is taken literally
 */
func escapeLike(term string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(term)
}

/**
 * One page of users with the combined filters. Profiles limits
 * which users the requester is allowed to see.
 */
func GetPage(ctx context.Context, payload *controller.UsersQueryPayload, profiles []string) (*controller.UsersPagePreview, error) {
	pool := database.GetPool()
	search := escapeLike(strings.TrimSpace(payload.Search))
	result := &controller.UsersPagePreview{
		Items: []*controller.UserRowPreview{},
		Page:  payload.Page,
		Size:  payload.Size,
	}

	err := pool.QueryRow(ctx, repository.UsrQryCount, profiles, payload.Profile, payload.Status, search).Scan(&result.Total)

	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(
		ctx,
		repository.UsrQryGet,
		profiles,
		payload.Profile,
		payload.Status,
		search,
		payload.Order,
		payload.Size,
		(payload.Page-1)*payload.Size,
	)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	for rows.Next() {
		item := &controller.UserRowPreview{Status: &controller.UserStatusPreview{}}

		err = rows.Scan(
			&item.ID,
			&item.CURP,
			&item.Username,
			&item.Fullname,
			&item.Profile,
			&item.CreatedAt,
			&item.Status.Slug,
			&item.Status.Title,
		)

		if err != nil {
			return nil, err
		}

		if item.CURP != nil {
			trimmed := strings.TrimSpace(*item.CURP)
			item.CURP = &trimmed
		}

		result.Items = append(result.Items, item)
	}

	return result, rows.Err()
}

/**
 * Trims the CHARACTER(n) columns (they come padded with spaces)
 */
func trimmed(value *string) *string {
	if value == nil {
		return nil
	}

	result := strings.TrimSpace(*value)

	return &result
}

/**
 * Every stored field of one user, only when its profile is in
 * the allowed ones (a manager can't see administrators)
 */
func GetByID(ctx context.Context, id uuid.UUID, profiles []string) (*controller.UserDetailPreview, error) {
	user := &controller.UserDetailPreview{Status: &controller.UserStatusPreview{}}

	err := database.GetPool().QueryRow(ctx, repository.UsrQryGetByID, id, profiles).Scan(
		&user.ID,
		&user.Fullname,
		&user.Username,
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
		&user.Status.Slug,
		&user.Status.Title,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, repository.UsrErrNotFound
		}

		return nil, err
	}

	user.CURP = trimmed(user.CURP)

	return user, nil
}

/**
 * Deletes a user (soft delete: it becomes inactive & can't log in) and
 * revokes its sessions, in one transaction. The requester can't delete
 * itself nor a superadmin, and only users in the allowed profiles.
 */
func Deactivate(ctx context.Context, requester *models.User, id uuid.UUID, profiles []string) error {
	user, err := GetByID(ctx, id, profiles)

	if err != nil {
		return err
	}

	switch {
	case user.ID == requester.ID:
		return repository.UsrErrDeleteSelf
	case user.Profile == repository.ProfileSuperadmin:
		return repository.UsrErrDeleteProtected
	case user.Status.Slug != "active":
		return repository.UsrErrAlreadyInactive
	}

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return err
	}

	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, repository.UsrQryDeactivate, id)

	if err != nil {
		return err
	}

	if tag.RowsAffected() == 0 {
		return repository.UsrErrAlreadyInactive
	}

	if err = session.RevokeUserSessions(ctx, tx, id); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

/**
 * Fields (json names) the profile requires when it is edited. The
 * guarantee ones only apply when the borrower has guarantee
 */
func missingUpdateFields(profile string, withGuarantee bool, payload *controller.UpdateUserPayload) []string {
	required := map[string]string{"phone_number": payload.PhoneNumber}

	switch profile {
	case repository.ProfileInvestor:
		required["account_clabe"] = payload.AccountClabe
		required["account_bank"] = payload.AccountBank
	case repository.ProfileBorrower:
		required["address"] = payload.Address

		if withGuarantee {
			required["guarantee_fullname"] = payload.GuaranteeFullname
			required["guarantee_phone_number"] = payload.GuaranteePhoneNumber
			required["guarantee_address"] = payload.GuaranteeAddress
		}
	}

	missing := []string{}

	for field, value := range required {
		if strings.TrimSpace(value) == "" {
			missing = append(missing, field)
		}
	}

	slices.Sort(missing)

	return missing
}

/**
 * Edits the data of an investor or a borrower. The name & the CURP never
 * change. A borrower with guarantee must keep it (it can only be changed),
 * one without it can add it, and guarantee data is dropped when it isn't
 * requested. Returns the missing required fields when there are any.
 */
func Update(ctx context.Context, id uuid.UUID, profiles []string, payload *controller.UpdateUserPayload) (*controller.UserDetailPreview, []string, error) {
	current, err := GetByID(ctx, id, profiles)

	if err != nil {
		return nil, nil, err
	}

	if current.Profile != repository.ProfileInvestor && current.Profile != repository.ProfileBorrower {
		return nil, nil, repository.UsrErrNotEditable
	}

	isBorrower := current.Profile == repository.ProfileBorrower
	hadGuarantee := current.GuaranteeFullname != nil || current.GuaranteePhoneNumber != nil || current.GuaranteeAddress != nil
	withGuarantee := isBorrower && payload.WithGuarantee

	if isBorrower && hadGuarantee && !payload.WithGuarantee {
		return nil, nil, repository.UsrErrGuaranteeRemoval
	}

	if missing := missingUpdateFields(current.Profile, withGuarantee, payload); len(missing) > 0 {
		return nil, missing, nil
	}

	_, err = database.GetPool().Exec(
		ctx,
		repository.UsrQryUpdate,
		id,
		optional(true, payload.PhoneNumber),
		optional(isBorrower, payload.Address),
		optional(withGuarantee, payload.GuaranteeFullname),
		optional(withGuarantee, payload.GuaranteePhoneNumber),
		optional(withGuarantee, payload.GuaranteeAddress),
		optional(!isBorrower, payload.AccountClabe),
		optional(!isBorrower, payload.AccountBank),
	)

	if err != nil {
		return nil, nil, err
	}

	updated, err := GetByID(ctx, id, profiles)

	return updated, nil, err
}

/**
 * Replaces the password of a user with a new random one, it is
 * returned only here. The user must change it again (passwordChanged
 * false) and its sessions are revoked, all in one transaction. The
 * requester can't regenerate its own password nor a superadmin one.
 */
func RegeneratePassword(ctx context.Context, requester *models.User, id uuid.UUID, profiles []string) (*controller.CreatedUserPreview, error) {
	user, err := GetByID(ctx, id, profiles)

	if err != nil {
		return nil, err
	}

	switch {
	case user.ID == requester.ID:
		return nil, repository.UsrErrPasswordSelf
	case user.Profile == repository.ProfileSuperadmin:
		return nil, repository.UsrErrPasswordProtected
	}

	password, err := generatePassword()

	if err != nil {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return nil, err
	}

	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return nil, err
	}

	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, repository.UsrQryRegeneratePassword, id, string(hash)); err != nil {
		return nil, err
	}

	if err = session.RevokeUserSessions(ctx, tx, id); err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &controller.CreatedUserPreview{ID: user.ID, Username: user.Username, Password: password}, nil
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
