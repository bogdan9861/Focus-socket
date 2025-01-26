const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

httpServer.listen(5000, () => {
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
