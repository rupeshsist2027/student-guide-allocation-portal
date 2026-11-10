package com.university.sgap.repository;

import com.university.sgap.entity.PortalNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PortalNotificationRepository extends JpaRepository<PortalNotification, String> {
    List<PortalNotification> findAllByOrderByCreatedAtDesc();
}

