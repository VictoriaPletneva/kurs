package ru.artschool.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import ru.artschool.dto.ChangeRoleRequest;
import ru.artschool.model.*;
import ru.artschool.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepo;
    private final RoleHistoryRepository historyRepo;
    private final StudentRepository studentRepo;
    private final TeacherRepository teacherRepo;
    private final CourseRepository courseRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final PasswordEncoder passwordEncoder;
    private final AdminRepository adminRepo;
    private final RegistrarRepository registrarRepo;
    private final ScheduleRepository scheduleRepo;

    public AdminController(UserRepository userRepo, RoleHistoryRepository historyRepo,
                          StudentRepository studentRepo, TeacherRepository teacherRepo,
                          CourseRepository courseRepo, EnrollmentRepository enrollmentRepo,
                          PasswordEncoder passwordEncoder, AdminRepository adminRepo,
                          RegistrarRepository registrarRepo, ScheduleRepository scheduleRepo) {
        this.userRepo = userRepo;
        this.historyRepo = historyRepo;
        this.studentRepo = studentRepo;
        this.teacherRepo = teacherRepo;
        this.courseRepo = courseRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.passwordEncoder = passwordEncoder;
        this.adminRepo = adminRepo;
        this.registrarRepo = registrarRepo;
        this.scheduleRepo = scheduleRepo;
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepo.findAll();
        List<Map<String, Object>> result = users.stream()
                .map(user -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("userId", user.getUserId());
                    map.put("username", user.getUsername());
                    map.put("role", user.getRole().name());
                    map.put("createdAt", user.getCreatedAt());
                    
                    // Добавляем дополнительную информацию в зависимости от роли
                    if (user.getRole() == Role.STUDENT) {
                        var studentOpt = studentRepo.findByUser(user);
                        if (studentOpt.isPresent()) {
                            var student = studentOpt.get();
                            map.put("fullName", student.getFullName());
                            map.put("email", student.getEmail());
                            map.put("age", student.getAge());
                            map.put("contactInfo", student.getContactInfo());
                        }
                    } else if (user.getRole() == Role.TEACHER) {
                        var teacherOpt = teacherRepo.findByUser(user);
                        if (teacherOpt.isPresent()) {
                            var teacher = teacherOpt.get();
                            map.put("fullName", teacher.getFullName());
                            map.put("email", teacher.getEmail());
                            map.put("specialization", teacher.getSpecialization());
                            map.put("experience", teacher.getExperience());
                        }
                    } else if (user.getRole() == Role.REGISTRAR) {
                        var registrarOpt = registrarRepo.findByUser(user);
                        if (registrarOpt.isPresent()) {
                            var registrar = registrarOpt.get();
                            map.put("fullName", registrar.getFullName());
                            map.put("email", registrar.getEmail());
                            map.put("contactInfo", registrar.getContactInfo());
                            map.put("age", registrar.getAge());
                        }
                    } else if (user.getRole() == Role.ADMIN) {
                        var adminOpt = adminRepo.findByUser(user);
                        if (adminOpt.isPresent()) {
                            var admin = adminOpt.get();
                            map.put("fullName", admin.getFullName());
                            map.put("email", admin.getEmail());
                            map.put("contactInfo", admin.getContactInfo());
                            map.put("age", admin.getAge());
                        }
                    }
                    
                    return map;
                })
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> request) {
        String username = (String) request.get("username");
        String password = (String) request.get("password");
        String roleStr = (String) request.get("role");
        
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body("Логин обязателен");
        }
        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body("Пароль обязателен");
        }
        if (roleStr == null) {
            return ResponseEntity.badRequest().body("Роль обязательна");
        }
        
        if (userRepo.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body("Пользователь с таким логином уже существует");
        }
        
        Role role;
        try {
            role = Role.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Неверная роль");
        }
        
        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .createdAt(LocalDateTime.now())
                .build();
        user = userRepo.save(user);
        
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getUserId());
        response.put("username", user.getUsername());
        response.put("role", user.getRole().name());
        response.put("password", password); // Возвращаем пароль для отображения админу
        
        // Создаем соответствующую сущность
        if (role == Role.STUDENT) {
            String fullName = (String) request.get("fullName");
            String email = (String) request.get("email");
            Integer age = request.get("age") != null ? Integer.valueOf(request.get("age").toString()) : null;
            String contactInfo = (String) request.get("contactInfo");
            
            Student student = Student.builder()
                    .user(user)
                    .fullName(fullName != null ? fullName : username)
                    .email(email != null ? email : username + "@mail.local")
                    .age(age != null ? age : 18)
                    .contactInfo(contactInfo != null ? contactInfo : "Не указано")
                    .registrationDate(LocalDateTime.now())
                    .build();
            studentRepo.save(student);
        } else if (role == Role.TEACHER) {
            String fullName = (String) request.get("fullName");
            String email = (String) request.get("email");
            String specialization = (String) request.get("specialization");
            Integer experience = request.get("experience") != null ? Integer.valueOf(request.get("experience").toString()) : null;
            
            // Убеждаемся, что user сохранен и имеет ID
            if (user.getUserId() == null) {
                user = userRepo.save(user);
            }
            
            Teacher teacher = new Teacher();
            teacher.setUser(user);
            teacher.setFullName(fullName != null ? fullName : username);
            teacher.setEmail(email != null ? email : username + "@mail.local");
            teacher.setSpecialization(specialization);
            teacher.setExperience(experience);
            teacherRepo.save(teacher);
        }
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'REGISTRAR')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userRepo.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        
        try {
            // Удаляем связанные сущности
            if (user.getRole() == Role.TEACHER) {
                var teacherOpt = teacherRepo.findByUser(user);
                if (teacherOpt.isPresent()) {
                    var teacher = teacherOpt.get();
                    // Удаляем все курсы преподавателя (расписания и записи удалятся каскадно)
                    var courses = courseRepo.findAll().stream()
                            .filter(c -> c.getTeacher() != null && c.getTeacher().getTeacherId().equals(teacher.getTeacherId()))
                            .toList();
                    for (var course : courses) {
                        // Удаляем все расписания курса
                        var schedules = scheduleRepo.findAll().stream()
                                .filter(s -> s.getCourse() != null && s.getCourse().getCourseId().equals(course.getCourseId()))
                                .toList();
                        for (var schedule : schedules) {
                            var enrollments = enrollmentRepo.findBySchedule(schedule);
                            enrollmentRepo.deleteAll(enrollments);
                        }
                        scheduleRepo.deleteAll(schedules);
                        courseRepo.delete(course);
                    }
                    // Удаляем преподавателя
                    teacherRepo.delete(teacher);
                }
            } else if (user.getRole() == Role.STUDENT) {
                var studentOpt = studentRepo.findByUser(user);
                if (studentOpt.isPresent()) {
                    var student = studentOpt.get();
                    var enrollments = enrollmentRepo.findByStudent(student);
                    enrollmentRepo.deleteAll(enrollments);
                    studentRepo.delete(student);
                }
            } else if (user.getRole() == Role.REGISTRAR) {
                var registrarOpt = registrarRepo.findByUser(user);
                if (registrarOpt.isPresent()) {
                    registrarRepo.delete(registrarOpt.get());
                }
            } else if (user.getRole() == Role.ADMIN) {
                var adminOpt = adminRepo.findByUser(user);
                if (adminOpt.isPresent()) {
                    adminRepo.delete(adminOpt.get());
                }
            }
            
            userRepo.delete(user);
            return ResponseEntity.ok("Пользователь успешно удален");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.status(409).body("Нельзя удалить пользователя: есть связанные записи. " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка удаления пользователя: " + e.getMessage());
        }
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        User user = userRepo.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        
        if (updates.containsKey("username")) {
            String newUsername = (String) updates.get("username");
            if (newUsername != null && !newUsername.isBlank()) {
                var existingUser = userRepo.findByUsername(newUsername);
                if (existingUser.isPresent() && !existingUser.get().getUserId().equals(id)) {
                    return ResponseEntity.badRequest().body("Пользователь с таким логином уже существует");
                }
                user.setUsername(newUsername);
            }
        }
        
        if (updates.containsKey("password")) {
            String newPassword = (String) updates.get("password");
            if (newPassword != null && !newPassword.isBlank()) {
                user.setPasswordHash(passwordEncoder.encode(newPassword));
            }
        }
        
        userRepo.save(user);
        return ResponseEntity.ok("Пользователь обновлен");
    }
    
    @PutMapping("/profile")
    public ResponseEntity<?> updateAdminProfile(@RequestBody Map<String, Object> updates, Authentication auth) {
        String username = auth.getName();
        User user = userRepo.findByUsername(username).orElse(null);
        if (user == null || user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).body("Доступ запрещён");
        }
        
        var adminOpt = adminRepo.findByUser(user);
        Admin admin;
        if (adminOpt.isPresent()) {
            admin = adminOpt.get();
        } else {
            admin = Admin.builder()
                    .user(user)
                    .fullName((String) updates.getOrDefault("fullName", user.getUsername()))
                    .email((String) updates.getOrDefault("email", user.getUsername() + "@mail.local"))
                    .contactInfo((String) updates.getOrDefault("contactInfo", "Не указано"))
                    .age(updates.get("age") != null ? Integer.valueOf(updates.get("age").toString()) : null)
                    .build();
        }
        
        if (updates.containsKey("fullName")) {
            admin.setFullName((String) updates.get("fullName"));
        }
        if (updates.containsKey("email")) {
            admin.setEmail((String) updates.get("email"));
        }
        if (updates.containsKey("contactInfo")) {
            admin.setContactInfo((String) updates.get("contactInfo"));
        }
        if (updates.containsKey("age")) {
            admin.setAge(updates.get("age") != null ? Integer.valueOf(updates.get("age").toString()) : null);
        }
        if (updates.containsKey("username")) {
            String newUsername = (String) updates.get("username");
            if (newUsername != null && !newUsername.isBlank()) {
                var existingUser = userRepo.findByUsername(newUsername);
                if (existingUser.isPresent() && !existingUser.get().getUserId().equals(user.getUserId())) {
                    return ResponseEntity.badRequest().body("Пользователь с таким логином уже существует");
                }
                user.setUsername(newUsername);
                userRepo.save(user);
            }
        }
        if (updates.containsKey("password")) {
            String newPassword = (String) updates.get("password");
            if (newPassword != null && !newPassword.isBlank()) {
                user.setPasswordHash(passwordEncoder.encode(newPassword));
                userRepo.save(user);
            }
        }
        
        adminRepo.save(admin);
        return ResponseEntity.ok("Профиль администратора обновлен");
    }
    
    @GetMapping("/profile")
    public ResponseEntity<?> getAdminProfile(Authentication auth) {
        String username = auth.getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        var adminOpt = adminRepo.findByUser(user);
        
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getUserId());
        response.put("username", user.getUsername());
        response.put("role", user.getRole().name());
        
        if (adminOpt.isPresent()) {
            var admin = adminOpt.get();
            response.put("fullName", admin.getFullName());
            response.put("email", admin.getEmail());
            response.put("contactInfo", admin.getContactInfo());
            response.put("age", admin.getAge());
        }
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable Long id, @RequestBody ChangeRoleRequest req, Authentication auth) {
        User user = userRepo.findById(id).orElseThrow();
        String adminUsername = auth.getName();
        User admin = userRepo.findByUsername(adminUsername).orElseThrow();

        Role oldRole = user.getRole();
        Role newRole = req.getNewRole();
        
        // Если роль не изменилась, просто возвращаем успех
        if (oldRole == newRole) {
            return ResponseEntity.ok("Роль уже установлена");
        }
        
        // Сохраняем старую роль для истории
        RoleHistory history = RoleHistory.builder()
                .user(user)
                .oldRole(oldRole)
                .newRole(newRole)
                .changedBy(admin)
                .build();
        
        // Обновляем роль пользователя
        user.setRole(newRole);
        user = userRepo.save(user);
        
        // Сохраняем историю после успешного обновления
        historyRepo.save(history);

        return ResponseEntity.ok("Роль успешно изменена");
    }
    
    @GetMapping("/role-history")
    public ResponseEntity<?> getRoleHistory() {
        List<RoleHistory> history = historyRepo.findAll();
        List<Map<String, Object>> result = history.stream()
                .map(h -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("historyId", h.getHistoryId());
                    map.put("userId", h.getUser().getUserId());
                    map.put("username", h.getUser().getUsername());
                    map.put("oldRole", h.getOldRole().name());
                    map.put("newRole", h.getNewRole().name());
                    map.put("changedBy", h.getChangedBy() != null ? h.getChangedBy().getUsername() : null);
                    map.put("changedAt", h.getChangedAt());
                    return map;
                })
                .sorted((a, b) -> {
                    LocalDateTime dateA = (LocalDateTime) a.get("changedAt");
                    LocalDateTime dateB = (LocalDateTime) b.get("changedAt");
                    if (dateA == null) return 1;
                    if (dateB == null) return -1;
                    return dateB.compareTo(dateA);
                })
                .toList();
        return ResponseEntity.ok(result);
    }
    
    // Получение записей студента по userId (для учителя)
    @GetMapping("/users/{userId}/enrollments")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<?> getUserEnrollments(@PathVariable Long userId) {
        User user = userRepo.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        
        if (user.getRole() != Role.STUDENT) {
            return ResponseEntity.badRequest().body("Пользователь не является студентом");
        }
        
        var studentOpt = studentRepo.findByUser(user);
        if (studentOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Профиль студента не найден");
        }
        
        var enrollments = enrollmentRepo.findByStudent(studentOpt.get());
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