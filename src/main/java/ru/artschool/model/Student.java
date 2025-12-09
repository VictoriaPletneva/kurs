package ru.artschool.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "students")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Student {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long studentId;

    @OneToOne
    @JoinColumn(name="user_id", nullable=false)
    private User user;

    @Column(nullable=false, length=100)
    private String fullName;

    private Integer age;
    private String contactInfo;
}
