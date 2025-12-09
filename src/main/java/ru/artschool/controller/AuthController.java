package ru.artschool.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import ru.artschool.dto.AuthRequest;
import ru.artschool.model.Role;
import ru.artschool.model.User;
import ru.artschool.repository.UserRepository;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;

    public AuthController(UserRepository userRepo, PasswordEncoder encoder) {
        this.userRepo = userRepo;
        this.encoder = encoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {
        if (req == null || req.getUsername() == null || req.getPassword() == null) {
            return ResponseEntity.badRequest().body("Неверный запрос");
        }

        if (userRepo.findByUsername(req.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Такой логин уже существует");
        }

        User user = User.builder()
                .username(req.getUsername())
                .passwordHash(encoder.encode(req.getPassword()))
                .role(Role.STUDENT)
                .createdAt(LocalDateTime.now())
                .build();

        userRepo.save(user);

        return ResponseEntity.ok("Пользователь зарегистрирован");
    }
}
