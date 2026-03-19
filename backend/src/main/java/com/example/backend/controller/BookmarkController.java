package com.example.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.example.backend.model.Bookmark;
import com.example.backend.payload.request.BookmarkRequest;
import com.example.backend.payload.response.MessageResponse;
import com.example.backend.repository.BookmarkRepository;
import com.example.backend.security.services.UserDetailsImpl;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController {

    @Autowired
    BookmarkRepository bookmarkRepository;

    @GetMapping
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<Bookmark>> getMyBookmarks() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userDetails.getId()));
    }

    @PostMapping
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> addBookmark(@Valid @RequestBody BookmarkRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Bookmark bookmark = new Bookmark(userDetails.getId(), request.getStoryId(),
                request.getChapterId(), request.getNote());
        bookmarkRepository.save(bookmark);
        return ResponseEntity.ok(bookmark);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteBookmark(@PathVariable String id) {
        if (!bookmarkRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Bookmark not found!"));
        }
        bookmarkRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse("Bookmark deleted successfully!"));
    }
}
