package com.example.backend.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.model.ChapterPurchase;

@Repository
public interface ChapterPurchaseRepository extends MongoRepository<ChapterPurchase, String> {
    Optional<ChapterPurchase> findByUserIdAndChapterId(String userId, String chapterId);
    boolean existsByUserIdAndChapterId(String userId, String chapterId);
}
