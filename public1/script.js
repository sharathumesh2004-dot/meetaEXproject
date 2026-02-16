const socket = io();
let localStream;
let recorder;
let currentRoom;

/* PASSWORD VALIDATION */

function validatePassword(password) {

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpper) return "Must contain one uppercase letter.";
    if (!hasLower) return "Must contain one lowercase letter.";
    if (!hasNumber) return "Must contain one number.";
    if (!hasSpecial) return "Must contain one special character.";

    return "valid";
}

/* REGISTER */

async function register() {

    const password = document.getElementById("regPassword").value;
    const validation = validatePassword(password);

    if (validation !== "valid") {
        alert(validation);
        return;
    }

    const res = await fetch("/register", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
            username:document.getElementById("regUsername").value,
            password:password
        })
    });

    const data = await res.json();

    if(data.success){
        alert("Registered Successfully");
        document.getElementById("registerBox").classList.add("hidden");
        document.getElementById("loginBox").classList.remove("hidden");
    } else {
        alert(data.message);
    }
}

/* LOGIN */

async function login(){

    const res = await fetch("/login", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
            username:document.getElementById("loginUsername").value,
            password:document.getElementById("loginPassword").value
        })
    });

    const data = await res.json();

    if(data.success){
        document.getElementById("loginBox").classList.add("hidden");
        document.getElementById("roomBox").classList.remove("hidden");
    } else {
        alert("Invalid Credentials");
    }
}

/* ROOM LOGIC */

function createRoom(){
    const roomId = document.getElementById("roomId").value;
    socket.emit("create-room", roomId);
    currentRoom = roomId;
}

function joinRoom(){
    const roomId = document.getElementById("roomId").value;
    socket.emit("join-room", roomId);
    currentRoom = roomId;
}

socket.on("room-created", () => {
    document.getElementById("status").innerText = "Room Created";
    startMeeting();
});

socket.on("room-joined", () => {
    document.getElementById("status").innerText = "Joined Room";
    startMeeting();
});

socket.on("room-exists", () => alert("Room already exists"));
socket.on("room-not-found", () => alert("Room not found"));
socket.on("room-full", () => alert("Room full"));

socket.on("meeting-ended", () => {
    alert("Meeting Ended");
    location.reload();
});

/* MEETING */

async function startMeeting(){

    document.getElementById("roomBox").classList.add("hidden");
    document.getElementById("meetingBox").classList.remove("hidden");

    localStream = await navigator.mediaDevices.getUserMedia({
        video:true,
        audio:true
    });

    document.getElementById("localVideo").srcObject = localStream;
}

/* RECORDING */

function startRecording(){
    recorder = new MediaRecorder(localStream);
    recorder.ondataavailable = e=>{
        const a=document.createElement("a");
        a.href=URL.createObjectURL(e.data);
        a.download="recording.webm";
        a.click();
    };
    recorder.start();
}

function stopRecording(){
    recorder.stop();
}

function endMeeting(){
    socket.emit("end-meeting", currentRoom);
}
