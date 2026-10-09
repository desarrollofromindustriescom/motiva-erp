package log

import (
	"log/slog"
	"os"
)

/**
 * define standard logout print type, level & set as global default
 */
func SetStandardLogConfig() {
	var handler slog.Handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})

	slog.SetDefault(slog.New(handler))
}
