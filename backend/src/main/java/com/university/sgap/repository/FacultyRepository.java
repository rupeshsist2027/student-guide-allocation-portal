package com.university.sgap.repository;

import com.university.sgap.entity.Faculty;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FacultyRepository extends JpaRepository<Faculty, Long> {
    Optional<Faculty> findByFacultyId(String facultyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM Faculty f WHERE f.facultyId = :facultyId")
    Optional<Faculty> findByFacultyIdForUpdate(@Param("facultyId") String facultyId);

    @Query("SELECT f.facultyId FROM Faculty f")
    List<String> findAllFacultyIds();

    @Query("SELECT f.email FROM Faculty f")
    List<String> findAllEmails();

    List<Faculty> findAllByOrderByIdAsc();
}
