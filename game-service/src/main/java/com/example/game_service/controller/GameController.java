package com.example.game_service.controller;

import com.example.game_service.dto.*;
import com.example.game_service.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/game")
public class GameController {
    private final GameService gameService;
    @Autowired
    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping("/create-session")
    public CreateSessionResponse createSession(@RequestBody CreateSessionRequest request) {
        // Placeholder implementation
        return gameService.createSession(request);
    }

    @GetMapping("/session/{sessionId}")
    public SessionInfoResponse getSession(@PathVariable String sessionId) {
        // Placeholder implementation
        return gameService.getSessionInfo(sessionId);
    }

    @PostMapping("/join-session")
    public JoinSessionResponse joinSession(@RequestBody JoinSessionRequest request) {
        // Placeholder implementation
        return gameService.joinSession(request);
    }

    @PostMapping("/start-round")
    public StartRoundResponse startRound(@RequestBody StartRoundRequest request) {
        // Placeholder implementation
        return gameService.startRound(request);

    }
    @PostMapping("/get-word")
    public GetWordResponse getWord(@RequestBody GetWordRequest request) {
        // Placeholder implementation
        return gameService.getWord(request);
    }
    @PostMapping("/guess")
    public GuessResponse submitGuess(@RequestBody GuessRequest request) {
        // Placeholder implementation
        return gameService.submitGuess(request);
    }

    @PostMapping("/end-round")
    public EndRoundResponse endRound(@RequestParam String sessionId) {
        return gameService.endRound(sessionId);
    }

    @PostMapping("/leave")
    public void leaveSession(@RequestParam String sessionId, @RequestParam String playerId) {
        gameService.removePlayer(sessionId, playerId);
    }
}
