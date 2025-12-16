package ru.artschool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import ru.artschool.model.Role;

@Data
public class CreateUserRequest {
    @NotBlank(message = "Логин обязателен")
    @Size(min = 3, max = 50, message = "Логин должен быть от 3 до 50 символов")
    private String username;

    @NotBlank(message = "Пароль обязателен")
    @Size(min = 6, message = "Пароль должен быть не менее 6 символов")
    private String password;

    @NotNull(message = "Роль обязательна")
    private Role role;

    // Для создания ученика
    private String fullName;
    private Integer age;
    private String email;
    private String contactInfo;

    // Для создания преподавателя
    private String specialization;
    private Integer experience;
}

























































