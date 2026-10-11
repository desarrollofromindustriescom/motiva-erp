package repository

const (
	ValJsonMime               string = "application/json"
	ValFormDataMime           string = "multipart/form-data"
	ValKeySecurePassword      string = "securepassword"
	ValJsonMaxSize            int64  = 1 << 20
	ValFormDataMaxRequestSize int64  = 10 << 20
	ValFormDataMaxFileSize    int64  = 9 << 20
)
