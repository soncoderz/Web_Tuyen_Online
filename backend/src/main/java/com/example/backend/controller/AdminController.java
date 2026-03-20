package com.example.backend.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.backend.repository.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    StoryRepository storyRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    ChapterRepository chapterRepository;

    @Autowired
    CommentRepository commentRepository;

    @Autowired
    ReportRepository reportRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalStories", storyRepository.count());
        stats.put("totalUsers", userRepository.count());
        stats.put("totalChapters", chapterRepository.count());
        stats.put("totalComments", commentRepository.count());
        stats.put("pendingReports", reportRepository.findByStatusOrderByCreatedAtDesc("PENDING").size());
        stats.put("recentStories", storyRepository.findAll().stream().limit(5).toList());
        return ResponseEntity.ok(stats);
    }
}
