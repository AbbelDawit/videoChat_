let localStream;
let username;
let remoteUser;
let url = new URL(window.location.href);
// username = url.searchParams.get("username");
// remoteUser = url.searchParams.get("remoteuser");
let peerConnection;
let remoteStream;
let sendChannel;
let receiveChannel;
let currentTimer;
var msgInput = document.querySelector("#msg-input");
var msgSendBtn = document.querySelector(".msg-send-button");
var chatTextArea = document.querySelector(".chat-text-area");
var timeElm = document.getElementById('timeElm');
var searchingOverlay = document.getElementById("user-2-overlay");

var omeID = localStorage.getItem("omeID");
if (omeID) {
  username = omeID;
  $.ajax({
    url: "/new-user-update/" + omeID + "",
    type: "PUT",
    success: function (response) {
      //console.log(response);
    },
  });
} else {
  var postData = "Demo Data";
  $.ajax({
    type: "POST",
    url: "/api/users",
    data: postData,
    success: function (response) {
      //console.log(response);
      localStorage.setItem("omeID", response);
      username = response;
    },
    error: function (error) {
     //console.log(error);
    },
  });
}

let connectionEstablished = false; // Flag to track whether the connection is established

let init = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
  } catch (error) {
    // Show a toast error message for non-verified users
    Toastify({
      text: "Must grant this website permission to access your video and audio.",
      duration: 5000, // Duration in milliseconds
      gravity: "top", // toast position, 'top' or 'bottom'
      position: "center", // toast position, 'left', 'center' or 'right'
      stopOnFocus: true, // Stop timer when the toast is focused
      close: false, // Show close button
      className: "error-toast", // Custom class for styling
    }).showToast();
  }
  // Create the peer connection
  await createPeerConnection();
  document.getElementById("user-1").srcObject = localStream;
  $.post("https://videochat-b42a71fded75.herokuapp.com/get-remote-users", { omeID: omeID })
    .done(function (data) {
      //console.log("Remoteuser id from Init() /get-remote-users: ", data[0]._id);
      if (data[0]) {
        remoteUser = data[0]._id;
        createOffer(data[0]._id);
      }
    })
    .fail(function (xhr, textStatus, errorThrown) {
      //console.log(xhr.responseText);
    });

  // Add a delay of 5 seconds before calling closeConnectionAndFetchNext recursively
  setTimeout(async () => {
    await closeConnectionAndFetchNext();
  }, 10000);
};

init();

let socket = io.connect();

socket.on("connect", () => {
  if (socket.connected) {
    socket.emit("userconnect", {
      displayName: username,
    });
  }
});

let servers = {
  iceServers: [
    {
      urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
    },
  ],
};


let createPeerConnection = async () => {
  // Display the searching overlay
  searchingOverlay.style.display = "flex";

  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();

  document.getElementById("user-2").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    const sender = peerConnection.addTrack(track, localStream);
  });
  // Add event listener for icegatheringstatechange
  peerConnection.onicegatheringstatechange = () => {
    //console.log("ICE gathering state:", peerConnection.iceGatheringState);
  };

  peerConnection.oniceconnectionstatechange = () => {
  //console.log("ICE connection state:", peerConnection.iceConnectionState);
    // Check the ICE connection state
    if (peerConnection.iceConnectionState === "connected") {
      // Set the flag to true when the connection is established
      connectionEstablished = true;
      // Hide the overlay when the connection is established
      searchingOverlay.style.display = "none";
      // Enable the "Next" button if already connected
      enableNextButton();
    } else {
      // Display the searching overlay if not connected
      searchingOverlay.style.display = "flex";
      // Disable the "Next" button if not connected
      disableNextButton();
    }
  };

  peerConnection.ondatachannel = (event) => {
    receiveChannelCallback(event);
    
    // Additional actions when the data channel is ready (connected)
    //console.log("Data channel is now ready (connected)!");
    // You can add further UI updates or actions here
  };
  
  peerConnection.ontrack = async (event) => {
    event.streams.forEach((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      }
    });
  };

  remoteStream.oninactive = () => {
    remoteStream.getTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    peerConnection.close();
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      socket.emit("candidateSentToUser", {
        username: username,
        remoteUser: remoteUser,
        iceCandidateData: event.candidate,
      });
    }
  };

  sendChannel = peerConnection.createDataChannel("sendDataChannel");
  sendChannel.onopen = () => {
    //console.log("Data channel is now open and ready to use");
    onSendChannelStateChange();
  };

  peerConnection.ondatachannel = receiveChannelCallback;

  // sendChannel.onmessage=onSendChannelMessageCallBack;
};

