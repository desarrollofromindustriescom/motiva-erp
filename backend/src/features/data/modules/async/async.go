package async

import (
	"context"
	"log/slog"
	"time"
)

/**
 * Function to create context that no end when handler ends
 * checks if parent context has deadline and create context or
 * add timeout at context
 */
func detachedCtx(parent context.Context) (context.Context, context.CancelFunc) {
	ctx := context.WithoutCancel(parent)

	if deadline, ok := parent.Deadline(); ok {
		return context.WithDeadline(ctx, deadline)
	}

	return context.WithTimeout(ctx, 5*time.Second)
}

/**
 * Function to execute callback function with deadline
 * eval panic at routine ends
 */
func RunAsync(parent context.Context, name string, callback func(asyncCtx context.Context) error) {
	ctx, cancel := detachedCtx(parent)

	go func() {
		defer cancel()
		defer func() {
			if data := recover(); data != nil {
				slog.Error("Panic async function",
					"event", "async.RunAsync.goroutine",
					"callback", name,
					"recover", data,
				)
			}
		}()

		if err := callback(ctx); err != nil {
			slog.Error("Error on async function",
				"event", "async.RunAsync.callback",
				"callback", name,
				"error", err,
			)
		}
	}()
}
