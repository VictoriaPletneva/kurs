package ru.artschool.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.artschool.dto.CreateTeacherRequest;
import ru.artschool.dto.TeacherDto;
import ru.artschool.dto.UpdateTeacherRequest;
import ru.artschool.model.Teacher;
import ru.artschool.repository.TeacherRepository;

import java.util.List;

@RestController
@RequestMapping("/api/teachers")
@RequiredArgsConstructor
public class TeacherController {

    private final TeacherRepository repo;

    // ADMIN + TEACHER + REGISTRAR
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'REGISTRAR')")
    public List<TeacherDto> getAll() {
        return repo.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    // ADMIN + TEACHER
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<TeacherDto> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(t -> ResponseEntity.ok(toDto(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ADMIN
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TeacherDto> create(@RequestBody CreateTeacherRequest req) {
        Teacher t = new Teacher();
        t.setFullName(req.getFullName());
        t.setSpecialization(req.getSpecialization());
        t.setExperience(req.getExperience());
        t.setEmail(req.getEmail());
        repo.save(t);
        return ResponseEntity.ok(toDto(t));
    }

    // ADMIN
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TeacherDto> update(
            @PathVariable Long id,
            @RequestBody UpdateTeacherRequest req
    ) {
        return repo.findById(id)
                .map(t -> {
                    t.setFullName(req.getFullName());
                    t.setSpecialization(req.getSpecialization());
                    t.setExperience(req.getExperience());
                    t.setEmail(req.getEmail());
                    repo.save(t);
                    return ResponseEntity.ok(toDto(t));
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

    private TeacherDto toDto(Teacher t) {
        return TeacherDto.builder()
                .id(t.getTeacherId())
                .userId(t.getUser() != null ? t.getUser().getUserId() : null)
                .fullName(t.getFullName())
                .specialization(t.getSpecialization())
                .experience(t.getExperience())
                .email(t.getEmail())
                .build();
    }
}
