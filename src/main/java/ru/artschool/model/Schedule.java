package ru.artschool.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long scheduleId;

    @ManyToOne
    @JoinColumn(name = "course_id", nullable = false)
    @NotNull
    private Course course;

    @NotNull
    private LocalDateTime dateTime;

    private String room;

    @Column(columnDefinition = "TEXT")
    private String notes;
}