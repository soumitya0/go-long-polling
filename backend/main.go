package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

const pollTimeout = 30 * time.Second

type Response struct {
	Data string `json:"data"`
}

var (
	data = "Hello from Go!"

	waitingClients []chan string
	mu             sync.Mutex
)

func getData(w http.ResponseWriter, r *http.Request) {
	lastData := r.URL.Query().Get("lastData")

	mu.Lock()

	// If the client has outdated data, respond immediately.
	if data != lastData {
		currentData := data
		mu.Unlock()

		sendJSON(w, currentData)
		return
	}

	// The client has the latest data, so make it wait.
	ch := make(chan string, 1)
	waitingClients = append(waitingClients, ch)

	mu.Unlock()

	// Wait for new data, timeout, or client disconnection.
	select {
	case newData := <-ch:
		sendJSON(w, newData)

	case <-time.After(pollTimeout):
		removeClient(ch)
		sendJSON(w, lastData)

	case <-r.Context().Done():
		removeClient(ch)
	}
}

func updateData(w http.ResponseWriter, r *http.Request) {
	var request Response

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if request.Data == "" {
		http.Error(w, "Data cannot be empty", http.StatusBadRequest)
		return
	}

	mu.Lock()

	data = request.Data

	// Notify every client waiting for new data.
	for _, ch := range waitingClients {
		ch <- data
	}

	log.Printf("Data updated: %q", data)

	// All waiting clients have been notified.
	waitingClients = nil

	mu.Unlock()

	sendJSON(w, request.Data)
}

func removeClient(client chan string) {
	mu.Lock()
	defer mu.Unlock()

	for i, ch := range waitingClients {
		if ch == client {
			waitingClients = append(
				waitingClients[:i],
				waitingClients[i+1:]...,
			)
			return
		}
	}
}

func sendJSON(w http.ResponseWriter, data string) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{Data: data})
}

func main() {
	http.HandleFunc("GET /getData", getData)
	http.HandleFunc("POST /updateData", updateData)

	log.Println("Server running at http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
