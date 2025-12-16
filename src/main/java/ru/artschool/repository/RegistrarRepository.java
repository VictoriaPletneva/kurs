package ru.artschool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.Registrar;
import ru.artschool.model.User;

import java.util.Optional;

public interface RegistrarRepository extends JpaRepository<Registrar, Long> {
    Optional<Registrar> findByUser(User user);
}
