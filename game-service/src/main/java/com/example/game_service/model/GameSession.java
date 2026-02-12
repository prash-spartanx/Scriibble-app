package com.example.game_service.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameSession {
    private String sessionId;
    private String roomCode;
    private String adminPlayerId;
    private List<Player> players;
    private List<Round> rounds;
    private GameStatus status;
    private int currentDrawerIndex;
    private int currentRoundNumber;
    private int roundDuration;
    private int maxRounds;
    private long createdAt;

    public GameSession(String adminUsername, int roundDuration, int maxRounds) {
        this.sessionId = java.util.UUID.randomUUID().toString();
        this.roomCode = generateRoomCode();
        this.players = new ArrayList<>();
        this.rounds = new java.util.ArrayList<>();
        this.status = GameStatus.WAITING;
        this.currentDrawerIndex = 0;
        this.currentRoundNumber = 0;
        this.roundDuration = roundDuration;
        this.maxRounds = maxRounds;
        this.createdAt = System.currentTimeMillis();

        Player admin = new Player((adminUsername));
        this.adminPlayerId = admin.getPlayerId();
        this.players.add(admin);
    }
    public Player addPlayer(String username) {
        boolean exist = players.stream().anyMatch(p -> p.getUsername().equalsIgnoreCase(username) && p.getStatus() == PlayerStatus.ACTIVE);
        if (exist) {
            throw new RuntimeException("Username already taken in this session.");
        }
        Player player = new Player(username);
        players.add(player);
        return player;

    }
    public void  removePlayer(String playerId) {
        players.stream()
                .filter(p -> p.getPlayerId().equals(playerId))
                .findFirst()
                .ifPresent(p -> p.setStatus(PlayerStatus.LEFT));
        List<Player> activePlayers = getActivePlayers();
        if(currentDrawerIndex >= activePlayers.size() && !activePlayers.isEmpty()) {
            currentDrawerIndex = 0;
        }
    }
    public Player getCurrentDrawer(){
        List<Player> activePlayers = getActivePlayers();
        if(activePlayers.isEmpty()){
            return null;
        }
        if(currentDrawerIndex >= activePlayers.size()){
            currentDrawerIndex = 0;
        }
        return activePlayers.get(currentDrawerIndex);
    }

    public String generateRoomCode(){
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder roomCode = new StringBuilder();
        java.util.Random random = new java.util.Random();
        for(int i=0; i<6; i++){
            roomCode.append(characters.charAt(random.nextInt(characters.length())));
        }
        return roomCode.toString();
    }

    public Player getNextDrawer(){
        List<Player> activePlayers = getActivePlayers();
        if(activePlayers.isEmpty()){
            return null;
        }
        currentDrawerIndex = (currentDrawerIndex + 1) % activePlayers.size();
        return activePlayers.get(currentDrawerIndex);
    }

    public List<Player> getActivePlayers(){
        List<Player> activePlayers = new ArrayList<>();
        for(Player p : players){
            if(p.getStatus() == PlayerStatus.ACTIVE){
                activePlayers.add(p);
            }
        }
        return activePlayers;
    }

    public Player getPlayerById(String playerId){
        return players.stream()
                .filter(p->p.getPlayerId().equals(playerId))
                .findFirst()
                .orElse(null);
    }
    public Player getPlayerByUsername(String username){
        return players.stream()
                .filter(p->p.getUsername().equals(username))
                .findFirst()
                .orElse(null);
    }
    public Round getCurrentRound(){
        if(rounds.isEmpty()){
            return null;
        }
        return rounds.get(rounds.size() - 1);
    }
    public boolean isGameComplete(){
        return currentRoundNumber >= maxRounds;
    }

    public void updateAllDrawerStatus(String currentDrawerId){
        for(Player p : players){
            p.setCurrentDrawer(p.getPlayerId().equals(currentDrawerId));
        }

    }



}
