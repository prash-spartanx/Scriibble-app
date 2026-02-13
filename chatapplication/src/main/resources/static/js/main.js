document.addEventListener('DOMContentLoaded', function() {
'use strict';
console.log("=== GAME APPLICATION LOADED - CLEAN VERSION ===");
//prashant 1.3
/* ==================== DOM ELEMENTS ==================== */
// Pages
var usernamePage = document.querySelector('#username-page');
var lobbyPage = document.querySelector('#lobby-page');
var chatPage = document.querySelector('#chat-page');
var roundEndPage = document.querySelector('#round-end-page');

// Forms & Inputs
var usernameForm = document.querySelector('#usernameForm');
var createRoomBtn = document.querySelector('#createRoomBtn');
var usernameInput = document.querySelector('#username');
var roomCodeInput = document.querySelector('#roomCode');
var joinRoomBtn = document.querySelector('#joinRoomBtn');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');

// Lobby
var displayRoomCode = document.querySelector('#lobbyRoomCode');
var playersList = document.querySelector('#playersList');
var playerCount = document.querySelector('#playerCount');
var startGameBtn = document.querySelector('#startGameBtn');
var waitingMessage = document.querySelector('#waitingMessage');

// Game
var currentRoundSpan = document.querySelector('#currentRound');
var maxRoundsSpan = document.querySelector('#maxRounds');
var currentDrawerSpan = document.querySelector('#currentDrawer');
var wordDisplay = document.querySelector('#wordDisplay');
var wordText = document.querySelector('#wordText');
var timeRemaining = document.querySelector('#timeRemaining');
var leaderboard = document.querySelector('#leaderboard');
var leaveGameBtn = document.querySelector('#leaveGameBtn');

// Round End
var revealedWord = document.querySelector('#revealedWord');
var roundEndLeaderboard = document.querySelector('#roundEndLeaderboard');
var nextDrawer = document.querySelector('#nextDrawer');
var nextRoundBtn = document.querySelector('#nextRoundBtn');
var nextRoundInfo = document.querySelector('#nextRoundInfo');
var waitingNextRound = document.querySelector('#waitingNextRound');

// Canvas
var canvas = document.getElementById('drawingCanvas');
var ctx = canvas ? canvas.getContext('2d') : null;
var canvasContainer = document.getElementById('canvasContainer');
var drawingTools = document.getElementById('drawingTools');

/* ==================== GAME STATE ==================== */
var stompClient = null;
var username = null;
var sessionId = null;
var playerId = null;
var roomCode = null;
var isAdmin = false;
var timerInterval = null;

var gameState = {
    currentRound: 0,
    maxRounds: 5,
    isDrawer: false,
    players: []
};

/* ==================== CANVAS STATE ==================== */
var isDrawing = false;
var currentTool = 'pen';
var currentColor = '#000000';
var brushSize = 3;

/* ==================== UTILITIES ==================== */
var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

function getAvatarColor(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
        hash = 31 * hash + name.charCodeAt(i);
    }
    return colors[Math.abs(hash % colors.length)];
}

/* ==================== EVENT LISTENERS ==================== */
createRoomBtn.addEventListener('click', createRoom, true);
joinRoomBtn.addEventListener('click', joinRoom, true);
messageForm.addEventListener('submit', sendMessage, true);
startGameBtn.addEventListener('click', startGame, true);
//nextRoundBtn.addEventListener('click', startNextRound, true);
leaveGameBtn.addEventListener('click', leaveGame, true);

/* ==================== ROOM CREATION ==================== */
function createRoom(event) {
    event.preventDefault();

    username = usernameInput.value.trim();
    if (!username) {
        alert('Please enter your name');
        return;
    }

    console.log('[CREATE] Creating room for:', username);

    fetch('http://localhost:8081/game/create-session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            adminUsername: username,
            roundDuration: 60,
            maxRounds: 5
        })
    })
    .then(response => {
        console.log('[CREATE] Response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error('Server error: ' + text);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('[CREATE] Room created:', data);

        sessionId = data.sessionId;
        roomCode = data.roomCode;
        playerId = data.adminPlayerId;
        isAdmin = true;

        console.log('[STATE] sessionId:', sessionId);
        console.log('[STATE] playerId:', playerId);
        console.log('[STATE] isAdmin:', isAdmin);

        connectWebSocket();
    })
    .catch(error => {
        console.error('[CREATE] Error:', error);
        alert('Failed to create room: ' + error.message);
    });
}

