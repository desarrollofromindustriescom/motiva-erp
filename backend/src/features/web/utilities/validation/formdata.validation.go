package validation

import (
	"bytes"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/models"
)

var (
	pdfMagic  []byte = []byte("%PDF-")
	pngMagic  []byte = []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}
	jpegMagic []byte = []byte{0xFF, 0xD8, 0xFF}
)

/**
 * Function to validate content in request form data
 * cheking keys in values and files
 */
func dataStructValidation(form *multipart.Form, allowed *models.FormDataContent) error {
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
func requestDataSize(response http.ResponseWriter, request *http.Request) error {
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
 * Broker function to validate form data format as multipart,
 * size in request and content fields
 */
func RequestDataValidation(response http.ResponseWriter, request *http.Request, allowed *models.FormDataContent) error {
	if err := contentTypeValidation(request, repository.ValMimeFormData); err != nil {
		slog.Error("Error verifying request content type",
			"event", "validation.RequestDataValidation.contentTypeValidation",
		)

		return err
	}

	if err := requestDataSize(response, request); err != nil {
		slog.Error("Error verifying request form data size",
			"event", "validation.RequestDataValidation.requestDataSize",
		)

		return err
	}

	if err := dataStructValidation(request.MultipartForm, allowed); err != nil {
		slog.Error("Error on form data fields allowed",
			"event", "validation.RequestDataValidation.dataStructValidation",
		)

		return err
	}

	return nil
}

/**
 * Opens the only file of a form field, checking the field has exactly one file & its size isn't exceeded
 */
func singleFile(form *multipart.Form, key string, event string) (multipart.File, error) {
	files := form.File[key]

	if len(files) == 0 || len(files) > 1 {
		slog.Error("Files length isn't expected",
			"event", event+".len",
			"key", key,
			"length", len(files),
		)

		return nil, repository.ValErrFileLength
	}

	header := files[0]

	if header.Size > repository.ValFormDataMaxFileSize {
		slog.Error("File too large",
			"event", event+".Size",
			"size", header.Size,
		)

		return nil, repository.ValErrFileSize
	}

	file, err := header.Open()

	if err != nil {
		slog.Error("Error verifying file open operation",
			"event", event+".Open",
		)

		return nil, repository.ValErrFileOpenTest
	}

	return file, nil
}

/**
 * Reads the first bytes of a file, a file shorter than that is an unsupported one
 */
func readHead(file multipart.File, size int, event string) ([]byte, error) {
	head := make([]byte, size)

	if _, err := io.ReadFull(file, head); err != nil {
		slog.Error("Error reading file head",
			"event", event+".ReadFull",
		)

		if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
			return nil, repository.ValErrUnsupportedFile
		}

		return nil, err
	}

	return head, nil
}

/**
 * Function to validate form data file is a valid pdf
 * - Only one file in form field
 * - Files size isn't exceed
 * - Is posibble to open file and read header
 * - Verify file type is pdf
 */
func ValidatePDF(form *multipart.Form, key string) error {
	file, err := singleFile(form, key, "validation.ValidatePDF")

	if err != nil {
		return err
	}

	defer file.Close()

	head, err := readHead(file, len(pdfMagic), "validation.ValidatePDF")

	if err != nil {
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

/**
 * Function to validate form data file is a png or jpg (jpeg) image, returns its type
 * (repository.ValImagePNG or ValImageJPEG, the extension to store it with)
 * - Only one file in form field
 * - Files size isn't exceed
 * - The type is the one of the content, never the one of the name or of the header of the request:
 *   the first bytes have to be the signature of a png or of a jpeg
 * - The header of the image has to be readable & agree with that signature, a file that only starts like
 *   an image but isn't one is refused
 * - Its sides can't be larger than repository.ValImageMaxSide
 */
func ValidateImage(form *multipart.Form, key string) (string, error) {
	file, err := singleFile(form, key, "validation.ValidateImage")

	if err != nil {
		return "", err
	}

	defer file.Close()

	head, err := readHead(file, len(pngMagic), "validation.ValidateImage")

	if err != nil {
		return "", err
	}

	var (
		kind   string
		format string
	)

	switch {
	case bytes.Equal(head, pngMagic):
		kind, format = repository.ValImagePNG, "png"
	case bytes.HasPrefix(head, jpegMagic):
		kind, format = repository.ValImageJPEG, "jpeg"
	default:
		slog.Error("Error into file head, image head mismatch",
			"event", "validation.ValidateImage.Equal",
		)

		return "", repository.ValErrUnsupportedFile
	}

	if _, err = file.Seek(0, io.SeekStart); err != nil {
		slog.Error("Error going back to the start of the file",
			"event", "validation.ValidateImage.Seek",
		)

		return "", repository.ValErrFileOpenTest
	}

	// only the header is decoded (its size & type), not the pixels
	config, detected, err := image.DecodeConfig(file)

	if err != nil || detected != format {
		slog.Error("Image header isn't valid",
			"event", "validation.ValidateImage.DecodeConfig",
			"detected", detected,
			"expected", format,
		)

		return "", repository.ValErrUnsupportedFile
	}

	if config.Width < 1 || config.Height < 1 {
		return "", repository.ValErrUnsupportedFile
	}

	if config.Width > repository.ValImageMaxSide || config.Height > repository.ValImageMaxSide {
		slog.Error("Image sides too large",
			"event", "validation.ValidateImage.Sides",
			"width", config.Width,
			"height", config.Height,
		)

		return "", repository.ValErrImageTooLarge
	}

	return kind, nil
}
