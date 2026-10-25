-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `password_hash` VARCHAR(100) NOT NULL,
    `role` ENUM('MAHASISWA', 'DOSEN', 'ADMIN') NOT NULL,
    `nim` VARCHAR(20) NULL,
    `nidn` VARCHAR(20) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_nim_key`(`nim`),
    UNIQUE INDEX `users_nidn_key`(`nidn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `devices` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `device_id` VARCHAR(100) NOT NULL,
    `label` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `devices_user_id_device_id_key`(`user_id`, `device_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `device_id` VARCHAR(100) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_clients` (
    `id` VARCHAR(36) NOT NULL,
    `client_id` VARCHAR(60) NOT NULL,
    `secret_hash` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `service_clients_client_id_key`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kelas` (
    `id` VARCHAR(36) NOT NULL,
    `kode` VARCHAR(20) NOT NULL,
    `kode_mk` VARCHAR(20) NOT NULL,
    `mata_kuliah` VARCHAR(100) NOT NULL,
    `sks` INTEGER NOT NULL,
    `semester` VARCHAR(20) NOT NULL,
    `dosen_id` VARCHAR(36) NOT NULL,
    `finalized_at` DATETIME(3) NULL,
    `transkrip_synced_at` DATETIME(3) NULL,

    UNIQUE INDEX `kelas_kode_key`(`kode`),
    INDEX `kelas_dosen_id_idx`(`dosen_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nilai` (
    `id` VARCHAR(36) NOT NULL,
    `kelas_id` VARCHAR(36) NOT NULL,
    `mahasiswa_id` VARCHAR(36) NOT NULL,
    `score` DOUBLE NULL,
    `status` ENUM('DRAFT', 'FINAL') NOT NULL DEFAULT 'DRAFT',
    `finalized_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nilai_kelas_id_mahasiswa_id_key`(`kelas_id`, `mahasiswa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transkrip_entries` (
    `id` VARCHAR(36) NOT NULL,
    `mahasiswa_id` VARCHAR(36) NOT NULL,
    `kelas_id` VARCHAR(36) NOT NULL,
    `kode_mk` VARCHAR(20) NOT NULL,
    `mata_kuliah` VARCHAR(100) NOT NULL,
    `sks` INTEGER NOT NULL,
    `semester` VARCHAR(20) NOT NULL,
    `nilai_angka` DOUBLE NOT NULL,
    `nilai_huruf` VARCHAR(2) NOT NULL,
    `bobot` DOUBLE NOT NULL,
    `synced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transkrip_entries_mahasiswa_id_kelas_id_key`(`mahasiswa_id`, `kelas_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `request_id` VARCHAR(36) NOT NULL,
    `subject_type` ENUM('USER', 'SERVICE', 'ANONYMOUS') NOT NULL,
    `subject_id` VARCHAR(60) NULL,
    `role` VARCHAR(20) NULL,
    `method` VARCHAR(10) NOT NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `device_id` VARCHAR(100) NULL,
    `ip` VARCHAR(64) NULL,
    `decision` ENUM('ALLOW', 'DENY') NOT NULL,
    `reason` VARCHAR(80) NOT NULL,

    INDEX `audit_logs_created_at_idx`(`created_at`),
    INDEX `audit_logs_subject_id_idx`(`subject_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `devices` ADD CONSTRAINT `devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kelas` ADD CONSTRAINT `kelas_dosen_id_fkey` FOREIGN KEY (`dosen_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nilai` ADD CONSTRAINT `nilai_kelas_id_fkey` FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nilai` ADD CONSTRAINT `nilai_mahasiswa_id_fkey` FOREIGN KEY (`mahasiswa_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transkrip_entries` ADD CONSTRAINT `transkrip_entries_mahasiswa_id_fkey` FOREIGN KEY (`mahasiswa_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
