package ru.artschool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.artschool.model.RoleHistory;

public interface RoleHistoryRepository extends JpaRepository<RoleHistory, Long> {
}