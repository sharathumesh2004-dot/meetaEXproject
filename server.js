const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname + "/public1"));

let users = [];
let rooms = {};

/* =========================
   REGISTER
========================= */
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    const existingUser = users.find(u => u.username === username);

    if (existingUser) {
        return res.json({ success: false, message: "Username already exists" });
    }

    users.push({ username, password });
    res.json({ success: true });
});

/* =========================
   LOGIN
========================= */
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u =>
        u.username === username &&
        u.password === password
    );

    if (user) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

/* =========================
   ROOM SYSTEM
========================= */
io.on("connection", socket => {

    socket.on("create-room", roomId => {

        if (rooms[roomId]) {
            socket.emit("room-exists");
        } else {
            rooms[roomId] = [socket.id];
            socket.join(roomId);
            socket.emit("room-created");
        }
    });

    socket.on("join-room", roomId => {

        if (!rooms[roomId]) {
            socket.emit("room-not-found");
            return;
        }

        if (rooms[roomId].length >= 2) {
            socket.emit("room-full");
            return;
        }

        rooms[roomId].push(socket.id);
        socket.join(roomId);

        socket.emit("room-joined");
        socket.to(roomId).emit("user-connected");
    });

    socket.on("end-meeting", roomId => {
        io.to(roomId).emit("meeting-ended");
        delete rooms[roomId];
    });

    socket.on("disconnect", () => {
        for (let room in rooms) {
            rooms[room] = rooms[room].filter(id => id !== socket.id);
            if (rooms[room].length === 0) {
                delete rooms[room];
            }
        }
    });

});

/* =========================
   DEPLOYMENT PORT FIX
========================= */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("MeetAtEX server running on port " + PORT);
});
