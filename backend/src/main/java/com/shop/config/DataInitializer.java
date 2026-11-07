package com.shop.config;

import com.shop.entity.Role;
import com.shop.entity.User;
import com.shop.repository.RoleRepository;
import com.shop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Ensure admin password is correctly hashed
        userRepository.findByEmail("admin@shop.local").ifPresent(admin -> {
            // Always reset to known password for demo convenience
            admin.setPasswordHash(passwordEncoder.encode("Admin@123"));
            userRepository.save(admin);
            log.info("Admin user ready → email=admin@shop.local  password=Admin@123");
        });

        // Create staff if missing
        if (userRepository.findByEmail("staff@shop.local").isEmpty()) {
            Role staffRole = roleRepository.findByName("ROLE_STAFF")
                    .orElseThrow();
            User staff = User.builder()
                    .fullName("Store Staff")
                    .email("staff@shop.local")
                    .passwordHash(passwordEncoder.encode("Staff@123"))
                    .phoneNumber("098765432")
                    .enabled(true)
                    .roles(Set.of(staffRole))
                    .build();
            userRepository.save(staff);
            log.info("Staff user created → email=staff@shop.local  password=Staff@123");
        } else {
            userRepository.findByEmail("staff@shop.local").ifPresent(staff -> {
                staff.setPasswordHash(passwordEncoder.encode("Staff@123"));
                userRepository.save(staff);
            });
        }
    }
}
