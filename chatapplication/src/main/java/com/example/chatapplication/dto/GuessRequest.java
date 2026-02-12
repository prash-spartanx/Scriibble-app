package com.example.chatapplication.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GuessRequest {
    private String sessionId;
    private String playerId;
    private String guess;
}
