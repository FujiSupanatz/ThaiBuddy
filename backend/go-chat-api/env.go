package main

import (
	"bufio"
	"log"
	"os"
	"path/filepath"
	"strings"
)

func loadEnvFiles() {
	paths := []string{
		".env.local",
		".env",
		filepath.Join("..", "..", ".env.local"),
		filepath.Join("..", "..", ".env"),
	}

	for _, path := range paths {
		loadEnvFile(path)
	}
}

func loadEnvFile(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"'`)

		if key == "" {
			continue
		}

		if _, exists := os.LookupEnv(key); exists {
			continue
		}

		if err := os.Setenv(key, value); err != nil {
			log.Printf("failed to set env %s from %s: %v", key, path, err)
		}
	}
}
