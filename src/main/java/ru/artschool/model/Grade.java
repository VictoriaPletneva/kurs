package ru.artschool.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "grades")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Grade {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long gradeId;

    @ManyToOne
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @Min(1)
    @Max(5)
    private Integer grade;

    @Column(columnDefinition = "TEXT")
    private String review;

    private LocalDateTime date = LocalDateTime.now();
}