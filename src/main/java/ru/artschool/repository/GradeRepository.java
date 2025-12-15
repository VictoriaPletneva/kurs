package ru.artschool.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.Grade;

public interface GradeRepository extends JpaRepository<Grade, Long> {
    Page<Grade> findByEnrollment_EnrollmentId(Long enrollmentId, Pageable pageable);
}