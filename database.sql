DROP DATABASE IF EXISTS castmanu;
CREATE DATABASE castmanu;
USE castmanu;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    admin BOOLEAN DEFAULT FALSE NOT NULL
);
CREATE TABLE IF NOT EXISTS films (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type ENUM('Serie', 'Pelicula', 'Otro') NOT NULL,
    sinopsis TEXT,
    poster VARCHAR(255),
    file VARCHAR(255) UNIQUE NOT NULL,
    uploader INT,
    capitulo INT,
    FOREIGN KEY (uploader) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    genre VARCHAR(255) UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS film_genres (
    idFilm INT,
    idGenre INT,
    PRIMARY KEY (idFilm, idGenre),
    FOREIGN KEY (idFilm) REFERENCES films(id),
    FOREIGN KEY (idGenre) REFERENCES genres(id)
);

INSERT INTO users (username, password, admin) VALUES
('admin', 'scrypt:32768:8:1$7BLKdBrCTHhGWJ3W$b8c49eaad43f48805d8d407e5dfa41ec4bc14db80272e3d5cdfe21ac481b8a9b70bad1480b2aedf42210b9abb898adfdb0ba9b4797b2ffd232c033d1b679ad5d', '1'), -- pass: testadmin
('test1', 'scrypt:32768:8:1$nbgRvwzsbWWE9gDd$1aa392f4458317f0da7a7493902a9880062becb3e1da7eb4dfa359e728ec6c79b0c58c372c76a648eb27b2e4ef745b0af157cfc19f4d46ce7468a5680ef12713', '0'), -- pass: test
('test2', 'scrypt:32768:8:1$nbgRvwzsbWWE9gDd$1aa392f4458317f0da7a7493902a9880062becb3e1da7eb4dfa359e728ec6c79b0c58c372c76a648eb27b2e4ef745b0af157cfc19f4d46ce7468a5680ef12713', '0'),
('test3', 'scrypt:32768:8:1$nbgRvwzsbWWE9gDd$1aa392f4458317f0da7a7493902a9880062becb3e1da7eb4dfa359e728ec6c79b0c58c372c76a648eb27b2e4ef745b0af157cfc19f4d46ce7468a5680ef12713', '0'),
('test4', 'scrypt:32768:8:1$nbgRvwzsbWWE9gDd$1aa392f4458317f0da7a7493902a9880062becb3e1da7eb4dfa359e728ec6c79b0c58c372c76a648eb27b2e4ef745b0af157cfc19f4d46ce7468a5680ef12713', '0'),
('test5', 'scrypt:32768:8:1$nbgRvwzsbWWE9gDd$1aa392f4458317f0da7a7493902a9880062becb3e1da7eb4dfa359e728ec6c79b0c58c372c76a648eb27b2e4ef745b0af157cfc19f4d46ce7468a5680ef12713', '0');

INSERT INTO genres (genre) VALUES
('Acción'),
('Acción y Aventura'),
('Animación'),
('Aventura'),
('Bélica'),
('Ciencia ficción'),
('Ciencia ficción y Fantasía'),
('Comedia'),
('Crimen'),
('Documental'),
('Drama'),
('Familia'),
('Fantasía'),
('Guerra y Política'),
('Historia'),
('Misterio'),
('Música'),
('Niños'),
('Noticias'),
('Película de TV'),
('Reality'),
('Romance'),
('Soap'),
('Suspense'),
('Talk Show'),
('Terror'),
('Western');