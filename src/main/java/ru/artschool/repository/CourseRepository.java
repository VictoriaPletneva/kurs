package ru.artschool.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ru.artschool.model.Course;

import java.util.List;

public interface CourseRepository extends JpaRepository<Course, Long> {
    Page<Course> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.teacher.teacherId = :teacherId")
    List<Course> findByTeacherId(Long teacherId);
}