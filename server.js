const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public1")));

io.on("connection", (socket) => {

    socket.on("join-room", (roomID) => {
        socket.join(roomID);

        const clients = io.sockets.adapter.rooms.get(roomID);

        if (clients && clients.size > 1) {
            socket.to(roomID).emit("ready");
        }
    });

    socket.on("offer", (offer, roomID) => {
        socket.to(roomID).emit("offer", offer);
    });

    socket.on("answer", (answer, roomID) => {
        socket.to(roomID).emit("answer", answer);
    });

    socket.on("candidate", (candidate, roomID) => {
        socket.to(roomID).emit("candidate", candidate);
    });

});

server.listen(3000, () => {
    console.log("MeetAtEx running on http://localhost:3000");
});
