package loans

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"motiva-erp/backend/src/features/data/database"
	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/controller"

	"github.com/xuri/excelize/v2"
)

// widths of the columns (characters), in the order of repository.LnLoansHeaders
var loansWidths = []float64{14, 32, 16, 16, 16, 12, 12}

// colors of the state of a loan, like in the table
var loanStatusColors = map[string]string{
	"pending":  "F27732",
	"active":   "22B14C",
	"rejected": "E53935",
	"finished": "64748B",
	"expired":  "B91C1C",
}

/**
 * Folio like the table shows it: the zeros that complete its length are removed, ex:
 * LN-00000000000000000000000000005 -> LN-00005
 */
func compactFolio(folio string) string {
	prefix, digits, found := strings.Cut(folio, "-")

	if !found {
		return folio
	}

	digits = strings.TrimLeft(digits, "0")

	return fmt.Sprintf("%s-%05s", prefix, digits)
}

/**
 * Loans of the table as an Excel file: every loan that matches the filters (not only a page), in the
 * same order as the table & with its columns. The amounts are numbers with currency format &
 * the interest a percentage, so they can be added up & sorted in Excel. Its state has the color of the table.
 */
func BuildLoansExcel(ctx context.Context, filters *controller.LoansFiltersPayload) ([]byte, error) {
	// the loans that are late have their mora before they are listed
	if err := RefreshMora(ctx, nil); err != nil {
		return nil, err
	}

	args, err := filterArgs(filters)

	if err != nil {
		return nil, err
	}

	rows, err := database.GetPool().Query(ctx, repository.LnQryGet, append(args, filters.Order, repository.LnMaxExcelRows, 0)...)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	items, err := scanLoanRows(rows)

	if err != nil {
		return nil, err
	}

	file := excelize.NewFile()

	defer file.Close()

	sheet := repository.LnLoansSheet

	if err = file.SetSheetName(file.GetSheetName(0), sheet); err != nil {
		return nil, err
	}

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

	percent, err := file.NewStyle(&excelize.Style{CustomNumFmt: &repository.LnExcelPercentFormat})

	if err != nil {
		return nil, err
	}

	statuses := map[string]int{}

	for slug, color := range loanStatusColors {
		style, err := file.NewStyle(&excelize.Style{
			Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
			Fill:      excelize.Fill{Type: "pattern", Color: []string{color}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center"},
		})

		if err != nil {
			return nil, err
		}

		statuses[slug] = style
	}

	for i, title := range repository.LnLoansHeaders {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)

		if err = file.SetCellValue(sheet, cell, title); err != nil {
			return nil, err
		}

		column, _ := excelize.ColumnNumberToName(i + 1)

		if err = file.SetColWidth(sheet, column, column, loansWidths[i]); err != nil {
			return nil, err
		}
	}

	if err = file.SetCellStyle(sheet, "A1", fmt.Sprintf("%c1", rune('A'+len(repository.LnLoansHeaders)-1)), header); err != nil {
		return nil, err
	}

	if err = file.SetPanes(sheet, &excelize.Panes{Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"}); err != nil {
		return nil, err
	}

	for i, item := range items {
		row := i + 2

		values := []any{
			compactFolio(item.Folio),
			item.Borrower.Fullname,
			item.Status.Title,
			item.Amount,
			item.Total,
			item.Rate / 100,
			item.NoPayments,
		}

		for column, value := range values {
			cell, _ := excelize.CoordinatesToCellName(column+1, row)

			if err = file.SetCellValue(sheet, cell, value); err != nil {
				return nil, err
			}
		}

		if err = file.SetCellStyle(sheet, fmt.Sprintf("D%d", row), fmt.Sprintf("E%d", row), money); err != nil {
			return nil, err
		}

		if err = file.SetCellStyle(sheet, fmt.Sprintf("F%d", row), fmt.Sprintf("F%d", row), percent); err != nil {
			return nil, err
		}

		if style, exists := statuses[item.Status.Slug]; exists {
			if err = file.SetCellStyle(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("C%d", row), style); err != nil {
				return nil, err
			}
		}
	}

	var buffer bytes.Buffer

	if err = file.Write(&buffer); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}
