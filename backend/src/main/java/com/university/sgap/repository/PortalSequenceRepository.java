package com.university.sgap.repository;

import com.university.sgap.entity.PortalSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PortalSequenceRepository extends JpaRepository<PortalSequence, String> {

    @Modifying(flushAutomatically = true, clearAutomatically = false)
    @Query(
            value = "INSERT IGNORE INTO portal_sequences (seq_name, next_val) VALUES (:seqName, :initialVal)",
            nativeQuery = true
    )
    void ensureRowExists(@Param("seqName") String seqName, @Param("initialVal") int initialVal);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM PortalSequence s WHERE s.seqName = :seqName")
    Optional<PortalSequence> findBySeqNameForUpdate(@Param("seqName") String seqName);
}

