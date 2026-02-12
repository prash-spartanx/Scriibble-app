package com.example.game_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSessionResponse {
    private String sessionId;
    private String roomCode;
    private String adminPlayerId;
    private String message;

}
