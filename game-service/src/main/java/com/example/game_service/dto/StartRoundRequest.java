package com.example.game_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StartRoundRequest {

    private String sessionId;
    private String requesterId; // admin player id

}
