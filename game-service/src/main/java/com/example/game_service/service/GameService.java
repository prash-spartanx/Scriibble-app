package com.example.game_service.service;

import com.example.game_service.client.ChatServiceClient;
import com.example.game_service.dto.*;
import com.example.game_service.model.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Service
public class GameService {
    @Autowired
    private ChatServiceClient chatServiceClient;

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    private final Map<String , GameSession> sessionsById = new ConcurrentHashMap<>();
    private final Map<String , String> roomCodeToSessionId = new ConcurrentHashMap<>();

    private static final List<String> WORD_BANK = List.of(
            "apple", "banana", "cat", "dog", "elephant",
            "flower", "guitar", "house", "island", "jungle",
            "kite", "lion", "mountain", "notebook", "ocean",
            "piano", "queen", "rainbow", "sunflower", "tree",
            "umbrella", "violin", "whale", "xylophone", "yacht", "zebra"
    );

    public CreateSessionResponse createSession(CreateSessionRequest request){
        GameSession session = new GameSession(
                request.getAdminUsername(),
                request.getRoundDuration(),
                request.getMaxRounds()
        );
        sessionsById.put(session.getSessionId(), session);
        roomCodeToSessionId.put(session.getRoomCode(), session.getSessionId());
        return new CreateSessionResponse(
                session.getSessionId(),
                session.getRoomCode(),
                session.getAdminPlayerId(),
                "Game session created successfully. Share Room Code: " + session.getRoomCode()
        );
    }

    public JoinSessionResponse joinSession(JoinSessionRequest request){
        String sessionId = roomCodeToSessionId.get(request.getRoomCode());
        if(sessionId == null){
            return new JoinSessionResponse(
                    null,
                    null,
                    "Invalid Room Code.",
                    null
            );
        }
        GameSession session = sessionsById.get(sessionId);
        Player player = session.addPlayer(request.getUsername());
        return new JoinSessionResponse(
                session.getSessionId(),
                player.getPlayerId(),
                "Joined session successfully.",
                player
        );
    }

    public SessionInfoResponse getSessionInfo(String sessionId) {
        GameSession session = sessionsById.get(sessionId);
        if (session == null) {
            throw new RuntimeException("Session not found.");
        }
        Player currentDrawer = session.getCurrentDrawer();
        String currentDrawerUsername = currentDrawer != null ? currentDrawer.getUsername() : null;
        return new SessionInfoResponse(
                session.getSessionId(),
                session.getRoomCode(),
                session.getStatus(),
                session.getPlayers(),
                session.getCurrentRoundNumber(),
                session.getMaxRounds(),
                currentDrawerUsername
        );
    }

    public synchronized StartRoundResponse startRound(StartRoundRequest request){
        GameSession session = sessionsById.get(request.getSessionId());
        if(session == null) {
            throw new RuntimeException("Session not found.");
        }
        if(!session.getAdminPlayerId().equals(request.getRequesterId())){
            throw new RuntimeException("Only admin can start the round.");
        }
        if(session.isGameComplete()){
            throw new RuntimeException("Game is already complete.");
        }
        List<Player> activePlayers = session.getActivePlayers();
        if(activePlayers.size() <2) {
            throw new RuntimeException("Not enough players to start the round.");
        }
        Round currentRound = session.getCurrentRound();
        if(currentRound != null && currentRound.getStatus() == RoundStatus.ACTIVE){
            currentRound.setStatus(RoundStatus.COMPLETED);
        }
        Player drawer = session.getCurrentDrawer();
        String wordToDraw = WORD_BANK.get(new Random().nextInt(WORD_BANK.size()));
        Round newRound = new Round(
                session.getCurrentRoundNumber(),
                wordToDraw,
                drawer.getPlayerId(),
                drawer.getUsername(),
                session.getRoundDuration()
        );
        session.getRounds().add(newRound);
        session.setStatus(GameStatus.IN_PROGRESS);
        session.updateAllDrawerStatus(drawer.getPlayerId());

        scheduler.schedule(() -> safeEndRound(session.getSessionId()),
                session.getRoundDuration(), TimeUnit.SECONDS);

         StartRoundResponse response = new  StartRoundResponse(
                newRound.getRoundId(),
                newRound.getRoundNumber(),
                newRound.getDrawerId(),
                newRound.getDrawerUsername(),
                session.getRoundDuration(),
                "Turn " + newRound.getRoundNumber() + " started. " + drawer.getUsername() + " is drawing.",
                newRound.getEndTime()
        );
        chatServiceClient.broadcastRoundStart(request.getSessionId(), response);
        return response;

    }

