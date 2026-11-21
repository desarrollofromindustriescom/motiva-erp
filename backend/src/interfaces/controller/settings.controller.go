package controller

type SettingPreview struct {
	Slug  string  `json:"slug"`
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type ExtrasSettingsPayload struct {
	Mora  float64 `json:"mora" validate:"required,percentage"`
	Visit float64 `json:"visit" validate:"required,monetary"`
}

type AgreementsSettingsPayload struct {
	Weekly      float64 `json:"weekly" validate:"required,percentage"`
	WeeksBefore int     `json:"weeks_before" validate:"required,gte=1,lte=100000"`
	WeeksAfter  int     `json:"weeks_after" validate:"required,gte=1,lte=100000"`
}

type MonthlySettingsPayload struct {
	Investor []float64 `json:"investor" validate:"required,len=3,dive,percentage,lte=100"`
	General  []float64 `json:"general" validate:"required,len=3,dive,percentage"`
}

type BiweeklySettingsPayload struct {
	Investor []float64 `json:"investor" validate:"required,len=8,dive,percentage,lte=100"`
	General  []float64 `json:"general" validate:"required,len=8,dive,percentage"`
}

type WeeklySettingsPayload struct {
	Investor []float64 `json:"investor" validate:"required,len=13,dive,percentage,lte=100"`
	General  []float64 `json:"general" validate:"required,len=13,dive,percentage"`
}
