package ru.artschool.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ru.artschool.model.*;
import ru.artschool.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceRecordRepository attendanceRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final ScheduleRepository scheduleRepo;
    private final TeacherRepository teacherRepo;
    private final UserRepository userRepo;
    private final CourseRepository courseRepo;
    private final StudentRepository studentRepo;

    public AttendanceController(AttendanceRecordRepository attendanceRepo,
                               EnrollmentRepository enrollmentRepo,
                               ScheduleRepository scheduleRepo,
                               TeacherRepository teacherRepo,
                               UserRepository userRepo,
                               CourseRepository courseRepo,
                               StudentRepository studentRepo) {
        this.attendanceRepo = attendanceRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.scheduleRepo = scheduleRepo;
        this.teacherRepo = teacherRepo;
        this.userRepo = userRepo;
        this.courseRepo = courseRepo;
        this.studentRepo = studentRepo;
    }

    // Получение посещаемости для занятия
    @GetMapping("/schedule/{scheduleId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<?> getAttendanceForSchedule(@PathVariable Long scheduleId, Authentication auth) {
        Schedule schedule = scheduleRepo.findById(scheduleId).orElse(null);
        if (schedule == null) {
            return ResponseEntity.notFound().build();
        }

        // Проверка доступа для TEACHER
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"))) {
            String username = auth.getName();
            User user = userRepo.findByUsername(username).orElse(null);
            if (user != null) {
                var teacherOpt = teacherRepo.findByUser(user);
                if (teacherOpt.isPresent()) {
                    Teacher teacher = teacherOpt.get();
                    if (schedule.getCourse() == null || schedule.getCourse().getTeacher() == null ||
                        !schedule.getCourse().getTeacher().getTeacherId().equals(teacher.getTeacherId())) {
                        return ResponseEntity.status(403).body("Нет доступа к этому занятию");
                    }
                }
            }
        }

        List<Enrollment> enrollments = enrollmentRepo.findBySchedule(schedule);
        List<Map<String, Object>> result = new java.util.ArrayList<>();

        for (Enrollment enrollment : enrollments) {
            Map<String, Object> map = new HashMap<>();
            map.put("enrollmentId", enrollment.getEnrollmentId());
            map.put("studentId", enrollment.getStudent().getStudentId());
            map.put("studentName", enrollment.getStudent().getFullName());
            
            var attendanceOpt = attendanceRepo.findByEnrollmentAndSchedule(enrollment, schedule);
            if (attendanceOpt.isPresent()) {
                AttendanceRecord record = attendanceOpt.get();
                map.put("attendanceId", record.getAttendanceId());
                map.put("status", record.getStatus().name());
                map.put("notes", record.getNotes());
                map.put("recordDate", record.getRecordDate());
            } else {
                map.put("attendanceId", null);
                map.put("status", null);
                map.put("notes", null);
                map.put("recordDate", null);
            }
            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    // Создание/обновление записи посещаемости
    @PostMapping("/schedule/{scheduleId}/enrollment/{enrollmentId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<?> markAttendance(@PathVariable Long scheduleId,
                                           @PathVariable Long enrollmentId,
                                           @RequestBody Map<String, Object> request,
                                           Authentication auth) {
        Schedule schedule = scheduleRepo.findById(scheduleId).orElse(null);
        Enrollment enrollment = enrollmentRepo.findById(enrollmentId).orElse(null);

        if (schedule == null || enrollment == null) {
            return ResponseEntity.notFound().build();
        }

        // Проверка доступа для TEACHER
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"))) {
            String username = auth.getName();
            User user = userRepo.findByUsername(username).orElse(null);
            if (user != null) {
                var teacherOpt = teacherRepo.findByUser(user);
                if (teacherOpt.isPresent()) {
                    Teacher teacher = teacherOpt.get();
                    if (schedule.getCourse() == null || schedule.getCourse().getTeacher() == null ||
                        !schedule.getCourse().getTeacher().getTeacherId().equals(teacher.getTeacherId())) {
                        return ResponseEntity.status(403).body("Нет доступа к этому занятию");
                    }
                }
            }
        }

        String statusStr = request.get("status") != null ? request.get("status").toString() : "PRESENT";
        AttendanceStatus status;
        try {
            status = AttendanceStatus.valueOf(statusStr);
        } catch (IllegalArgumentException e) {
            status = AttendanceStatus.PRESENT;
        }

        String notes = request.get("notes") != null ? request.get("notes").toString() : null;

        var existingOpt = attendanceRepo.findByEnrollmentAndSchedule(enrollment, schedule);
        AttendanceRecord record;
        
        if (existingOpt.isPresent()) {
            record = existingOpt.get();
            record.setStatus(status);
            record.setNotes(notes);
            record.setRecordDate(LocalDateTime.now());
        } else {
            record = AttendanceRecord.builder()
                    .enrollment(enrollment)
                    .schedule(schedule)
                    .status(status)
                    .notes(notes)
                    .recordDate(LocalDateTime.now())
                    .build();
        }

        attendanceRepo.save(record);
        return ResponseEntity.ok("Посещаемость отмечена");
    }

    // Получение посещаемости для курса
    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'STUDENT')")
    public ResponseEntity<?> getAttendanceForCourse(@PathVariable Long courseId, Authentication auth) {
        Course course = courseRepo.findById(courseId).orElse(null);
        if (course == null) {
            return ResponseEntity.notFound().build();
        }

        String username = null;
        if (auth != null) {
            username = auth.getName();
        }
        User user = null;
        if (username != null) {
            user = userRepo.findByUsername(username).orElse(null);
        }
        
        // Проверка доступа для TEACHER
        if (user != null && user.getRole() == Role.TEACHER) {
            var teacherOpt = teacherRepo.findByUser(user);
            if (teacherOpt.isPresent()) {
                Teacher teacher = teacherOpt.get();
                if (course.getTeacher() == null || !course.getTeacher().getTeacherId().equals(teacher.getTeacherId())) {
                    return ResponseEntity.status(403).body("Нет доступа к этому курсу");
                }
            }
        }

        List<Schedule> schedulesList = scheduleRepo.findAll().stream()
                .filter(s -> s.getCourse() != null && s.getCourse().getCourseId().equals(courseId))
                .toList();

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        
        // Если это студент, фильтруем только его записи
        Student currentStudent = null;
        if (user != null && user.getRole() == Role.STUDENT) {
            var studentOpt = studentRepo.findByUser(user);
            if (studentOpt.isPresent()) {
                currentStudent = studentOpt.get();
            }
        }
        
        for (Schedule scheduleItem : schedulesList) {
            List<Enrollment> enrollmentsList = enrollmentRepo.findBySchedule(scheduleItem);
            for (Enrollment enrollmentItem : enrollmentsList) {
                // Если это студент, показываем только его записи
                if (currentStudent != null && !enrollmentItem.getStudent().getStudentId().equals(currentStudent.getStudentId())) {
                    continue;
                }
                
                var attendanceOpt = attendanceRepo.findByEnrollmentAndSchedule(enrollmentItem, scheduleItem);
                Map<String, Object> map = new HashMap<>();
                map.put("scheduleId", scheduleItem.getScheduleId());
                map.put("dateTime", scheduleItem.getDateTime());
                map.put("enrollmentId", enrollmentItem.getEnrollmentId());
                map.put("studentId", enrollmentItem.getStudent().getStudentId());
                map.put("studentName", enrollmentItem.getStudent().getFullName());
                
                if (attendanceOpt.isPresent()) {
                    AttendanceRecord record = attendanceOpt.get();
                    map.put("attendanceId", record.getAttendanceId());
                    map.put("status", record.getStatus().name());
                    map.put("notes", record.getNotes());
                } else {
                    map.put("attendanceId", null);
                    map.put("status", null);
                    map.put("notes", null);
                }
                result.add(map);
            }
        }

        return ResponseEntity.ok(result);
    }
}
