// server.js

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*", // Allow frontend from Cloudflare Pages
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
app.use(express.static("public")); // Serve frontend files

// Lobby data structure
const lobbies = {};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Create a new lobby
  socket.on("createLobby", () => {
    const lobbyId = Math.random().toString(36).substr(2, 5);
    lobbies[lobbyId] = { players: [] };
    socket.join(lobbyId);
    socket.emit("lobbyCreated", lobbyId);
    io.emit("updateLobbyList", lobbies);
  });

  // Join an existing lobby
  socket.on("joinLobby", ({ lobbyId, name }) => {
    if (lobbies[lobbyId]) {
      const player = { id: socket.id, name };
      lobbies[lobbyId].players.push(player);
      socket.join(lobbyId);
      io.to(lobbyId).emit("playerJoined", lobbies[lobbyId].players);
      io.emit("updateLobbyList", lobbies);
    }
  });

  // Handle chat messages
  socket.on("chatMessage", ({ lobbyId, name, message }) => {
    if (lobbies[lobbyId]) {
      io.to(lobbyId).emit("chatMessage", { name, message });
    }
  });

  // Disconnect cleanup
  socket.on("disconnect", () => {
    for (let lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];
      const index = lobby.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        lobby.players.splice(index, 1);
        io.to(lobbyId).emit("playerJoined", lobby.players);
        if (lobby.players.length === 0) {
          delete lobbies[lobbyId];
        }
        io.emit("updateLobbyList", lobbies);
        break;
      }
    }
  });
});

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
