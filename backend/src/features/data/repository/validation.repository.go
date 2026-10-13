package repository

import (
	"errors"
	"motiva-erp/backend/src/interfaces/models"
)

const (
	ValJsonMaxSize            int64 = 1 << 20
	ValFormDataMaxRequestSize int64 = 10 << 20
	ValFormDataMaxFileSize    int64 = 9 << 20

	ValKeySecurePassword string = "securepassword"

	ValMimeJson     string = "application/json"
	ValMimeFormData string = "multipart/form-data"

	ValI18nKeyFailFieldsValidation models.I18nKey = "FAIL_FIELDS_VALIDATION"
	ValI18nKeyFieldRequired        models.I18nKey = "FIELD_REQUIRED"
)

var (
	ValErrUnexpectedFields    error = errors.New("Unexpected fields in form data")
	ValErrUnexpectedFiles     error = errors.New("Unexpected files in form data")
	ValErrFileLength          error = errors.New("Files length mismatch")
	ValErrFileSize            error = errors.New("File too large")
	ValErrFileOpenTest        error = errors.New("Error opening file")
	ValErrUnsupportedFile     error = errors.New("Unsupported file type")
	ValErrInvalidDataType     error = errors.New("Invalid data type")
	ValErrPayloadDecode       error = errors.New("Request payload decode error")
	ValErrContentTypeMismatch error = errors.New("Content type mismatch")
)
