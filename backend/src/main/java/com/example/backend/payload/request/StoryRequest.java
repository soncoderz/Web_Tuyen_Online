package com.example.backend.payload.request;

import java.util.Set;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.example.backend.model.EStoryStatus;

public class StoryRequest {
    @NotBlank
    @Size(max = 200)
    private String title;

    private String description;

    private EStoryStatus status;

    private Set<String> categoryIds;

    private String coverImage;

    private Set<String> authorIds;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public EStoryStatus getStatus() {
        return status;
    }

    public void setStatus(EStoryStatus status) {
        this.status = status;
    }

    public Set<String> getCategoryIds() {
        return categoryIds;
    }

    public void setCategoryIds(Set<String> categoryIds) {
        this.categoryIds = categoryIds;
    }

    public Set<String> getAuthorIds() {
        return authorIds;
    }

    public void setAuthorIds(Set<String> authorIds) {
        this.authorIds = authorIds;
    }

    public String getCoverImage() {
        return coverImage;
    }

    public void setCoverImage(String coverImage) {
        this.coverImage = coverImage;
    }
}
