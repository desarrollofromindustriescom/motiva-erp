package repository

import "errors"

var (
	FolioErrInvalid  error = errors.New("Invalid folio data")
	FolioErrOverflow error = errors.New("Folio number overflow")
)