function sendData() {
  const msgData = msgInput.value;
  chatTextArea.innerHTML +=
    "<div style='margin-top:2px; margin-bottom:2px; color: #3F89FB'><b>Me: </b>" +
    msgData +
    "</div>";
  if (sendChannel) {
    onSendChannelStateChange();
    sendChannel.send(msgData);
    msgInput.value = "";
  } else {
    receiveChannel.send(msgData);
    msgInput.value = "";
  }
}
function receiveChannelCallback(event) {
  //console.log("Receive Channel Callback");
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveChannelMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}
function onReceiveChannelMessageCallback(event) {
  //console.log("Received Message");
  chatTextArea.innerHTML +=
    "<div style='margin-top:2px; margin-bottom:2px; color: #FDBD2F'><b>Stranger: </b>" +
    event.data +
    "</div>";
}

function onSendChannelStateChange() {
  const readyState = sendChannel.readyState;
  //console.log("Send channel state is: " + readyState);
}

function onReceiveChannelStateChange() {
  const readyState = receiveChannel.readyState;
  //console.log("Receive channel state is: " + readyState);
  /*
  if (readyState === "open") {
    console.log("Data channel ready state is open - onReceiveChannelStateChange");
  } else {
    console.log("Data channel ready state is NOT open - onReceiveChannelStateChange");
  }
  */
}

function fetchNextUser(remoteUser, maxRetries = 5, currentRetries = 0) {
  return new Promise((resolve, reject) => {
    if (currentRetries >= maxRetries) {
      //console.log('Max retries reached. Unable to find a different user.');
      reject('Max retries reached');
      return;
    }

    $.post(
      "https://videochat-b42a71fded75.herokuapp.com/get-next-user",
      { omeID: omeID, remoteUser: remoteUser },
      function (data) {
        //console.log("Next user is: ", data);
        if (data[0]) {
          if (data[0]._id == remoteUser || data[0]._id == username) {
            // Same user, fetch again (recursive call)
            fetchNextUser(remoteUser, maxRetries, currentRetries + 1)
              .then(resolve)
              .catch(reject);
          } else {
            // Different user, resolve the Promise
            remoteUser = data[0]._id;
            resolve(data[0]._id);
          }
        } else {
          reject('No user found');
        }
      }
    );
  });
}


let createOffer = async (remoteU) => {
  // Create the peer connection if it doesn't exist
  if (!peerConnection) {
    await createPeerConnection();
  }
  
  if (peerConnection && peerConnection.connectionState === 'stable' && !peerConnection.localDescription) {
    try {
      let offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      // Emit the offer to the remote user
      socket.emit("offerSentToRemote", {
        username: username,
        remoteUser: remoteU,
        offer: peerConnection.localDescription,
      });
    } catch (error) {
      console.error('Error creating or setting local description:', error);
    }
  } else {
    console.error('PeerConnection is not in the expected state for creating an offer.');
  }
  // Create and set the local offer
  //let offer = await peerConnection.createOffer();
  //await peerConnection.setLocalDescription(offer);
  // Emit the offer to the remote user
  /*socket.emit("offerSentToRemote", {
    username: username,
    remoteUser: remoteU,
    offer: peerConnection.localDescription,
  });*/
  //console.log("from Offer");
};

let createAnswer = async (data) => {
  remoteUser = data.username;

  createPeerConnection();

  //console.log("Before setRemoteDescription");
  await peerConnection.setRemoteDescription(data.offer);
  //console.log("After setRemoteDescription");

  let answer = await peerConnection.createAnswer();

  //console.log("Before setLocalDescription");
  await peerConnection.setLocalDescription(answer);
  //console.log("After setLocalDescription");

  socket.emit("answerSentToUser1", {
    answer: answer,
    sender: data.remoteUser,
    receiver: data.username,
  });
  //console.log("from answer");
  $.ajax({
    url: "/update-on-engagement/" + username + "",
    type: "PUT",
    success: function (response) {},
  });
};

socket.on("ReceiveOffer", function (data) {
  createAnswer(data);
  timer(60);
});

