package ru.artschool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.AttendanceRecord;
import ru.artschool.model.Enrollment;
import ru.artschool.model.Schedule;

import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByEnrollment(Enrollment enrollment);
    List<AttendanceRecord> findBySchedule(Schedule schedule);
    Optional<AttendanceRecord> findByEnrollmentAndSchedule(Enrollment enrollment, Schedule schedule);
    List<AttendanceRecord> findBySchedule_Course_CourseId(Long courseId);
}
