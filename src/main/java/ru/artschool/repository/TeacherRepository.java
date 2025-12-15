package ru.artschool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.Teacher;
import ru.artschool.model.User;

import java.util.Optional;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    Optional<Teacher> findByUser(User user);
}