let addAnswer = async (data) => {
  //console.log("Before setRemoteDescription");
  if (!peerConnection.currentRemoteDescription) {
    await peerConnection.setRemoteDescription(data.answer);
  }
  //console.log("After setRemoteDescription");

  // Check if the peer connection is in the "stable" state before adding the ICE candidate
  if (peerConnection.signalingState === "stable") {
    // Add the ICE candidate only if the signaling state is stable
    peerConnection.addIceCandidate(data.iceCandidateData)
      
    /*.catch((error) => {
      console.error("Error adding ICE candidate:", error);
    });*/
  } else {
    //console.warn("ICE candidate received in non-stable signaling state:", peerConnection.signalingState);
  }
  $.ajax({
    url: "/update-on-engagement/" + username + "",
    type: "PUT",
    success: function (response) {},
  });
};


socket.on("ReceiveAnswer", async function (data) {
  // Check if the peer connection is closed
  if (peerConnection && peerConnection.connectionState !== 'closed') {
    try {
      // Set the remote description
      await peerConnection.setRemoteDescription(data.answer);
      // Add the answer
      addAnswer(data);
      // Start or reset the timer
      timer(60);
    } catch (error) {
      //console.error("Error setting remote description:", error);
    }
  } else {
    //console.warn("Attempted to process answer on a closed RTCPeerConnection.");
  }
});

socket.on("closedRemoteUser", async function () {
  if (peerConnection && peerConnection.connectionState !== 'closed') {
    // Close the peer connection and stop tracks
    const remoteStreams = peerConnection.getReceivers().map(receiver => receiver.track.remoteStream);
    if (remoteStreams && remoteStreams.length > 0) {
      const remoteStream = remoteStreams[0];
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
      }
    }

    // Use promise to ensure peerConnection.close() completes before moving on
    await peerConnection.close();
  }

  const remoteVid = document.getElementById("user-2");
  if (remoteVid && remoteVid.srcObject) {
    // Stop tracks in the video element's source object
    remoteVid.srcObject.getTracks().forEach((track) => track.stop());
    remoteVid.srcObject = null;
  }

  // Fetch next user
  try {
    await fetchNextUser(remoteUser);
  } catch (error) {
    // Handle error fetching next user
    //console.error('Error fetching next user:', error);
  }
});



socket.on("candidateReceiver", async function (data) {
  if (peerConnection && peerConnection.signalingState !== "closed") {
    // Check if remote description is set
    if (peerConnection.remoteDescription) {
      try {
        // Add the ICE candidate
        await peerConnection.addIceCandidate(data.iceCandidateData);
        //console.log("ICE candidate added successfully");
      } catch (error) {
        //console.error("Error adding ICE candidate:", error);
      }
    } else {
      //console.warn("Remote description not set. Cannot add ICE candidate.");
    }
  } else {
    //console.warn("Attempted to add ICE candidate to a closed RTCPeerConnection.");
  }
});


// Add an event listener for key press on the input field
msgInput.addEventListener("keypress", function (event) {
  // Check if the pressed key is Enter (key code 13)
  if (event.key === 'Enter') {
    // Prevent the default behavior of the Enter key (e.g., form submission)
    event.preventDefault();
    
    // Call the sendData function to send the message
    sendData();
  }
});

msgSendBtn.addEventListener("click", function (event) {
  sendData();
});

window.addEventListener("unload", function (event) {
  if (navigator.userAgent.indexOf("Chrome") != -1) {
    $.ajax({
      url: "/leaving-user-update/" + username + "",
      type: "PUT",
      success: function (response) {
        //console.log(response);
      },
    });
    //console.log("Leaving local user is: ", username);
    // ..........................Newly Edited
    navigator.sendBeacon("/update-on-otherUser-closing/" + remoteUser, null);
    //console.log("Leaving remote user is: ", remoteUser);
    // ..........................Newly Edited
    //console.log("This is Chrome");
  } else if (navigator.userAgent.indexOf("Firefox") != -1) {
    // The browser is Firefox
    navigator.sendBeacon("/leaving-user-update/" + username, null);
    //console.log("Leaving local user is: ", username);
    // ..........................Newly Edited
    navigator.sendBeacon("/update-on-otherUser-closing/" + remoteUser, null);
    //console.log("Leaving remote user is: ", remoteUser);
    // ..........................Newly Edited

    //console.log("This is Firefox");
  } else {
    // The browser is not Chrome or Firefox
    //console.log("This is not Chrome or Firefox");
  }
});

