package com.example.game_service.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Player {
    private String playerId;
    private String username;
    private int totalScore;
    private PlayerStatus status;
    private boolean isCurrentDrawer;

    public Player(String username) {
        this.playerId = java.util.UUID.randomUUID().toString();
        this.username = username;
        this.totalScore = 0;
        this.status = PlayerStatus.ACTIVE;
        this.isCurrentDrawer = false;
    }
}
