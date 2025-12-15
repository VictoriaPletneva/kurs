package ru.artschool.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import ru.artschool.dto.CreateStudentRequest;
import ru.artschool.dto.StudentDto;
import ru.artschool.dto.UpdateStudentRequest;
import ru.artschool.model.Role;
import ru.artschool.model.Student;
import ru.artschool.model.Teacher;
import ru.artschool.model.User;
import ru.artschool.repository.StudentRepository;
import ru.artschool.repository.TeacherRepository;
import ru.artschool.repository.UserRepository;
import ru.artschool.repository.StudentWorkRepository;
import ru.artschool.model.StudentWork;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.HashMap;
import ru.artschool.repository.CourseRepository;
import ru.artschool.repository.EnrollmentRepository;
import ru.artschool.repository.GradeRepository;
import ru.artschool.model.Grade;
import ru.artschool.model.Enrollment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentRepository repo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final TeacherRepository teacherRepo;
    private final CourseRepository courseRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final StudentWorkRepository workRepo;
    private final GradeRepository gradeRepo;
    private static final String UPLOAD_DIR = "uploads/student-works/";
    
    public StudentController(StudentRepository repo, UserRepository userRepo, PasswordEncoder passwordEncoder,
                             TeacherRepository teacherRepo, CourseRepository courseRepo, EnrollmentRepository enrollmentRepo,
                             StudentWorkRepository workRepo, GradeRepository gradeRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.teacherRepo = teacherRepo;
        this.courseRepo = courseRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.workRepo = workRepo;
        this.gradeRepo = gradeRepo;
        // Создаем директорию для загрузки файлов
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
        } catch (Exception e) {
            System.err.println("Не удалось создать директорию для загрузки файлов: " + e.getMessage());
        }
    }

    // ADMIN + TEACHER + REGISTRAR
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'REGISTRAR')")
    public List<StudentDto> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "fullName") String sortBy,
            org.springframework.security.core.Authentication auth
    ) {
        List<Student> students = repo.findAll();
        
        // Для преподавателя фильтруем только учеников, записанных на его курсы
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"))) {
            String username = auth.getName();
            var userOpt = userRepo.findByUsername(username);
            if (userOpt.isPresent()) {
                var teacherOpt = teacherRepo.findByUser(userOpt.get());
                if (teacherOpt.isPresent()) {
                    Teacher teacher = teacherOpt.get();
                    // Получаем все курсы преподавателя
                    var teacherCourses = courseRepo.findAll().stream()
                            .filter(c -> c.getTeacher() != null && c.getTeacher().getTeacherId().equals(teacher.getTeacherId()))
                            .map(c -> c.getCourseId())
                            .toList();
                    // Получаем всех учеников, записанных на эти курсы через расписание
                    var enrolledStudentIds = enrollmentRepo.findAll().stream()
                            .filter(e -> e.getSchedule() != null && 
                                        e.getSchedule().getCourse() != null &&
                                        teacherCourses.contains(e.getSchedule().getCourse().getCourseId()))
                            .map(e -> e.getStudent().getStudentId())
                            .distinct()
                            .toList();
                    // Фильтруем студентов
                    students = students.stream()
                            .filter(s -> enrolledStudentIds.contains(s.getStudentId()))
                            .toList();
                }
            }
        }
        
        // Поиск
        if (search != null && !search.isBlank()) {
            String searchLower = search.toLowerCase();
            students = students.stream()
                    .filter(s -> (s.getFullName() != null && s.getFullName().toLowerCase().contains(searchLower)) ||
                                (s.getEmail() != null && s.getEmail().toLowerCase().contains(searchLower)))
                    .toList();
        }
        
        // Сортировка
        students = switch (sortBy) {
            case "age" -> students.stream()
                    .sorted((a, b) -> {
                        Integer ageA = a.getAge() != null ? a.getAge() : 0;
                        Integer ageB = b.getAge() != null ? b.getAge() : 0;
                        return ageA.compareTo(ageB);
                    })
                    .toList();
            case "registrationDate" -> students.stream()
                    .sorted((a, b) -> {
                        if (a.getRegistrationDate() == null) return 1;
                        if (b.getRegistrationDate() == null) return -1;
                        return b.getRegistrationDate().compareTo(a.getRegistrationDate());
                    })
                    .toList();
            default -> students.stream()
                    .sorted((a, b) -> {
                        String nameA = a.getFullName() != null ? a.getFullName() : "";
                        String nameB = b.getFullName() != null ? b.getFullName() : "";
                        return nameA.compareToIgnoreCase(nameB);
                    })
                    .toList();
        };
        
        return students.stream()
                .map(this::toDto)
                .toList();
    }

    // ADMIN + TEACHER + STUDENT (только если свой ID)
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER') or #id == principal.id")
    public ResponseEntity<StudentDto> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(student -> ResponseEntity.ok(toDto(student)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ADMIN
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody CreateStudentRequest req) {
        // Проверка обязательных полей
        if (req.getFullName() == null || req.getFullName().isBlank()) {
            return ResponseEntity.badRequest().body("ФИО обязательно");
        }
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Email обязателен");
        }
        if (req.getUsername() == null || req.getUsername().isBlank()) {
            return ResponseEntity.badRequest().body("Логин обязателен");
        }
        if (req.getPassword() == null || req.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Пароль обязателен");
        }
        
        // Проверка на существующий логин
        if (userRepo.findByUsername(req.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Пользователь с таким логином уже существует");
        }
        
        // Создание пользователя
        User user = User.builder()
                .username(req.getUsername())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(Role.STUDENT)
                .createdAt(LocalDateTime.now())
                .build();
        user = userRepo.save(user);
        
        // Создание ученика
        Student s = Student.builder()
                .user(user)
                .fullName(req.getFullName())
                .age(req.getAge() != null ? req.getAge() : 18)
                .email(req.getEmail())
                .contactInfo(req.getContactInfo() != null ? req.getContactInfo() : "Не указано")
                .registrationDate(LocalDateTime.now())
                .build();
        repo.save(s);
        
        return ResponseEntity.ok(toDto(s));
    }

    // ADMIN + REGISTRAR (преподаватель не может редактировать)
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'REGISTRAR')")
    public ResponseEntity<StudentDto> update(
            @PathVariable Long id,
            @RequestBody UpdateStudentRequest req
    ) {
        return repo.findById(id)
                .map(student -> {
                    if (req.getFullName() != null) student.setFullName(req.getFullName());
                    if (req.getAge() != null) student.setAge(req.getAge());
                    if (req.getEmail() != null) student.setEmail(req.getEmail());
                    if (req.getContactInfo() != null) student.setContactInfo(req.getContactInfo());
                    repo.save(student);
                    return ResponseEntity.ok(toDto(student));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ADMIN
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repo.deleteById(id);
        return ResponseEntity.ok("Deleted");
    }

    private StudentDto toDto(Student s) {
        return StudentDto.builder()
                .id(s.getStudentId())
                .studentId(s.getStudentId())
                .userId(s.getUser() != null ? s.getUser().getUserId() : null)
                .fullName(s.getFullName())
                .age(s.getAge())
                .email(s.getEmail())
                .contactInfo(s.getContactInfo())
                .registrationDate(s.getRegistrationDate())
                .build();
    }
    
    // Загрузка работы ученика
    @PostMapping("/{id}/works")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> uploadWork(
            @PathVariable Long id,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("file") MultipartFile file,
            org.springframework.security.core.Authentication auth
    ) {
        // Проверяем, что студент загружает работу для себя
        String username = auth.getName();
        var userOpt = userRepo.findByUsername(username);
        if (userOpt.isEmpty() || userOpt.get().getRole() != Role.STUDENT) {
            return ResponseEntity.status(403).body("Доступ запрещен");
        }
        
        var studentOpt = repo.findByUser(userOpt.get());
        if (studentOpt.isEmpty() || !studentOpt.get().getStudentId().equals(id)) {
            return ResponseEntity.status(403).body("Вы можете загружать работы только для своего профиля");
        }
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Файл не выбран");
        }
        
        try {
            // Сохраняем файл
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(UPLOAD_DIR + fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Сохраняем информацию о работе в БД
            StudentWork work = StudentWork.builder()
                    .student(studentOpt.get())
                    .title(title)
                    .description(description)
                    .fileName(file.getOriginalFilename())
                    .fileSize(file.getSize())
                    .filePath(filePath.toString())
                    .uploadDate(LocalDateTime.now()) // Явно устанавливаем дату загрузки
                    .build();
            
            workRepo.save(work);
            
            Map<String, Object> response = new HashMap<>();
            response.put("workId", work.getWorkId());
            response.put("title", work.getTitle());
            response.put("fileName", work.getFileName());
            response.put("uploadDate", work.getUploadDate());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка загрузки файла: " + e.getMessage());
        }
    }
    
    // Получение работ ученика
    @GetMapping("/{id}/works")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    public ResponseEntity<?> getWorks(@PathVariable Long id) {
        var studentOpt = repo.findById(id);
        if (studentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        var works = workRepo.findByStudent(studentOpt.get());
        List<Map<String, Object>> result = works.stream()
                .map(w -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("workId", w.getWorkId());
                    map.put("title", w.getTitle());
                    map.put("description", w.getDescription());
                    map.put("fileName", w.getFileName());
                    map.put("fileSize", w.getFileSize());
                    map.put("uploadDate", w.getUploadDate());
                    return map;
                })
                .toList();
        
        return ResponseEntity.ok(result);
    }
    
    // Скачивание работы ученика
    @GetMapping("/{id}/works/{workId}/download")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    public ResponseEntity<Resource> downloadWork(@PathVariable Long id, @PathVariable Long workId) {
        var studentOpt = repo.findById(id);
        if (studentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        var workOpt = workRepo.findById(workId);
        if (workOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        StudentWork work = workOpt.get();
        // Проверяем, что работа принадлежит этому студенту
        if (!work.getStudent().getStudentId().equals(id)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            Path filePath = Paths.get(work.getFilePath());
            Resource resource = new FileSystemResource(filePath.toFile());
            
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + work.getFileName() + "\"");
            headers.add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    // Удаление работы ученика
    @DeleteMapping("/{id}/works/{workId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> deleteWork(@PathVariable Long id, @PathVariable Long workId, org.springframework.security.core.Authentication auth) {
        // Проверяем, что студент удаляет работу для себя
        String username = auth.getName();
        var userOpt = userRepo.findByUsername(username);
        if (userOpt.isEmpty() || userOpt.get().getRole() != Role.STUDENT) {
            return ResponseEntity.status(403).body("Доступ запрещен");
        }
        
        var studentOpt = repo.findByUser(userOpt.get());
        if (studentOpt.isEmpty() || !studentOpt.get().getStudentId().equals(id)) {
            return ResponseEntity.status(403).body("Вы можете удалять работы только из своего профиля");
        }
        
        var workOpt = workRepo.findById(workId);
        if (workOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        StudentWork work = workOpt.get();
        // Проверяем, что работа принадлежит этому студенту
        if (!work.getStudent().getStudentId().equals(id)) {
            return ResponseEntity.status(403).body("Работа не принадлежит вам");
        }
        
        try {
            // Удаляем файл с диска
            Path filePath = Paths.get(work.getFilePath());
            if (Files.exists(filePath)) {
                Files.delete(filePath);
            }
            
            // Удаляем запись из БД
            workRepo.delete(work);
            
            return ResponseEntity.ok("Работа успешно удалена");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка удаления работы: " + e.getMessage());
        }
    }
    
    // Получение оценок ученика
    @GetMapping("/{id}/grades")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<?> getStudentGrades(@PathVariable Long id, org.springframework.security.core.Authentication auth) {
        var studentOpt = repo.findById(id);
        if (studentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Student student = studentOpt.get();
        var enrollments = enrollmentRepo.findByStudent(student);
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        
        // Проверка доступа для TEACHER
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"))) {
            String username = auth.getName();
            var userOpt = userRepo.findByUsername(username);
            if (userOpt.isPresent()) {
                var teacherOpt = teacherRepo.findByUser(userOpt.get());
                if (teacherOpt.isPresent()) {
                    Teacher teacher = teacherOpt.get();
                    // Фильтруем только записи на курсы этого преподавателя
                    enrollments = enrollments.stream()
                            .filter(e -> e.getSchedule() != null && 
                                        e.getSchedule().getCourse() != null &&
                                        e.getSchedule().getCourse().getTeacher() != null &&
                                        e.getSchedule().getCourse().getTeacher().getTeacherId().equals(teacher.getTeacherId()))
                            .toList();
                }
            }
        }
        
        for (Enrollment enrollment : enrollments) {
            var grades = gradeRepo.findByEnrollment_EnrollmentId(enrollment.getEnrollmentId(), 
                    org.springframework.data.domain.Pageable.unpaged());
            for (Grade grade : grades) {
                Map<String, Object> map = new HashMap<>();
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
    
    // Получение записей ученика
    @GetMapping("/{id}/enrollments")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    public ResponseEntity<?> getStudentEnrollments(@PathVariable Long id, org.springframework.security.core.Authentication auth) {
        var studentOpt = repo.findById(id);
        if (studentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Student student = studentOpt.get();
        var enrollments = enrollmentRepo.findByStudent(student);
        
        // Проверка доступа для TEACHER
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"))) {
            String username = auth.getName();
            var userOpt = userRepo.findByUsername(username);
            if (userOpt.isPresent()) {
                var teacherOpt = teacherRepo.findByUser(userOpt.get());
                if (teacherOpt.isPresent()) {
                    Teacher teacher = teacherOpt.get();
                    // Фильтруем только записи на курсы этого преподавателя
                    enrollments = enrollments.stream()
                            .filter(e -> e.getSchedule() != null && 
                                        e.getSchedule().getCourse() != null &&
                                        e.getSchedule().getCourse().getTeacher() != null &&
                                        e.getSchedule().getCourse().getTeacher().getTeacherId().equals(teacher.getTeacherId()))
                            .toList();
                }
            }
        }
        
        List<Map<String, Object>> result = enrollments.stream()
                .map(e -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("enrollmentId", e.getEnrollmentId());
                    if (e.getSchedule() != null) {
                        map.put("scheduleId", e.getSchedule().getScheduleId());
                        if (e.getSchedule().getCourse() != null) {
                            map.put("courseId", e.getSchedule().getCourse().getCourseId());
                            map.put("courseName", e.getSchedule().getCourse().getName());
                        }
                        map.put("dateTime", e.getSchedule().getDateTime());
                    }
                    map.put("status", e.getStatus() != null ? e.getStatus().name() : null);
                    map.put("enrollmentDate", e.getEnrollmentDate());
                    return map;
                })
                .toList();
        
        return ResponseEntity.ok(result);
    }
}
