package mcp

import (
	"github.com/areumfire/mcp-server-go/internal/widget"
)

// handleResourcesList returns the list of available resources
func (s *Server) handleResourcesList(req *JSONRPCRequest) *JSONRPCResponse {
	resources := []Resource{
		{
			URI:         WidgetTemplateURI,
			Name:        "Simulation Widget",
			Description: "Interactive Monte Carlo simulation results widget",
			MimeType:    WidgetMimeType,
		},
	}

	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result: map[string]interface{}{
			"resources": resources,
		},
	}
}

// handleResourcesRead reads a resource
func (s *Server) handleResourcesRead(req *JSONRPCRequest) *JSONRPCResponse {
	params := req.Params
	uri, _ := params["uri"].(string)

	if uri == WidgetTemplateURI {
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result: map[string]interface{}{
				"contents": []ResourceContents{
					{
						URI:      WidgetTemplateURI,
						MimeType: WidgetMimeType,
						Text:     widget.HTML,
						Meta:     toolDescriptorMeta(),
					},
				},
			},
		}
	}

	return &JSONRPCResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Error: &JSONRPCError{
			Code:    -32602,
			Message: "Resource not found: " + uri,
		},
	}
}