async function closeConnection() {
  if (peerConnection && peerConnection.connectionState !== 'closed') {
    // Check if the remote stream is available
    const remoteStreams = peerConnection.getReceivers().map(receiver => receiver.track.remoteStream);

    if (remoteStreams && remoteStreams.length > 0) {
      const remoteStream = remoteStreams[0];

      if (remoteStream) {
        // Stop tracks in the remote stream
        remoteStream.getTracks().forEach((track) => track.stop());
      }
    }

    // Close the peer connection
    await peerConnection.close();
  }

  const remoteVid = document.getElementById("user-2");

  if (remoteVid && remoteVid.srcObject) {
    // Stop tracks in the video element's source object
    remoteVid.srcObject.getTracks().forEach((track) => track.stop());
    remoteVid.srcObject = null;
  }

  // Notify the server that the remote user is closed
  socket.emit("remoteUserClosed", {
    username: username,
    remoteUser: remoteUser,
  });

  // Update user status and fetch the next user
  $.ajax({
    url: "/update-on-next/" + username + "",
    type: "PUT",
    success: function (response) {
      fetchNextUser(remoteUser);
    },
  });

  //console.log("From closeConnection");
}

async function closeConnectionAndFetchNext() {
  await closeConnection();

  try {
    const newRemoteUser = await fetchNextUser(remoteUser);
    //console.log('Fetched new remote user:', newRemoteUser);

    // Check if the peer connection is in a state where it's not connected
    if (
      peerConnection &&
      peerConnection.connectionState !== 'connected'
    ) {
      // Clear the chat area
      chatTextArea.innerHTML = '';

      // Create a new peer connection and offer
      createPeerConnection();
      createOffer(newRemoteUser);

      // Recursive call only if the connection state is not 'connected'
      setTimeout(async () => {
        if (peerConnection.iceConnectionState !== 'connected') {
          // Clear the chat area
          chatTextArea.innerHTML = '';
          // Clear the timer if it is currently running
        if (currentTimer) {
          //console.log('Clearing timer');
          clearTimeout(currentTimer);
          // Clear the timer element
          timeElm.innerHTML = '';
        }
          await closeConnectionAndFetchNext();
        }
      }, 1000);
    }
  } catch (error) {
    if (error.message !== "Max retries reached" && error.message !== "No user found") {
      //console.error('Error fetching next user:', error);
    }
  }
}

function enableNextButton() {
  // Enable the "Next" button and reset opacity to 100%
  const nextButton = document.querySelector(".next-chat");
  if (nextButton) {
    nextButton.style.pointerEvents = "auto";
    nextButton.style.opacity = 1.0;  // Reset opacity to 100%
  }
}

function disableNextButton() {
  // Disable the "Next" button and set opacity to 50%
  const nextButton = document.querySelector(".next-chat");
  if (nextButton) {
    nextButton.style.pointerEvents = "none";
    nextButton.style.opacity = 0.5;
  }
}

// Function to clear the timer and perform necessary actions
const clearTimerAndNext = async () => {
  // Clear the timer if it is currently running
  if (currentTimer) {
    //console.log('Clearing timer');
    clearTimeout(currentTimer);
    // Clear the timer element
    timeElm.innerHTML = '';
  }

  // Hide the overlay when any connection state change occurs
  searchingOverlay.style.display = "flex";

  // Disable the "Next" button for the remote user
  disableNextButton();

  // Close the connection and fetch the next user immediately
  await closeConnectionAndFetchNext();
};

socket.on("nextButtonClick", async (data) => {
  // Check if the remote user in the received data matches the currently connected remote user
  if (data.remoteUser === data.remoteUser) {
    //console.log("Received nextButtonClick for remoteUser:", data.remoteUser);

    // Clear the chat area
    chatTextArea.innerHTML = '';

    // Call the function to clear the timer and perform necessary actions
    await clearTimerAndNext();
  } else {
    // Log a message or take any other action if the remote user doesn't match
    //console.log("Received nextButtonClick, but remoteUser doesn't match the currently connected remoteUser.");
  }
});

$(document).on("click", ".next-chat", function () {
  //console.log("Clicked the Next button"); // Add this log
  // Notify both local and remote users about the "Next" button click
  socket.emit("nextButtonClick", { username: username, remoteUser: remoteUser });

  // Call the function to clear the timer and perform necessary actions for the local user
  clearTimerAndNext();
});



// Timer Script
let timer = function (x) {
  if (x === 0) {
    timeElm.innerHTML = 'Done';
    // Clear the chat area
    chatTextArea.innerHTML = '';
    // Clear the timer element
    timeElm.innerHTML = '';
    // Close the connection and fetch the next user
    closeConnectionAndFetchNext(); 
    return;
  }
  timeElm.innerHTML = x + ' Sec';
  currentTimer = setTimeout(() => {
    timer(--x);
  }, 1000);
};

function openNav() {
  document.getElementById("mySidenav").style.width = "100%";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}





