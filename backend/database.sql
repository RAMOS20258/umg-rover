-- ============================================================
-- UMG Rover 2.0 - Base de datos completa y relacionada
-- MySQL
-- ============================================================

DROP DATABASE IF EXISTS UMGRover;
CREATE DATABASE UMGRover CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE UMGRover;

-- ============================================================
-- TABLA: roles
-- ============================================================
CREATE TABLE roles (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    nombre            VARCHAR(30) NOT NULL UNIQUE,
    descripcion       VARCHAR(200) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: conductores
-- ============================================================
CREATE TABLE conductores (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    rol_id              INT NOT NULL,
    nombres             VARCHAR(100) NOT NULL,
    apellidos           VARCHAR(100) NOT NULL,
    email               VARCHAR(150) NOT NULL UNIQUE,
    phone               VARCHAR(20) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    nickname            VARCHAR(50) NOT NULL UNIQUE,
    carnet              VARCHAR(30) NULL UNIQUE,
    avatar_base64       LONGTEXT NULL,
    foto_path           VARCHAR(300) NULL,
    qr_login_token      VARCHAR(64) NULL,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    email_verificado    TINYINT(1) NOT NULL DEFAULT 0,
    telefono_verificado TINYINT(1) NOT NULL DEFAULT 0,
    ultimo_login        DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NULL,
    CONSTRAINT fk_conductores_roles
        FOREIGN KEY (rol_id) REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_conductores_rol      ON conductores(rol_id);
CREATE INDEX ix_conductores_email    ON conductores(email);
CREATE INDEX ix_conductores_nickname ON conductores(nickname);

-- ============================================================
-- TABLA: biometrias
-- ============================================================
CREATE TABLE biometrias (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id      CHAR(36) NOT NULL,
    tipo              VARCHAR(30) NOT NULL,
    template_base64   LONGTEXT NULL,
    imagen_base64     LONGTEXT NULL,
    confianza_minima  DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    activa            TINYINT(1) NOT NULL DEFAULT 1,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NULL,
    CONSTRAINT fk_biometrias_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_biometrias_conductor ON biometrias(conductor_id);

-- ============================================================
-- TABLA: bitacora_accesos
-- ============================================================
CREATE TABLE bitacora_accesos (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id      CHAR(36) NOT NULL,
    accion            VARCHAR(20) NOT NULL,
    metodo            VARCHAR(20) NULL,
    fecha_hora        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_salida      DATETIME NULL,
    exito             TINYINT(1) NOT NULL DEFAULT 1,
    ip_address        VARCHAR(50) NULL,
    user_agent        VARCHAR(500) NULL,
    observaciones     VARCHAR(300) NULL,
    CONSTRAINT fk_bitacora_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_bitacora_conductor ON bitacora_accesos(conductor_id);
CREATE INDEX ix_bitacora_fecha     ON bitacora_accesos(fecha_hora);

-- ============================================================
-- TABLA: tokens_sesion
-- ============================================================
CREATE TABLE tokens_sesion (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id      CHAR(36) NOT NULL,
    token_hash        VARCHAR(255) NOT NULL,
    dispositivo       VARCHAR(100) NULL,
    ip_address        VARCHAR(50) NULL,
    expires_at        DATETIME NOT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked           TINYINT(1) NOT NULL DEFAULT 0,
    revoked_at        DATETIME NULL,
    CONSTRAINT fk_tokens_sesion_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_tokens_conductor ON tokens_sesion(conductor_id);

-- ============================================================
-- TABLA: tokens_qr
-- ============================================================
CREATE TABLE tokens_qr (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id      CHAR(36) NOT NULL,
    token             VARCHAR(100) NOT NULL UNIQUE,
    usado             TINYINT(1) NOT NULL DEFAULT 0,
    expires_at        DATETIME NOT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usado_at          DATETIME NULL,
    CONSTRAINT fk_tokens_qr_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_tokens_qr_conductor ON tokens_qr(conductor_id);

-- ============================================================
-- TABLA: recuperacion_password
-- ============================================================
CREATE TABLE recuperacion_password (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id      CHAR(36) NOT NULL,
    token             VARCHAR(120) NOT NULL UNIQUE,
    usado             TINYINT(1) NOT NULL DEFAULT 0,
    expires_at        DATETIME NOT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usado_at          DATETIME NULL,
    CONSTRAINT fk_recuperacion_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_recuperacion_conductor ON recuperacion_password(conductor_id);

-- ============================================================
-- TABLA: notificaciones
-- ============================================================
CREATE TABLE notificaciones (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id      CHAR(36) NOT NULL,
    tipo              VARCHAR(20) NOT NULL,
    asunto            VARCHAR(150) NULL,
    mensaje           LONGTEXT NOT NULL,
    estado            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_envio       DATETIME NULL,
    error_detalle     VARCHAR(500) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notificaciones_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_notificaciones_conductor ON notificaciones(conductor_id);

-- ============================================================
-- TABLA: rovers
-- ============================================================
CREATE TABLE rovers (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    codigo              VARCHAR(30) NOT NULL UNIQUE,
    nombre              VARCHAR(100) NOT NULL,
    modelo              VARCHAR(100) NULL,
    numero_serie        VARCHAR(100) NULL UNIQUE,
    firmware_version    VARCHAR(50) NULL,
    mac_address         VARCHAR(50) NULL UNIQUE,
    estado              VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE',
    tipo                VARCHAR(20) NOT NULL DEFAULT 'FISICO',
    bateria_porcentaje  DECIMAL(5,2) NULL,
    ultima_conexion     DATETIME NULL,
    descripcion         VARCHAR(300) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NULL
) ENGINE=InnoDB;

CREATE INDEX ix_rovers_estado ON rovers(estado);

-- ============================================================
-- TABLA: asignaciones_rover
-- ============================================================
CREATE TABLE asignaciones_rover (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id      CHAR(36) NOT NULL,
    rover_id          CHAR(36) NOT NULL,
    fecha_asignacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin         DATETIME NULL,
    activa            TINYINT(1) NOT NULL DEFAULT 1,
    observaciones     VARCHAR(300) NULL,
    CONSTRAINT fk_asignacion_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_asignacion_rover
        FOREIGN KEY (rover_id) REFERENCES rovers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_asignaciones_conductor ON asignaciones_rover(conductor_id);
CREATE INDEX ix_asignaciones_rover     ON asignaciones_rover(rover_id);

-- ============================================================
-- TABLA: programas
-- ============================================================
CREATE TABLE programas (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id      CHAR(36) NOT NULL,
    rover_id          CHAR(36) NULL,
    nombre            VARCHAR(100) NOT NULL,
    descripcion       VARCHAR(300) NULL,
    codigo_actual     LONGTEXT NOT NULL,
    lenguaje          VARCHAR(30) NOT NULL DEFAULT 'UMG_BASIC',
    version_actual    INT NOT NULL DEFAULT 1,
    es_publico        TINYINT(1) NOT NULL DEFAULT 0,
    is_coreografia    TINYINT(1) NOT NULL DEFAULT 0,
    estado            VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NULL,
    CONSTRAINT fk_programas_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_programas_rover
        FOREIGN KEY (rover_id) REFERENCES rovers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX ix_programas_conductor ON programas(conductor_id);
CREATE INDEX ix_programas_rover     ON programas(rover_id);

-- ============================================================
-- TABLA: versiones_programa
-- ============================================================
CREATE TABLE versiones_programa (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    programa_id       CHAR(36) NOT NULL,
    numero_version    INT NOT NULL,
    codigo_fuente     LONGTEXT NOT NULL,
    comentario        VARCHAR(300) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por        CHAR(36) NOT NULL,
    CONSTRAINT fk_versiones_programa
        FOREIGN KEY (programa_id) REFERENCES programas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_versiones_creador
        FOREIGN KEY (creado_por) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_programa_version UNIQUE (programa_id, numero_version)
) ENGINE=InnoDB;

CREATE INDEX ix_versiones_programa ON versiones_programa(programa_id);

-- ============================================================
-- TABLA: coreografias
-- ============================================================
CREATE TABLE coreografias (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    programa_id       CHAR(36) NOT NULL,
    conductor_id      CHAR(36) NOT NULL,
    nombre            VARCHAR(100) NOT NULL,
    descripcion       VARCHAR(500) NULL,
    cancion           VARCHAR(200) NULL,
    archivo_audio     VARCHAR(300) NULL,
    duracion_seg      INT NOT NULL DEFAULT 180,
    dificultad        VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NULL,
    CONSTRAINT fk_coreografia_programa
        FOREIGN KEY (programa_id) REFERENCES programas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_coreografia_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_coreografias_programa  ON coreografias(programa_id);
CREATE INDEX ix_coreografias_conductor ON coreografias(conductor_id);

-- ============================================================
-- TABLA: simulaciones
-- ============================================================
CREATE TABLE simulaciones (
    id                          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    programa_id                 CHAR(36) NOT NULL,
    conductor_id                CHAR(36) NOT NULL,
    exito                       TINYINT(1) NOT NULL DEFAULT 0,
    tiempo_estimado_seg         INT NULL,
    recorrido_estimado_m        DECIMAL(10,2) NULL,
    consumo_estimado_bateria    DECIMAL(10,2) NULL,
    salida_log                  LONGTEXT NULL,
    errores                     LONGTEXT NULL,
    created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_simulacion_programa
        FOREIGN KEY (programa_id) REFERENCES programas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_simulacion_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_simulaciones_programa ON simulaciones(programa_id);

-- ============================================================
-- TABLA: ejecuciones_programa
-- ============================================================
CREATE TABLE ejecuciones_programa (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    programa_id       CHAR(36) NOT NULL,
    conductor_id      CHAR(36) NOT NULL,
    rover_id          CHAR(36) NULL,
    simulacion_id     CHAR(36) NULL,
    tipo_ejecucion    VARCHAR(20) NOT NULL,
    estado            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_inicio      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin         DATETIME NULL,
    duracion_seg      INT NULL,
    resultado         LONGTEXT NULL,
    error_detalle     LONGTEXT NULL,
    CONSTRAINT fk_ejecucion_programa
        FOREIGN KEY (programa_id) REFERENCES programas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_ejecucion_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_ejecucion_rover
        FOREIGN KEY (rover_id) REFERENCES rovers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_ejecucion_simulacion
        FOREIGN KEY (simulacion_id) REFERENCES simulaciones(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX ix_ejecuciones_programa  ON ejecuciones_programa(programa_id);
CREATE INDEX ix_ejecuciones_conductor ON ejecuciones_programa(conductor_id);
CREATE INDEX ix_ejecuciones_rover     ON ejecuciones_programa(rover_id);

-- ============================================================
-- TABLA: detalle_ejecucion_comandos
-- ============================================================
CREATE TABLE detalle_ejecucion_comandos (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    ejecucion_id      CHAR(36) NOT NULL,
    orden             INT NOT NULL,
    comando           VARCHAR(100) NOT NULL,
    parametro_1       VARCHAR(50) NULL,
    parametro_2       VARCHAR(50) NULL,
    estado            VARCHAR(20) NOT NULL DEFAULT 'OK',
    mensaje           VARCHAR(300) NULL,
    tiempo_ms         INT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_detalle_ejecucion
        FOREIGN KEY (ejecucion_id) REFERENCES ejecuciones_programa(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_detalle_ejecucion_orden UNIQUE (ejecucion_id, orden)
) ENGINE=InnoDB;

CREATE INDEX ix_detalle_ejecucion ON detalle_ejecucion_comandos(ejecucion_id);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

INSERT INTO roles (nombre, descripcion) VALUES
('admin', 'Administrador general del sistema'),
('conductor', 'Usuario que programa y opera rovers'),
('supervisor', 'Usuario con permisos de revisión');

INSERT INTO conductores (
    id, rol_id, nombres, apellidos, email, phone, password_hash,
    nickname, carnet, is_active, email_verificado
)
VALUES (
    UUID(),
    (SELECT id FROM roles WHERE nombre = 'admin'),
    'Administrador',
    'General',
    'admin@umg.edu.gt',
    '50299999999',
    '$2b$12$rKhgHs7HtJwvlVPkmSMy5.r024m1r9VVusIu9aKztc99loNHSZs0.',
    'admin',
    'UMG-ADMIN-001',
    1,
    1
);

INSERT INTO rovers (
    id, codigo, nombre, modelo, numero_serie, firmware_version, estado, tipo, descripcion
)
VALUES
(
    UUID(),
    'ROVER-001',
    'Rover Principal',
    'UMG Basic Rover 2.0',
    'SN-UMG-0001',
    'v1.0.0',
    'DISPONIBLE',
    'FISICO',
    'Rover principal del laboratorio'
),
(
    UUID(),
    'ROVER-SIM-01',
    'Rover Simulado',
    'Simulador Oficial',
    'SIM-0001',
    'v1.0.0',
    'DISPONIBLE',
    'VIRTUAL',
    'Rover virtual para pruebas'
);

-- Variables de apoyo
SET @admin_id = (SELECT id FROM conductores WHERE nickname = 'admin' LIMIT 1);
SET @rover_sim = (SELECT id FROM rovers WHERE codigo = 'ROVER-SIM-01' LIMIT 1);
SET @programa_id = UUID();

INSERT INTO programas (
    id, conductor_id, rover_id, nombre, descripcion, codigo_actual,
    lenguaje, version_actual, es_publico, is_coreografia, estado
)
VALUES (
    @programa_id,
    @admin_id,
    @rover_sim,
    'Danza Galáctica',
    'Coreografía inspirada en el movimiento de los planetas',
    'PROGRAM DanzaGalactica
BEGIN
    circulo(50);
    rotar(2);
    avanzar_mts(1);
    girar(1);
    avanzar_vlts(3);
    moonwalk(5);
END.',
    'UMG_BASIC',
    1,
    1,
    1,
    'COMPILADO'
);

INSERT INTO versiones_programa (
    id, programa_id, numero_version, codigo_fuente, comentario, creado_por
)
VALUES (
    UUID(),
    @programa_id,
    1,
    'PROGRAM DanzaGalactica
BEGIN
    circulo(50);
    rotar(2);
    avanzar_mts(1);
    girar(1);
    avanzar_vlts(3);
    moonwalk(5);
END.',
    'Versión inicial',
    @admin_id
);

INSERT INTO coreografias (
    id, programa_id, conductor_id, nombre, descripcion, cancion, archivo_audio, duracion_seg, dificultad
)
VALUES (
    UUID(),
    @programa_id,
    @admin_id,
    'Danza Galáctica',
    'Una coreografía inspirada en el movimiento de planetas',
    'galactic.mp3',
    '/media/audio/galactic.mp3',
    200,
    'MEDIA'
);

USE UMGRover;

-- ============================================================
-- TABLA: modulos
-- Catálogo de módulos del sistema
-- ============================================================
CREATE TABLE modulos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    nombre            VARCHAR(50) NOT NULL UNIQUE,
    descripcion       VARCHAR(200) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: permisos
-- Catálogo de permisos del sistema
-- ============================================================
CREATE TABLE permisos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    nombre            VARCHAR(50) NOT NULL UNIQUE,
    descripcion       VARCHAR(200) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: rol_permisos
-- Relación entre roles, módulos y permisos
-- ============================================================
CREATE TABLE rol_permisos (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    rol_id            INT NOT NULL,
    modulo_id         INT NOT NULL,
    permiso_id        INT NOT NULL,
    permitido         TINYINT(1) NOT NULL DEFAULT 1,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rol_permisos_rol
        FOREIGN KEY (rol_id) REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_rol_permisos_modulo
        FOREIGN KEY (modulo_id) REFERENCES modulos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_rol_permisos_permiso
        FOREIGN KEY (permiso_id) REFERENCES permisos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_rol_modulo_permiso UNIQUE (rol_id, modulo_id, permiso_id)
) ENGINE=InnoDB;

CREATE INDEX ix_rol_permisos_rol     ON rol_permisos(rol_id);
CREATE INDEX ix_rol_permisos_modulo  ON rol_permisos(modulo_id);
CREATE INDEX ix_rol_permisos_permiso ON rol_permisos(permiso_id);

-- ============================================================
-- TABLA: auditoria_general
-- Guarda inserciones, actualizaciones y eliminaciones
-- ============================================================
CREATE TABLE auditoria_general (
    id                CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id      CHAR(36) NULL,
    tabla_afectada    VARCHAR(100) NOT NULL,
    registro_id       VARCHAR(100) NOT NULL,
    accion            VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    datos_anteriores  LONGTEXT NULL,
    datos_nuevos      LONGTEXT NULL,
    fecha_evento      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address        VARCHAR(50) NULL,
    user_agent        VARCHAR(500) NULL,
    observaciones     VARCHAR(300) NULL,
    CONSTRAINT fk_auditoria_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX ix_auditoria_conductor ON auditoria_general(conductor_id);
CREATE INDEX ix_auditoria_tabla     ON auditoria_general(tabla_afectada);
CREATE INDEX ix_auditoria_accion    ON auditoria_general(accion);
CREATE INDEX ix_auditoria_fecha     ON auditoria_general(fecha_evento);

-- ============================================================
-- TABLA: errores_compilador
-- Registra errores del compilador/intérprete
-- ============================================================
CREATE TABLE errores_compilador (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    programa_id         CHAR(36) NOT NULL,
    conductor_id        CHAR(36) NOT NULL,
    simulacion_id       CHAR(36) NULL,
    ejecucion_id        CHAR(36) NULL,
    linea               INT NULL,
    columna_error       INT NULL,
    tipo_error          VARCHAR(50) NOT NULL, -- SINTACTICO, SEMANTICO, LEXICO, EJECUCION
    codigo_error        VARCHAR(50) NULL,
    mensaje_error       VARCHAR(500) NOT NULL,
    fragmento_codigo    LONGTEXT NULL,
    severidad           VARCHAR(20) NOT NULL DEFAULT 'MEDIA', -- BAJA, MEDIA, ALTA, CRITICA
    fecha_error         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_errores_programa
        FOREIGN KEY (programa_id) REFERENCES programas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_errores_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_errores_simulacion
        FOREIGN KEY (simulacion_id) REFERENCES simulaciones(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_errores_ejecucion
        FOREIGN KEY (ejecucion_id) REFERENCES ejecuciones_programa(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX ix_errores_programa   ON errores_compilador(programa_id);
CREATE INDEX ix_errores_conductor  ON errores_compilador(conductor_id);
CREATE INDEX ix_errores_tipo       ON errores_compilador(tipo_error);
CREATE INDEX ix_errores_fecha      ON errores_compilador(fecha_error);

-- ============================================================
-- TABLA: credenciales_pdf
-- Guarda las credenciales generadas en PDF
-- ============================================================
CREATE TABLE credenciales_pdf (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id        CHAR(36) NOT NULL,
    codigo_credencial   VARCHAR(50) NOT NULL UNIQUE,
    nombre_archivo      VARCHAR(255) NOT NULL,
    ruta_archivo        VARCHAR(500) NULL,
    pdf_base64          LONGTEXT NULL,
    hash_documento      VARCHAR(255) NULL,
    fecha_generacion    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento   DATETIME NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'GENERADA', -- GENERADA, ENVIADA, REVOCADA, VENCIDA
    enviado_email       TINYINT(1) NOT NULL DEFAULT 0,
    enviado_whatsapp    TINYINT(1) NOT NULL DEFAULT 0,
    observaciones       VARCHAR(300) NULL,
    CONSTRAINT fk_credenciales_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_credenciales_conductor ON credenciales_pdf(conductor_id);
CREATE INDEX ix_credenciales_estado    ON credenciales_pdf(estado);

-- ============================================================
-- TABLA: evidencias_conductor
-- Fotos, videos o archivos de evidencia por conductor
-- ============================================================
CREATE TABLE evidencias_conductor (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id        CHAR(36) NOT NULL,
    tipo_evidencia      VARCHAR(30) NOT NULL, -- FOTO, VIDEO, PDF, OTRO
    nombre_archivo      VARCHAR(255) NOT NULL,
    ruta_archivo        VARCHAR(500) NULL,
    archivo_base64      LONGTEXT NULL,
    descripcion         VARCHAR(300) NULL,
    fecha_captura       DATETIME NULL,
    fecha_subida        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    es_principal        TINYINT(1) NOT NULL DEFAULT 0,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT fk_evidencias_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_evidencias_conductor ON evidencias_conductor(conductor_id);
CREATE INDEX ix_evidencias_tipo      ON evidencias_conductor(tipo_evidencia);

-- ============================================================
-- TABLA: mantenimientos_rover
-- Historial de mantenimiento del rover
-- ============================================================
CREATE TABLE mantenimientos_rover (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    rover_id            CHAR(36) NOT NULL,
    conductor_id        CHAR(36) NULL, -- quien reportó o registró
    tipo_mantenimiento  VARCHAR(30) NOT NULL, -- PREVENTIVO, CORRECTIVO, ACTUALIZACION
    descripcion         VARCHAR(500) NOT NULL,
    fecha_mantenimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    proximo_mantenimiento DATETIME NULL,
    costo               DECIMAL(10,2) NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'REALIZADO', -- PENDIENTE, EN_PROCESO, REALIZADO
    observaciones       VARCHAR(300) NULL,
    CONSTRAINT fk_mantenimiento_rover
        FOREIGN KEY (rover_id) REFERENCES rovers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_mantenimiento_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX ix_mantenimientos_rover      ON mantenimientos_rover(rover_id);
CREATE INDEX ix_mantenimientos_conductor  ON mantenimientos_rover(conductor_id);
CREATE INDEX ix_mantenimientos_fecha      ON mantenimientos_rover(fecha_mantenimiento);

-- ============================================================
-- TABLA: sensores
-- Catálogo/registro de sensores instalados en un rover
-- ============================================================
CREATE TABLE sensores (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    rover_id            CHAR(36) NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    tipo_sensor         VARCHAR(50) NOT NULL, -- ULTRASONICO, TEMPERATURA, GPS, INFRARROJO, GIROSCOPIO, etc.
    unidad_medida       VARCHAR(20) NULL,     -- cm, m, °C, %, etc.
    pin_conexion        VARCHAR(50) NULL,
    rango_min           DECIMAL(10,2) NULL,
    rango_max           DECIMAL(10,2) NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NULL,
    CONSTRAINT fk_sensores_rover
        FOREIGN KEY (rover_id) REFERENCES rovers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX ix_sensores_rover ON sensores(rover_id);
CREATE INDEX ix_sensores_tipo  ON sensores(tipo_sensor);

-- ============================================================
-- TABLA: lecturas_sensores
-- Historial de lecturas de sensores
-- ============================================================
CREATE TABLE lecturas_sensores (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sensor_id           CHAR(36) NOT NULL,
    ejecucion_id        CHAR(36) NULL,
    valor               DECIMAL(12,4) NOT NULL,
    valor_texto         VARCHAR(100) NULL,
    fecha_lectura       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado              VARCHAR(20) NOT NULL DEFAULT 'OK',
    observaciones       VARCHAR(300) NULL,
    CONSTRAINT fk_lectura_sensor
        FOREIGN KEY (sensor_id) REFERENCES sensores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_lectura_ejecucion
        FOREIGN KEY (ejecucion_id) REFERENCES ejecuciones_programa(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX ix_lecturas_sensor    ON lecturas_sensores(sensor_id);
CREATE INDEX ix_lecturas_ejecucion ON lecturas_sensores(ejecucion_id);
CREATE INDEX ix_lecturas_fecha     ON lecturas_sensores(fecha_lectura);

-- ============================================================
-- TABLA: rutas
-- Define rutas/recorridos programados
-- ============================================================
CREATE TABLE rutas (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conductor_id        CHAR(36) NOT NULL,
    rover_id            CHAR(36) NULL,
    nombre              VARCHAR(100) NOT NULL,
    descripcion         VARCHAR(300) NULL,
    tipo_ruta           VARCHAR(30) NOT NULL DEFAULT 'MANUAL', -- MANUAL, AUTOMATICA, COREOGRAFIA
    distancia_estimada_m DECIMAL(10,2) NULL,
    duracion_estimada_seg INT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NULL,
    CONSTRAINT fk_rutas_conductor
        FOREIGN KEY (conductor_id) REFERENCES conductores(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_rutas_rover
        FOREIGN KEY (rover_id) REFERENCES rovers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX ix_rutas_conductor ON rutas(conductor_id);
CREATE INDEX ix_rutas_rover     ON rutas(rover_id);

-- ============================================================
-- TABLA: puntos_ruta
-- Puntos que componen una ruta
-- ============================================================
CREATE TABLE puntos_ruta (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    ruta_id             CHAR(36) NOT NULL,
    orden               INT NOT NULL,
    pos_x               DECIMAL(10,2) NULL,
    pos_y               DECIMAL(10,2) NULL,
    pos_z               DECIMAL(10,2) NULL,
    latitud             DECIMAL(10,7) NULL,
    longitud            DECIMAL(10,7) NULL,
    accion              VARCHAR(100) NULL,
    velocidad           DECIMAL(10,2) NULL,
    tiempo_estimado_seg INT NULL,
    observaciones       VARCHAR(300) NULL,
    CONSTRAINT fk_puntos_ruta
        FOREIGN KEY (ruta_id) REFERENCES rutas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_ruta_orden UNIQUE (ruta_id, orden)
) ENGINE=InnoDB;

CREATE INDEX ix_puntos_ruta ON puntos_ruta(ruta_id);

-- ============================================================
-- TABLA: trayectorias_ejecucion
-- Registro real de la trayectoria seguida en una ejecución
-- ============================================================
CREATE TABLE trayectorias_ejecucion (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    ejecucion_id        CHAR(36) NOT NULL,
    punto_no            INT NOT NULL,
    pos_x               DECIMAL(10,2) NULL,
    pos_y               DECIMAL(10,2) NULL,
    pos_z               DECIMAL(10,2) NULL,
    latitud             DECIMAL(10,7) NULL,
    longitud            DECIMAL(10,7) NULL,
    orientacion_grados  DECIMAL(10,2) NULL,
    velocidad           DECIMAL(10,2) NULL,
    timestamp_punto     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones       VARCHAR(300) NULL,
    CONSTRAINT fk_trayectoria_ejecucion
        FOREIGN KEY (ejecucion_id) REFERENCES ejecuciones_programa(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_ejecucion_punto UNIQUE (ejecucion_id, punto_no)
) ENGINE=InnoDB;

CREATE INDEX ix_trayectorias_ejecucion ON trayectorias_ejecucion(ejecucion_id);
CREATE INDEX ix_trayectorias_fecha     ON trayectorias_ejecucion(timestamp_punto);

INSERT INTO modulos (nombre, descripcion) VALUES
('usuarios', 'Gestión de conductores y administradores'),
('rovers', 'Gestión de rovers'),
('programas', 'Gestión de programas y código'),
('coreografias', 'Gestión de coreografías'),
('simulador', 'Simulación de programas'),
('ejecuciones', 'Ejecución real o simulada'),
('credenciales', 'Generación de credenciales PDF'),
('auditoria', 'Consulta de auditoría'),
('mantenimiento', 'Mantenimiento de rovers'),
('sensores', 'Lectura y gestión de sensores'),
('rutas', 'Gestión de rutas y trayectorias'),
('reportes', 'Reportes del sistema');

INSERT INTO permisos (nombre, descripcion) VALUES
('crear', 'Permite crear registros'),
('ver', 'Permite visualizar registros'),
('editar', 'Permite modificar registros'),
('eliminar', 'Permite eliminar registros'),
('ejecutar', 'Permite ejecutar acciones del sistema'),
('aprobar', 'Permite aprobar procesos o acciones'),
('exportar', 'Permite exportar información');

INSERT INTO rol_permisos (id, rol_id, modulo_id, permiso_id, permitido)
SELECT UUID(), r.id, m.id, p.id, 1
FROM roles r
CROSS JOIN modulos m
CROSS JOIN permisos p
WHERE r.nombre = 'admin';

USE UMGRover;

-- SUPERVISOR: ver usuarios, auditoría, reportes, credenciales, programas
INSERT INTO rol_permisos (id, rol_id, modulo_id, permiso_id, permitido)
SELECT UUID(), r.id, m.id, p.id, 1
FROM roles r
JOIN modulos m
JOIN permisos p
WHERE r.nombre = 'supervisor'
  AND (
      (m.nombre = 'usuarios' AND p.nombre = 'ver')
   OR (m.nombre = 'auditoria' AND p.nombre = 'ver')
   OR (m.nombre = 'reportes' AND p.nombre = 'ver')
   OR (m.nombre = 'credenciales' AND p.nombre IN ('ver', 'exportar'))
   OR (m.nombre = 'programas' AND p.nombre = 'ver')
   OR (m.nombre = 'ejecuciones' AND p.nombre = 'ver')
  );

-- CONDUCTOR: trabajar con sus propios recursos
INSERT INTO rol_permisos (id, rol_id, modulo_id, permiso_id, permitido)
SELECT UUID(), r.id, m.id, p.id, 1
FROM roles r
JOIN modulos m
JOIN permisos p
WHERE r.nombre = 'conductor'
  AND (
      (m.nombre = 'programas' AND p.nombre IN ('crear', 'ver', 'editar', 'ejecutar'))
   OR (m.nombre = 'simulador' AND p.nombre IN ('ver', 'ejecutar'))
   OR (m.nombre = 'credenciales' AND p.nombre IN ('ver', 'exportar'))
   OR (m.nombre = 'rutas' AND p.nombre IN ('crear', 'ver', 'editar'))
   OR (m.nombre = 'sensores' AND p.nombre = 'ver')
  );

  USE UMGRover;

INSERT INTO modulos (nombre, descripcion)
VALUES ('evidencias', 'Gestión de evidencias del conductor');

-- permisos para admin
INSERT INTO rol_permisos (id, rol_id, modulo_id, permiso_id, permitido)
SELECT UUID(), r.id, m.id, p.id, 1
FROM roles r
CROSS JOIN permisos p
JOIN modulos m ON m.nombre = 'evidencias'
WHERE r.nombre = 'admin';

-- permisos para supervisor
INSERT INTO rol_permisos (id, rol_id, modulo_id, permiso_id, permitido)
SELECT UUID(), r.id, m.id, p.id, 1
FROM roles r
JOIN modulos m ON m.nombre = 'evidencias'
JOIN permisos p ON p.nombre = 'ver'
WHERE r.nombre = 'supervisor';

-- permisos para conductor
INSERT INTO rol_permisos (id, rol_id, modulo_id, permiso_id, permitido)
SELECT UUID(), r.id, m.id, p.id, 1
FROM roles r
JOIN modulos m ON m.nombre = 'evidencias'
JOIN permisos p
WHERE r.nombre = 'conductor'
  AND p.nombre IN ('crear', 'ver', 'editar', 'eliminar');