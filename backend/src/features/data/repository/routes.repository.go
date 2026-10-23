package repository

const (
	RouteMain           string = "/api/"
	RouteLogin          string = "/api/login"
	RouteValidate       string = "/api/validate"
	RouteChangePassword string = "/api/users/change-password"
	RouteSessions       string = "/api/users/sessions"
	RouteRevokeSessions string = "/api/users/sessions"
	RouteRevokeSession  string = "/api/users/session/{id}"
	RouteLogout         string = "/api/users/logout"
)
