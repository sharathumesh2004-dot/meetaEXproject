let users = {};
let socket = io();
let localStream;
let peerConnection;
let roomID;
let mediaRecorder;
let recordedChunks = [];

const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

function showRegister(){
    homePage.classList.add("hidden");
    registerPage.classList.remove("hidden");
}

function showLogin(){
    homePage.classList.add("hidden");
    loginPage.classList.remove("hidden");
}

function goHome(){
    registerPage.classList.add("hidden");
    loginPage.classList.add("hidden");
    homePage.classList.remove("hidden");
}

function register(){
    let u = regUsername.value;
    let p = regPassword.value;
    let regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/;

    if(!regex.test(p)){
        alert("Password must contain 1 uppercase, 1 lowercase, 1 number, 1 special character");
        return;
    }

    users[u]=p;
    alert("Registered Successfully");
    goHome();
}

function login(){
    let u = loginUsername.value;
    let p = loginPassword.value;

    if(users[u]===p){
        loginPage.classList.add("hidden");
        roomSection.classList.remove("hidden");
    } else {
        alert("Invalid Credentials");
    }
}

async function createRoom(){
    roomID = roomInput.value;
    socket.emit("join-room", roomID);
    startVideo();
}

async function joinRoom(){
    roomID = roomInput.value;
    socket.emit("join-room", roomID);
    startVideo();
}

async function startVideo(){
    localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    localVideo.srcObject = localStream;
    videoSection.classList.remove("hidden");

    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track=>{
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = e=>{
        remoteVideo.srcObject = e.streams[0];
    };

    peerConnection.onicecandidate = e=>{
        if(e.candidate){
            socket.emit("candidate", e.candidate, roomID);
        }
    };
}

socket.on("ready", async ()=>{
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomID);
});

socket.on("offer", async offer=>{
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomID);
});

socket.on("answer", async answer=>{
    await peerConnection.setRemoteDescription(answer);
});

socket.on("candidate", async candidate=>{
    await peerConnection.addIceCandidate(candidate);
});

function startRecording(){
    mediaRecorder = new MediaRecorder(localStream);
    mediaRecorder.ondataavailable = e=>recordedChunks.push(e.data);
    mediaRecorder.start();
    alert("Recording Started");
}

function stopRecording(){
    mediaRecorder.stop();
    mediaRecorder.onstop = ()=>{
        const blob = new Blob(recordedChunks,{type:"video/webm"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href=url;
        a.download="recording.webm";
        a.click();
    };
}

function endMeeting(){
    if(peerConnection) peerConnection.close();
    if(localStream){
        localStream.getTracks().forEach(track=>track.stop());
    }
    videoSection.classList.add("hidden");
    roomSection.classList.remove("hidden");
}
