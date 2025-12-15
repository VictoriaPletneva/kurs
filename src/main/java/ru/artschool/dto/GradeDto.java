package ru.artschool.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GradeDto {
    private Long id;
    private Long enrollmentId;
    private Integer grade;
    private String review;
    private LocalDateTime date;
}
