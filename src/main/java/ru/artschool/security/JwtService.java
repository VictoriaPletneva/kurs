package ru.artschool.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String SECRET_KEY;

    private long EXPIRATION = 1000 * 60 * 60 * 24; // 24 часа

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        return generateToken(claims, userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        try {
            return Jwts
                    .parserBuilder()
                    .setSigningKey(getSignInKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            throw new RuntimeException("Токен истек", e);
        } catch (io.jsonwebtoken.JwtException e) {
            throw new RuntimeException("Неверный токен: " + e.getMessage(), e);
        }
    }

    private Key getSignInKey() {
        byte[] keyBytes;
        try {
            // Пытаемся декодировать как base64
            keyBytes = Decoders.BASE64.decode(SECRET_KEY);
        } catch (Exception e) {
            // Если не base64, используем строку напрямую в UTF-8
            keyBytes = SECRET_KEY.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
        
        // Для HS256 нужен ключ минимум 256 бит (32 байта)
        // Если ключ короче, дополняем его до 32 байт
        if (keyBytes.length < 32) {
            byte[] paddedKey = new byte[32];
            System.arraycopy(keyBytes, 0, paddedKey, 0, Math.min(keyBytes.length, 32));
            // Заполняем остаток повторением ключа
            for (int i = keyBytes.length; i < 32; i++) {
                paddedKey[i] = keyBytes[i % keyBytes.length];
            }
            keyBytes = paddedKey;
        } else if (keyBytes.length > 32) {
            // Если ключ длиннее, обрезаем до 32 байт (можно использовать SHA-256 для хеширования)
            byte[] trimmedKey = new byte[32];
            System.arraycopy(keyBytes, 0, trimmedKey, 0, 32);
            keyBytes = trimmedKey;
        }
        
        return Keys.hmacShaKeyFor(keyBytes);
    }
}