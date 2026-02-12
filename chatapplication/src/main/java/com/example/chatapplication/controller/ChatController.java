package com.example.chatapplication.controller;

import com.example.chatapplication.client.GameServiceClient;
import com.example.chatapplication.dto.GuessRequest;
import com.example.chatapplication.dto.GuessResponse;
import com.example.chatapplication.model.ChatMessage;
import com.example.chatapplication.model.MessageType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {
    private final GameServiceClient gameServiceClient;
    @Autowired
    public ChatController(GameServiceClient gameServiceClient) {
        this.gameServiceClient = gameServiceClient;
    }

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage message) {
        if (message.getType() == MessageType.GUESS) {
            GuessRequest request = new GuessRequest();
            request.setSessionId(message.getSessionId());
            request.setPlayerId(message.getPlayerId());
            request.setGuess(message.getContent());

            GuessResponse response = gameServiceClient.submitGuess(request);

            ChatMessage event = new ChatMessage();
            event.setType(MessageType.EVENT);
            event.setSessionId(message.getSessionId());
            event.setSender("SYSTEM");

            String eventMessage = response.getUsername() + ": " + response.getMessage();
            if (response.getScoreDelta() > 0) {
                eventMessage += " (Total: " + response.getTotalScore() + ")";
            }
            event.setContent(eventMessage);

            return event;
        } else if (message.getType() == MessageType.DRAW) {  // ADD THIS BLOCK
            // Just broadcast drawing data to all clients
            return message;
        }
        return message;
    }
    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage chatMessage , SimpMessageHeaderAccessor headerAccessor) {
        // Logic to add user
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        headerAccessor.getSessionAttributes().put("sessionId", chatMessage.getSessionId());
        headerAccessor.getSessionAttributes().put("playerId", chatMessage.getPlayerId());
        return chatMessage;
    }
}