/* ==================== ROOM JOINING ==================== */
function joinRoom() {
    username = usernameInput.value.trim();
    var code = roomCodeInput.value.trim().toUpperCase();

    if (!username || !code) {
        alert('Please enter your name and room code');
        return;
    }

    console.log('[JOIN] Joining room:', code, 'as:', username);

    fetch('http://localhost:8081/game/join-session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            username: username,
            roomCode: code
        })
    })
    .then(response => {
        console.log('[JOIN] Response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error('Server error: ' + text);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('[JOIN] Joined room:', data);

        sessionId = data.sessionId;
        roomCode = code;
        playerId = data.playerId;
        isAdmin = false;

        console.log('[STATE] sessionId:', sessionId);
        console.log('[STATE] playerId:', playerId);
        console.log('[STATE] isAdmin:', isAdmin);

        connectWebSocket();
    })
    .catch(error => {
        console.error('[JOIN] Error:', error);
        alert('Failed to join room: ' + error.message);
    });
}

/* ==================== WEBSOCKET CONNECTION ==================== */
function connectWebSocket() {
    console.log('[WS] Connecting to WebSocket...');

    var socket = new SockJS('http://localhost:8080/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, onConnected, onError);
}

function onConnected() {
    console.log('[WS] Connected successfully');

    stompClient.subscribe('/topic/public', onMessageReceived);
    console.log('[WS] Subscribed to /topic/public');

    var joinMessage = {
        sender: username,
        content: username + ' joined!',
        type: 'JOIN',
        sessionId: sessionId,
        playerId: playerId
    };

    console.log('[WS] Sending JOIN:', joinMessage);
    stompClient.send("/app/chat.addUser", {}, JSON.stringify(joinMessage));

    // ✅ MOVE UI NOW
    console.log('[LOBBY] Showing lobby and fetching session info');
    showLobby();
    fetchSessionInfo();
}


function onError(error) {
    console.error('[WS] Connection error:', error);
    alert('Could not connect to WebSocket. Please refresh and try again.');
}

/* ==================== LOBBY ==================== */
function showLobby() {
    console.log('[LOBBY] Showing lobby - isAdmin:', isAdmin);

    usernamePage.classList.add('hidden');
    lobbyPage.classList.remove('hidden');
    displayRoomCode.textContent = roomCode;

    if (isAdmin) {
        startGameBtn.classList.remove('hidden');
        if (waitingMessage) waitingMessage.classList.add('hidden');
    } else {
        startGameBtn.classList.add('hidden');
        if (waitingMessage) {
            waitingMessage.classList.remove('hidden');
            waitingMessage.textContent = 'Waiting for admin to start the game...';
        }
    }
}

function fetchSessionInfo() {
    console.log('[SESSION] Fetching session info for:', sessionId);

    fetch('http://localhost:8081/game/session/' + sessionId)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch session');
            }
            return response.json();
        })
        .then(data => {
            console.log('[SESSION] Session data:', data);

            gameState.players = data.players || [];
            gameState.currentRound = data.currentRoundNumber || 0;
            gameState.maxRounds = data.maxRounds || 5;

            updatePlayersList();
            updateLeaderboard();
        })
        .catch(error => {
            console.error('[SESSION] Fetch error:', error);
        });
}

function updatePlayersList() {
    playersList.innerHTML = '';

    var activePlayers = gameState.players.filter(function(p) {
        return p.status === 'ACTIVE';
    });

    playerCount.textContent = activePlayers.length;
    console.log('[PLAYERS] Active players:', activePlayers.length);

    activePlayers.forEach(function(player) {
        var li = document.createElement('li');
        li.textContent = player.username;

        if (player.playerId === playerId) {
            li.style.fontWeight = 'bold';
            li.textContent += ' (You)';
        }

        playersList.appendChild(li);
    });
}

/* ==================== GAME START ==================== */
function startGame() {
    console.log('[GAME] Start game called - isAdmin:', isAdmin);

    if (!isAdmin) {
        alert('Only the room creator can start the game!');
        return;
    }

    console.log('[GAME] Calling start-round endpoint');

    fetch('http://localhost:8081/game/start-round', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            sessionId: sessionId,
            requesterId: playerId
        })
    })
    .then(response => {
        console.log('[GAME] Start-round response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('[GAME] Round started:', data);
//
//        var roundStartMsg = {
//            type: 'ROUND_START',
//            content: JSON.stringify(data),
//            sender: 'SYSTEM',
//            sessionId: sessionId,
//            playerId: playerId
//        };
//
//        console.log('[WS] Broadcasting ROUND_START');
//        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(roundStartMsg));

        startRound(data);
    })
    .catch(error => {
        console.error('[GAME] Start error:', error);
        alert('Failed to start game: ' + error.message);
    });
}

