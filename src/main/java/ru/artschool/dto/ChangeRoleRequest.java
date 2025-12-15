package ru.artschool.dto;

import lombok.Data;
import ru.artschool.model.Role;

@Data
public class ChangeRoleRequest {
    private Role newRole;
}