package ru.artschool.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Entity
@Table(name = "courses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long courseId;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @Min(1)
    private Integer maxStudents;

    @Enumerated(EnumType.STRING)
    private CourseStatus status = CourseStatus.ACTIVE;
}