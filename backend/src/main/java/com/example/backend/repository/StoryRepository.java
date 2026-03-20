package com.example.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Story;

@Repository
public interface StoryRepository extends MongoRepository<Story, String> {
}
