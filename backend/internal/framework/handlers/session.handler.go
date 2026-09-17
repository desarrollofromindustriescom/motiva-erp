package handlers

import (
	"encoding/json"
	"log"
	"motiva-erp/backend/internal/features/authentication"
	"motiva-erp/backend/internal/features/session"
	"motiva-erp/backend/internal/framework/messages"
	"motiva-erp/backend/internal/models"
	"net/http"
)

func Login(response http.ResponseWriter, request *http.Request) {
	credentials := &models.LoginRequest{}
	responseDTO := &models.ApiResponseDTO[models.LoginDTO]{ Success: false }

	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&credentials); err != nil {
		log.Printf("%v", err)
		responseDTO.Error = &models.ErrorDetailDTO{ Message: messages.RequestValidationError }

		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	user, err := authentication.VerifyUserData(credentials, request.Context())

	if err != nil {
		responseDTO.Error = &models.ErrorDetailDTO{ Message: messages.DataValidationError }

		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	token, err := session.CreateNewSession(user, request.Header.Get("User-Agent"), request.Context())

	if err != nil {
		responseDTO.Error = &models.ErrorDetailDTO{ Message: messages.GenerateSessionError }

		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	cookie := &http.Cookie{
		Name: "bearer",
		Value: token,
		Path: "/",
	}

	http.SetCookie(response, cookie)

	responseDTO.Success = true
	responseDTO.Data = &models.LoginDTO{
		User: &models.LoginDTOData{
			Fullname: user.Fullname,
			Username: user.Username,
			Profile: user.Profile,
		},
	}

	json.NewEncoder(response).Encode(responseDTO)
}