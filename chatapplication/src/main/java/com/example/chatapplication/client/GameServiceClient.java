package com.example.chatapplication.client;

import com.example.chatapplication.dto.GuessRequest;
import com.example.chatapplication.dto.GuessResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class GameServiceClient {
    private final RestTemplate restTemplate = new RestTemplate();

    // Spring will inject the value from application.properties here
    @Value("${game.service.url}")
    private String GAME_SERVICE_URL;

    public GuessResponse submitGuess(GuessRequest request) {
        return restTemplate.postForObject(GAME_SERVICE_URL + "/guess", request, GuessResponse.class);
    }
}