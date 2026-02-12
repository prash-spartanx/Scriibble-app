'use strict';
console.log("MAIN.JS LOADED - NEW VERSION");

// page elements
var usernamePage = document.querySelector('#username-page');
var lobbyPage = document.querySelector('#lobby-page');
var chatPage = document.querySelector('#chat-page');
var roundEndPage = document.querySelector('#round-end-page');

// Form elements
var usernameForm = document.querySelector('#usernameForm');
var usernameInput = document.querySelector('#username');
var roomCodeInput = document.querySelector('#roomCode');
var joinRoomBtn = document.querySelector('#joinRoomBtn');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');

// Lobby elements
var displayRoomCode = document.querySelector('#lobbyRoomCode');
var playersList = document.querySelector('#playersList');
var playerCount = document.querySelector('#playerCount');
var startGameBtn = document.querySelector('#startGameBtn');
var waitingMessage = document.querySelector('#waitingMessage');

// Game elements
var currentRoundSpan = document.querySelector('#currentRound');
var maxRoundsSpan = document.querySelector('#maxRounds');
var currentDrawerSpan = document.querySelector('#currentDrawer');
var wordDisplay = document.querySelector('#wordDisplay');
var wordText = document.querySelector('#wordText');
var timeRemaining = document.querySelector('#timeRemaining');
var leaderboard = document.querySelector('#leaderboard');
var leaveGameBtn = document.querySelector('#leaveGameBtn');

// Round end elements
var revealedWord = document.querySelector('#revealedWord');
var roundEndLeaderboard = document.querySelector('#roundEndLeaderboard');
var nextDrawer = document.querySelector('#nextDrawer');
var nextRoundBtn = document.querySelector('#nextRoundBtn');
var nextRoundInfo = document.querySelector('#nextRoundInfo');
var waitingNextRound = document.querySelector('#waitingNextRound');

// Game state
var stompClient = null;
var username = null;
var sessionId = null;
var playerId = null;
var roomCode = null;
var isAdmin = false;
var gameState = {
    currentRound: 0,
    maxRounds: 5,
    isDrawer: false,
    players: []
};

var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

// Event listeners
usernameForm.addEventListener('submit', createRoom, true);
joinRoomBtn.addEventListener('click', joinRoom, true);
messageForm.addEventListener('submit', sendMessage, true);
startGameBtn.addEventListener('click', startGame, true);
nextRoundBtn.addEventListener('click', startNextRound, true);
leaveGameBtn.addEventListener('click', leaveGame, true);

function createRoom(event) {
    event.preventDefault();

    username = usernameInput.value.trim();
    if (!username) return;

    fetch('http://localhost:8081/game/create-session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            adminUsername: username,
            roundDuration: 60,
            maxRounds: 5
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Create room response:", data);

        sessionId = data.sessionId;
        roomCode = data.roomCode;
        playerId = data.adminPlayerId;
        isAdmin = true;

        connectWebSocket();
        showLobby();
    })
    .catch(error => {
        console.error('Error creating room:', error);
        alert('Failed to create room.');
    });
}

// join an existing room
function joinRoom() {
    username = usernameInput.value.trim();
    var code = roomCodeInput.value.trim().toUpperCase();

    if (!username || !code) return;

    fetch('http://localhost:8081/game/join-session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            username: username,
            roomCode: code
        })
    })
    .then(response => response.json())
    .then(data => {
        sessionId = data.sessionId;
        roomCode = code;
        playerId = data.playerId;
        isAdmin = false;
        connectWebSocket();
        showLobby();
    })
    .catch(error => {
        console.error('Error joining room:', error);
        alert('Failed to join room. Please check the code and try again.');
    });
}

