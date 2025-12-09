package ru.artschool.controller;

import org.springframework.web.bind.annotation.*;
import ru.artschool.model.Course;
import ru.artschool.repository.CourseRepository;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseRepository repo;

    public CourseController(CourseRepository repo){
        this.repo = repo;
    }

    @GetMapping
    public List<Course> list(@RequestParam(required = false) String q){
        if (q == null || q.isBlank()) return repo.findAll();
        return repo.findByNameContainingIgnoreCase(q);
    }

    @PostMapping
    public Course create(@RequestBody Course course){
        return repo.save(course);
    }

    @GetMapping("/{id}")
    public Course get(@PathVariable Long id){
        return repo.findById(id).orElseThrow();
    }

    @PutMapping("/{id}")
    public Course update(@PathVariable Long id, @RequestBody Course c){
        Course existing = repo.findById(id).orElseThrow();
        existing.setName(c.getName());
        existing.setDescription(c.getDescription());
        existing.setMaxStudents(c.getMaxStudents());
        existing.setStatus(c.getStatus());
        return repo.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id){
        repo.deleteById(id);
    }
}
