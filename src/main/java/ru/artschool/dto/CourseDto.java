package ru.artschool.dto;

import lombok.Builder;
import lombok.Data;
import ru.artschool.model.CourseStatus;

@Data
@Builder
public class CourseDto {
    private Long id;
    private Long courseId;
    private String name;
    private String description;
    private Long teacherId;
    private String teacherName;
    private Integer maxStudents;
    private CourseStatus status;
}