package com.example.game_service.dto;

import com.example.game_service.model.GuessStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GuessResponse {
    private String playerId;
    private String username;
    private GuessStatus status;
    private int scoreDelta;
    private int totalScore;
    private String message;

}
