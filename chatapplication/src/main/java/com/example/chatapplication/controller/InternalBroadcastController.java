package com.example.chatapplication.controller;
import com.example.chatapplication.dto.EndRoundResponse;
import com.example.chatapplication.dto.StartRoundResponse;
import com.example.chatapplication.model.ChatMessage;
import com.example.chatapplication.model.MessageType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

@RestController
public class InternalBroadcastController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public InternalBroadcastController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/internal/broadcast/round-end")
    public void broadcastRoundEnd(@RequestBody Map<String, Object> payload) throws Exception {
        Object data = payload.get("data");

        // ADD THESE LINES:
        System.out.println("=== ROUND END DEBUG ===");
        System.out.println("Raw data object: " + data);
        System.out.println("Data class: " + data.getClass().getName());

        String json = objectMapper.writeValueAsString(data);

        // ADD THIS LINE:
        System.out.println("Serialized JSON: " + json);

        ChatMessage msg = new ChatMessage();
        msg.setType(MessageType.ROUND_END);
        msg.setContent(json);
        msg.setSender("SYSTEM");

        messagingTemplate.convertAndSend("/topic/public", msg);
    }

    @PostMapping("/internal/broadcast/hint")
    public void broadcastHint(@RequestBody Map<String, Object> payload) throws Exception {
        Object data = payload.get("data");
        String json = objectMapper.writeValueAsString(data);

        ChatMessage msg = new ChatMessage();
        msg.setType(MessageType.HINT_UPDATE);
        msg.setContent(json);
        msg.setSender("SYSTEM");

        messagingTemplate.convertAndSend("/topic/public", msg);
    }


    @PostMapping("/internal/broadcast/round-start")
    public void broadcastRoundStart(@RequestBody Map<String, Object> payload) throws Exception {
        Object data = payload.get("data");

        String json = objectMapper.writeValueAsString(data);

        ChatMessage msg = new ChatMessage();
        msg.setType(MessageType.ROUND_START);
        msg.setContent(json);   // ✅ now String
        msg.setSender("SYSTEM");

        messagingTemplate.convertAndSend("/topic/public", msg);
    }
}

