package com.university.sgap.repository;

import com.university.sgap.entity.Student;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByRegisterNumber(String registerNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Student s WHERE s.registerNumber = :registerNumber")
    Optional<Student> findByRegisterNumberForUpdate(@Param("registerNumber") String registerNumber);

    boolean existsByRegisterNumber(String registerNumber);

    @Query("SELECT s.registerNumber FROM Student s")
    List<String> findAllRegisterNumbers();

    @Query("SELECT s.email FROM Student s")
    List<String> findAllEmails();

    List<Student> findAllByOrderByIdAsc();
}