    private synchronized void safeEndRound(String sessionId) {
        GameSession session = sessionsById.get(sessionId);
        if (session == null) return;
        Round currentRound = session.getCurrentRound();
        if (currentRound == null || currentRound.getStatus() != RoundStatus.ACTIVE) return;
        endRound(sessionId);
    }

    public synchronized EndRoundResponse endRound(String sessionId) {
        GameSession session = sessionsById.get(sessionId);
        if (session == null) {
            throw new RuntimeException("Session not found.");
        }

        Round currentRound = session.getCurrentRound();
        if (currentRound == null || currentRound.getStatus() != RoundStatus.ACTIVE) {
            throw new RuntimeException("No active round to end.");
        }

        currentRound.setStatus(RoundStatus.COMPLETED);
        session.setStatus(GameStatus.ROUND_END);

        List<Player> leaderboard = session.getPlayers().stream()
                .sorted((p1, p2) -> Integer.compare(p2.getTotalScore(), p1.getTotalScore()))
                .collect(Collectors.toList());

        String nextDrawerUsername = null;

        List<Player> activePlayers = session.getActivePlayers();
        if (!activePlayers.isEmpty()) {
            Player nextDrawer = session.getNextDrawer();
            nextDrawerUsername = nextDrawer.getUsername();

            session.setCurrentTurnInRound(session.getCurrentTurnInRound() + 1);

            if (session.getCurrentTurnInRound() >= activePlayers.size()) {
                session.setCurrentTurnInRound(0);
                session.setCurrentRoundNumber(session.getCurrentRoundNumber() + 1);
            }
        }

        boolean isGameComplete = session.isGameComplete();

        if (isGameComplete) {
            session.setStatus(GameStatus.ENDED);
        } else {
            session.setStatus(GameStatus.WAITING);
            scheduler.schedule(() -> {
                try {
                    GameSession s = sessionsById.get(sessionId);
                    if (s == null) return;
                    if (s.getActivePlayers().size() < 2) {
                        s.setStatus(GameStatus.WAITING);
                        return;
                    }
                    if (s.isGameComplete()) {
                        s.setStatus(GameStatus.ENDED);
                        return;
                    }
                    StartRoundRequest autoReq = new StartRoundRequest(
                            s.getSessionId(),
                            s.getAdminPlayerId()
                    );
                    startRound(autoReq);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }, 5, TimeUnit.SECONDS);
        }

        EndRoundResponse response = new  EndRoundResponse(
                "Turn ended!",
                currentRound.getWord(),
                leaderboard,
                isGameComplete,
                isGameComplete ? null : nextDrawerUsername
        );
        chatServiceClient.broadcastRoundEnd(sessionId, response);
        return response;

    }

    public GetWordResponse getWord(GetWordRequest request){
        GameSession session = sessionsById.get(request.getSessionId());
        if(session == null) {
            throw new RuntimeException("Session not found.");
        }
        Round currentRound = session.getCurrentRound();
        if(currentRound == null || currentRound.getStatus() != RoundStatus.ACTIVE){
            throw new RuntimeException("No active round found.");
        }
        if(!currentRound.getDrawerId().equals(request.getPlayerId())){
            throw new RuntimeException("Only the drawer can request the word.");
        }
        return new GetWordResponse(
                currentRound.getWord(),
                "Draw the word: " + currentRound.getWord()
        );
    }

    public GuessResponse submitGuess(GuessRequest request){
        GameSession session = sessionsById.get(request.getSessionId());
        if(session == null) {
            return new GuessResponse(
                    request.getPlayerId(),
                    "UNKNOWN",
                    GuessStatus.ROUND_OVER,
                    0,
                    0,
                    "Session not found."
            );
        }

        Round currentRound = session.getCurrentRound();
        if (currentRound == null || currentRound.getStatus() != RoundStatus.ACTIVE) {
            return new GuessResponse(
                    request.getPlayerId(),
                    "UNKNOWN",
                    GuessStatus.ROUND_OVER,
                    0,
                    0,
                    "No active round found."
            );
        }

        if (currentRound.isExpired()) {
            safeEndRound(session.getSessionId());
            return new GuessResponse(
                    request.getPlayerId(),
                    "UNKNOWN",
                    GuessStatus.ROUND_OVER,
                    0,
                    0,
                    "Round is over."
            );
        }

        Player player = session.getPlayerById(request.getPlayerId());
        if (player == null || player.getStatus() != PlayerStatus.ACTIVE) {
            return new GuessResponse(
                    "NULL",
                    "UNKNOWN",
                    GuessStatus.ROUND_OVER,
                    0,
                    0,
                    "Player not found or not active."
            );
        }

        if (currentRound.getDrawerId().equals(request.getPlayerId())) {
            return new GuessResponse(
                    request.getPlayerId(),
                    player.getUsername(),
                    GuessStatus.INCORRECT,
                    0,
                    player.getTotalScore(),
                    "Drawers cannot make guesses."
            );
        }

        GuessResult existingResult = currentRound.getGuessResults().get(request.getPlayerId());
        if (existingResult != null && existingResult.getStatus() == GuessStatus.CORRECT) {
            return new GuessResponse(
                    request.getPlayerId(),
                    player.getUsername(),
                    GuessStatus.CORRECT,
                    0,
                    player.getTotalScore(),
                    "You have already guessed correctly."
            );
        }

        String guess = request.getGuess().trim().toLowerCase();
        String correctWord = currentRound.getWord().toLowerCase();

        GuessStatus guessStatus;
        int pointsAwarded = 0;
        String message;
        if (guess.equals(correctWord)) {
            guessStatus = GuessStatus.CORRECT;
            long timeLeft = currentRound.getRemainingTime();
            pointsAwarded = (int) (100 + timeLeft * 10);
            player.setTotalScore(player.getTotalScore() + pointsAwarded);
            message = "Correct! You earned " + pointsAwarded + " points.";

            GuessResult guessResult = new GuessResult(
                    player.getPlayerId(),
                    player.getUsername(),
                    guessStatus,
                    pointsAwarded,
                    System.currentTimeMillis()
            );
            currentRound.getGuessResults().put(player.getPlayerId(), guessResult);

            boolean allGuessed = session.getActivePlayers().stream()
                    .filter(p -> !p.getPlayerId().equals(currentRound.getDrawerId()))
                    .allMatch(p -> {
                        GuessResult gr = currentRound.getGuessResults().get(p.getPlayerId());
                        return gr != null && gr.getStatus() == GuessStatus.CORRECT;
                    });

            if (allGuessed) {
                scheduler.schedule(() -> safeEndRound(session.getSessionId()), 700, TimeUnit.MILLISECONDS);
            }

            return new GuessResponse(
                    player.getPlayerId(),
                    player.getUsername(),
                    guessStatus,
                    pointsAwarded,
                    player.getTotalScore(),
                    message
            );

        } else if (isClose(guess, correctWord)) {
            guessStatus = GuessStatus.CLOSE;
            message = "Close guess! Try again.";
        } else {
            guessStatus = GuessStatus.INCORRECT;
            message = "Incorrect guess. Try again.";
        }

        GuessResult guessResult = new GuessResult(
                player.getPlayerId(),
                player.getUsername(),
                guessStatus,
                pointsAwarded,
                System.currentTimeMillis()
        );

        currentRound.getGuessResults().put(player.getPlayerId(), guessResult);

        return new GuessResponse(
                player.getPlayerId(),
                player.getUsername(),
                guessStatus,
                pointsAwarded,
                player.getTotalScore(),
                message
        );
    }

    public boolean isClose(String Guess, String Word) {
        if (Math.abs(Guess.length() - Word.length()) > 1) {
            return false;
        }
        int matches = 0;
        int minLength = Math.min(Guess.length(), Word.length());
        for (int i = 0; i < minLength; i++) {
            if (Guess.charAt(i) == Word.charAt(i)) {
                matches++;
            }
        }
        return matches >= minLength - 1;
    }

    public void removePlayer(String sessionId, String playerId) {
        GameSession session = sessionsById.get(sessionId);
        if (session != null) {
            session.removePlayer(playerId);
        }
    }
}
