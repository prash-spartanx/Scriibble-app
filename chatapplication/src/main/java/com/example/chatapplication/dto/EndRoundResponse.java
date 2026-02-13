package com.example.chatapplication.dto;

import com.example.chatapplication.model.Player;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EndRoundResponse {
    private String message;
    private String correctWord;
    private List<Player> leaderboard;
    private boolean isGameComplete;
    private String nextDrawerUsername;
}