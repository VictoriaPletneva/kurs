package ru.artschool.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "role_histories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long historyId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    private Role oldRole;

    @Enumerated(EnumType.STRING)
    private Role newRole;

    private LocalDateTime changedAt = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "changed_by")
    private User changedBy;
}