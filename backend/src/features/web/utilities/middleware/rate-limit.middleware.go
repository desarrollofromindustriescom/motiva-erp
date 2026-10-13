package middleware

import (
	"errors"
	"log/slog"
	"math"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"motiva-erp/backend/src/features/data/repository"
	"motiva-erp/backend/src/interfaces/models"

	"golang.org/x/time/rate"
)

var (
	mutex   sync.Mutex
	clients map[string]*models.ClientLimiter = make(map[string]*models.ClientLimiter)
)

/**
 * Function ro request client ip
 * - if development checks remote addr
 * - check x-forwarded-for header to get ip list
 * - create fallback with helper headers
 * - get client ip from header
 */
func clientIP(request *http.Request) (string, error) {
	env := os.Getenv(repository.EnvEnv)

	if env == repository.EnvValDevelopment {
		host, _, err := net.SplitHostPort(request.RemoteAddr)

		if err != nil {
			slog.Error("Error on development getting request address",
				"event", "middleware.clientIP.SlipHostPort",
				"addr", request.RemoteAddr,
				"error", err,
			)

			return "", err
		}

		return host, nil
	}

	if repository.MwTrustedProxies < 1 {
		slog.Error("Invalid no of trusted proxies",
			"event", "middleware.clienTP.MwTrustedProxies",
			"proxies", repository.MwTrustedProxies,
		)

		return "", repository.MwErrInvalidProxies
	}

	xff := strings.Join(request.Header.Values(repository.HeadXForwardedFor), ",")

	if xff == "" {
		cloudflareIP := request.Header.Get(repository.HeadCFConnectingIP)

		if cloudflareIP == "" || cloudflareIP != request.Header.Get(repository.HeadTrueClientIP) || net.ParseIP(cloudflareIP) == nil {
			slog.Error("Error on fallback option for client ip",
				"event", "middleware.clientIP.ipsmismatch",
				"cf-connecting-ip", cloudflareIP,
			)

			return "", repository.MwErrUndefinedClientIP
		}

		return cloudflareIP, nil
	}

	ips := strings.Split(xff, ",")

	if len(ips) < repository.MwTrustedProxies {
		slog.Error("Error on request ips length",
			"event", "middleware.clientIP.len",
			"expected", repository.MwTrustedProxies,
			"length", len(ips),
		)

		return "", repository.MwErrProxiesLength
	}

	ip := strings.TrimSpace(ips[len(ips)-repository.MwTrustedProxies])

	if net.ParseIP(ip) == nil {
		slog.Error("Error verifying client ip",
			"event", "middleware.clientIP.ParseIP",
			"ip", ip,
		)

		return "", repository.MwErrUndefinedClientIP
	}

	return ip, nil
}

/**
 * Function to clean clients object removing at first clients
 * that isn't banned & their idle time passed, if clients
 * still are more than allowed clean every ip except banned users
 */
func lazyclientsCleanner(now time.Time) {
	for ip, client := range clients {
		if !now.Before(client.BannedUntil) && now.Sub(client.LastConnAt) > repository.MwLastIdle {
			delete(clients, ip)
		}
	}

	if len(clients) < repository.MwMaxClients {
		return
	}

	for ip, client := range clients {
		if !now.Before(client.BannedUntil) {
			delete(clients, ip)
		}
	}
}

/**
 * This function block access to clients object when
 * new request comes, check if user was banned and its deadline
 * if is a new user calls the cleaner helper and create new register
 * finnaly checks if user can continue
 */
func allow(ip string, now time.Time) (bool, time.Duration) {
	mutex.Lock()

	defer mutex.Unlock()

	client, exists := clients[ip]

	if exists && !client.BannedUntil.IsZero() {
		if now.Before(client.BannedUntil) {
			return false, client.BannedUntil.Sub(now)
		}

		delete(clients, ip)

		exists = false
	}

	if !exists {
		if len(clients) >= repository.MwMaxClients {
			lazyclientsCleanner(now)
		}

		client = &models.ClientLimiter{
			Limiter: rate.NewLimiter(repository.MwMaxRatePerSecond, repository.MwMaxRateBurst),
		}

		clients[ip] = client
	}

	client.LastConnAt = now

	if !client.Limiter.AllowN(now, 1) {
		client.BannedUntil = now.Add(repository.MwBannDuration)
		return false, repository.MwBannDuration
	}

	return true, 0
}

/**
 * Middleware to allow client make request to api, first get
 * client ip, if is not possible get it, continues but with a warn,
 * if that ip isn't allowed return error, else continues with handler
 */
func rateLimitMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		ip, err := clientIP(request)

		if err != nil {
			if errors.Is(err, repository.MwErrUndefinedClientIP) || errors.Is(err, repository.MwErrProxiesLength) {
				slog.Warn("Error verifying client real IP",
					"event", "middleware.rateLimitMiddleware.clienIP",
					"x-forwarded-for", request.Header.Values(repository.HeadXForwardedFor),
					"error", err,
				)

				handler.ServeHTTP(response, request)
				return
			}

			http.Error(response, repository.HttpInternalServerError, http.StatusInternalServerError)
			return
		}

		if allowed, wait := allow(ip, time.Now()); !allowed {
			response.Header().Set(repository.HeadRetryAfter, strconv.Itoa(int(math.Ceil(wait.Seconds()))))
			http.Error(response, repository.HttpTooManyRequest, http.StatusTooManyRequests)
			return
		}

		handler.ServeHTTP(response, request)
	})
}
