package ru.artschool.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "student_works")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentWork {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long workId;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String fileName;

    @Column
    private Long fileSize;

    @Column(nullable = false)
    private LocalDateTime uploadDate = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String filePath; // Путь к файлу на сервере или base64 данные
}

