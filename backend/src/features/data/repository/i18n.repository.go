package repository

import "motiva-erp/backend/src/interfaces/models"

const (
	I18nDefaultLang     string = "es"
	I18nFallbackMessage string = "ERR"
	I18nFileType        string = "json"
	I18nDirLocale       string = "locales"
)

var I18nTagsKeys map[string]models.I18nKey = map[string]models.I18nKey{
	"required": ValI18nKeyFieldRequired,
}
