package com.example.game_service.dto;

import com.example.game_service.model.Player;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JoinSessionResponse {
    private String sessionId;
    private String playerId;
    private String message;
    private Player player;
}
