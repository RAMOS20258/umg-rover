-- ============================================================
-- UMG Basic Rover 2.0 - MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS UMGRover
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE UMGRover;

-- ─────────────────────────────────────────────────────────
-- TABLA: conductores
-- ─────────────────────────────────────────────────────────
CREATE TABLE conductores (
    id              VARCHAR(36) PRIMARY KEY,
    email           VARCHAR(150) NOT NULL UNIQUE,
    phone           VARCHAR(20) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(50) NOT NULL UNIQUE,
    avatar_base64   LONGTEXT NULL,             -- Base64 de la imagen
    role            VARCHAR(20) NOT NULL DEFAULT 'conductor', -- 'conductor' | 'admin'
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    qr_login_token  VARCHAR(64) NULL,
    updated_at      DATETIME NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────
-- TABLA: bitacora_accesos (log de login/logout)
-- ─────────────────────────────────────────────────────────
CREATE TABLE bitacora_accesos (
    id              VARCHAR(36) PRIMARY KEY,
    conductor_id    VARCHAR(36) NOT NULL,
    accion          VARCHAR(20) NOT NULL,   -- 'LOGIN' | 'LOGOUT'
    fecha_hora      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_salida    DATETIME NULL,
    ip_address      VARCHAR(50) NULL,
    user_agent      VARCHAR(500) NULL,
    CONSTRAINT fk_bitacora_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IX_bitacora_conductor ON bitacora_accesos(conductor_id);
CREATE INDEX IX_bitacora_fecha ON bitacora_accesos(fecha_hora);

-- ─────────────────────────────────────────────────────────
-- TABLA: programas (código guardado)
-- ─────────────────────────────────────────────────────────
CREATE TABLE programas (
    id              VARCHAR(36) PRIMARY KEY,
    conductor_id    VARCHAR(36) NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    codigo          LONGTEXT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NULL,
    is_coreografia  TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_programas_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IX_programas_conductor ON programas(conductor_id);

-- ─────────────────────────────────────────────────────────
-- TABLA: coreografias (coreografías pregrabadas)
-- ─────────────────────────────────────────────────────────
CREATE TABLE coreografias (
    id              VARCHAR(36) PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(500) NULL,
    codigo          LONGTEXT NOT NULL,
    cancion         VARCHAR(200) NULL,       -- nombre del archivo de audio
    duracion_seg    INT NOT NULL DEFAULT 180, -- min 3 min = 180s
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────
-- TABLA: tokens_sesion (refresh tokens)
-- ─────────────────────────────────────────────────────────
CREATE TABLE tokens_sesion (
    id              VARCHAR(36) PRIMARY KEY,
    conductor_id    VARCHAR(36) NOT NULL,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      DATETIME NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked         TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_tokens_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IX_tokens_conductor ON tokens_sesion(conductor_id);
CREATE INDEX IX_tokens_expires_at ON tokens_sesion(expires_at);

-- ─────────────────────────────────────────────────────────
-- DATOS INICIALES
-- ─────────────────────────────────────────────────────────

-- Admin por defecto (password: Admin2026!)
INSERT INTO conductores (id, email, phone, password_hash, nickname, role, created_at)
VALUES (
    UUID(),
    'admin@umg.edu.gt',
    '50299999999',
    '$2b$12$rKhgHs7HtJwvlVPkmSMy5.r024m1r9VVusIu9aKztc99loNHSZs0.',
    'admin',
    'admin',
    NOW()
);

-- Coreografías pregrabadas
INSERT INTO coreografias (id, nombre, descripcion, codigo, cancion, duracion_seg)
VALUES
(
    UUID(),
    'Danza Galáctica',
    'Una coreografía inspirada en el movimiento de planetas',
    'PROGRAM DanzaGalactica
BEGIN
    circulo(50);
    rotar(2);
    avanzar_mts(1);
    girar(1) + avanzar_vlts(3);
    circulo(100);
    rotar(-2);
    avanzar_mts(-1);
    moonwalk(5);
    cuadrado(80);
    rotar(1);
END.',
    'galactic.mp3',
    200
),
(
    UUID(),
    'Exploración Polar',
    'Ruta de exploración con giros y avances estratégicos',
    'PROGRAM ExploracionPolar
BEGIN
    avanzar_mts(2);
    girar(1) + avanzar_ctms(50);
    girar(0) + avanzar_mts(1);
    girar(-1) + avanzar_ctms(80);
    cuadrado(60);
    rotar(3);
    avanzar_vlts(5);
    circulo(40);
    caminar(8);
    moonwalk(3);
END.',
    'polar.mp3',
    190
),
(
    UUID(),
    'Tango del Rover',
    'Movimientos elegantes al ritmo del tango',
    'PROGRAM TangoRover
BEGIN
    caminar(3);
    moonwalk(2);
    girar(-1) + avanzar_mts(1) + girar(0) + girar(1) + avanzar_ctms(40);
    rotar(1);
    caminar(-3);
    moonwalk(-2);
    circulo(30);
    cuadrado(50);
    avanzar_vlts(4);
    rotar(-1);
END.',
    'tango.mp3',
    185
);