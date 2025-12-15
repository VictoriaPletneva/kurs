package ru.artschool.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentDto {
    private Long id;
    private Long studentId;
    private Long userId;
    private String fullName;
    private Integer age;
    private String email;
    private String contactInfo;
    private java.time.LocalDateTime registrationDate;
}