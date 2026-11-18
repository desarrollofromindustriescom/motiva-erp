package loans

import (
	"context"
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

/**
 * Folder where the images of the receipts are stored, taken from the environment so
 * production can mount a volume there
 */
func ticketsDir() string {
	dir := os.Getenv(repository.EnvUploadsDir)

	if dir == "" {
		dir = repository.CcDefaultUploadsDir
	}

	return filepath.Join(dir, repository.LnTicketsDir)
}

/**
 * Stores the image using the ticket id as its name (& the extension of its detected type), so
 * no value from the user is part of the path. Fails if the file exists.
 */
func saveTicket(ticket uuid.UUID, kind string, header *multipart.FileHeader) (string, error) {
	dir := ticketsDir()

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	source, err := header.Open()

	if err != nil {
		return "", err
	}

	defer source.Close()

	target := filepath.Join(dir, ticket.String()+"."+kind)

	file, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o640)

	if err != nil {
		return "", err
	}

	if _, err = io.Copy(file, source); err != nil {
		file.Close()
		os.Remove(target)

		return "", err
	}

	if err = file.Close(); err != nil {
		os.Remove(target)

		return "", err
	}

	return target, nil
}

/**
 * Registers how an approved loan was handed to the borrower. It is only a record, it doesn't change
 * anything of the loan: with a transfer the image of the receipt is stored & its name (an uuid) is
 * kept, with cash there is no image. It can only be done once.
 * - kind & header are the type & the file of the image (only for transfers)
 */
func RegisterTicket(ctx context.Context, loanID uuid.UUID, payment string, kind string, header *multipart.FileHeader) error {
	tx, err := database.GetPool().Begin(ctx)

	if err != nil {
		return err
	}

	defer tx.Rollback(ctx)

	var (
		status     string
		registered bool
	)

	if err = tx.QueryRow(ctx, repository.LnQryLockTicket, loanID).Scan(&status, &registered); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return repository.LnErrNotFound
		}

		return err
	}

	if registered {
		return repository.LnErrTicketExists
	}

	// a loan that wasn't approved hasn't been handed over
	if status == "pending" || status == "rejected" || status == "cancelled" {
		return repository.LnErrTicketStatus
	}

	var (
		ticket *uuid.UUID
		path   string
	)

	if payment == repository.LnPaymentTransfer {
		id := uuid.New()
		ticket = &id

		if path, err = saveTicket(id, kind, header); err != nil {
			return err
		}
	}

	if _, err = tx.Exec(ctx, repository.LnQrySetTicket, loanID, payment, ticket); err != nil {
		if path != "" {
			os.Remove(path)
		}

		return err
	}

	if err = tx.Commit(ctx); err != nil {
		if path != "" {
			os.Remove(path)
		}

		return err
	}

	return nil
}

/**
 * Image & its mime type from the name (an uuid) the receipt was stored with
 */
func ticketFile(ticket uuid.UUID) (string, string, error) {
	for extension, mime := range map[string]string{repository.ValImagePNG: "image/png", repository.ValImageJPEG: "image/jpeg"} {
		path := filepath.Join(ticketsDir(), ticket.String()+"."+extension)

		if _, err := os.Stat(path); err == nil {
			return path, mime, nil
		}
	}

	return "", "", repository.LnErrTicketNotFound
}

/**
 * Path of the image of the receipt of a loan & its mime type
 */
func GetTicketPath(ctx context.Context, loanID uuid.UUID) (string, string, error) {
	var (
		payment *string
		ticket  *uuid.UUID
	)

	if err := database.GetPool().QueryRow(ctx, repository.LnQryGetTicket, loanID).Scan(&payment, &ticket); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", repository.LnErrNotFound
		}

		return "", "", err
	}

	if ticket == nil {
		return "", "", repository.LnErrTicketNotFound
	}

	return ticketFile(*ticket)
}

/**
 * Path of the image of the receipt of a payment made to a payment of a loan & its mime type
 */
func GetDepositTicketPath(ctx context.Context, loanID uuid.UUID, paymentID uuid.UUID, depositID uuid.UUID) (string, string, error) {
	var ticket *uuid.UUID

	if err := database.GetPool().QueryRow(ctx, repository.LnQryDepositTicket, depositID, paymentID, loanID).Scan(&ticket); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", repository.LnErrNotFound
		}

		return "", "", err
	}

	if ticket == nil {
		return "", "", repository.LnErrTicketNotFound
	}

	return ticketFile(*ticket)
}

/**
 * How a payment is made: cash, or a transfer with the image of its receipt (kind is its type
 * & header its file, validated by the handler)
 */
type Receipt struct {
	Method string
	Kind   string
	Header *multipart.FileHeader
}

/**
 * A receipt that was stored for a payment: the file stays only if the payment is saved
 */
type storedReceipt struct {
	payment *string
	id      *uuid.UUID
	path    string
	saved   bool
}

/**
 * Stores the image of the receipt of a transfer (cash has none). A payment without a receipt
 * (nil) keeps the type & the receipt empty.
 */
func storeReceipt(receipt *Receipt) (*storedReceipt, error) {
	stored := &storedReceipt{}

	if receipt == nil {
		return stored, nil
	}

	method := receipt.Method
	stored.payment = &method

	if receipt.Method != repository.LnPaymentTransfer {
		return stored, nil
	}

	id := uuid.New()
	path, err := saveTicket(id, receipt.Kind, receipt.Header)

	if err != nil {
		return nil, err
	}

	stored.id = &id
	stored.path = path

	return stored, nil
}

func (stored *storedReceipt) method() *string {
	return stored.payment
}

func (stored *storedReceipt) ticket() *uuid.UUID {
	return stored.id
}

// the payment was saved
func (stored *storedReceipt) keep() {
	stored.saved = true
}

// removes the image if the payment wasn't saved
func (stored *storedReceipt) discard() {
	if !stored.saved && stored.path != "" {
		os.Remove(stored.path)
	}
}
