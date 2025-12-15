package ru.artschool.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ru.artschool.dto.GradeDto;
import ru.artschool.model.*;
import ru.artschool.repository.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/grades")
public class GradeController {

    private final GradeRepository gradeRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final TeacherRepository teacherRepo;
    private final UserRepository userRepo;
    private final StudentRepository studentRepo;

    public GradeController(GradeRepository gradeRepo, EnrollmentRepository enrollmentRepo,
                           TeacherRepository teacherRepo, UserRepository userRepo,
                           StudentRepository studentRepo) {
        this.gradeRepo = gradeRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.teacherRepo = teacherRepo;
        this.userRepo = userRepo;
        this.studentRepo = studentRepo;
    }

    // POST /api/grades/{enrollmentId} — добавить оценку (TEACHER для своего курса)
    @PostMapping("/{enrollmentId}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> addGrade(@PathVariable Long enrollmentId, @Valid @RequestBody GradeDto dto, Authentication auth) {
        Enrollment enrollment = enrollmentRepo.findById(enrollmentId).orElseThrow();

        // Проверка: TEACHER только для своего курса
        String username = auth.getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        Teacher teacher = teacherRepo.findAll().stream()
                .filter(t -> t.getUser().getUserId().equals(user.getUserId()))
                .findFirst().orElseThrow();
        if (enrollment.getSchedule() == null || enrollment.getSchedule().getCourse() == null ||
            enrollment.getSchedule().getCourse().getTeacher() == null ||
            !enrollment.getSchedule().getCourse().getTeacher().getTeacherId().equals(teacher.getTeacherId())) {
            return ResponseEntity.status(403).body("Не ваш курс");
        }

        // Используем дату из DTO, если она указана, иначе текущее время
        LocalDateTime gradeDate = dto.getDate() != null ? dto.getDate() : LocalDateTime.now();
        
        Grade grade = Grade.builder()
                .enrollment(enrollment)
                .grade(dto.getGrade())
                .review(dto.getReview())
                .date(gradeDate)
                .build();
        gradeRepo.save(grade);

        return ResponseEntity.ok("Оценка добавлена");
    }

    // GET /api/grades/enrollment/{id} — оценки для записи (STUDENT для своей, TEACHER для курса, ADMIN)
    @GetMapping("/enrollment/{id}")
    @PreAuthorize("authenticated")
    public ResponseEntity<Page<GradeDto>> gradesForEnrollment(@PathVariable Long id, Pageable pageable, Authentication auth) {
        Enrollment enrollment = enrollmentRepo.findById(id).orElseThrow();

        // Проверки доступа
        String username = auth.getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        Role role = user.getRole();

        if (role == Role.STUDENT) {
            if (!enrollment.getStudent().getUser().getUserId().equals(user.getUserId())) {
                return ResponseEntity.status(403).build();
            }
        } else if (role == Role.TEACHER) {
            Teacher teacher = teacherRepo.findAll().stream()
                    .filter(t -> t.getUser().getUserId().equals(user.getUserId()))
                    .findFirst().orElseThrow();
            if (enrollment.getSchedule() == null || enrollment.getSchedule().getCourse() == null ||
                !enrollment.getSchedule().getCourse().getTeacher().getTeacherId().equals(teacher.getTeacherId())) {
                return ResponseEntity.status(403).build();
            }
        } else if (role != Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        Page<Grade> page = gradeRepo.findByEnrollment_EnrollmentId(id, pageable);
        Page<GradeDto> dtoPage = page.map(this::toDto);
        return ResponseEntity.ok(dtoPage);
    }

    // PUT /api/grades/{id} — обновить оценку (TEACHER)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> updateGrade(@PathVariable Long id, @Valid @RequestBody GradeDto dto, Authentication auth) {
        Grade grade = gradeRepo.findById(id).orElseThrow();

        // Проверка доступа
        Enrollment enrollment = grade.getEnrollment();
        String username = auth.getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        Teacher teacher = teacherRepo.findAll().stream()
                .filter(t -> t.getUser().getUserId().equals(user.getUserId()))
                .findFirst().orElseThrow();
        if (enrollment.getSchedule() == null || enrollment.getSchedule().getCourse() == null ||
            !enrollment.getSchedule().getCourse().getTeacher().getTeacherId().equals(teacher.getTeacherId())) {
            return ResponseEntity.status(403).body("Не ваша оценка");
        }

        grade.setGrade(dto.getGrade());
        grade.setReview(dto.getReview());
        // Обновляем дату, если она указана в DTO
        if (dto.getDate() != null) {
            grade.setDate(dto.getDate());
        }
        gradeRepo.save(grade);

        return ResponseEntity.ok("Оценка обновлена");
    }

    // DELETE /api/grades/{id} — удалить (TEACHER или ADMIN)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<?> deleteGrade(@PathVariable Long id, Authentication auth) {
        Grade grade = gradeRepo.findById(id).orElseThrow();

        // Проверка для TEACHER
        if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"))) {
            Enrollment enrollment = grade.getEnrollment();
            String username = auth.getName();
            User user = userRepo.findByUsername(username).orElseThrow();
            Teacher teacher = teacherRepo.findAll().stream()
                    .filter(t -> t.getUser().getUserId().equals(user.getUserId()))
                    .findFirst().orElseThrow();
            if (enrollment.getSchedule() == null || enrollment.getSchedule().getCourse() == null ||
                !enrollment.getSchedule().getCourse().getTeacher().getTeacherId().equals(teacher.getTeacherId())) {
                return ResponseEntity.status(403).body("Не ваша оценка");
            }
        }

        gradeRepo.deleteById(id);
        return ResponseEntity.ok("Оценка удалена");
    }
    
    // GET /api/grades/me — все оценки текущего студента
    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> myGrades(Authentication auth) {
        String username = auth.getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        var studentOpt = studentRepo.findByUser(user);
        if (studentOpt.isEmpty()) {
            return ResponseEntity.status(400).body("Профиль студента не найден");
        }
        
        var enrollments = enrollmentRepo.findByStudent(studentOpt.get());
        List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        
        for (var enrollment : enrollments) {
            var grades = gradeRepo.findByEnrollment_EnrollmentId(enrollment.getEnrollmentId(), 
                    org.springframework.data.domain.Pageable.unpaged());
            for (var grade : grades) {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("gradeId", grade.getGradeId());
                map.put("enrollmentId", enrollment.getEnrollmentId());
                map.put("grade", grade.getGrade());
                map.put("review", grade.getReview());
                map.put("date", grade.getDate());
                if (enrollment.getSchedule() != null && enrollment.getSchedule().getCourse() != null) {
                    map.put("courseId", enrollment.getSchedule().getCourse().getCourseId());
                    map.put("courseName", enrollment.getSchedule().getCourse().getName());
                }
                result.add(map);
            }
        }
        
        return ResponseEntity.ok(result);
    }

    private GradeDto toDto(Grade g) {
        return GradeDto.builder()
                .id(g.getGradeId())
                .enrollmentId(g.getEnrollment().getEnrollmentId())
                .grade(g.getGrade())
                .review(g.getReview())
                .date(g.getDate())
                .build();
    }
}