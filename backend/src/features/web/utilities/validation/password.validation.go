package validation

import "github.com/go-playground/validator/v10"

var allowedChars map[rune]bool = make(map[rune]bool)

func setAllowedChars() {
	list := "¡¿ªºçÇñÑ!@#$%^&*(),.?:{}|<>_+-=[]';/^~`\\\""

	for _, char := range list {
		allowedChars[char] = true
	}
}

func securePasswordValidation(level validator.FieldLevel) bool {
	flags := 0

	for _, char := range level.Field().String() {
		if allowedChars[char] {
			flags |= 1
		} else if char >= '0' && char <= '9' {
			flags |= 2
		} else if char >= 'A' && char <= 'Z' {
			flags |= 4
		} else if char >= 'a' && char <= 'z' {
			flags |= 8
		}

		if flags == 15 {
			return true
		}
	}

	return false
}
