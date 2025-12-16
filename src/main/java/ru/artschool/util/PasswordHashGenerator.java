package ru.artschool.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Утилита для генерации BCrypt хешей паролей
 * Запустите main метод для генерации хешей
 */
public class PasswordHashGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        
        System.out.println("=== BCrypt Password Hashes ===");
        System.out.println();
        
        System.out.println("admin123:");
        System.out.println(encoder.encode("admin123"));
        System.out.println();
        
        System.out.println("teacher123:");
        System.out.println(encoder.encode("teacher123"));
        System.out.println();
        
        System.out.println("registrar123:");
        System.out.println(encoder.encode("registrar123"));
        System.out.println();
        
        System.out.println("password123:");
        System.out.println(encoder.encode("password123"));
        System.out.println();
    }
}

























































