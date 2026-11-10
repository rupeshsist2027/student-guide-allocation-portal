CREATE TABLE IF NOT EXISTS departments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    must_set_password BOOLEAN NOT NULL DEFAULT TRUE,
    invitation_token VARCHAR(128) NULL UNIQUE,
    invitation_expires_at DATETIME NULL,
    account_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ACTIVATION',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    register_number VARCHAR(50) NOT NULL UNIQUE,
    student_name VARCHAR(150) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    department_id BIGINT NOT NULL,
    academic_year VARCHAR(30) NOT NULL,
    section VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    batch VARCHAR(40) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_students_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faculty (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    faculty_id VARCHAR(50) NOT NULL UNIQUE,
    faculty_name VARCHAR(150) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    department_id BIGINT NOT NULL,
    designation VARCHAR(120) NOT NULL,
    specialization VARCHAR(200) NOT NULL,
    office VARCHAR(150) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_faculty_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_faculty_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_statistics (
    id BIGINT PRIMARY KEY,
    total_students INT NOT NULL DEFAULT 0,
    total_faculty INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_capacity_settings (
    id BIGINT PRIMARY KEY,
    total_students INT NOT NULL,
    total_guides INT NOT NULL,
    students_per_team INT NOT NULL,
    max_teams_mode VARCHAR(20) NOT NULL,
    custom_max_teams_per_guide INT NOT NULL,
    configured_teams_per_guide INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_sequences (
    seq_name VARCHAR(64) PRIMARY KEY,
    next_val INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_teams (
    team_id VARCHAR(40) PRIMARY KEY,
    team_number INT NULL,
    team_name VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    lead_register_number VARCHAR(50) NOT NULL,
    project_title VARCHAR(255) NOT NULL,
    created_at VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_team_members (
    id VARCHAR(60) PRIMARY KEY,
    team_id VARCHAR(40) NOT NULL,
    register_number VARCHAR(50) NOT NULL UNIQUE,
    member_name VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    role VARCHAR(40) NOT NULL,
    joined_at VARCHAR(50) NOT NULL,
    CONSTRAINT fk_member_team FOREIGN KEY (team_id) REFERENCES portal_teams(team_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_guide_allocations (
    allocation_id VARCHAR(40) PRIMARY KEY,
    allocation_order INT NOT NULL,
    team_id VARCHAR(40) NOT NULL UNIQUE,
    faculty_id VARCHAR(50) NOT NULL,
    allocated_at VARCHAR(50) NOT NULL,
    allocation_date VARCHAR(40) NOT NULL,
    status VARCHAR(40) NOT NULL,
    CONSTRAINT fk_alloc_team FOREIGN KEY (team_id) REFERENCES portal_teams(team_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_project_topics (
    topic_id VARCHAR(40) PRIMARY KEY,
    faculty_id VARCHAR(50) NOT NULL,
    project_title VARCHAR(255) NOT NULL,
    project_domain VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    technologies_used VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_project_progress (
    team_id VARCHAR(40) PRIMARY KEY,
    faculty_id VARCHAR(50) NOT NULL,
    stage VARCHAR(80) NOT NULL,
    feedback TEXT NOT NULL,
    updated_at VARCHAR(50) NOT NULL,
    updated_date VARCHAR(40) NOT NULL,
    CONSTRAINT fk_progress_team FOREIGN KEY (team_id) REFERENCES portal_teams(team_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_notifications (
    id VARCHAR(60) PRIMARY KEY,
    audience VARCHAR(40) NOT NULL,
    faculty_id VARCHAR(50) NULL,
    category VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    timestamp_label VARCHAR(40) NOT NULL,
    tag VARCHAR(40) NOT NULL,
    variant VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    import_type VARCHAR(30) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    strategy VARCHAR(40) NOT NULL,
    total_records INT NOT NULL,
    imported_records INT NOT NULL,
    failed_records INT NOT NULL,
    duplicate_records INT NOT NULL,
    invalid_records INT NOT NULL,
    imported_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

