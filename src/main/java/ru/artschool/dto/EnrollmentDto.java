package ru.artschool.dto;

import lombok.Builder;
import lombok.Data;
import ru.artschool.model.EnrollmentStatus;

import java.time.LocalDateTime;

@Data
@Builder
public class EnrollmentDto {
    private Long id;
    private Long studentId;
    private Long courseId;
    private LocalDateTime enrollmentDate;
    private EnrollmentStatus status;
}