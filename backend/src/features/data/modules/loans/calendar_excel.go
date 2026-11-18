package loans

import (
	"bytes"
	"context"
	"fmt"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"

	"github.com/xuri/excelize/v2"
)

// widths of the columns (characters), in the order of repository.LnCalendarHeaders
var calendarWidths = []float64{30, 16, 16, 28, 14, 16, 30, 16, 14}

/**
 * Calendar of payments as an Excel file: one sheet for each weekday (Sunday only when a loan has its
 * payment that day) with the same columns of the calendar dialog. The amounts are numbers with
 * currency format, so they can be added up, and the status is colored like in the dialog.
 */
func BuildCalendarExcel(ctx context.Context) ([]byte, error) {
	days, err := GetCalendar(ctx)

	if err != nil {
		return nil, err
	}

	file := excelize.NewFile()

	defer file.Close()

	header, err := file.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"0E2953"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center"},
	})

	if err != nil {
		return nil, err
	}

	money, err := file.NewStyle(&excelize.Style{CustomNumFmt: &repository.LnExcelMoneyFormat})

	if err != nil {
		return nil, err
	}

	status := map[bool]int{}

	for overdue, color := range map[bool]string{false: "22B14C", true: "E53935"} {
		style, err := file.NewStyle(&excelize.Style{
			Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
			Fill:      excelize.Fill{Type: "pattern", Color: []string{color}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center"},
		})

		if err != nil {
			return nil, err
		}

		status[overdue] = style
	}

	first := true

	for _, day := range days {
		// Sunday only has a sheet when there is something to show
		if day.Weekday == 7 && len(day.Items) == 0 {
			continue
		}

		name := repository.LnWeekdayNames[day.Weekday-1]

		if first {
			// the file starts with a sheet that is renamed instead of an extra one
			if err = file.SetSheetName(file.GetSheetName(0), name); err != nil {
				return nil, err
			}

			first = false
		} else if _, err = file.NewSheet(name); err != nil {
			return nil, err
		}

		if err = writeCalendarDay(file, name, day, header, money, status); err != nil {
			return nil, err
		}
	}

	var buffer bytes.Buffer

	if err = file.Write(&buffer); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

func writeCalendarDay(file *excelize.File, sheet string, day *controller.CalendarDayPreview, header int, money int, status map[bool]int) error {
	for i, title := range repository.LnCalendarHeaders {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)

		if err := file.SetCellValue(sheet, cell, title); err != nil {
			return err
		}

		column, _ := excelize.ColumnNumberToName(i + 1)

		if err := file.SetColWidth(sheet, column, column, calendarWidths[i]); err != nil {
			return err
		}
	}

	last := len(repository.LnCalendarHeaders)

	if err := file.SetCellStyle(sheet, "A1", fmt.Sprintf("%c1", rune('A'+last-1)), header); err != nil {
		return err
	}

	// the titles stay visible while scrolling
	if err := file.SetPanes(sheet, &excelize.Panes{Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"}); err != nil {
		return err
	}

	for i, item := range day.Items {
		row := i + 2

		payDay := repository.LnWeekdayNames[(item.PayDay+6)%7]

		switch item.PayDayType {
		case repository.LnTypeMonthly:
			payDay = fmt.Sprintf("%02d de cada mes", item.PayDay)
		case repository.LnTypeBiweekly:
			payDay += " cada 2 semanas"
		}

		state := repository.LnCalendarCurrent

		if item.Overdue {
			state = repository.LnCalendarOverdue
		}

		values := []any{
			item.Borrower,
			item.Amount,
			item.TotalDebt,
			payDay,
			item.ExpectedDate.Format("02.01.2006"),
			phone(item.BorrowerPhone),
			dash(item.Guarantor),
			phone(item.GuarantorPhone),
			state,
		}

		for column, value := range values {
			cell, _ := excelize.CoordinatesToCellName(column+1, row)

			if err := file.SetCellValue(sheet, cell, value); err != nil {
				return err
			}
		}

		if err := file.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("C%d", row), money); err != nil {
			return err
		}

		if err := file.SetCellStyle(sheet, fmt.Sprintf("I%d", row), fmt.Sprintf("I%d", row), status[item.Overdue]); err != nil {
			return err
		}
	}

	return nil
}

func dash(value *string) string {
	if value == nil || *value == "" {
		return "-"
	}

	return *value
}

// a phone number of 10 digits is written like in the app: 551 234 5606
func phone(value *string) string {
	number := dash(value)

	if len(number) != 10 {
		return number
	}

	return number[:3] + " " + number[3:6] + " " + number[6:]
}
