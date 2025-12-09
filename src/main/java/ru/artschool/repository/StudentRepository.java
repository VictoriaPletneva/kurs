package ru.artschool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.Student;

public interface StudentRepository extends JpaRepository<Student, Long> {

}
