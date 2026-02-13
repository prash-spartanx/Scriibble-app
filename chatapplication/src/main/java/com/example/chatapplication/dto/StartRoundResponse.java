package com.example.chatapplication.dto;
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
}