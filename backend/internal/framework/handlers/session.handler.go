package handlers

import (
	"encoding/json"
	"motiva-erp/backend/internal/features/authentication"
	"motiva-erp/backend/internal/features/session"
	"motiva-erp/backend/internal/framework/messages"
	"motiva-erp/backend/internal/models"
	"net/http"
)

func Login(response http.ResponseWriter, request *http.Request) {
	credentials := &models.LoginRequest{}
	responseDTO := &models.ApiResponseDTO[struct {
		User models.LoginDTO `json:"user"`
	}]{
		Success: false,
	}

	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&credentials); err != nil {
		responseDTO.Error = &models.ErrorDetailDTO{Message: messages.RequestValidationError}

		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	user, err := authentication.VerifyUserData(credentials, request.Context())

	if err != nil {
		responseDTO.Error = &models.ErrorDetailDTO{Message: messages.DataValidationError}

		response.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	session, err := session.CreateNewSession(user, request.Header.Get("User-Agent"), request.Context())

	if err != nil {
		responseDTO.Error = &models.ErrorDetailDTO{Message: messages.GenerateSessionError}

		response.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(response).Encode(responseDTO)
		return
	}

	responseDTO.Success = true
	responseDTO.Data = &struct {
		User models.LoginDTO `json:"user"`
	}{
		User: models.LoginDTO{
			Token:    session.Token,
			Fullname: user.Fullname,
			Username: user.Username,
			Profile:  user.Profile,
		},
	}

	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(responseDTO)
}

func Validation(response http.ResponseWriter, request *http.Request) {
	session := request.Context().Value("session").(*models.Session)
	responseDTO := &models.ApiResponseDTO[struct {
		User models.LoginDTO `json:"user"`
	}]{
		Success: false,
		Data: &struct {
			User models.LoginDTO `json:"user"`
		}{
			User: models.LoginDTO{
				Fullname: session.User.Fullname,
				Username: session.User.Username,
				Profile:  session.User.Profile,
			},
		},
	}

	response.WriteHeader(http.StatusOK)
	json.NewEncoder(response).Encode(responseDTO)
}
