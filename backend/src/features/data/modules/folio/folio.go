package folio

import (
	"context"
	"fmt"
	"strings"

	"motiva-erp/backend/src/features/data/repository"

	"github.com/jackc/pgx/v5"
)

/**
 * Total length of a folio, same as CHARACTER(32) columns
 */
const Length int = 32

/**
 * Builds a folio with prefix, hyphen & the number padded with zeros
 * until completing Length (only uppercase letters, numbers & hyphen),
 * ex: MV-00000000000000000000000000000001
 */
func Format(prefix string, number int64) (string, error) {
	if number < 1 || prefix == "" || prefix != strings.ToUpper(prefix) {
		return "", repository.FolioErrInvalid
	}

	digits := Length - len(prefix) - 1

	if digits < 1 {
		return "", repository.FolioErrInvalid
	}

	value := fmt.Sprintf("%0*d", digits, number)

	if len(value) > digits {
		return "", repository.FolioErrOverflow
	}

	return fmt.Sprintf("%s-%s", prefix, value), nil
}

/**
 * Next incremental folio for movements using a database
 * sequence, so concurrent requests never repeat a number
 */
func NextMovement(ctx context.Context, tx pgx.Tx) (string, error) {
	var number int64

	if err := tx.QueryRow(ctx, repository.CbQryNextMovementFolio).Scan(&number); err != nil {
		return "", err
	}

	return Format(repository.CbFolioPrefix, number)
}

/**
 * Next incremental folio for investments using a database sequence
 */
func NextInvestment(ctx context.Context, tx pgx.Tx) (string, error) {
	var number int64

	if err := tx.QueryRow(ctx, repository.CbQryNextInvestmentFolio).Scan(&number); err != nil {
		return "", err
	}

	return Format(repository.CbInvestmentFolioPrefix, number)
}
