package com.example.game_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StartRoundResponse {
    private String roundId;
    private int roundNumber;
    private String drawerId;
    private String drawerUsername;
    private long roundDuration;
    private String message;
    private long roundEndsAt;
    private String maskedWord;  // Add this for non-drawers

    // Add endTime as alias for roundEndsAt for backward compatibility
    public long getEndTime() {
        return this.roundEndsAt;
    }

    public void setEndTime(long endTime) {
        this.roundEndsAt = endTime;
    }
}