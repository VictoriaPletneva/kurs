package ru.artschool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.Course;
import ru.artschool.model.Enrollment;
import ru.artschool.model.EnrollmentStatus;
import ru.artschool.model.Schedule;
import ru.artschool.model.Student;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    Optional<Enrollment> findByStudentAndSchedule(Student student, Schedule schedule);
    List<Enrollment> findByStudent(Student student);
    List<Enrollment> findBySchedule(Schedule schedule);
    List<Enrollment> findBySchedule_Course(Course course);
    long countBySchedule_CourseAndStatus(Course course, EnrollmentStatus status);
}