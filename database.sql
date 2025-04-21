CREATE DATABASE IF NOT EXISTS castmanu;
USE castmanu;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    admin BOOLEAN DEFAULT FALSE NOT NULL
);
CREATE TABLE IF NOT EXISTS films (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type ENUM('serie', 'pelicula', 'otro') NOT NULL,
    sinopsis TEXT,
    poster VARCHAR(255),
    file VARCHAR(255) UNIQUE NOT NULL,
    uploader INT,
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


