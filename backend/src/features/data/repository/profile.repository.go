package repository

/**
 * User profiles, same values as enum user_profile
 * in database/schema/types.sql
 */
const (
	ProfileSuperadmin    string = "superadmin"
	ProfileAdministrator string = "administrator"
	ProfileManager       string = "manager"
	ProfileBorrower      string = "borrower"
	ProfileInvestor      string = "investor"
)
