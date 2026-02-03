package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/areumfire/mcp-server-go/internal/mcp"
	"github.com/areumfire/mcp-server-go/internal/simulation"
)

// corsMiddleware adds CORS headers and handles preflight requests
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "content-type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next(w, r)
	}
}

// handleRoot returns server info for ChatGPT connector discovery
func handleRoot(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"name":         "areumfire-mcp-server",
		"version":      "1.0.0",
		"description":  "AreumFire Monte Carlo financial simulation",
		"mcp_endpoint": "/mcp",
	})
}

// handleOAuthDiscovery returns JSON 404 for OAuth endpoints
// This prevents ChatGPT connector from getting confused by HTML 404
func handleOAuthDiscovery(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotFound)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error":             "not_found",
		"error_description": "This server does not require authentication",
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize simulation engine
	engine := simulation.NewEngine()

	// Initialize MCP server
	server := mcp.NewServer(engine)

	// Register routes with CORS middleware
	http.HandleFunc("/", corsMiddleware(handleRoot))
	http.HandleFunc("/mcp", corsMiddleware(server.HandleMCP))           // Unified endpoint (GET=SSE, POST=Streamable)
	http.HandleFunc("/mcp/messages", corsMiddleware(server.HandleMessages)) // Legacy SSE POST endpoint
	http.HandleFunc("/health", corsMiddleware(server.HandleHealth))
	http.HandleFunc("/widget", corsMiddleware(server.HandleWidget))
	http.HandleFunc("/test", corsMiddleware(server.HandleTest))

	// OAuth discovery endpoints - return JSON 404
	oauthPaths := []string{
		"/.well-known/oauth-authorization-server",
		"/.well-known/oauth-protected-resource",
		"/.well-known/openid-configuration",
		"/register",
		"/authorize",
		"/token",
	}
	for _, path := range oauthPaths {
		http.HandleFunc(path, corsMiddleware(handleOAuthDiscovery))
	}

	log.Printf("AreumFire MCP Server (Go) listening on :%s", port)
	log.Printf("Endpoints:")
	log.Printf("  GET  /                 - Server info (ChatGPT discovery)")
	log.Printf("  GET  /mcp              - SSE stream for MCP")
	log.Printf("  POST /mcp/messages     - MCP message handling")
	log.Printf("  GET  /health           - Health check")
	log.Printf("  GET  /widget           - Widget preview")
	log.Printf("  GET  /test             - Test harness")
	log.Printf("OAuth discovery endpoints return JSON 404 (no auth required)")

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
