package com.example.game_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSessionRequest {
    private String adminUsername;
    private int roundDuration;
    private int maxRounds;
}
