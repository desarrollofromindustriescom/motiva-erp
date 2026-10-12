package validation

import (
	"bytes"
	"errors"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/models"
)

var pdfMagic []byte = []byte("%PDF-")

/**
 * Function to validate content in request form data
 * cheking keys in values and files
 */
func DataStructValidation(form *multipart.Form, allowed *models.FormDataContent) error {
	for key := range form.Value {
		if !allowed.Values[key] {
			slog.Error("Request form data has invalid values",
				"event", "validation.dataStructValidation.Values",
				"key", key,
			)

			return repository.ValErrUnexpectedFields
		}
	}

	for key := range form.File {
		if valid := allowed.Files[key]; !valid {
			slog.Error("Request form data has invalid files",
				"event", "validation.dataStructValidation.Files",
				"key", key,
			)

			return repository.ValErrUnexpectedFiles
		}
	}

	return nil
}

/**
 * Function to verify request form data max size isn't exceed
 */
func RequestDataSize(response http.ResponseWriter, request *http.Request) error {
	request.Body = http.MaxBytesReader(response, request.Body, repository.ValFormDataMaxRequestSize)

	if err := request.ParseMultipartForm(repository.ValFormDataMaxFileSize); err != nil {
		slog.Error("Error parsing form data from request",
			"event", "validation.RequestDataSize.ParseMultipartForm",
		)

		return err
	}

	defer request.MultipartForm.RemoveAll()

	return nil
}

/**
 * Function to validate form data file is a valid pdf
 * - Only one file in form field
 * - Files size isn't exceed
 * - Is posibble to open file and read header
 * - Verify file type is pdf
 */
func ValidatePDF(form *multipart.Form, key string) error {
	files := form.File[key]

	if len(files) == 0 || len(files) > 1 {
		slog.Error("Files length isn't expected",
			"event", "validation.ValidatePDF.len",
			"key", key,
			"length", len(files),
		)

		return repository.ValErrFileLength
	}

	header := files[0]

	if header.Size > repository.ValFormDataMaxFileSize {
		slog.Error("File too large",
			"event", "validation.ValidatePDF.Size",
			"size", header.Size,
		)

		return repository.ValErrFileSize
	}

	file, err := header.Open()

	if err != nil {
		slog.Error("Error verifying file open operation",
			"event", "validation.ValidatePDF.Open",
		)

		return repository.ValErrFileOpenTest
	}

	defer file.Close()

	head := make([]byte, len(pdfMagic))

	if _, err := io.ReadFull(file, head); err != nil {
		slog.Error("Error reading file head",
			"event", "validation.ValidatePDF.ReadFull",
		)

		if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
			return repository.ValErrUnsupportedFile
		}

		return err
	}

	if !bytes.Equal(head, pdfMagic) {
		slog.Error("Error into file head, pdf head mismatch",
			"event", "validation.ValidatePDF.Equal",
		)

		return repository.ValErrUnsupportedFile
	}

	return nil
}