// connect to websocket
function connectWebSocket() {
    var socket = new SockJS('http://localhost:8080/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
}

function onConnected() {
    stompClient.subscribe('/topic/public', onMessageReceived);
    stompClient.send("/app/chat.addUser", {}, JSON.stringify({
        sender: username,
        type: 'JOIN',
        sessionId: sessionId,
        playerId: playerId
    }));

    // Fetch initial session info
    fetchSessionInfo();
}

function onError(error) {
    console.error('WebSocket connection error:', error);
    alert('Could not connect to WebSocket server. Please refresh the page and try again.');
}

function showLobby(){
    usernamePage.classList.add('hidden');
    lobbyPage.classList.remove('hidden');
    displayRoomCode.textContent = roomCode;

    if(isAdmin) {
        startGameBtn.classList.remove('hidden');
        waitingMessage.classList.add('hidden');
    } else {
        startGameBtn.classList.add('hidden');
        waitingMessage.classList.remove('hidden');
    }
}

// Fetch session information
function fetchSessionInfo() {
    fetch('http://localhost:8081/game/session/' + sessionId)
        .then(response => response.json())
        .then(data => {
            gameState.players = data.players;
            gameState.currentRound = data.currentRoundNumber;
            gameState.maxRounds = data.maxRounds;
            updatePlayersList();
            updateLeaderboard();
        })
        .catch(error => console.error('Error fetching session info:', error));
}

// update players list in lobby
function updatePlayersList() {
    playersList.innerHTML = '';
    var activePlayers = gameState.players.filter(p => p.isActive);
    playerCount.textContent = activePlayers.length;
    activePlayers.forEach(player => {
        var li = document.createElement('li');
        li.textContent = player.username;
        if(player.id === playerId) {
            li.style.fontWeight = 'bold';
            li.textContent += ' (You)';
        }
        playersList.appendChild(li);
    });
}

// Start the game
function startGame() {
    fetch('http://localhost:8081/game/start-round', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            sessionId: sessionId,
            requesterId: playerId
        })
    })
    .then(response => response.json())
    .then(data => {
        // Broadcast round start to all players
        var roundStartMsg = {
            type: 'ROUND_START',
            content: data.message,
            sender: 'SYSTEM',
            sessionId: sessionId,
            playerId: playerId
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(roundStartMsg));

        startRound(data);
    })
    .catch(error => {
        console.error('Error starting game:', error);
        alert('Failed to start game: ' + error.message);
    });
}

// Start round
function startRound(data) {
    lobbyPage.classList.add('hidden');
    roundEndPage.classList.add('hidden');
    chatPage.classList.remove('hidden');

    gameState.currentRound = data.roundNumber;
    currentRoundSpan.textContent = data.roundNumber;
    maxRoundsSpan.textContent = gameState.maxRounds;
    currentDrawerSpan.textContent = data.drawerUsername;

    // Clear canvas for new round
    var canvas = document.getElementById('drawingCanvas');
    var ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Check if current user is the drawer
    gameState.isDrawer = (playerId === data.drawerId);

    var canvasContainer = document.getElementById('canvasContainer');
    var drawingTools = document.getElementById('drawingTools');

    if (gameState.isDrawer) {
        // Drawer can draw
        if (canvasContainer) canvasContainer.classList.remove('disabled');
        if (drawingTools) drawingTools.style.display = 'flex';

        // Fetch the word for the drawer
        fetch('http://localhost:8081/game/get-word', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sessionId: sessionId,
                playerId: playerId
            })
        })
        .then(response => response.json())
        .then(wordData => {
            wordText.textContent = wordData.word;
            wordDisplay.classList.remove('hidden');
        })
        .catch(error => console.error('Error fetching word:', error));
    } else {
        // Non-drawer cannot draw
        if (canvasContainer) canvasContainer.classList.add('disabled');
        if (drawingTools) drawingTools.style.display = 'none';
        wordDisplay.classList.add('hidden');
    }

    // Start timer
    startTimer(data.roundDuration);

    // Refresh session info
    fetchSessionInfo();
}

// Start round timer
var timerInterval;
function startTimer(duration) {
    var remaining = duration;
    timeRemaining.textContent = remaining;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remaining--;
        timeRemaining.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(timerInterval);
            endRound();
        }
    }, 1000);
}

// End round
function endRound() {
    if (!isAdmin) return;

    fetch('http://localhost:8081/game/end-round?sessionId=' + sessionId, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        var roundEndMsg = {
            type: 'ROUND_END',
            content: JSON.stringify(data),
            sender: 'SYSTEM',
            sessionId: sessionId,
            playerId: playerId
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(roundEndMsg));

        showRoundEnd(data);
    })
    .catch(error => console.error('Error ending round:', error));
}

// show round end screen
function showRoundEnd(data) {
    chatPage.classList.add('hidden');
    roundEndPage.classList.remove('hidden');

    revealedWord.textContent = data.revealedWord;

    // update leaderboard
    roundEndLeaderboard.innerHTML = '';
    data.leaderboard.forEach((player, index) => {
        var li = document.createElement('li');
        li.innerHTML = `<span>${index + 1}. ${player.username}</span><span>${player.totalScore} pts</span>`;
        roundEndLeaderboard.appendChild(li);
    });

    if(data.isGameComplete) {
        nextRoundInfo.classList.add('hidden');
        nextRoundBtn.classList.add('hidden');
        waitingNextRound.textContent = 'Game Over! Thanks for playing.';
        waitingNextRound.classList.remove('hidden');
    } else {
        nextDrawer.textContent = data.nextDrawerUsername;
        nextRoundInfo.classList.remove('hidden');
        if(isAdmin) {
            nextRoundBtn.classList.remove('hidden');
            waitingNextRound.classList.add('hidden');
        } else {
            nextRoundBtn.classList.add('hidden');
            waitingNextRound.textContent = 'Waiting for admin to start next round...';
            waitingNextRound.classList.remove('hidden');
        }
        fetchSessionInfo();
    }
}

