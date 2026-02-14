package com.example.game_service.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Round {
    private Set<Integer> revealedIndexes = ConcurrentHashMap.newKeySet();

    private String roundId;
    private int roundNumber;
    private String word;
    private String drawerId;
    private String drawerUsername;
    private long startTime;
    private long endTime;
    private Map<String , GuessResult> guessResults;
    private RoundStatus status;

    public Round(int roundNumber, String word, String drawerId, String drawerUsername, long duration) {
        this.roundId = java.util.UUID.randomUUID().toString();
        this.roundNumber = roundNumber;
        this.word = word;
        this.drawerId = drawerId;
        this.drawerUsername = drawerUsername;
        this.startTime = System.currentTimeMillis();
        this.endTime = System.currentTimeMillis() + (duration * 1000L);
        this.guessResults = new HashMap<>();
        this.status = RoundStatus.ACTIVE;
    }
    public boolean isExpired() {
        return System.currentTimeMillis() >= this.endTime;
    }
    public long getRemainingTime() {
        long remaining = (endTime - System.currentTimeMillis())/1000;
        return Math.max(remaining, 0);
    }
    public String getMaskedWord() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < word.length(); i++) {
            if (revealedIndexes.contains(i)) sb.append(word.charAt(i));
            else sb.append("-");
        }
        return sb.toString();
    }

}
