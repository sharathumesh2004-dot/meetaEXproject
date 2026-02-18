const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const socketio = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public1")));

mongoose.connect("mongodb://127.0.0.1:27017/meetatex")
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

/* ================= USER MODEL ================= */

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const User = mongoose.model("User", userSchema);

/* ================= REGISTER ================= */

app.post("/register", async (req,res)=>{
    const {username,password} = req.body;

    const regex = /^(?=.*[A-Z])(?=.*[\W_]).+$/;

    if(!regex.test(password)){
        return res.json({
            success:false,
            message:"Password must contain 1 uppercase & 1 special character"
        });
    }

    const existing = await User.findOne({username});
    if(existing){
        return res.json({
            success:false,
            message:"User already exists"
        });
    }

    const hash = await bcrypt.hash(password,10);
    await User.create({username,password:hash});

    res.json({success:true});
});

/* ================= LOGIN ================= */

app.post("/login", async (req,res)=>{
    const {username,password} = req.body;

    const user = await User.findOne({username});
    if(!user) return res.json({success:false});

    const match = await bcrypt.compare(password,user.password);
    if(!match) return res.json({success:false});

    res.json({success:true});
});

/* ================= SOCKET SECTION ================= */

let rooms = {};

io.on("connection",(socket)=>{

    socket.on("join-room",(roomId)=>{

        if(!rooms[roomId]) rooms[roomId]=[];
        rooms[roomId].push(socket.id);

        socket.join(roomId);

        socket.emit("existing-users",
            rooms[roomId].filter(id=>id!==socket.id)
        );

        socket.to(roomId).emit("user-joined",socket.id);

        /* ========= TRANSLATION BROADCAST ========= */
        socket.on("send-transcript",(data)=>{
            socket.to(roomId).emit("receive-transcript",{
                text:data.text,
                username:data.username
            });
        });
        /* ========================================== */

        socket.on("offer",(data)=>{
            io.to(data.target).emit("offer",{
                sdp:data.sdp,
                sender:socket.id
            });
        });

        socket.on("answer",(data)=>{
            io.to(data.target).emit("answer",{
                sdp:data.sdp,
                sender:socket.id
            });
        });

        socket.on("ice-candidate",(data)=>{
            io.to(data.target).emit("ice-candidate",{
                candidate:data.candidate,
                sender:socket.id
            });
        });

        socket.on("disconnect",()=>{
            if(rooms[roomId]){
                rooms[roomId]=rooms[roomId].filter(id=>id!==socket.id);
                socket.to(roomId).emit("user-left",socket.id);
            }
        });

    });

});

server.listen(3000,()=>console.log("Meet at EX running on port 3000"));
