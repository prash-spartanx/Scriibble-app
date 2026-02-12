package com.example.game_service.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GuessResult {
    private String playerId;
    private String username;
    private GuessStatus status;
    private int scoreEarned;
    private long guessTime;
}
