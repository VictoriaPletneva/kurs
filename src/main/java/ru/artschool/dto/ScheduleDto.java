package ru.artschool.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ScheduleDto {
    private Long scheduleId;
    private Long courseId;
    private String courseName;
    private Long teacherId;
    private String teacherName;
    private LocalDateTime dateTime;
    private String room;
    private String notes;
}