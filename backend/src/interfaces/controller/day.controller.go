package controller

import (
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

/**
 * A day of the calendar (a due date) with no hour or timezone: it is sent to the client as "2006-01-02", so the browser
 * shows that same day in whatever timezone it is, instead of moving it with an instant like 2026-11-27T00:00:00Z.
 */
type Day time.Time

func (d Day) Time() time.Time {
	return time.Time(d)
}

func (d Day) MarshalJSON() ([]byte, error) {
	return []byte(`"` + time.Time(d).Format(time.DateOnly) + `"`), nil
}

// the day is read from a timestamp column keeping its wall clock
func (d *Day) ScanTimestamp(value pgtype.Timestamp) error {
	if !value.Valid || value.InfinityModifier != pgtype.Finite {
		return errors.New("the date of the payment is not a valid day")
	}

	*d = Day(value.Time)

	return nil
}
