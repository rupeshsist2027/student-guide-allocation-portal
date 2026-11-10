package com.university.sgap.repository;

import com.university.sgap.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByUsernameIgnoreCase(String username);
    Optional<UserAccount> findByEmailIgnoreCase(String email);
    Optional<UserAccount> findByInvitationToken(String invitationToken);

    @Query("SELECT u FROM UserAccount u WHERE LOWER(u.username) = LOWER(:identifier) OR LOWER(u.email) = LOWER(:identifier)")
    Optional<UserAccount> findByIdentifier(String identifier);

    @Query("SELECT u.email FROM UserAccount u")
    List<String> findAllEmails();

    @Query("SELECT u.username FROM UserAccount u")
    List<String> findAllUsernames();
}

