package repository

import "motiva-erp/backend/src/interfaces/models"

const (
	I18nDefaultLang     string = "es"
	I18nFallbackMessage string = "ERR"
	I18nFileType        string = "json"
	I18nDirLocale       string = "locales"
)

var I18nTagsKeys map[string]models.I18nKey = map[string]models.I18nKey{
	"required":           ValI18nKeyFieldRequired,
	"min":                ValI18nKeyFieldMinLength,
	ValKeySecurePassword: ValI18nKeyFieldSecurePassword,
	"gte":                ValI18nKeyFieldMinValue,
	"lte":                ValI18nKeyFieldMaxValue,
	"len":                ValI18nKeyFieldLength,
	ValKeyPercentage:     ValI18nKeyFieldPercentage,
	ValKeyMonetary:       ValI18nKeyFieldMonetary,
	ValKeyPhone:          UsrI18nKeyFieldPhone,
	ValKeyCURP:           UsrI18nKeyFieldCURP,
	ValKeyClabe:          UsrI18nKeyFieldClabe,
	"max":                UsrI18nKeyFieldMaxLength,
	"oneof":              UsrI18nKeyFieldOneOf,
	"uuid":               UsrI18nKeyFieldOneOf,
	"datetime":           UsrI18nKeyFieldOneOf,
}
