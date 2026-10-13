package repository

const (
	HeadAcceptLanguage string = "Accept-Language"
	HeadOrigin         string = "Origin"
	HeadCORSOrigin     string = "Access-Control-Allow-Origin"
	HeadCORSMethods    string = "Access-Control-Allow-Methods"
	HeadCORSHeaders    string = "Access-Control-Allow-Headers"
	HeadXForwardedFor  string = "X-Forwarded-For"
	HeadCFConnectingIP string = "CF-Connecting-IP"
	HeadTrueClientIP   string = "True-Client-IP"
	HeadRetryAfter     string = "Retry-After"
	HeadUserAgent      string = "User-Agent"
	HeadContentType    string = "Content-Type"

	HeadValCORSMethods string = "GET, POST, PATCH, PUT, DELETE, QUERY, OPTIONS"
	HeadValCORSHeaders string = "Content-Type, Authorization"
)
