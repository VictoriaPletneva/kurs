package ru.artschool.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import ru.artschool.model.*;
import ru.artschool.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class EnrollmentController {

    private final UserRepository userRepo;
    private final StudentRepository studentRepo;
    private final CourseRepository courseRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final TeacherRepository teacherRepo;
    private final ScheduleRepository scheduleRepo;
    private final AttendanceRecordRepository attendanceRecordRepo;

    public EnrollmentController(UserRepository userRepo,
                                StudentRepository studentRepo,
                                CourseRepository courseRepo,
                                EnrollmentRepository enrollmentRepo,
                                TeacherRepository teacherRepo,
                                ScheduleRepository scheduleRepo,
                                AttendanceRecordRepository attendanceRecordRepo) {
        this.userRepo = userRepo;
        this.studentRepo = studentRepo;
        this.courseRepo = courseRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.teacherRepo = teacherRepo;
        this.scheduleRepo = scheduleRepo;
        this.attendanceRecordRepo = attendanceRecordRepo;
    }

    // STUDENT: записаться на занятие (schedule)
    @PostMapping("/enrollments")
    public ResponseEntity<?> enroll(@RequestBody Map<String, Object> request) {
        Long scheduleId = request.get("scheduleId") != null ? Long.valueOf(request.get("scheduleId").toString()) : null;

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        if (user.getRole() != Role.STUDENT) {
            return ResponseEntity.status(403).body("Только студенты могут записываться");
        }

        var studentOpt = studentRepo.findByUser(user);
        if (studentOpt.isEmpty()) {
            return ResponseEntity.status(400).body("Профиль студента не найден");
        }
        Student student = studentOpt.get();

        Schedule schedule = scheduleRepo.findById(scheduleId).orElse(null);
        if (schedule == null) {
            return ResponseEntity.notFound().build();
        }

        Course course = schedule.getCourse();
        // проверка мест
        long count = enrollmentRepo.findBySchedule(schedule).size();
        if (course.getMaxStudents() != null && count >= course.getMaxStudents()) {
            return ResponseEntity.badRequest().body("Нет мест в курсе");
        }

        // проверка дубликата
        if (enrollmentRepo.findByStudentAndSchedule(student, schedule).isPresent()) {
            return ResponseEntity.badRequest().body("Вы уже записаны");
        }

        Enrollment e = Enrollment.builder()
                .student(student)
                .schedule(schedule)
                .enrollmentDate(LocalDateTime.now())
                .build();

        enrollmentRepo.save(e);

        return ResponseEntity.ok("Запись успешна");
    }

    // STUDENT: мои записи
    @GetMapping("/enrollments/me")
    public ResponseEntity<?> myEnrollments() {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        if (user.getRole() != Role.STUDENT) {
            return ResponseEntity.status(403).body("Только студенты");
        }

        var studentOpt = studentRepo.findByUser(user);
        if (studentOpt.isEmpty()) {
            return ResponseEntity.status(400).body("Профиль студента не найден");
        }

        List<Enrollment> list = enrollmentRepo.findByStudent(studentOpt.get());
        // Преобразуем в DTO для удобства
        List<java.util.Map<String, Object>> dtos = list.stream()
                .map(e -> {
                    java.util.Map<String, Object> dto = new java.util.HashMap<>();
                    dto.put("enrollmentId", e.getEnrollmentId());
                    if (e.getSchedule() != null) {
                        dto.put("scheduleId", e.getSchedule().getScheduleId());
                        dto.put("courseId", e.getSchedule().getCourse() != null ? e.getSchedule().getCourse().getCourseId() : null);
                        dto.put("courseName", e.getSchedule().getCourse() != null ? e.getSchedule().getCourse().getName() : null);
                        dto.put("dateTime", e.getSchedule().getDateTime());
                    }
                    dto.put("status", e.getStatus() != null ? e.getStatus().name() : null);
                    dto.put("enrollmentDate", e.getEnrollmentDate());
                    return dto;
                })
                .toList();
        return ResponseEntity.ok(dtos);
    }

    // TEACHER / ADMIN: список студентов курса
    @GetMapping("/courses/{id}/students")
    public ResponseEntity<?> studentsForCourse(@PathVariable Long id) {

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElse(null);

        if (user == null) return ResponseEntity.status(401).body("User not found");

        Course course = courseRepo.findById(id).orElse(null);
        if (course == null) return ResponseEntity.notFound().build();

        // TEACHER — проверяем, что он владелец
        if (user.getRole() == Role.TEACHER) {

            var teacherOpt = teacherRepo.findByUser(user);
            if (teacherOpt.isEmpty())
                return ResponseEntity.status(403).body("Профиль преподавателя не найден");

            if (!course.getTeacher().getTeacherId().equals(teacherOpt.get().getTeacherId())) {
                return ResponseEntity.status(403).body("Нет доступа к этому курсу");
            }
        }

        // ADMIN — можно всё
        if (user.getRole() != Role.ADMIN && user.getRole() != Role.TEACHER) {
            return ResponseEntity.status(403).body("Доступ запрещён");
        }

        List<Enrollment> enrollments = enrollmentRepo.findBySchedule_Course(course);
        return ResponseEntity.ok(enrollments);
    }

    // STUDENT: отменить запись
    @DeleteMapping("/enrollments/{enrollmentId}")
    public ResponseEntity<?> cancelEnrollment(@PathVariable Long enrollmentId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        if (user.getRole() != Role.STUDENT) {
            return ResponseEntity.status(403).body("Только студенты могут отменять записи");
        }

        var enrollmentOpt = enrollmentRepo.findById(enrollmentId);
        if (enrollmentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Enrollment enrollment = enrollmentOpt.get();

        // Проверяем, что это запись текущего студента
        var studentOpt = studentRepo.findByUser(user);
        if (studentOpt.isEmpty() || !enrollment.getStudent().getStudentId().equals(studentOpt.get().getStudentId())) {
            return ResponseEntity.status(403).body("Нет доступа к этой записи");
        }

        enrollmentRepo.delete(enrollment);
        return ResponseEntity.ok("Запись успешно отменена");
    }
    
    // GET /api/enrollments/me/attendance-records - получение записей посещаемости студента
    @GetMapping("/enrollments/me/attendance-records")
    public ResponseEntity<?> myAttendanceRecords() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.status(401).body("User not found");
        }

        if (user.getRole() != Role.STUDENT) {
            return ResponseEntity.status(403).body("Только студенты");
        }

        var studentOpt = studentRepo.findByUser(user);
        if (studentOpt.isEmpty()) {
            return ResponseEntity.status(400).body("Профиль студента не найден");
        }

        List<Enrollment> enrollments = enrollmentRepo.findByStudent(studentOpt.get());
        List<Map<String, Object>> records = new java.util.ArrayList<>();

        // Получаем все записи посещаемости для enrollments студента
        for (Enrollment enrollment : enrollments) {
            if (enrollment.getSchedule() != null) {
                var attendanceRecords = attendanceRecordRepo.findByEnrollment(enrollment);
                for (var record : attendanceRecords) {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("attendanceId", record.getAttendanceId());
                    map.put("enrollmentId", enrollment.getEnrollmentId());
                    map.put("scheduleId", record.getSchedule().getScheduleId());
                    map.put("status", record.getStatus().name());
                    map.put("recordDate", record.getRecordDate());
                    map.put("notes", record.getNotes());
                    records.add(map);
                }
            }
        }
        return ResponseEntity.ok(records);
    }
}