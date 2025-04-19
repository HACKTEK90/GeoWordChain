import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getDatabase, ref, set, update, get, onValue, push, remove } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAp9kCBsDLnQEmR7wWHXwt3FB2T1zDtiqU",
  authDomain: "h-90-8a7c5.firebaseapp.com",
  databaseURL: "https://h-90-8a7c5-default-rtdb.firebaseio.com",
  projectId: "h-90-8a7c5",
  storageBucket: "h-90-8a7c5.appspot.com",
  messagingSenderId: "367196609301",
  appId: "1:367196609301:web:156e24c1b4532c26af671c",
  measurementId: "G-W5K7F4VQGP"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let username = "";
let roomId = "";
let isMyTurn = false;

window.createRoom = async function () {
  username = document.getElementById("username").value.trim();
  if (!username) return alert("Enter your name!");

  roomId = Math.random().toString(36).substring(2, 7);
  const roomRef = ref(db, "rooms/" + roomId);

  const now = Date.now();
  await set(roomRef, {
    players: [username],
    gameState: {
      turn: username,
      lastWord: "",
      usedWords: [],
      createdAt: now
    }
  });

  alert("Room created! Room ID: " + roomId);
  startGame(roomId);
  scheduleAutoDelete(roomId, now);
};

window.joinRoom = async function () {
  username = document.getElementById("username").value.trim();
  roomId = document.getElementById("room-id").value.trim();
  if (!username || !roomId) return alert("Fill both fields.");

  const playersRef = ref(db, "rooms/" + roomId + "/players");

  const snapshot = await get(playersRef);
  if (!snapshot.exists()) return alert("Room doesn't exist.");

  const players = snapshot.val();
  if (players.includes(username)) {
    alert("You're already in this room.");
  } else {
    await set(playersRef, [...players, username]);
  }

  startGame(roomId);
};

function startGame(roomId) {
  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";

  const stateRef = ref(db, "rooms/" + roomId + "/gameState");
  onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    document.getElementById("last-word").textContent = data.lastWord || "None";
    document.getElementById("used-words").textContent = data.usedWords.join(", ");
    isMyTurn = data.turn === username;
    document.getElementById("your-turn").textContent = isMyTurn ? "Yes" : "No";
  });
}

window.submitWord = async function () {
  if (!isMyTurn) return alert("⛔ Not your turn!");

  const input = document.getElementById("word-input");
  const word = input.value.trim().toLowerCase();
  input.value = "";

  if (!word) return alert("⚠️ Please enter a word.");

  // 🔍 1. Check geo validity
  const isRealPlace = await isValidPlace(word);
  if (!isRealPlace) {
    alert("❌ Not a valid geographical location.");
    handleLoss(); // optional: remove or skip this player
    return;
  }

  // ✅ 2. Rest of your checks (last letter, repeated word etc.)
  if (usedWords.includes(word)) {
    alert("❗ This word was already used.");
    return;
  }

  if (lastWord && word[0] !== lastWord[lastWord.length - 1]) {
    alert("❌ Word doesn't start with last letter.");
    return;
  }

  // ✅ 3. Push valid word to Firebase
  await update(ref(db, `rooms/${roomId}`), {
    lastWord: word,
    turnIndex: (turnIndex + 1) % players.length,
    usedWords: [...usedWords, word]
  });
};


  input.value = "";
};

// ⏳ Auto delete logic (24hr after room creation)
function scheduleAutoDelete(roomId, createdAt) {
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const timeLeft = (createdAt + twentyFourHours) - Date.now();

  setTimeout(() => {
    remove(ref(db, "rooms/" + roomId));
    console.log("Room auto-deleted: " + roomId);
  }, timeLeft);
}

async function isValidPlace(placeName) {
  const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${placeName}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': '1b61595180mshd987fdd20706339p178259jsnc30974367b78', // Replace with your actual key
        'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
      }
    });
    
    const data = await response.json();
    return data.data.length > 0; // true if place exists
  } catch (error) {
    console.error('GeoDB Error:', error);
    return false;
  }
}
