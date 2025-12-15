package ru.artschool.dto;

import lombok.Data;

@Data
public class UpdateStudentRequest {
    private String fullName;
    private Integer age;
    private String email;
    private String contactInfo;
}