/* ==================== ROUND START ==================== */
function startRound(data) {
    console.log('[ROUND] Starting round:', data.roundNumber);
    console.log('[ROUND] Drawer ID:', data.drawerId);
    console.log('[ROUND] My player ID:', playerId);

    lobbyPage.classList.add('hidden');
    chatPage.classList.remove('hidden');
    roundEndPage.classList.add('hidden');

    gameState.currentRound = data.roundNumber;
    currentRoundSpan.textContent = data.roundNumber;
    maxRoundsSpan.textContent = gameState.maxRounds;
    currentDrawerSpan.textContent = data.drawerUsername;

    messageArea.innerHTML = '';

    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    gameState.isDrawer = (playerId === data.drawerId);
    console.log('[ROUND] Am I drawer?', gameState.isDrawer);

    if (gameState.isDrawer) {
        console.log('[DRAWER] Enabling canvas');
        if (canvasContainer) canvasContainer.classList.remove('disabled');
        if (drawingTools) drawingTools.style.display = 'flex';

        console.log('[DRAWER] Fetching word');
        fetch('http://localhost:8081/game/get-word', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sessionId: sessionId,
                playerId: playerId
            })
        })
        .then(response => {
            console.log('[DRAWER] Get-word response:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text);
                });
            }
            return response.json();
        })
        .then(wordData => {
            console.log('[DRAWER] Word received:', wordData);
            if (wordData.word) {
                wordText.textContent = wordData.word;
                wordDisplay.classList.remove('hidden');
            } else {
                alert('Failed to get word: ' + (wordData.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('[DRAWER] Word fetch error:', error);
            alert('Error getting word: ' + error.message);
        });
    } else {
        console.log('[GUESSER] Disabling canvas');
        if (canvasContainer) canvasContainer.classList.add('disabled');
        if (drawingTools) drawingTools.style.display = 'none';
        wordDisplay.classList.add('hidden');
    }

    startTimer(data.roundDuration);
    fetchSessionInfo();
}

/* ==================== TIMER ==================== */
function startTimer(duration) {
    var remaining = duration;
    timeRemaining.textContent = remaining;

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(function() {
        remaining--;
        timeRemaining.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

/* ==================== ROUND END ==================== */
//function endRound() {
//    console.log('[ROUND] Ending round - isAdmin:', isAdmin);
//
//    if (!isAdmin) {
//        console.log('[ROUND] Not admin, skipping end-round call');
//        return;
//    }
//
//    console.log('[ROUND] Calling end-round endpoint');
//
//    fetch('http://localhost:8081/game/end-round?sessionId=' + sessionId, {
//        method: 'POST',
//        headers: {'Content-Type': 'application/json'}
//    })
//    .then(response => {
//        console.log('[ROUND] End-round response:', response.status);
//        if (!response.ok) {
//            return response.text().then(text => {
//                throw new Error(text);
//            });
//        }
//        return response.json();
//    })
//    .then(data => {
//        console.log('[ROUND] Round ended:', data);
//
//        var roundEndMsg = {
//            type: 'ROUND_END',
//            content: JSON.stringify(data),
//            sender: 'SYSTEM',
//            sessionId: sessionId,
//            playerId: playerId
//        };
//
//        console.log('[WS] Broadcasting ROUND_END');
//        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(roundEndMsg));
//
//        showRoundEnd(data);
//    })
//    .catch(error => {
//        console.error('[ROUND] End error:', error);
//        alert('Error ending round: ' + error.message);
//    });
//}
var autoNextRoundTimer = null; // put this near your globals (top of main.js)

function showRoundEnd(data) {
    console.log('[ROUND_END] Showing round end screen');
    console.log('[ROUND_END] Data:', data);

    chatPage.classList.add('hidden');
    roundEndPage.classList.remove('hidden');

    revealedWord.textContent = data.correctWord || 'Word not available';

    roundEndLeaderboard.innerHTML = '';

    if (data.leaderboard && data.leaderboard.length > 0) {
        data.leaderboard.forEach(function(player, index) {
            var li = document.createElement('li');
            li.innerHTML =
                '<span>' + (index + 1) + '. ' + player.username + '</span>' +
                '<span>' + player.totalScore + ' pts</span>';
            roundEndLeaderboard.appendChild(li);
        });
    } else {
        var li = document.createElement('li');
        li.textContent = 'No scores yet';
        roundEndLeaderboard.appendChild(li);
    }

    // Clear any previous timer (safety)
    if (autoNextRoundTimer) {
        clearInterval(autoNextRoundTimer);
        autoNextRoundTimer = null;
    }

    if (data.isGameComplete) {
        console.log('[ROUND_END] Game complete');
        nextRoundInfo.classList.add('hidden');
        nextRoundBtn.classList.add('hidden');
        waitingNextRound.textContent = 'Game Over! Thanks for playing.';
        waitingNextRound.classList.remove('hidden');
    } else {
        console.log('[ROUND_END] Next drawer:', data.nextDrawerUsername);
        nextDrawer.textContent = data.nextDrawerUsername || 'Unknown';
        nextRoundInfo.classList.remove('hidden');

        // Hide manual button for everyone during auto-start
        nextRoundBtn.classList.add('hidden');

        // Start 5-second countdown
        var secondsLeft = 5;
        waitingNextRound.textContent = 'Next round starting in ' + secondsLeft + '...';
        waitingNextRound.classList.remove('hidden');

        autoNextRoundTimer = setInterval(function () {
            secondsLeft--;
            if (secondsLeft > 0) {
                waitingNextRound.textContent = 'Next round starting in ' + secondsLeft + '...';
            } else {
                clearInterval(autoNextRoundTimer);
                autoNextRoundTimer = null;

                    waitingNextRound.textContent = 'Starting...';

            }
        }, 1000);
    }

    fetchSessionInfo();
}

//function startNextRound() {
//    console.log('[ROUND] Starting next round');
//    startGame();
//}

/* ==================== MESSAGES ==================== */
function sendMessage(event) {
    event.preventDefault();

    var messageContent = messageInput.value.trim();

    if (gameState.isDrawer) {
        alert('You cannot send messages while drawing!');
        messageInput.value = '';
        return;
    }

    if (!sessionId || !playerId) {
        console.error('[MESSAGE] Missing session data');
        alert('Session disconnected. Please refresh.');
        messageInput.value = '';
        return;
    }

    if (messageContent && stompClient && stompClient.connected) {
        console.log('[MESSAGE] Sending guess:', messageContent);

        var guessMessage = {
            sender: username,
            content: messageContent,
            type: 'GUESS',
            sessionId: sessionId,
            playerId: playerId
        };

        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(guessMessage));
    }

    messageInput.value = '';
}

function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);
    console.log('[WS] Message received:', message.type);

    switch(message.type) {
        case 'JOIN':
            addEventMessage(message.sender + ' joined!');
            fetchSessionInfo();
            break;

        case 'LEAVE':
            addEventMessage(message.sender + ' left!');
            fetchSessionInfo();
            break;

        case 'EVENT':
            addEventMessage(message.content);
            fetchSessionInfo();
            break;

        case 'DRAW':
            try {
                var drawData = JSON.parse(message.content);
                receiveDrawing(drawData);
            } catch(e) {
                console.error('[DRAW] Parse error:', e);
            }
            break;

        case 'ROUND_START':
            if (message.playerId !== playerId) {
                console.log('[WS] Processing ROUND_START from another player');
                try {
                    var roundData = JSON.parse(message.content);
                    setTimeout(function() {
                        startRound(roundData);
                    }, 200);
                } catch(e) {
                    console.error('[ROUND_START] Parse error:', e);
                }
            }
            break;

        case 'ROUND_END':
            console.log('[WS] Processing ROUND_END');
            try {
                var endData = JSON.parse(message.content);
                showRoundEnd(endData);
            } catch(e) {
                console.error('[ROUND_END] Parse error:', e);
            }
            break;


        case 'CHAT':
            addChatMessage(message);
            break;
    }
}

function addEventMessage(content) {
    var messageElement = document.createElement('li');
    messageElement.classList.add('event-message');
    messageElement.textContent = content;
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function addChatMessage(message) {
    var messageElement = document.createElement('li');
    messageElement.classList.add('chat-message');

    var avatarElement = document.createElement('i');
    avatarElement.textContent = message.sender[0];
    avatarElement.style.backgroundColor = getAvatarColor(message.sender);

    var usernameElement = document.createElement('span');
    usernameElement.textContent = message.sender;

    var textElement = document.createElement('p');
    textElement.textContent = message.content;

    messageElement.appendChild(avatarElement);
    messageElement.appendChild(usernameElement);
    messageElement.appendChild(textElement);

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

/* ==================== LEADERBOARD ==================== */
function updateLeaderboard() {
    leaderboard.innerHTML = '';

    var sortedPlayers = gameState.players
        .filter(function(p) { return p.status === 'ACTIVE'; })
        .sort(function(a, b) { return b.totalScore - a.totalScore; });

    sortedPlayers.forEach(function(player, index) {
        var li = document.createElement('li');
        li.innerHTML = '<span>' + (index + 1) + '. ' + player.username + '</span><span>' + player.totalScore + '</span>';

        if (player.playerId === playerId) {
            li.style.fontWeight = 'bold';
            li.style.backgroundColor = '#f0f0f0';
        }

        leaderboard.appendChild(li);
    });
}

/* ==================== LEAVE GAME ==================== */
function leaveGame() {
    if (!confirm('Are you sure you want to leave the game?')) {
        return;
    }

    fetch('http://localhost:8081/game/leave?sessionId=' + sessionId + '&playerId=' + playerId, {
        method: 'POST'
    })
    .then(function() {
        if (stompClient) {
            stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
                sender: username,
                type: 'LEAVE',
                sessionId: sessionId,
                playerId: playerId
            }));
            stompClient.disconnect();
        }
        location.reload();
    })
    .catch(function(error) {
        console.error('[LEAVE] Error:', error);
    });
}

