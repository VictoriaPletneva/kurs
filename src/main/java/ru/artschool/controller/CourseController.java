package ru.artschool.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.artschool.dto.CourseDto;
import ru.artschool.model.Course;
import ru.artschool.model.CourseStatus;
import ru.artschool.model.Teacher;
import ru.artschool.repository.CourseRepository;
import ru.artschool.repository.TeacherRepository;
import ru.artschool.repository.UserRepository;
import ru.artschool.repository.ScheduleRepository;
import ru.artschool.repository.EnrollmentRepository;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseRepository repo;
    private final TeacherRepository teacherRepo;
    private final UserRepository userRepo;
    private final ScheduleRepository scheduleRepo;
    private final EnrollmentRepository enrollmentRepo;

    public CourseController(CourseRepository repo, TeacherRepository teacherRepo, UserRepository userRepo,
                           ScheduleRepository scheduleRepo, EnrollmentRepository enrollmentRepo) {
        this.repo = repo;
        this.teacherRepo = teacherRepo;
        this.userRepo = userRepo;
        this.scheduleRepo = scheduleRepo;
        this.enrollmentRepo = enrollmentRepo;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String q, org.springframework.security.core.Authentication auth) {
        List<Course> courses;
        if (q == null || q.isBlank()) {
            courses = repo.findAll();
        } else {
            courses = repo.findAll().stream()
                    .filter(c -> c.getName() != null && c.getName().toLowerCase().contains(q.toLowerCase()))
                    .toList();
        }
        
        // Фильтруем курсы для преподавателя - показываем только его курсы
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"))) {
            String username = auth.getName();
            var userOpt = userRepo.findByUsername(username);
            if (userOpt.isPresent()) {
                var teacherOpt = teacherRepo.findByUser(userOpt.get());
                if (teacherOpt.isPresent()) {
                    Long teacherId = teacherOpt.get().getTeacherId();
                    courses = courses.stream()
                            .filter(c -> c.getTeacher() != null && c.getTeacher().getTeacherId().equals(teacherId))
                            .toList();
                }
            }
        }
        
        List<CourseDto> dtos = courses.stream()
                .map(c -> CourseDto.builder()
                        .id(c.getCourseId())
                        .courseId(c.getCourseId())
                        .name(c.getName())
                        .description(c.getDescription())
                        .teacherId(c.getTeacher() != null ? c.getTeacher().getTeacherId() : null)
                        .teacherName(c.getTeacher() != null ? c.getTeacher().getFullName() : null)
                        .maxStudents(c.getMaxStudents())
                        .status(c.getStatus())
                        .build())
                .toList();
        
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<Course> create(@Valid @RequestBody CourseDto dto) {
        Teacher teacher = teacherRepo.findById(dto.getTeacherId()).orElseThrow();
        Course course = Course.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .teacher(teacher)
                .maxStudents(dto.getMaxStudents())
                .status(dto.getStatus() != null ? dto.getStatus() : CourseStatus.ACTIVE)
                .build();
        return ResponseEntity.ok(repo.save(course));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Course> get(@PathVariable Long id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<Course> update(@PathVariable Long id, @Valid @RequestBody CourseDto dto) {
        Course existing = repo.findById(id).orElseThrow();
        // Проверка, если учитель обновляет - только свой курс
        // (добавить логику с SecurityContext если нужно)
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setMaxStudents(dto.getMaxStudents());
        existing.setStatus(dto.getStatus());
        if (dto.getTeacherId() != null) {
            Teacher teacher = teacherRepo.findById(dto.getTeacherId()).orElseThrow();
            existing.setTeacher(teacher);
        }
        return ResponseEntity.ok(repo.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Course course = repo.findById(id).orElse(null);
        if (course == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Удаляем все расписания курса
        var schedules = scheduleRepo.findAll().stream()
                .filter(s -> s.getCourse() != null && s.getCourse().getCourseId().equals(id))
                .toList();
        
        // Удаляем все записи на эти расписания
        for (var schedule : schedules) {
            var enrollments = enrollmentRepo.findBySchedule(schedule);
            enrollmentRepo.deleteAll(enrollments);
        }
        
        // Удаляем расписания
        scheduleRepo.deleteAll(schedules);
        
        // Удаляем курс
        repo.deleteById(id);
        
        return ResponseEntity.ok().build();
    }
}