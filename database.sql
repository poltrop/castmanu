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
    UNIQUE (title, type),
    FOREIGN KEY (uploader) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS serie_capitulos (
    idSerie INT,
    capitulo INT,
    PRIMARY KEY (idSerie, capitulo),
    FOREIGN KEY (idSerie) REFERENCES films(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    genre VARCHAR(255) UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS film_genres (
    idFilm INT,
    idGenre INT,
    PRIMARY KEY (idFilm, idGenre),
    FOREIGN KEY (idFilm) REFERENCES films(id) ON DELETE CASCADE,
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

-- Esto es para testear peliculas
/*
INSERT INTO films(title, type, file) VALUES
('The Shawshank Redemption', 'Pelicula', 'file_001'),
('Breaking Bad', 'Serie', 'file_002'),
('Planet Earth', 'Otro', 'file_003'),
('The Godfather', 'Pelicula', 'file_004'),
('Stranger Things', 'Serie', 'file_005'),
('Cosmos: A Spacetime Odyssey', 'Otro', 'file_006'),
('Pulp Fiction', 'Pelicula', 'file_007'),
('The Crown', 'Serie', 'file_008'),
('Blackfish', 'Otro', 'file_009'),
('The Dark Knight', 'Pelicula', 'file_010'),
('Game of Thrones', 'Serie', 'file_011'),
('The Social Dilemma', 'Otro', 'file_012'),
('Forrest Gump', 'Pelicula', 'file_013'),
('The Mandalorian', 'Serie', 'file_014'),
('Inside Job', 'Otro', 'file_015'),
('Inception', 'Pelicula', 'file_016'),
('The Last of Us', 'Serie', 'file_017'),
('Seaspiracy', 'Otro', 'file_018'),
('Fight Club', 'Pelicula', 'file_019'),
('Chernobyl', 'Serie', 'file_020'),
('My Octopus Teacher', 'Otro', 'file_021'),
('The Matrix', 'Pelicula', 'file_022'),
('The Office', 'Serie', 'file_023'),
('13th', 'Otro', 'file_024'),
('Interstellar', 'Pelicula', 'file_025'),
('Better Call Saul', 'Serie', 'file_026'),
('The Game Changers', 'Otro', 'file_027'),
('Gladiator', 'Pelicula', 'file_028'),
('House of the Dragon', 'Serie', 'file_029'),
('Making a Murderer', 'Otro', 'file_030'),
('Titanic', 'Pelicula', 'file_031'),
('Dark', 'Serie', 'file_032'),
('Night on Earth', 'Otro', 'file_033'),
('The Green Mile', 'Pelicula', 'file_034'),
('Peaky Blinders', 'Serie', 'file_035'),
('The Rescue', 'Otro', 'file_036'),
('Goodfellas', 'Pelicula', 'file_037'),
('Narcos', 'Serie', 'file_038'),
('Fyre', 'Otro', 'file_039'),
('Braveheart', 'Pelicula', 'file_040'),
('The Witcher', 'Serie', 'file_041'),
('American Murder', 'Otro', 'file_042'),
('The Prestige', 'Pelicula', 'file_043'),
('The Boys', 'Serie', 'file_044'),
('Wild Wild Country', 'Otro', 'file_045'),
('Whiplash', 'Pelicula', 'file_046'),
('Lupin', 'Serie', 'file_047'),
('Icarus', 'Otro', 'file_048'),
('The Revenant', 'Pelicula', 'file_049'),
('The 100', 'Serie', 'file_050'),
('Athlete A', 'Otro', 'file_051'),
('Parasite', 'Pelicula', 'file_052'),
('Sherlock', 'Serie', 'file_053'),
('The Tinder Swindler', 'Otro', 'file_054'),
('Joker', 'Pelicula', 'file_055'),
('The Umbrella Academy', 'Serie', 'file_056'),
('The Keepers', 'Otro', 'file_057'),
('Django Unchained', 'Pelicula', 'file_058'),
('The Haunting of Hill House', 'Serie', 'file_059'),
('Minimalism', 'Otro', 'file_060'),
('The Pianist', 'Pelicula', 'file_061'),
('Ozark', 'Serie', 'file_062'),
('Wild Babies', 'Otro', 'file_063'),
('The Silence of the Lambs', 'Pelicula', 'file_064'),
('The Walking Dead', 'Serie', 'file_065'),
('Our Planet', 'Otro', 'file_066'),
('Schindler’s List', 'Pelicula', 'file_067'),
('Lost', 'Serie', 'file_068'),
('Explained', 'Otro', 'file_069'),
('Inglourious Basterds', 'Pelicula', 'file_070'),
('The Big Bang Theory', 'Serie', 'file_071'),
('Rotten', 'Otro', 'file_072');
 
INSERT INTO film_genres VALUES
(11,1),
(11,2),
(28,1),
(28,3);
 */