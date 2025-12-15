package ru.artschool.dto;

import lombok.Data;

@Data
public class CreateStudentRequest {
    private String fullName;
    private Integer age;
    private String email;
    private String contactInfo;
    private String username;
    private String password;
}