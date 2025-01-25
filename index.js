const io = require("socket.io")(
  "https://focus-socket.onrender.com",
  {
    cors: {
      origin: ["https://guileless-clafoutis-9d01ff.netlify.app"],
    },
  }
);

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
