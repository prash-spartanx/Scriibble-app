package com.example.game_service.client;

import com.example.game_service.dto.EndRoundResponse;
import com.example.game_service.dto.StartRoundResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class ChatServiceClient {

    @Value("${chat.service.url}")
    private String chatServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public void broadcastRoundStart(String sessionId, StartRoundResponse response) {
        Map<String, Object> payload = Map.of(
                "sessionId", sessionId,
                "data", response
        );

        restTemplate.postForObject(
                chatServiceUrl + "/internal/broadcast/round-start",
                payload,
                Void.class
        );
    }

    public void broadcastRoundEnd(String sessionId, EndRoundResponse response) {
        Map<String, Object> payload = Map.of(
                "sessionId", sessionId,
                "data", response
        );

        restTemplate.postForObject(
                chatServiceUrl + "/internal/broadcast/round-end",
                payload,
                Void.class
        );
    }
}

