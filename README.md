# Long Polling: React + Go

## Run it

Terminal 1 (backend, port 8081):

    cd backend
    go run .

Terminal 2 (frontend, port 5173):

    cd frontend
    npm install
    npm run dev

Open http://localhost:5173 in **two tabs**. Type in one tab, and the other updates instantly.

## How it works

1. React calls `GET /getData?lastData=<what it has>`.
2. Go: if the data is newer, it replies right away. If not, it **keeps the request open**.
3. Someone calls `POST /updateData`. Go wakes up every waiting request with the new data.
4. React gets the answer and immediately sends the next `/getData` request.
5. If nothing changes for 30s, Go replies with the same data and React just asks again.

Files to read: `backend/main.go` and `frontend/src/App.jsx`.
