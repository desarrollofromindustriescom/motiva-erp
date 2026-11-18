package validation

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/gif"
	"image/jpeg"
	"image/png"
	"mime/multipart"
	"testing"

	"motiva-erp/backend/src/features/data/repository"
)

// builds the form of a request with the given files in the field "file"
func formWith(t *testing.T, files ...[]byte) *multipart.Form {
	t.Helper()

	var body bytes.Buffer

	writer := multipart.NewWriter(&body)

	for _, content := range files {
		part, err := writer.CreateFormFile("file", "name.bin")

		if err != nil {
			t.Fatal(err)
		}

		part.Write(content)
	}

	writer.Close()

	form, err := multipart.NewReader(&body, writer.Boundary()).ReadForm(1 << 20)

	if err != nil {
		t.Fatal(err)
	}

	return form
}

func pngBytes(t *testing.T, width, height int) []byte {
	t.Helper()

	var buffer bytes.Buffer

	canvas := image.NewRGBA(image.Rect(0, 0, width, height))
	canvas.Set(0, 0, color.RGBA{R: 255, A: 255})

	if err := png.Encode(&buffer, canvas); err != nil {
		t.Fatal(err)
	}

	return buffer.Bytes()
}

func jpegBytes(t *testing.T, width, height int) []byte {
	t.Helper()

	var buffer bytes.Buffer

	if err := jpeg.Encode(&buffer, image.NewRGBA(image.Rect(0, 0, width, height)), nil); err != nil {
		t.Fatal(err)
	}

	return buffer.Bytes()
}

func TestValidateImageAccepted(t *testing.T) {
	cases := map[string]struct {
		content []byte
		kind    string
	}{
		"png":  {pngBytes(t, 40, 30), repository.ValImagePNG},
		"jpg":  {jpegBytes(t, 40, 30), repository.ValImageJPEG},
		"edge": {pngBytes(t, repository.ValImageMaxSide, 1), repository.ValImagePNG},
	}

	for name, item := range cases {
		kind, err := ValidateImage(formWith(t, item.content), "file")

		if err != nil || kind != item.kind {
			t.Errorf("%s: got %q, %v, want %q", name, kind, err, item.kind)
		}
	}
}

func TestValidateImageRefused(t *testing.T) {
	var animation bytes.Buffer

	gif.Encode(&animation, image.NewPaletted(image.Rect(0, 0, 4, 4), color.Palette{color.Black, color.White}), nil)

	png := pngBytes(t, 40, 30)

	cases := map[string]struct {
		content []byte
		err     error
	}{
		"pdf":                        {[]byte("%PDF-1.7 content"), repository.ValErrUnsupportedFile},
		"gif":                        {animation.Bytes(), repository.ValErrUnsupportedFile},
		"text":                       {[]byte("this is not an image, but long enough"), repository.ValErrUnsupportedFile},
		"empty":                      {[]byte{}, repository.ValErrUnsupportedFile},
		"too short":                  {[]byte{0x89, 'P', 'N'}, repository.ValErrUnsupportedFile},
		"png signature, no image":    {append([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}, []byte("garbage garbage")...), repository.ValErrUnsupportedFile},
		"png cut after the header":   {png[:12], repository.ValErrUnsupportedFile},
		"jpeg signature, no image":   {[]byte{0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0}, repository.ValErrUnsupportedFile},
		"png with the jpeg head":     {append([]byte{0xFF, 0xD8, 0xFF}, png[3:]...), repository.ValErrUnsupportedFile},
		"side too large":             {pngBytes(t, repository.ValImageMaxSide+1, 1), repository.ValErrImageTooLarge},
		"jpeg with a side too large": {jpegBytes(t, 1, repository.ValImageMaxSide+1), repository.ValErrImageTooLarge},
	}

	for name, item := range cases {
		if _, err := ValidateImage(formWith(t, item.content), "file"); !errors.Is(err, item.err) {
			t.Errorf("%s: got %v, want %v", name, err, item.err)
		}
	}
}

func TestValidateImageFields(t *testing.T) {
	image := pngBytes(t, 10, 10)

	if _, err := ValidateImage(formWith(t), "file"); !errors.Is(err, repository.ValErrFileLength) {
		t.Errorf("no file: got %v", err)
	}

	if _, err := ValidateImage(formWith(t, image, image), "file"); !errors.Is(err, repository.ValErrFileLength) {
		t.Errorf("two files: got %v", err)
	}

	if _, err := ValidateImage(formWith(t, image), "other"); !errors.Is(err, repository.ValErrFileLength) {
		t.Errorf("other field: got %v", err)
	}

	big := formWith(t, image)
	big.File["file"][0].Size = repository.ValFormDataMaxFileSize + 1

	if _, err := ValidateImage(big, "file"); !errors.Is(err, repository.ValErrFileSize) {
		t.Errorf("too large: got %v", err)
	}
}

// the pdf validation keeps working after sharing code with the image one
func TestValidatePDF(t *testing.T) {
	if err := ValidatePDF(formWith(t, []byte("%PDF-1.4 content")), "file"); err != nil {
		t.Errorf("pdf: got %v", err)
	}

	if err := ValidatePDF(formWith(t, pngBytes(t, 4, 4)), "file"); !errors.Is(err, repository.ValErrUnsupportedFile) {
		t.Errorf("png as pdf: got %v", err)
	}

	if err := ValidatePDF(formWith(t, []byte("%PD")), "file"); !errors.Is(err, repository.ValErrUnsupportedFile) {
		t.Errorf("short: got %v", err)
	}

	if err := ValidatePDF(formWith(t), "file"); !errors.Is(err, repository.ValErrFileLength) {
		t.Errorf("no file: got %v", err)
	}
}
