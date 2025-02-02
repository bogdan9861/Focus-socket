const express = require("express");
const cors = require("cors");
const app = express();
const { createServer } = require("http");
const { Server } = require("socket.io");

app.use(cors({ origin: "*" }));

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

server.listen(5000, () => {
  console.log("server is running");
});

const users = {};

io.on("connection", (socket) => {
  socket.on("auth", (userId) => {
    if (users[userId]) {
      users[userId].push(socket.id);
    } else {
      users[userId] = [socket.id];
    }

    socket.userId = userId;
    console.log(`User ${userId} authenticated`);

    console.log(users);
  });

  socket.on(
    "send-message",
    (room, message, time, reciverId, id, audio, file) => {
      const socketIds = users[reciverId];

      if (socketIds) {
        socketIds.forEach((socketId) => {
          io.to(socketId).emit("recive-message", {
            room,
            message,
            time,
            reciverId,
            userId: id,
            audio,
            file,
          });
        });
      } else {
        console.log(`User with id: ${id} not found`);
      }
    }
  );

  socket.on("send-push-notification", (reciverId, title, message) => {
    const socketIds = users[reciverId];
    if (socketIds) {
      socketIds.forEach((socketId) => {
        io.to(socketId).emit("recive-push-notification", { title, message });
      });
    } else {
      console.log(`User with id: ${reciverId} not found`);
    }
  });

  socket.on("send-status", (room, id, status) => {
    io.to(room).emit("get-status", { writerId: id, status });
  });

  socket.on("join-room", (room) => {
    socket.join(room);
  });
});
