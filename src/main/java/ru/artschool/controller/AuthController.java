package ru.artschool.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import ru.artschool.dto.AuthRequest;
import ru.artschool.model.Role;
import ru.artschool.model.Student;
import ru.artschool.model.User;
import ru.artschool.repository.StudentRepository;
import ru.artschool.repository.UserRepository;
import ru.artschool.repository.TeacherRepository;
import ru.artschool.repository.RegistrarRepository;
import ru.artschool.repository.AdminRepository;
import ru.artschool.security.JwtService;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepo;
    private final StudentRepository studentRepo;
    private final TeacherRepository teacherRepo;
    private final RegistrarRepository registrarRepo;
    private final AdminRepository adminRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthController(
            UserRepository userRepo,
            StudentRepository studentRepo,
            TeacherRepository teacherRepo,
            RegistrarRepository registrarRepo,
            AdminRepository adminRepo,
            PasswordEncoder encoder,
            JwtService jwtService
    ) {
        this.userRepo = userRepo;
        this.studentRepo = studentRepo;
        this.teacherRepo = teacherRepo;
        this.registrarRepo = registrarRepo;
        this.adminRepo = adminRepo;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {

        if (userRepo.findByUsername(req.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Такой логин уже существует");
        }

        // создаём пользователя
        User user = User.builder()
                .username(req.getUsername())
                .passwordHash(encoder.encode(req.getPassword()))
                .role(Role.STUDENT)
                .createdAt(LocalDateTime.now())
                .build();

        userRepo.save(user);

        // создаём студента сразу
        Student s = Student.builder()
                .user(user)
                .fullName(req.getUsername())      // временно = логин
                .email(req.getUsername() + "@mail.local")  // временно
                .age(18)                          // временно
                .contactInfo("Не указано")
                .build();

        studentRepo.save(s);

        return ResponseEntity.ok("Пользователь зарегистрирован");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {

        var user = userRepo.findByUsername(req.getUsername()).orElse(null);

        if (user == null || !encoder.matches(req.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(401).body("Неверный логин или пароль");
        }

        String token = jwtService.generateToken(
                org.springframework.security.core.userdetails.User
                        .withUsername(user.getUsername())
                        .password(user.getPasswordHash())
                        .roles(user.getRole().name())
                        .build(),
                user.getRole().name()
        );

        return ResponseEntity.ok(token);
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(org.springframework.security.core.Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body("Не авторизован");
        }
        
        String username = auth.getName();
        User user = userRepo.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body("Пользователь не найден");
        }
        
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("userId", user.getUserId());
        response.put("username", user.getUsername());
        response.put("role", user.getRole().name());
        
        if (user.getRole() == Role.STUDENT) {
            var studentOpt = studentRepo.findByUser(user);
            if (studentOpt.isPresent()) {
                var student = studentOpt.get();
                response.put("studentId", student.getStudentId());
                response.put("fullName", student.getFullName());
                response.put("age", student.getAge());
                response.put("email", student.getEmail());
                response.put("contactInfo", student.getContactInfo());
            }
        } else if (user.getRole() == Role.TEACHER) {
            var teacherOpt = teacherRepo.findByUser(user);
            if (teacherOpt.isPresent()) {
                var teacher = teacherOpt.get();
                response.put("teacherId", teacher.getTeacherId());
                response.put("fullName", teacher.getFullName());
                response.put("email", teacher.getEmail());
                response.put("specialization", teacher.getSpecialization());
                response.put("experience", teacher.getExperience());
            }
        } else if (user.getRole() == Role.REGISTRAR) {
            var registrarOpt = registrarRepo.findByUser(user);
            if (registrarOpt.isPresent()) {
                var registrar = registrarOpt.get();
                response.put("registrarId", registrar.getRegistrarId());
                response.put("fullName", registrar.getFullName());
                response.put("email", registrar.getEmail());
                response.put("contactInfo", registrar.getContactInfo());
                response.put("age", registrar.getAge());
            }
        } else if (user.getRole() == Role.ADMIN) {
            var adminOpt = adminRepo.findByUser(user);
            if (adminOpt.isPresent()) {
                var admin = adminOpt.get();
                response.put("fullName", admin.getFullName());
                response.put("email", admin.getEmail());
                response.put("contactInfo", admin.getContactInfo());
                response.put("age", admin.getAge());
            }
        }
        
        return ResponseEntity.ok(response);
    }
}
