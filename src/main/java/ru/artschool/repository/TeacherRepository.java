package ru.artschool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.Teacher;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {

}
