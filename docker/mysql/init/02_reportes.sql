-- =============================================================
-- Tabla: reportes
-- Almacena los layouts de la página reportes.html
-- Las imágenes se guardan como bytes crudos (LONGBLOB)
-- para poder reconstruirse desde el mime type guardado.
-- =============================================================
USE evidencias;

CREATE TABLE IF NOT EXISTS reportes (
  id_reporte      INT           NOT NULL AUTO_INCREMENT,
  layout_num      TINYINT       NOT NULL COMMENT '1-5 según el layout de la página',
  layout_titulo   VARCHAR(100)  NOT NULL,
  descripcion     TEXT          NULL,
  imagen_bytes    LONGBLOB      NULL     COMMENT 'bytes crudos de la imagen',
  imagen_mime     VARCHAR(50)   NULL     COMMENT 'image/jpeg, image/png, etc.',
  imagen_nombre   VARCHAR(255)  NULL,
  fecha_crea      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualiza DATETIME      NULL     ON UPDATE CURRENT_TIMESTAMP,
  usuario_id_usu  INT           NULL,
  PRIMARY KEY (id_reporte),
  INDEX idx_layout (layout_num),
  CONSTRAINT fk_reportes_usuario
    FOREIGN KEY (usuario_id_usu)
    REFERENCES usuario (id_usu)
    ON DELETE SET NULL
    ON UPDATE NO ACTION
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
