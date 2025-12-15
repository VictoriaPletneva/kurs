package ru.artschool.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.Schedule;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    Page<Schedule> findByCourse_CourseId(Long courseId, Pageable pageable);
}