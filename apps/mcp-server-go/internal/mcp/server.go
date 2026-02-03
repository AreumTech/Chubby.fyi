package mcp

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/areumfire/mcp-server-go/internal/simulation"
	"github.com/areumfire/mcp-server-go/internal/widget"
	"github.com/google/uuid"
)

const (
	WidgetVersion     = "v14"
	WidgetTemplateURI = "ui://widget/simulation-summary-" + WidgetVersion + ".html"
	WidgetMimeType    = "text/html+skybridge"
)

// Server is the MCP server
type Server struct {
	engine       *simulation.Engine
	bronzeEngine *simulation.BronzeEngine
	fullEngine   *simulation.FullEngine
	sessions     sync.Map // sessionID -> *Session
}

// Session represents an MCP session
type Session struct {
	ID       string
	Messages chan []byte
}

// NewServer creates a new MCP server
func NewServer(engine *simulation.Engine) *Server {
	return &Server{
		engine:       engine,
		bronzeEngine: simulation.NewBronzeEngine(),
		fullEngine:   simulation.NewFullEngine(),
	}
}

// HandleHealth handles health check requests
func (s *Server) HandleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	sessionCount := 0
	s.sessions.Range(func(_, _ interface{}) bool {
		sessionCount++
		return true
	})
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "ok",
		"sessions": sessionCount,
		"engine":   s.engine.Status(),
	})
}

// HandleWidget serves the widget HTML for preview
func (s *Server) HandleWidget(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(widget.HTML))
}

// HandleTest serves the test harness
func (s *Server) HandleTest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(widget.TestHarnessHTML))
}

// HandleMCP handles the unified MCP endpoint supporting both transports:
// - GET: Old HTTP+SSE transport (2024-11-05) - returns SSE stream with endpoint event
// - POST: New Streamable HTTP transport (2025-06-18) - handles JSON-RPC directly
func (s *Server) HandleMCP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleSSE(w, r)
	case http.MethodPost:
		s.handleStreamableHTTP(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleSSE handles SSE connections for MCP (old HTTP+SSE transport)
func (s *Server) handleSSE(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Create session
	sessionID := uuid.New().String()
	session := &Session{
		ID:       sessionID,
		Messages: make(chan []byte, 100),
	}
	s.sessions.Store(sessionID, session)

	log.Printf("SSE session created: %s", sessionID)

	// Send endpoint event
	fmt.Fprintf(w, "event: endpoint\ndata: /mcp/messages?sessionId=%s\n\n", sessionID)
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	// Keep connection alive and send messages
	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			s.sessions.Delete(sessionID)
			log.Printf("SSE session closed: %s", sessionID)
			return
		case msg := <-session.Messages:
			fmt.Fprintf(w, "event: message\ndata: %s\n\n", msg)
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
	}
}

// handleStreamableHTTP handles the new Streamable HTTP transport (2025-06-18)
// Each POST request is a complete JSON-RPC message exchange
func (s *Server) handleStreamableHTTP(w http.ResponseWriter, r *http.Request) {
	// Check Accept header - client should accept both JSON and SSE
	accept := r.Header.Get("Accept")
	log.Printf("Streamable HTTP request: Accept=%s", accept)

	// Parse JSON-RPC request
	var req JSONRPCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"jsonrpc": "2.0",
			"error": map[string]interface{}{
				"code":    -32700,
				"message": "Parse error: " + err.Error(),
			},
		})
		return
	}

	log.Printf("Streamable HTTP: method=%s id=%v", req.Method, req.ID)

	// Handle request
	response := s.handleRequest(&req)

	// For initialize, we can optionally set Mcp-Session-Id header
	if req.Method == "initialize" {
		sessionID := uuid.New().String()
		w.Header().Set("Mcp-Session-Id", sessionID)
		// Store session for potential future use
		session := &Session{
			ID:       sessionID,
			Messages: make(chan []byte, 100),
		}
		s.sessions.Store(sessionID, session)
		log.Printf("Streamable HTTP session created: %s", sessionID)
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleSSE is kept for backwards compatibility but delegates to HandleMCP
func (s *Server) HandleSSE(w http.ResponseWriter, r *http.Request) {
	s.HandleMCP(w, r)
}

// HandleMessages handles MCP messages via POST
func (s *Server) HandleMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sessionID := r.URL.Query().Get("sessionId")
	if sessionID == "" {
		http.Error(w, "Missing sessionId", http.StatusBadRequest)
		return
	}

	sessionI, ok := s.sessions.Load(sessionID)
	if !ok {
		http.Error(w, "Unknown session", http.StatusNotFound)
		return
	}
	session := sessionI.(*Session)

	// Parse JSON-RPC request
	var req JSONRPCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	log.Printf("MCP request: method=%s id=%v", req.Method, req.ID)

	// Handle request
	response := s.handleRequest(&req)

	// Send response to session
	respBytes, _ := json.Marshal(response)
	select {
	case session.Messages <- respBytes:
	default:
		log.Printf("Session buffer full: %s", sessionID)
	}

	// Also return response directly
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleRequest handles an MCP request
func (s *Server) handleRequest(req *JSONRPCRequest) *JSONRPCResponse {
	switch req.Method {
	case "initialize":
		return s.handleInitialize(req)
	case "tools/list":
		return s.handleToolsList(req)
	case "tools/call":
		return s.handleToolsCall(req)
	case "resources/list":
		return s.handleResourcesList(req)
	case "resources/read":
		return s.handleResourcesRead(req)
	default:
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error: &JSONRPCError{
				Code:    -32601,
				Message: "Method not found",
			},
		}
	}
}

// handleInitialize handles the initialize request
func (s *Server) handleInitialize(req *JSONRPCRequest) *JSONRPCResponse {
	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result: map[string]interface{}{
			"protocolVersion": "2024-11-05",
			"capabilities": map[string]interface{}{
				"tools":     map[string]interface{}{},
				"resources": map[string]interface{}{},
			},
			"serverInfo": map[string]interface{}{
				"name":    "areumfire-mcp-server",
				"version": "1.0.0",
			},
		},
	}
}
