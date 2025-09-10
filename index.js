const express = require("express");
const cors = require("cors");
const app = express();
const { createServer } = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./actions");
const { version, validate } = require("uuid");

app.use(cors({ origin: "*" }));

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

server.listen(8080, () => {
  console.log("server is running");
});

function getClientRooms() {
  const { rooms } = io.sockets.adapter;

  return Array.from(rooms.keys()).filter(
    (roomID) => validate(roomID) && version(roomID) === 4
  );
}

function shareRoomsInfo() {
  io.emit(ACTIONS.SHARE_ROOMS, {
    rooms: getClientRooms(),
  });
}

const users = {};
const onlineUsers = new Set();

io.on("connection", (socket) => {
  socket.on("auth", (userId) => {
    if (users[userId]) {
      users[userId].push(socket.id);
    } else {
      users[userId] = [socket.id];
    }

    socket.userId = userId;

    console.log(users);
  });

  socket.on("user:online", (userId) => {
    onlineUsers.add(userId);
    socket.data.userId = userId;
    io.emit("users:online", Array.from(onlineUsers));
  });

  socket.on("send-message", (room, message, time, reciverId, id, fileUrl) => {
    const socketIds = users[reciverId];

    console.log(socketIds);

    if (socketIds) {
      socketIds.forEach((socketId) => {
        io.to(socketId).emit("recive-message", {
          room,
          message,
          time,
          reciverId,
          userId: id,
          fileUrl,
        });
      });
    } else {
      console.log(`User with id: ${id} not found`);
    }
  });

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

  socket.on("send-status", (id, receiverId, status) => {
    if (receiverId && users[receiverId]) {
      io.to(users[receiverId]).emit("get-status", { userId: id, status });
    } else {
      io.emit("get-status", { userId: id, status });
    }
  });

  socket.on("send-call-offer", (photo, name, conferenceId, recipientId) => {
    const socketIds = users[recipientId];

    socketIds?.forEach((socketId) => {
      io.to(socketId).emit("get-call-offer", {
        photo,
        name,
        conferenceId,
        recipientId,
      });
    });
  });

  socket.on("join-room", (room) => {
    socket.join(room);
  });

  shareRoomsInfo();

  socket.on(ACTIONS.JOIN, (config) => {
    const { room: roomID } = config;
    const { rooms: joinedRooms } = socket;

    if (Array.from(joinedRooms).includes(roomID)) {
      return console.warn(`Already joined to ${roomID}`);
    }

    const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

    clients.forEach((clientID) => {
      io.to(clientID).emit(ACTIONS.ADD_PEER, {
        peerID: socket.id,
        createOffer: false,
      });

      socket.emit(ACTIONS.ADD_PEER, {
        peerID: clientID,
        createOffer: true,
      });
    });

    socket.join(roomID);
    shareRoomsInfo();
  });

  function leaveRoom() {
    const { rooms } = socket;

    Array.from(rooms)
      // LEAVE ONLY CLIENT CREATED ROOM
      .filter((roomID) => validate(roomID) && version(roomID) === 4)
      .forEach((roomID) => {
        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

        clients.forEach((clientID) => {
          io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
            peerID: socket.id,
          });

          socket.emit(ACTIONS.REMOVE_PEER, {
            peerID: clientID,
          });
        });

        socket.leave(roomID);
      });

    shareRoomsInfo();
  }

  socket.on(ACTIONS.LEAVE, leaveRoom);
  socket.on("disconnecting", leaveRoom);

  socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
    io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
      peerID: socket.id,
      sessionDescription,
    });
  });

  socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
    io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
      peerID: socket.id,
      iceCandidate,
    });
  });

  socket.on("disconnect", () => {
    const { userId } = socket.data || {};
    if (userId) {
      onlineUsers.delete(userId);
      io.emit("users:online", Array.from(onlineUsers));
    }
  });
});
