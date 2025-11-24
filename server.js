const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let lobbies = {}; // { lobbyId: {host, settings, players: []} }

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
    // Chat messages
  socket.on("chatMessage", ({ lobbyId, name, message }) => {
    if (lobbies[lobbyId]) {
      io.to(lobbyId).emit("chatMessage", { name, message });
    }
  });


  // Host creates a lobby
  socket.on("createLobby", (settings) => {
    const lobbyId = Math.random().toString(36).substr(2, 5);
    lobbies[lobbyId] = {
      host: socket.id,
      settings,
      players: []
    };
    socket.join(lobbyId);
    socket.emit("lobbyCreated", { lobbyId, settings });
    io.emit("updateLobbyList", lobbies);
  });

  // Player joins a lobby
  socket.on("joinLobby", ({ lobbyId, name }) => {
    if (lobbies[lobbyId]) {
      lobbies[lobbyId].players.push({ id: socket.id, name });
      socket.join(lobbyId);
      io.to(lobbyId).emit("playerJoined", lobbies[lobbyId].players);
    } else {
      socket.emit("errorMsg", "Lobby not found");
    }
  });

  // Disconnect cleanup
  socket.on("disconnect", () => {
    for (let id in lobbies) {
      lobbies[id].players = lobbies[id].players.filter(p => p.id !== socket.id);
      if (lobbies[id].host === socket.id) {
        delete lobbies[id]; // remove lobby if host leaves
      }
    }
    io.emit("updateLobbyList", lobbies);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
