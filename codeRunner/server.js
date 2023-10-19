const app = require("express")();
const pty = require("node-pty");
const server = require("http").createServer(app);
const options = {
  cors: {
    origin: "*",
  },
  port: 9999,
  shell: "bash",
};
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let socket;
let term = pty.fork(options.shell, [], {
  cols: 100,
  name: "xterm",
  cwd: ".",
});
term.on("data", (data) => {
  console.log(data);
  if (socket) socket.emit("data", Buffer.from(data, "utf-8"));
});

io.on("connection", (s) => {
  socket = s;
  socket.on("data", (data) => {
    console.log("Received data: ", data);
    term.write(data);
  });

  socket.on("disconnect", () => (socket = null));
});

server.listen(options.port, () => {
  console.log(`App ready on :${options.port}`);
});
