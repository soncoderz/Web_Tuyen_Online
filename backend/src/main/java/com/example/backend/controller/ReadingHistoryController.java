package com.example.backend.controller;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.example.backend.model.ReadingHistory;
import com.example.backend.repository.ReadingHistoryRepository;
import com.example.backend.security.services.UserDetailsImpl;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/reading-history")
public class ReadingHistoryController {

    @Autowired
    ReadingHistoryRepository readingHistoryRepository;

    @GetMapping
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<ReadingHistory>> getMyHistory() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(readingHistoryRepository.findByUserIdOrderByLastReadAtDesc(userDetails.getId()));
    }

    @PostMapping
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> saveHistory(@RequestBody java.util.Map<String, String> payload) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        String storyId = payload.get("storyId");
        String chapterId = payload.get("chapterId");

        Optional<ReadingHistory> existing = readingHistoryRepository
                .findByUserIdAndStoryId(userDetails.getId(), storyId);

        ReadingHistory history;
        if (existing.isPresent()) {
            history = existing.get();
            history.setChapterId(chapterId);
            history.setLastReadAt(new Date());
        } else {
            history = new ReadingHistory(userDetails.getId(), storyId, chapterId);
        }
        readingHistoryRepository.save(history);
        return ResponseEntity.ok(history);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteHistory(@PathVariable String id) {
        readingHistoryRepository.deleteById(id);
        return ResponseEntity.ok(new com.example.backend.payload.response.MessageResponse("History deleted!"));
    }
}
