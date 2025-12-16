package ru.artschool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.Student;
import ru.artschool.model.StudentWork;

import java.util.List;

public interface StudentWorkRepository extends JpaRepository<StudentWork, Long> {
    List<StudentWork> findByStudent(Student student);
    List<StudentWork> findByStudent_StudentId(Long studentId);
}

