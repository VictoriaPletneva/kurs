package ru.artschool.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import ru.artschool.model.*;
import ru.artschool.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/registrars")
@PreAuthorize("hasAnyRole('ADMIN', 'REGISTRAR')")
public class RegistrarController {

    private final UserRepository userRepo;
    private final StudentRepository studentRepo;
    private final TeacherRepository teacherRepo;
    private final CourseRepository courseRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final ScheduleRepository scheduleRepo;
    private final PasswordEncoder passwordEncoder;
    private final RegistrarRepository registrarRepo;

    public RegistrarController(UserRepository userRepo, StudentRepository studentRepo,
                              TeacherRepository teacherRepo, CourseRepository courseRepo,
                              EnrollmentRepository enrollmentRepo, ScheduleRepository scheduleRepo,
                              PasswordEncoder passwordEncoder, RegistrarRepository registrarRepo) {
        this.userRepo = userRepo;
        this.studentRepo = studentRepo;
        this.teacherRepo = teacherRepo;
        this.courseRepo = courseRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.scheduleRepo = scheduleRepo;
        this.passwordEncoder = passwordEncoder;
        this.registrarRepo = registrarRepo;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRegistrar(@PathVariable Long id, @RequestBody Map<String, Object> updates, Authentication auth) {
        User user = userRepo.findById(id).orElse(null);
        if (user == null || user.getRole() != Role.REGISTRAR) {
            return ResponseEntity.notFound().build();
        }
        
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_REGISTRAR"))) {
            String username = auth.getName();
            if (!user.getUsername().equals(username)) {
                return ResponseEntity.status(403).body("Доступ запрещён");
            }
        }
        
        var registrarOpt = registrarRepo.findByUser(user);
        Registrar registrar;
        if (registrarOpt.isPresent()) {
            registrar = registrarOpt.get();
        } else {
            registrar = Registrar.builder()
                    .user(user)
                    .fullName((String) updates.getOrDefault("fullName", user.getUsername()))
                    .email((String) updates.getOrDefault("email", user.getUsername() + "@mail.local"))
                    .contactInfo((String) updates.getOrDefault("contactInfo", "Не указано"))
                    .age(updates.get("age") != null ? Integer.valueOf(updates.get("age").toString()) : null)
                    .build();
        }
        
        if (updates.containsKey("fullName")) {
            registrar.setFullName((String) updates.get("fullName"));
        }
        if (updates.containsKey("email")) {
            registrar.setEmail((String) updates.get("email"));
        }
        if (updates.containsKey("contactInfo")) {
            registrar.setContactInfo((String) updates.get("contactInfo"));
        }
        if (updates.containsKey("age")) {
            registrar.setAge(updates.get("age") != null ? Integer.valueOf(updates.get("age").toString()) : null);
        }
        if (updates.containsKey("username")) {
            user.setUsername((String) updates.get("username"));
            userRepo.save(user);
        }
        
        registrarRepo.save(registrar);
        return ResponseEntity.ok("Профиль регистратора обновлен");
    }
    
    @GetMapping("/me")
    @PreAuthorize("hasRole('REGISTRAR')")
    public ResponseEntity<?> getMyProfile(Authentication auth) {
        String username = auth.getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        var registrarOpt = registrarRepo.findByUser(user);
        
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getUserId());
        response.put("username", user.getUsername());
        response.put("role", user.getRole().name());
        
        if (registrarOpt.isPresent()) {
            var registrar = registrarOpt.get();
            response.put("fullName", registrar.getFullName());
            response.put("email", registrar.getEmail());
            response.put("contactInfo", registrar.getContactInfo());
            response.put("age", registrar.getAge());
        }
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/register-user")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, Object> request) {
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
            
            Teacher teacher = new Teacher();
            teacher.setUser(user);
            teacher.setFullName(fullName != null ? fullName : username);
            teacher.setEmail(email != null ? email : username + "@mail.local");
            teacher.setSpecialization(specialization);
            teacher.setExperience(experience);
            teacherRepo.save(teacher);
        }
        
        return ResponseEntity.ok("Пользователь успешно зарегистрирован");
    }
    
    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN', 'REGISTRAR')")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepo.findAll();
        List<Map<String, Object>> result = users.stream()
                .map(user -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("userId", user.getUserId());
                    map.put("username", user.getUsername());
                    map.put("role", user.getRole().name());
                    map.put("createdAt", user.getCreatedAt());
                    
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
                    }
                    
                    return map;
                })
                .toList();
        return ResponseEntity.ok(result);
    }
}
