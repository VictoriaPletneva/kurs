package ru.artschool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.Student;
import ru.artschool.model.User;

import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByUser(User user);
}
