const socket = io();
let localStream;
let peers = {};
let roomId;
let mediaRecorder;
let recordedChunks = [];
let usernameGlobal = "";

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

/* ================= PASSWORD TOGGLE ================= */

function togglePassword(id){
  const input=document.getElementById(id);
  input.type=input.type==="password"?"text":"password";
  input.addEventListener("blur",()=>{ input.type="password"; });
}

/* ================= SWITCH ================= */

function showLogin(){
  registerSection.style.display="none";
  loginSection.style.display="block";
}

function showRegister(){
  loginSection.style.display="none";
  registerSection.style.display="block";
}

/* ================= REGISTER ================= */

async function registerUser(){
  const res=await fetch("/register",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      username:regUsername.value,
      password:regPassword.value
    })
  });

  const data=await res.json();
  alert(data.message || "Registered successfully");

  if(data.success){
    showLogin();
  }
}

/* ================= LOGIN ================= */

async function loginUser(){
  const res=await fetch("/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      username:loginUsername.value,
      password:loginPassword.value
    })
  });

  const data=await res.json();

  if(data.success){
    usernameGlobal = loginUsername.value;
    authCard.style.display="none";
    dashboard.style.display="block";
  } else {
    alert("Invalid username or password");
  }
}

/* ================= ROOM ================= */

function createRoom(){
  roomId=Math.floor(1000+Math.random()*9000).toString();
  roomInput.value = roomId;
  startRoom();
}

function joinRoom(){
  roomId=roomInput.value;
  if(roomId) startRoom();
}

async function startRoom(){
  dashboard.style.display="none";
  roomSection.style.display="block";

  localStream=await navigator.mediaDevices.getUserMedia({
    video:true,
    audio:true
  });

  addVideo(localStream,true);
  socket.emit("join-room",roomId);

  startSpeechRecognition();
}

/* ================= SOCKET EVENTS ================= */

socket.on("existing-users",users=>{
  users.forEach(id=>createPeer(id,true));
});

socket.on("user-joined",id=>{
  createPeer(id,false);
});

socket.on("offer",async({sdp,sender})=>{
  const peer=createPeer(sender,false);
  await peer.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer=await peer.createAnswer();
  await peer.setLocalDescription(answer);
  socket.emit("answer",{target:sender,sdp:answer});
});

socket.on("answer",async({sdp,sender})=>{
  await peers[sender].setRemoteDescription(new RTCSessionDescription(sdp));
});

socket.on("ice-candidate",async({candidate,sender})=>{
  await peers[sender].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("user-left",id=>{
  if(peers[id]){
    peers[id].close();
    delete peers[id];
  }
});

/* ================= PEER ================= */

function createPeer(id,initiator){
  const peer=new RTCPeerConnection(config);

  localStream.getTracks().forEach(track=>{
    peer.addTrack(track,localStream);
  });

  peer.ontrack=e=>{
    addVideo(e.streams[0],false);
  };

  peer.onicecandidate=e=>{
    if(e.candidate){
      socket.emit("ice-candidate",{
        target:id,
        candidate:e.candidate
      });
    }
  };

  if(initiator){
    peer.createOffer().then(offer=>{
      peer.setLocalDescription(offer);
      socket.emit("offer",{target:id,sdp:offer});
    });
  }

  peers[id]=peer;
  return peer;
}

function addVideo(stream,mirror){
  const video=document.createElement("video");
  video.srcObject=stream;
  video.autoplay=true;
  video.playsInline=true;
  if(mirror) video.style.transform="scaleX(-1)";
  videoGrid.appendChild(video);
}

/* ================= RECORD ================= */

function startRecording(){
  mediaRecorder=new MediaRecorder(localStream);
  mediaRecorder.ondataavailable=e=>recordedChunks.push(e.data);
  mediaRecorder.start();
}

function stopRecording(){
  mediaRecorder.stop();
  mediaRecorder.onstop=()=>{
    const blob=new Blob(recordedChunks,{type:"video/webm"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="meeting.webm";
    a.click();
    recordedChunks=[];
  };
}

function leaveRoom(){
  location.reload();
}

/* ================= LIVE TRANSCRIPT ================= */

function startSpeechRecognition(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition) return;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.lang = "en-US";

  recognition.onresult = (event)=>{
    const text = event.results[event.results.length-1][0].transcript;

    socket.emit("send-transcript",{
      text:text,
      username:usernameGlobal
    });
  };

  recognition.start();
}

socket.on("receive-transcript",(data)=>{
  let box = document.getElementById("transcriptBox");

  if(!box){
    box=document.createElement("div");
    box.id="transcriptBox";
    box.style.position="fixed";
    box.style.bottom="10px";
    box.style.left="50%";
    box.style.transform="translateX(-50%)";
    box.style.background="rgba(0,0,0,0.7)";
    box.style.color="white";
    box.style.padding="10px 20px";
    box.style.borderRadius="10px";
    document.body.appendChild(box);
  }

  box.innerText = data.username + ": " + data.text;
});
