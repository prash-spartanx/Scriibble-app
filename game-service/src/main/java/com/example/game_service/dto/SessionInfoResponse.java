package com.example.game_service.dto;

import com.example.game_service.model.GameStatus;
import com.example.game_service.model.Player;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SessionInfoResponse {
    private String sessionId;
    private String roomCode;
    private GameStatus status;
    private List<Player> players;
    private int currentRoundNumber;
    private int maxRounds;
    private String currentDrawerUsername;

}
