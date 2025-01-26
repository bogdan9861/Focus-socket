const express = require('express');
const cors = require('cors');
const app = express();
const { createServer } = require("http");
const { Server } = require("socket.io");

app.use(cors({ origin: '*' }));

const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

server.listen(5000, () => {
  console.log("server is running");
});

io.on("connection", (socket) => {
  socket.on("send-message", (room, message, time, id, audio) => {
    socket
      .to(room)
      .emit("recive-message", { message, time, userId: id, audio });
  });

  socket.on("send-status", (room, id, status) => {
    console.log(status);

    io.emit("get-status", { writerId: id, status });
  });

  socket.on("join-room", (room) => {
    socket.join(room);
  });
});
