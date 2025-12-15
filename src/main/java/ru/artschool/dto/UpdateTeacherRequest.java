package ru.artschool.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateTeacherRequest {
    @Size(max = 100)
    private String fullName;

    @Size(max = 100)
    private String specialization;

    @Min(value = 0, message = "Стаж >= 0")
    private Integer experience;

    @Email(message = "Неверный формат email")
    private String email;
}