function sendMessage(event) {
    event.preventDefault();
    var messageContent = messageInput.value.trim();

    if(gameState.isDrawer) {
        alert('You cannot send messages while drawing!');
        messageInput.value = '';
        return;
    }

    if(messageContent && stompClient) {
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

function startNextRound() {
    startGame();
}

// Handle incoming messages
function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);

    if (message.type === 'JOIN') {
        addEventMessage(message.sender + ' joined!');
        fetchSessionInfo();
    } else if (message.type === 'LEAVE') {
        addEventMessage(message.sender + ' left!');
        fetchSessionInfo();
    } else if (message.type === 'EVENT') {
        addEventMessage(message.content);
        fetchSessionInfo();
    } else if (message.type === 'DRAW') {
        var drawData = JSON.parse(message.content);
        receiveDrawing(drawData);
    } else if (message.type === 'ROUND_START') {
        // Handle round start from other player
        fetch('http://localhost:8081/game/session/' + sessionId)
            .then(response => response.json())
            .then(data => {
                var currentRound = data.currentRoundNumber;
                fetch('http://localhost:8081/game/start-round', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        sessionId: sessionId,
                        requesterId: playerId
                    })
                })
                .then(response => response.json())
                .then(roundData => {
                    if (message.playerId !== playerId) {
                        startRound(roundData);
                    }
                })
                .catch(error => {
                    // Round already started, just fetch info
                    console.log('Round already started');
                });
            });
    } else if (message.type === 'ROUND_END') {
        var endData = JSON.parse(message.content);
        if (message.playerId !== playerId) {
            showRoundEnd(endData);
        }
    } else if (message.type === 'CHAT') {
        addChatMessage(message);
    }
}

// Add event message
function addEventMessage(content) {
    var messageElement = document.createElement('li');
    messageElement.classList.add('event-message');
    messageElement.textContent = content;
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// Add chat message
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

// Update leaderboard
function updateLeaderboard() {
    leaderboard.innerHTML = '';
    var sortedPlayers = gameState.players
        .filter(p => p.status === 'ACTIVE')
        .sort((a, b) => b.totalScore - a.totalScore);

    sortedPlayers.forEach((player, index) => {
        var li = document.createElement('li');
        li.innerHTML = `<span>${index + 1}. ${player.username}</span><span>${player.totalScore}</span>`;
        if (player.id === playerId) {
            li.style.fontWeight = 'bold';
            li.style.backgroundColor = '#f0f0f0';
        }
        leaderboard.appendChild(li);
    });
}

// Leave game
function leaveGame() {
    if (confirm('Are you sure you want to leave the game?')) {
        fetch('http://localhost:8081/game/leave?sessionId=' + sessionId + '&playerId=' + playerId, {
            method: 'POST'
        })
        .then(() => {
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
        .catch(error => console.error('Error leaving game:', error));
    }
}

// Get avatar color
function getAvatarColor(messageSender) {
    var hash = 0;
    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    var index = Math.abs(hash % colors.length);
    return colors[index];
}

// Canvas drawing variables
var canvas = document.getElementById('drawingCanvas');
var ctx = canvas ? canvas.getContext('2d') : null;
var isDrawing = false;
var currentTool = 'pen';
var currentColor = '#000000';
var brushSize = 3;

// Canvas event listeners
if (canvas) {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

// Tool buttons
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        var tool = this.getAttribute('data-tool');
        if (tool) {
            currentTool = tool;
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
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
            // Broadcast clear to other players
            broadcastDrawing({
                type: 'clear'
            });
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

    // Broadcast drawing to other players
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
    var mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function broadcastDrawing(data) {
    if (stompClient && stompClient.connected) {
        var drawMessage = {
            type: 'DRAW',
            content: JSON.stringify(data),
            sender: username,
            sessionId: sessionId,
            playerId: playerId
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(drawMessage));
    }
}

function receiveDrawing(data) {
    if (gameState.isDrawer) return; // Don't draw your own strokes

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