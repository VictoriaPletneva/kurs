package ru.artschool.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Entity
@Table(name = "teachers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Teacher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long teacherId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Size(max = 100)
    private String fullName;

    @Size(max = 100)
    private String specialization;

    @Min(0)
    private Integer experience;

    @Email
    @NotBlank
    private String email;
}