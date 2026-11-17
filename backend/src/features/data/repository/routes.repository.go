package repository

const (
	RouteMain               string = "/api/"
	RouteLogin              string = "/api/login"
	RouteValidate           string = "/api/validate"
	RouteUsers              string = "/api/users"
	RouteChangePassword     string = "/api/users/change-password"
	RouteSessions           string = "/api/users/sessions"
	RouteRevokeSessions     string = "/api/users/sessions"
	RouteRevokeSession      string = "/api/users/session/{id}"
	RouteLogout             string = "/api/users/logout"
	RouteSettings           string = "/api/settings"
	RouteCashBalance        string = "/api/cash-balance"
	RouteCashMovements      string = "/api/cash-balance/movements"
	RouteCashDeposit        string = "/api/cash-balance/deposit"
	RouteCashWithdraw       string = "/api/cash-balance/withdraw"
	RouteSettingsExtras     string = "/api/settings/extras"
	RouteSettingsAgreements string = "/api/settings/agreements"
	RouteSettingsMonthly    string = "/api/settings/monthly"
	RouteSettingsWeekly     string = "/api/settings/weekly"
)
