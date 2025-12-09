package ru.artschool.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique=true, nullable=false, length=50)
    private String username;

    @Column(nullable=false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private Role role;

    private java.time.LocalDateTime createdAt;
}
