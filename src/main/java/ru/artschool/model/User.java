package ru.artschool.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @NotBlank(message = "Логин обязателен")
    @Size(max = 50)
    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @NotBlank(message = "Пароль обязателен")
    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @NotNull
    private Role role;

    private LocalDateTime createdAt = LocalDateTime.now();
}