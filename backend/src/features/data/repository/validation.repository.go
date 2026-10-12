package repository

import "errors"

const (
	ValJsonMime               string = "application/json"
	ValFormDataMime           string = "multipart/form-data"
	ValKeySecurePassword      string = "securepassword"
	ValJsonMaxSize            int64  = 1 << 20
	ValFormDataMaxRequestSize int64  = 10 << 20
	ValFormDataMaxFileSize    int64  = 9 << 20
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
