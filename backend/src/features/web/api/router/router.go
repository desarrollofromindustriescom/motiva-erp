package router

import (
	"fmt"
	"net/http"
	"time"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/features/web/api/handlers"
	"motiva-erp/backend/src/features/web/utilities/middleware"
	"motiva-erp/backend/src/interfaces/models"
)

func Router() *http.ServeMux {
	root := http.NewServeMux()
	api := http.NewServeMux()

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLogin), handlers.Login)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteValidate), handlers.Validate)

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPatch, repository.RouteChangePassword), handlers.ChangePassword)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteSessions), handlers.GetSessions)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodDelete, repository.RouteRevokeSessions), handlers.RevokeSessions)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodDelete, repository.RouteRevokeSession), handlers.RevokeSession)
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLogout), handlers.Logout)

	// Settings & general cash balance: only superadmin & administrator
	settingsProfiles := []string{repository.ProfileSuperadmin, repository.ProfileAdministrator}

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteCashBalance), middleware.Authorize(handlers.GetCashBalance, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteCashMovements), middleware.Authorize(handlers.QueryCashMovements, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteCashDeposit), middleware.Authorize(handlers.DepositCashBalance, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteCashWithdraw), middleware.Authorize(handlers.WithdrawCashBalance, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteSettings), middleware.Authorize(handlers.GetSettings, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsExtras), middleware.Authorize(handlers.UpdateExtraSettings, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsAgreements), middleware.Authorize(handlers.UpdateAgreementSettings, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsMonthly), middleware.Authorize(handlers.UpdateMonthlySettings, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsBiweekly), middleware.Authorize(handlers.UpdateBiweeklySettings, settingsProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteSettingsWeekly), middleware.Authorize(handlers.UpdateWeeklySettings, settingsProfiles...))

	// Users module: superadmin, administrator & manager (a manager can only create investors & borrowers)
	usersProfiles := []string{repository.ProfileSuperadmin, repository.ProfileAdministrator, repository.ProfileManager}

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUsers), middleware.Authorize(handlers.CreateUser, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteUsers), middleware.Authorize(handlers.QueryUsers, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteUser), middleware.Authorize(handlers.GetUser, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodDelete, repository.RouteUser), middleware.Authorize(handlers.DeleteUser, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteUser), middleware.Authorize(handlers.UpdateUser, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserPassword), middleware.Authorize(handlers.RegenerateUserPassword, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteUserBalance), middleware.Authorize(handlers.GetInvestorBalance, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserBalanceDeposit), middleware.Authorize(handlers.DepositInvestorBalance, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserBalanceWithdraw), middleware.Authorize(handlers.WithdrawInvestorBalance, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteUserMovements), middleware.Authorize(handlers.QueryInvestorMovements, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteCashCycles), middleware.Authorize(handlers.GetCashCycles, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteUserInvestments), middleware.Authorize(handlers.QueryInvestorInvestments, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserInvestments), middleware.Authorize(handlers.CreateInvestorInvestment, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteUserInvestmentMovements), middleware.Authorize(handlers.QueryInvestmentMovements, usersProfiles...))

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteUserCancellationPending), middleware.Authorize(handlers.GetPendingCancellation, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteUserCancellationDocument), middleware.Authorize(handlers.GetCancellationDocument, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserCancellationApprove), middleware.Authorize(handlers.ApproveCancellation, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserCancellationReject), middleware.Authorize(handlers.RejectCancellation, usersProfiles...))

	// Kpis: only superadmin & administrator, like the settings
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteKpis), middleware.Authorize(handlers.GetKpis, settingsProfiles...))

	// Loans module: same profiles as users
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteLoansCalendar), middleware.Authorize(handlers.GetLoansCalendar, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteLoansCalendarExcel), middleware.Authorize(handlers.GetLoansCalendarExcel, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteLoansExcel), middleware.Authorize(handlers.QueryLoansExcel, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteAgreementLoans), middleware.Authorize(handlers.QueryAgreementLoans, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteAgreements), middleware.Authorize(handlers.CreateAgreement, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteLoansFunds), middleware.Authorize(handlers.QueryLoanFunds, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteLoans), middleware.Authorize(handlers.QueryLoans, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLoans), middleware.Authorize(handlers.CreateLoan, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteLoan), middleware.Authorize(handlers.GetLoan, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteLoanPayments), middleware.Authorize(handlers.GetLoanPayments, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteLoanPaymentDeposits), middleware.Authorize(handlers.QueryLoanPaymentDeposits, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLoanPaymentVisits), middleware.Authorize(handlers.AddLoanPaymentVisit, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteLoanPaymentBreakdown), middleware.Authorize(handlers.GetLoanPaymentBreakdown, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteLoanDepositTicket), middleware.Authorize(handlers.GetLoanDepositTicket, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLoanDepositAccept), middleware.Authorize(handlers.AcceptLoanDeposit, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLoanDepositReject), middleware.Authorize(handlers.RejectLoanDeposit, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteLoanTicket), middleware.Authorize(handlers.GetLoanTicket, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPut, repository.RouteLoan), middleware.Authorize(handlers.UpdateLoan, usersProfiles...))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLoanApprove), middleware.Authorize(handlers.ApproveLoan, usersProfiles...))

	// Panel of the borrower: only its own loans
	borrower := repository.ProfileBorrower

	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteMySummary), middleware.Authorize(handlers.GetMySummary, borrower))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteMyLoans), middleware.Authorize(handlers.QueryMyLoans, borrower))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteMyLoan), middleware.Authorize(handlers.GetMyLoan, borrower))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteMyLoanPayments), middleware.Authorize(handlers.GetMyLoanPayments, borrower))
	api.HandleFunc(fmt.Sprintf("%s %s", "QUERY", repository.RouteMyLoanDeposits), middleware.Authorize(handlers.QueryMyLoanPaymentDeposits, borrower))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteMyLoanDepositTicket), middleware.Authorize(handlers.GetMyLoanDepositTicket, borrower))
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteMyLoanBreakdown), middleware.Authorize(handlers.GetMyLoanPaymentBreakdown, borrower))

	// Panel of the investor: its own balance
	api.HandleFunc(fmt.Sprintf("%s %s", http.MethodGet, repository.RouteInvestorBalance), middleware.Authorize(handlers.GetMyBalance, repository.ProfileInvestor))

	root.Handle(repository.RouteMain, middleware.Pipeline(api, nil))

	// Endpoints with files need more time to read the request, so they use their
	// own middleware config instead of the default one. The more specific route
	// takes precedence over the generic api one.
	streamConfig := &models.MiddlewareConfig{Timeout: 1 * time.Minute}

	root.Handle(
		fmt.Sprintf("%s %s", http.MethodPost, repository.RouteUserCancellations),
		middleware.Pipeline(middleware.Authorize(handlers.CreateCancellation, usersProfiles...), streamConfig),
	)

	root.Handle(
		fmt.Sprintf("%s %s", http.MethodPost, repository.RouteLoanTicket),
		middleware.Pipeline(middleware.Authorize(handlers.RegisterLoanTicket, usersProfiles...), streamConfig),
	)

	// the payments carry the receipt of a transfer too
	for route, handler := range map[string]http.HandlerFunc{
		repository.RouteLoanPaymentPay: handlers.PayLoanPayment,
		repository.RouteLoanPay:        handlers.PayLoan,
	} {
		root.Handle(
			fmt.Sprintf("%s %s", http.MethodPost, route),
			middleware.Pipeline(middleware.Authorize(handler, usersProfiles...), streamConfig),
		)
	}

	root.Handle(
		fmt.Sprintf("%s %s", http.MethodPost, repository.RouteMyLoanPaymentPay),
		middleware.Pipeline(middleware.Authorize(handlers.RequestMyLoanPayment, repository.ProfileBorrower), streamConfig),
	)

	return root
}