/* ==================== CANVAS DRAWING ==================== */
if (canvas) {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

document.querySelectorAll('.tool-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var tool = this.getAttribute('data-tool');
        if (tool) {
            currentTool = tool;
            document.querySelectorAll('.tool-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
        }
    });
});

var colorPicker = document.getElementById('colorPicker');
if (colorPicker) {
    colorPicker.addEventListener('change', function() {
        currentColor = this.value;
        currentTool = 'pen';
    });
}

var brushSizeInput = document.getElementById('brushSize');
if (brushSizeInput) {
    brushSizeInput.addEventListener('input', function() {
        brushSize = this.value;
    });
}

var clearCanvasBtn = document.getElementById('clearCanvas');
if (clearCanvasBtn) {
    clearCanvasBtn.addEventListener('click', function() {
        if (confirm('Clear the entire canvas?')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            broadcastDrawing({ type: 'clear' });
        }
    });
}

function startDrawing(e) {
    if (!gameState.isDrawer) return;
    isDrawing = true;
    var pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
    if (!isDrawing || !gameState.isDrawer) return;

    var pos = getMousePos(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';

    if (currentTool === 'pen') {
        ctx.strokeStyle = currentColor;
        ctx.globalCompositeOperation = 'source-over';
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
    }

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    broadcastDrawing({
        type: 'draw',
        x: pos.x,
        y: pos.y,
        color: currentColor,
        size: brushSize,
        tool: currentTool
    });
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        ctx.beginPath();
    }
}

function getMousePos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function handleTouch(e) {
    e.preventDefault();
    var touch = e.touches[0];
    var mouseEvent = new MouseEvent(
        e.type === 'touchstart' ? 'mousedown' : 'mousemove',
        {
            clientX: touch.clientX,
            clientY: touch.clientY
        }
    );
    canvas.dispatchEvent(mouseEvent);
}

function broadcastDrawing(data) {
    if (stompClient && stompClient.connected) {
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
            type: 'DRAW',
            content: JSON.stringify(data),
            sender: username,
            sessionId: sessionId,
            playerId: playerId
        }));
    }
}

function receiveDrawing(data) {
    if (gameState.isDrawer) return;

    if (data.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (data.type === 'draw') {
        ctx.lineWidth = data.size;
        ctx.lineCap = 'round';

        if (data.tool === 'pen') {
            ctx.strokeStyle = data.color;
            ctx.globalCompositeOperation = 'source-over';
        } else if (data.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        }

        ctx.lineTo(data.x, data.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
    }
}

console.log("=== GAME APPLICATION READY ===");
});