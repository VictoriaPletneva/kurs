package ru.artschool.controller;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ru.artschool.dto.ScheduleDto;
import ru.artschool.model.Course;
import ru.artschool.model.Role;
import ru.artschool.model.Schedule;
import ru.artschool.model.User;
import ru.artschool.repository.CourseRepository;
import ru.artschool.repository.EnrollmentRepository;
import ru.artschool.repository.ScheduleRepository;
import ru.artschool.repository.StudentRepository;
import ru.artschool.repository.UserRepository;
import ru.artschool.repository.TeacherRepository;

@RestController
@RequestMapping("/api/schedule")
public class ScheduleController {

    private final ScheduleRepository repo;
    private final CourseRepository courseRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final UserRepository userRepo;
    private final StudentRepository studentRepo;
    private final TeacherRepository teacherRepo;

    public ScheduleController(ScheduleRepository repo, CourseRepository courseRepo,
                              EnrollmentRepository enrollmentRepo,
                              UserRepository userRepo,
                              StudentRepository studentRepo,
                              TeacherRepository teacherRepo) {
        this.repo = repo;
        this.courseRepo = courseRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.userRepo = userRepo;
        this.studentRepo = studentRepo;
        this.teacherRepo = teacherRepo;
    }

    @GetMapping
    @PreAuthorize("authenticated")
    public ResponseEntity<?> list(Authentication auth) {
        String username = auth.getName();
        User user = userRepo.findByUsername(username).orElse(null);
        
        List<Schedule> schedules;
        
        // Если это студент, показываем только те занятия, на которые он записан
        if (user != null && user.getRole() == Role.STUDENT) {
            var studentOpt = studentRepo.findByUser(user);
            if (studentOpt.isPresent()) {
                var enrollments = enrollmentRepo.findByStudent(studentOpt.get());
                // Получаем ID только тех занятий, на которые студент записан
                var scheduleIds = enrollments.stream()
                        .filter(e -> e.getSchedule() != null)
                        .map(e -> e.getSchedule().getScheduleId())
                        .toList();
                // Показываем только эти конкретные занятия
                schedules = repo.findAll().stream()
                        .filter(s -> scheduleIds.contains(s.getScheduleId()))
                        .toList();
            } else {
                schedules = List.of();
            }
        } else if (user != null && user.getRole() == Role.TEACHER) {
            // Преподаватель видит только расписание своих курсов
            var teacherOpt = teacherRepo.findByUser(user);
            if (teacherOpt.isPresent()) {
                Long teacherId = teacherOpt.get().getTeacherId();
                schedules = repo.findAll().stream()
                        .filter(s -> s.getCourse() != null
                                && s.getCourse().getTeacher() != null
                                && teacherId.equals(s.getCourse().getTeacher().getTeacherId()))
                        .toList();
            } else {
                schedules = List.of();
            }
        } else {
            // Для остальных ролей показываем все расписание
            schedules = repo.findAll();
        }
        
        List<ScheduleDto> dtos = schedules.stream()
                .map(s -> ScheduleDto.builder()
                        .scheduleId(s.getScheduleId())
                        .courseId(s.getCourse() != null ? s.getCourse().getCourseId() : null)
                        .courseName(s.getCourse() != null ? s.getCourse().getName() : null)
                        .teacherId(s.getCourse() != null && s.getCourse().getTeacher() != null ? s.getCourse().getTeacher().getTeacherId() : null)
                        .teacherName(s.getCourse() != null && s.getCourse().getTeacher() != null ? s.getCourse().getTeacher().getFullName() : null)
                        .dateTime(s.getDateTime())
                        .room(s.getRoom())
                        .notes(s.getNotes())
                        .build())
                .sorted((a, b) -> {
                    if (a.getDateTime() == null) return 1;
                    if (b.getDateTime() == null) return -1;
                    return a.getDateTime().compareTo(b.getDateTime());
                })
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/course/{courseId}")
    @PreAuthorize("authenticated")
    public ResponseEntity<?> listByCourse(@PathVariable Long courseId) {
        List<Schedule> schedules = repo.findAll().stream()
                .filter(s -> s.getCourse() != null && s.getCourse().getCourseId().equals(courseId))
                .toList();
        List<ScheduleDto> dtos = schedules.stream()
                .map(s -> {
                    Course course = s.getCourse();
                    return ScheduleDto.builder()
                            .scheduleId(s.getScheduleId())
                            .courseId(course != null ? course.getCourseId() : null)
                            .courseName(course != null ? course.getName() : null)
                            .teacherId(course != null && course.getTeacher() != null ? course.getTeacher().getTeacherId() : null)
                            .teacherName(course != null && course.getTeacher() != null ? course.getTeacher().getFullName() : null)
                            .dateTime(s.getDateTime())
                            .room(s.getRoom())
                            .notes(s.getNotes())
                            .build();
                })
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'REGISTRAR')")
    public ResponseEntity<?> create(@RequestBody ScheduleDto dto, Authentication auth) {
        Course course = courseRepo.findById(dto.getCourseId()).orElseThrow();

        // Преподаватель может создавать только для своих курсов
        if (auth != null) {
            String username = auth.getName();
            User user = userRepo.findByUsername(username).orElse(null);
            if (user != null && user.getRole() == Role.TEACHER) {
                var teacherOpt = teacherRepo.findByUser(user);
                if (teacherOpt.isEmpty() || course.getTeacher() == null ||
                        !course.getTeacher().getTeacherId().equals(teacherOpt.get().getTeacherId())) {
                    return ResponseEntity.status(403).body("Можно изменять только свои курсы");
                }
            }
        }

        Schedule schedule = Schedule.builder()
                .course(course)
                .dateTime(dto.getDateTime())
                .room(dto.getRoom())
                .notes(dto.getNotes())
                .build();
        return ResponseEntity.ok(repo.save(schedule));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'REGISTRAR')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ScheduleDto dto, Authentication auth) {
        Schedule schedule = repo.findById(id).orElseThrow(() -> new RuntimeException("Schedule not found"));

        User currentUser = null;
        if (auth != null) {
            currentUser = userRepo.findByUsername(auth.getName()).orElse(null);
        }

        // Обновляем курс, если указан
        if (dto.getCourseId() != null) {
            Course course = courseRepo.findById(dto.getCourseId()).orElseThrow();

            // Преподаватель может назначать только свои курсы
            if (currentUser != null && currentUser.getRole() == Role.TEACHER) {
                var teacherOpt = teacherRepo.findByUser(currentUser);
                if (teacherOpt.isEmpty() || course.getTeacher() == null ||
                        !course.getTeacher().getTeacherId().equals(teacherOpt.get().getTeacherId())) {
                    return ResponseEntity.status(403).body("Можно изменять только свои курсы");
                }
            }

            schedule.setCourse(course);
        } else if (currentUser != null && currentUser.getRole() == Role.TEACHER) {
            // Преподаватель без смены курса должен иметь доступ только к своим расписаниям
            var teacherOpt = teacherRepo.findByUser(currentUser);
            if (teacherOpt.isEmpty() || schedule.getCourse() == null ||
                    schedule.getCourse().getTeacher() == null ||
                    !schedule.getCourse().getTeacher().getTeacherId().equals(teacherOpt.get().getTeacherId())) {
                return ResponseEntity.status(403).body("Можно изменять только свои курсы");
            }
        }

        // Обновляем остальные поля
        if (dto.getDateTime() != null) {
            schedule.setDateTime(dto.getDateTime());
        }
        if (dto.getRoom() != null) {
            schedule.setRoom(dto.getRoom());
        }
        if (dto.getNotes() != null) {
            schedule.setNotes(dto.getNotes());
        }

        return ResponseEntity.ok(repo.save(schedule));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'REGISTRAR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repo.deleteById(id);
        return ResponseEntity.ok("Расписание удалено");
    }
}
