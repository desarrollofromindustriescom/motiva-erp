package i18n

import (
	"embed"
	"encoding/json"
	"log/slog"
	"path"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/models"

	"github.com/nicksnyder/go-i18n/v2/i18n"
	"golang.org/x/text/language"
)

var (
	//go:embed locales/*.json
	localeFS embed.FS
	bundle   *i18n.Bundle = nil
)

/**
 * Function to create new i18n bundle, set default language
 * & scan json files in locale directory
 */
func Init() error {
	if bundle != nil {
		return nil
	}

	bundle = i18n.NewBundle(language.Spanish)
	bundle.RegisterUnmarshalFunc(repository.I18nFileType, json.Unmarshal)

	entries, err := localeFS.ReadDir(repository.I18nDirLocale)

	if err != nil {
		slog.Error("Error reading locales directory",
			"event", "i18n.Init.ReadDir",
			"dir", repository.I18nDirLocale,
		)

		return err
	}

	for _, entry := range entries {
		_, err = bundle.LoadMessageFileFS(localeFS, path.Join(repository.I18nDirLocale, entry.Name()))

		if err != nil {
			slog.Error("Error embeding lang from locales",
				"event", "i18n.Init.LoadMessageFileFS",
				"lang", entry.Name(),
			)

			return err
		}
	}

	return nil
}

/**
 * Main function to translate locale key in selected
 * language or return fallback as default
 */
func Translate(lang string, key models.I18nKey, data map[string]any) string {
	localizer := i18n.NewLocalizer(bundle, lang)
	msg, err := localizer.Localize(&i18n.LocalizeConfig{
		MessageID:    string(key),
		TemplateData: data,
	})

	if err != nil {
		slog.Warn("Error on message translation",
			"event", "i18n.Translate.Localize",
			"lang", lang,
			"key", key,
			"error", err,
		)

		return repository.I18nFallbackMessage
	}

	return msg
}
