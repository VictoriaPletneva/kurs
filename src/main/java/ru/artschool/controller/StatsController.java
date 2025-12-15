package ru.artschool.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.artschool.model.CourseStatus;
import ru.artschool.model.Grade;
import ru.artschool.repository.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
@PreAuthorize("hasAnyRole('ADMIN', 'REGISTRAR')")
public class StatsController {

    private final UserRepository userRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final StudentRepository studentRepo;
    private final TeacherRepository teacherRepo;
    private final CourseRepository courseRepo;
    private final GradeRepository gradeRepo;

    public StatsController(UserRepository userRepo, EnrollmentRepository enrollmentRepo,
                          StudentRepository studentRepo,
                          TeacherRepository teacherRepo,
                          CourseRepository courseRepo,
                          GradeRepository gradeRepo) {
        this.userRepo = userRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.studentRepo = studentRepo;
        this.teacherRepo = teacherRepo;
        this.courseRepo = courseRepo;
        this.gradeRepo = gradeRepo;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // Общая статистика
        stats.put("totalUsers", userRepo.count());
        stats.put("totalStudents", studentRepo.count());
        stats.put("totalTeachers", teacherRepo.count());
        stats.put("totalCourses", courseRepo.count());
        stats.put("totalEnrollments", enrollmentRepo.count());
        
        // Активные курсы
        long activeCourses = courseRepo.findAll().stream()
                .filter(c -> c.getStatus() == CourseStatus.ACTIVE)
                .count();
        stats.put("activeCourses", activeCourses);
        
        // Средняя оценка
        List<Grade> grades = gradeRepo.findAll();
        if (!grades.isEmpty()) {
            double avgGrade = grades.stream()
                    .filter(g -> g.getGrade() != null)
                    .mapToInt(Grade::getGrade)
                    .average()
                    .orElse(0.0);
            stats.put("averageGrade", avgGrade);
        } else {
            stats.put("averageGrade", 0.0);
        }

        return ResponseEntity.ok(stats);
    }
}
