package ru.artschool.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long studentId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String fullName;

    @Min(value = 14, message = "Возраст от 14")
    private Integer age;

    @Size(max = 255)
    private String contactInfo;

    private LocalDateTime registrationDate = LocalDateTime.now();

    @Email
    @NotBlank
    private String email;
}