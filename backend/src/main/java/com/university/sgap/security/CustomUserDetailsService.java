package com.university.sgap.security;

import com.university.sgap.entity.AccountStatus;
import com.university.sgap.entity.UserAccount;
import com.university.sgap.repository.UserAccountRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserAccountRepository userAccountRepository;

    public CustomUserDetailsService(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        UserAccount account = userAccountRepository.findByIdentifier(identifier)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + identifier));

        boolean enabled = account.getAccountStatus() != AccountStatus.DISABLED;
        return new User(
                account.getUsername(),
                account.getPasswordHash(),
                enabled,
                true,
                true,
                true,
                List.of(new SimpleGrantedAuthority("ROLE_" + account.getRole().name()))
        );
    }
}

