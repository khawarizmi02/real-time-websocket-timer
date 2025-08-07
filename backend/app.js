import { Server } from "socket.io";

const rooms= {
  room1: { timer: null, remaining: 300000, running: false, startTime: null },
  room2: { timer: null, remaining: 300000, running: false, startTime: null },
  room3: { timer: null, remaining: 300000, running: false, startTime: null },
};

export function createApplication(
	HttpServer,
	serverOptions= {
		cors: {
			origin: ["http://localhost"],
		},
	}
) {
	const io = new Server(HttpServer, serverOptions)

	io.on("connection", (socket) => {
		console.log("Client connected:", socket.id);

		socket.on("room:list", () => {
			const roomList = Object.keys(rooms).filter(
        (room) => !socket.rooms.has(room) || room !== socket.id
      );
      socket.emit("room:list", roomList);
      console.log("Rooms sent to client:", roomList);
		});

		socket.on("room:read", (roomId) => {
			if (!rooms[roomId]) {
        socket.emit("error", { message: `Invalid room: ${roomId}` });
        return;
      }
      socket.join(roomId);
      console.log(`Client ${socket.id} joined room ${roomId}`);

      let time = rooms[roomId].remaining;
      if (rooms[roomId].running && rooms[roomId].startTime) {
        const elapsed = Date.now() - rooms[roomId].startTime;
        time = Math.max(rooms[roomId].remaining - elapsed, 0);
      }
      socket.emit("room:state", {
        roomId,
        time,
        isRunning: rooms[roomId].running,
      });
		});

		socket.on("room:start", (roomId) => {
			let room = rooms[roomId];
      if (!room || room.running) {
        socket.emit("error", { message: "Invalid room or timer already running" });
        return;
      }

      room.running = true;
      room.startTime = Date.now();
      room.timer = setInterval(() => {
        const elapsed = Date.now() - room.startTime;
        const timeLeft = Math.max(room.remaining - elapsed, 0);

        if (timeLeft <= 0) {
          clearInterval(room.timer);
          room.running = false;
          room.remaining = 0;
          room.timer = null;
          io.to(roomId).emit("room:state", { roomId, time: 0, isRunning: false });
          io.to(roomId).emit("room:finished", { roomId });
        } else {
          io.to(roomId).emit("room:state", { roomId, time: timeLeft, isRunning: true });
          io.to(roomId).emit("room:update", { roomId, time: timeLeft });
        }
      }, 1000);
		});

		socket.on("room:pause", (roomId) => {
			let room = rooms[roomId];
      if (!room || !room.running) {
        socket.emit("error", { message: "Invalid room or timer not running" });
        return;
      }

      clearInterval(room.timer);
      room.running = false;
      const elapsed = Date.now() - room.startTime;
      room.remaining = Math.max(room.remaining - elapsed, 0);
      room.startTime = null;
      room.timer = null;

      io.to(roomId).emit("room:state", { roomId, time: room.remaining, isRunning: false });
      io.to(roomId).emit("room:paused", { roomId, time: room.remaining });
		});

		// Stop timer for a room
    socket.on("room:stop", (roomId) => {
      let room = rooms[roomId];
      if (!room || !room.running) {
        socket.emit("error", { message: "Invalid room or timer not running" });
        return;
      }

      clearInterval(room.timer);
      room.running = false;
      const elapsed = Date.now() - room.startTime;
      room.remaining = Math.max(room.remaining - elapsed, 0);
      room.startTime = null;
      room.timer = null;

      io.to(roomId).emit("room:state", { roomId, time: room.remaining, isRunning: false });
      io.to(roomId).emit("room:stopped", { roomId, time: room.remaining });
    });

		socket.on("room:reset", (roomId) => {
			let room = rooms[roomId];
      if (!room) {
        socket.emit("error", { message: `Invalid room: ${roomId}` });
        return;
      }

      if (room.running) {
        clearInterval(room.timer);
      }
      room.running = false;
      room.remaining = 300000; // Reset to 5 minutes
      room.startTime = null;
      room.timer = null;

      io.to(roomId).emit("room:state", { roomId, time: room.remaining, isRunning: false });
		});

		socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
	});

	return io;
}