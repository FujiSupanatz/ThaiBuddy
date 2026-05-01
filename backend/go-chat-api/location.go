package main

import "strings"

func sanitizeLocationForMode(mode string, location *chatLocation) *chatLocation {
	mode = strings.TrimSpace(strings.ToLower(mode))
	if mode != "nearby" && mode != "planner" {
		return nil
	}

	if location == nil {
		return nil
	}

	sanitized := &chatLocation{
		Label:     strings.TrimSpace(location.Label),
		Source:    strings.TrimSpace(location.Source),
		UpdatedAt: location.UpdatedAt,
	}

	if location.Lat != nil {
		lat := *location.Lat
		sanitized.Lat = &lat
	}

	if location.Lng != nil {
		lng := *location.Lng
		sanitized.Lng = &lng
	}

	if sanitized.Lat == nil && sanitized.Lng == nil && sanitized.Label == "" {
		return nil
	}

	return sanitized
}
