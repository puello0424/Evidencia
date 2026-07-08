-- =============================================================
-- Schema: evidencias
-- Generado y corregido desde el modelo original
-- Correcciones:
--   - table1 eliminada (estaba vacía)
--   - id_rol e id_sesion con AUTO_INCREMENT
--   - fecha_crea, fecha_ini, fecha_fin cambiados a DATE/DATETIME
--   - campo contraseña renombrado a contrasena (evitar tilde)
--   - datos dummy incluidos al final
-- =============================================================

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE SCHEMA IF NOT EXISTS evidencias DEFAULT CHARACTER SET utf8mb4;
USE evidencias;

-- -----------------------------------------------------
-- Table: usuario
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  id_usu      INT           NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100)  NOT NULL,
  correo      VARCHAR(100)  NOT NULL UNIQUE,
  contrasena  VARCHAR(255)  NOT NULL,
  estado      VARCHAR(20)   NOT NULL DEFAULT 'activo',
  fecha_crea  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usu)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: rol
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS rol (
  id_rol          INT          NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(45)  NOT NULL,
  descripcion     VARCHAR(100) NOT NULL,
  usuario_id_usu  INT          NOT NULL,
  PRIMARY KEY (id_rol),
  INDEX fk_rol_usuario_idx (usuario_id_usu ASC),
  CONSTRAINT fk_rol_usuario
    FOREIGN KEY (usuario_id_usu)
    REFERENCES usuario (id_usu)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: departamento
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS departamento (
  id_departamento  INT          NOT NULL AUTO_INCREMENT,
  nombre           VARCHAR(45)  NOT NULL,
  descripcion      VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_departamento)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: empleados
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS empleados (
  id_emple        INT           NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(45)   NOT NULL,
  apellido        VARCHAR(45)   NOT NULL,
  cedula          VARCHAR(20)   NOT NULL UNIQUE,
  carga           VARCHAR(45)   NOT NULL,
  fecha_ingre     DATE          NOT NULL,
  salario         DECIMAL(10,2) NOT NULL,
  estado          VARCHAR(20)   NULL DEFAULT 'activo',
  usuario_id_usu  INT           NOT NULL,
  PRIMARY KEY (id_emple),
  INDEX fk_empleados_usuario1_idx (usuario_id_usu ASC),
  CONSTRAINT fk_empleados_usuario1
    FOREIGN KEY (usuario_id_usu)
    REFERENCES usuario (id_usu)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: sesiones
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS sesiones (
  id_sesion   INT          NOT NULL AUTO_INCREMENT,
  token       VARCHAR(255) NOT NULL,
  usuario_id  INT          NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sesion)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: asignaciones
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS asignaciones (
  id_asignacion               INT         NOT NULL AUTO_INCREMENT,
  fecha_ini                   DATE        NOT NULL,
  fecha_fin                   DATE        NOT NULL,
  departamento_id_departamento INT        NOT NULL,
  empleados_id_emple          INT         NOT NULL,
  PRIMARY KEY (id_asignacion),
  INDEX fk_asignaciones_departamento1_idx (departamento_id_departamento ASC),
  INDEX fk_asignaciones_empleados1_idx (empleados_id_emple ASC),
  CONSTRAINT fk_asignaciones_departamento1
    FOREIGN KEY (departamento_id_departamento)
    REFERENCES departamento (id_departamento)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT fk_asignaciones_empleados1
    FOREIGN KEY (empleados_id_emple)
    REFERENCES empleados (id_emple)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- =============================================================
-- DATOS DUMMY
-- =============================================================

INSERT INTO usuario (nombre, correo, contrasena, estado, fecha_crea) VALUES
  ('Admin Sistema',  'admin@evidencias.com',   'hash_admin_123',  'activo',   NOW()),
  ('Carlos Pérez',   'carlos@evidencias.com',  'hash_carlos_456', 'activo',   NOW()),
  ('Laura Gómez',    'laura@evidencias.com',   'hash_laura_789',  'inactivo', NOW());

INSERT INTO rol (nombre, descripcion, usuario_id_usu) VALUES
  ('Administrador', 'Acceso total al sistema',      1),
  ('Editor',        'Puede crear y editar registros', 2),
  ('Visor',         'Solo lectura',                  3);

INSERT INTO departamento (nombre, descripcion) VALUES
  ('Tecnología',    'Departamento de sistemas e IT'),
  ('Recursos Humanos', 'Gestión del talento humano'),
  ('Contabilidad',  'Finanzas y contabilidad');

INSERT INTO empleados (nombre, apellido, cedula, carga, fecha_ingre, salario, estado, usuario_id_usu) VALUES
  ('Juan',    'Martínez',  '10001111', 'Desarrollador',    '2023-01-15', 4500000.00, 'activo',   1),
  ('María',   'López',     '10002222', 'Diseñadora',       '2023-03-01', 3800000.00, 'activo',   1),
  ('Pedro',   'Ramírez',   '10003333', 'Analista',         '2022-07-20', 5100000.00, 'activo',   2),
  ('Sofía',   'Torres',    '10004444', 'Contadora',        '2021-11-10', 4200000.00, 'inactivo', 2),
  ('Andrés',  'Vargas',    '10005555', 'RRHH Specialist',  '2024-02-05', 3500000.00, 'activo',   3);

INSERT INTO sesiones (token, usuario_id, creado_en) VALUES
  ('tok_abc123xyz', 1, NOW()),
  ('tok_def456uvw', 2, NOW());

INSERT INTO asignaciones (fecha_ini, fecha_fin, departamento_id_departamento, empleados_id_emple) VALUES
  ('2024-01-01', '2024-06-30', 1, 1),
  ('2024-01-01', '2024-12-31', 1, 2),
  ('2023-07-01', '2024-06-30', 2, 5),
  ('2022-08-01', '2024-12-31', 3, 4),
  ('2023-01-01', '2024-12-31', 2, 3);

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
