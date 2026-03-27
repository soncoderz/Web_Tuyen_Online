package com.example.backend.model;

import java.util.Date;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "chapter_purchases")
public class ChapterPurchase {
    @Id
    private String id;

    private String userId;
    private String chapterId;
    private String storyId;
    private Long amount;
    private Date purchasedAt = new Date();

    public ChapterPurchase() {}

    public ChapterPurchase(String userId, String chapterId, String storyId, Long amount) {
        this.userId = userId;
        this.chapterId = chapterId;
        this.storyId = storyId;
        this.amount = amount;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getChapterId() { return chapterId; }
    public void setChapterId(String chapterId) { this.chapterId = chapterId; }

    public String getStoryId() { return storyId; }
    public void setStoryId(String storyId) { this.storyId = storyId; }

    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }

    public Date getPurchasedAt() { return purchasedAt; }
    public void setPurchasedAt(Date purchasedAt) { this.purchasedAt = purchasedAt; }
}
