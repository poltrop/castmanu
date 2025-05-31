import { apiGet, apiGetServer, apiPost, apiPut } from "../api.js";
import { initHeader } from "../header.js";
import { jwt_decode } from "../jwt-decode.js";

if (!localStorage.getItem("token")) window.location.href = "login.html";
let params = new URLSearchParams(window.location.search);
if (!params.get("id")) window.location.href = 'home.html';

document.addEventListener("DOMContentLoaded", async () => {
    let decoded = jwt_decode(localStorage.getItem("token"));
    await initHeader(decoded.admin == 1);
    let pelicula = await apiGet(`http://localhost:8000/get-film/${params.get("id")}`)
    if (!pelicula) window.location.href = 'home.html';

    let title = document.getElementById("title");
    let type = document.getElementById("type");
    let poster = document.getElementById("poster");
    let sinopsis = document.getElementById("sinopsis");
    let genres = document.getElementById("genres");

    let idGlobal = params.get("id");
    let capituloGlobal = params.get("capitulo");

    title.innerText = pelicula.title;
    type.innerText = pelicula.type;
    let posterValue = pelicula.poster || "../assets/img/poster.jpg";
    poster.src = posterValue;
    sinopsis.innerText = pelicula.sinopsis;
    let span;
    pelicula.generos.forEach(genero => {
        span = document.createElement("span");
        span.classList.add(
            "bg-neon-cyan",
            "text-midnight-blue",
            "px-3",
            "py-1",
            "rounded-full",
            "text-xs",
            "font-bold"
        );
        span.innerText = genero;
        genres.appendChild(span);
    });

    let videoSource = `${pelicula.file}/master.m3u8`;

    if (pelicula.type == "Serie") {
        let selector = document.createElement("select");
        selector.classList.add("p-2", "bg-deep-black", "text-center", "text-gray-blue", "rounded-md");
        selector.id = "capitulo";
        let opcion = document.createElement("option");
        opcion.value = '';
        opcion.textContent = '-- Selecciona un capítulo --';
        opcion.selected = true;
        opcion.disabled = true;
        selector.appendChild(opcion);
        pelicula.capitulos.forEach(capitulo => {
            opcion = document.createElement("option");
            opcion.value = capitulo;
            opcion.textContent = capitulo;
            selector.appendChild(opcion);
        });

        selector.addEventListener("change", loadCapitulo);

        let main = document.querySelector('main');
        let divMain = document.createElement('div');
        divMain.className = 'text-center';
        let div = document.createElement('div');
        div.className = 'block mb-2 font-semibold text-gray-blue';
        div.textContent = 'Selecciona el capítulo';

        main.appendChild(divMain);
        divMain.appendChild(div);
        divMain.appendChild(selector);

        let capitulo = params.get("capitulo");
        if (capitulo) {
            selector.value = capitulo;
            videoSource = `${pelicula.file}/${capitulo}/master.m3u8`;
        } else return;
    }

    let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isSafari) {
        initPlayerSafari();
    } else {
        initPlayer();
    }

    async function initPlayerSafari() {
        let main = document.querySelector('main');
        let container = document.createElement('div');
        container.className = 'w-full md:w-3/4 flex aspect-[16/9] justify-center hidden';

        let video = document.createElement('video');
        video.id = 'videoPlayer';
        video.setAttribute('controls', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('preload', 'auto');
        video.width = 640;
        video.height = 360;

        // Añadir subtítulos
        let subs = await apiGetServer(`https://castmanu.ddns.net/getSubLanguages/${pelicula.title}/${pelicula.type}${params.get("capitulo") ? `?capitulo=${params.get("capitulo")}` : ''}`);
        if (subs.success) {
            let capitulo = params.get("capitulo") ? `/${params.get("capitulo")}` : '';
            subs.languages.forEach((sub, index) => {
                let track = document.createElement('track');
                track.kind = 'subtitles';
                track.label = sub;
                track.srclang = mapSubs(sub);
                track.src = `https://castmanu.ddns.net/videos/${pelicula.type}/${pelicula.title}${capitulo}/subs/subs_${index}.vtt`;
                video.appendChild(track);
            });
        }

        video.addEventListener('error', function () {
            let container = video.parentNode;
            container.classList.remove("aspect-[16/9]", "hidden");
            video.remove();

            // Crear el div de error
            let errorDiv = document.createElement('div');
            errorDiv.classList.add(
                'bg-gray-blue/20',
                'border',
                'border-neon-cyan/30',
                'text-gray-blue',
                'px-6',
                'py-8',
                'rounded-xl',
                'text-center',
                'shadow-md',
                'md:w-2/4',
                'w-full'
            );

            let title = document.createElement('p');
            title.textContent = 'No se pudo cargar el video';
            title.classList.add('text-lg', 'font-semibold', 'mb-2');

            let message = document.createElement('p');
            message.textContent = 'El video se está procesando. Inténtalo más tarde';
            message.classList.add('text-sm');

            errorDiv.appendChild(title);
            errorDiv.appendChild(message);
            container.appendChild(errorDiv);
        });

        video.src = videoSource;
        container.appendChild(video);
        main.appendChild(container);

        // Carga configuración previa
        let volumen = await apiGet(`http://localhost:8000/get-volume`);
        let settings = await apiGet(`http://localhost:8000/get-settings/${params.get("id")}${params.get("capitulo") ? `?capitulo=${params.get("capitulo")}` : ''}`);
        if (!settings.success)
            settings = null;
        else
            settings = settings.settings;

        video.volume = volumen?.volumen || 1;

        if (settings && settings.tiempo) {
            video.currentTime = settings.tiempo;
        }

        video.addEventListener('loadedmetadata', async () => {
            let textTracks = video.textTracks;

            if (settings && settings.subs) {
                for (let i = 0; i < textTracks.length; i++) {
                    if (settings.subs !== "disabled" && textTracks[i].src && textTracks[i].src.endsWith(settings.subs)) {
                        textTracks[i].mode = "showing";
                    } else {
                        textTracks[i].mode = "hidden";
                    }
                }
            }

            // Escuchar cambios en subtítulos para guardar configuración
            for (let i = 0; i < textTracks.length; i++) {
                textTracks[i].addEventListener('change', () => {
                    let activeTrack = null;
                    for (let j = 0; j < textTracks.length; j++) {
                        if (textTracks[j].mode === 'showing') {
                            activeTrack = textTracks[j];
                            break;
                        }
                    }
                    apiPost('http://localhost:8000/update-settings', {
                        id: idGlobal,
                        capitulo: capituloGlobal,
                        subs: activeTrack ? activeTrack.src.split("/").pop() : "disabled"
                    });
                });
            }

            let duracion = document.getElementById("duracion");
            duracion.innerText = `Duración: ${Math.round((video.duration / 60))} minutos`;
            video.parentNode.classList.remove("hidden");
        });

        // Guardar progreso cada 30s
        let intervalId;
        video.addEventListener('play', () => {
            intervalId = setInterval(() => {
                saveProgressToBackend(Math.floor(video.currentTime));
            }, 30000);
        });

        video.addEventListener('pause', () => clearInterval(intervalId));
        video.addEventListener('ended', () => clearInterval(intervalId));

        // Enviar beacon antes de salir
        window.addEventListener('beforeunload', () => {
            if (video.ended)
                video.currentTime = 0;

            let data = {
                id: idGlobal,
                capitulo: capituloGlobal,
                tiempo: Math.floor(video.currentTime),
                beacon: btoa(localStorage.getItem("token") || "")
            };
            let blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon("http://localhost:8000/update-settings", blob);
        });

        // Actualizar volumen
        let volumeChangeTimeout;
        video.addEventListener('volumechange', () => {
            clearTimeout(volumeChangeTimeout);
            volumeChangeTimeout = setTimeout(() => {
                let volume = video.volume.toFixed(2);
                apiPut(`http://localhost:8000/update-volume`, { volumen: volume });
            }, 500);
        });

        // Función para guardar progreso
        function saveProgressToBackend(time) {
            apiPost(`http://localhost:8000/update-settings`, {
                id: idGlobal,
                capitulo: capituloGlobal,
                tiempo: time
            });
        }

        // Subtítulos: escuchar cambio manual y guardar configuración
        video.textTracks.addEventListener('change', () => {
            let activeTrack = null;
            for (let i = 0; i < video.textTracks.length; i++) {
                if (video.textTracks[i].mode === 'showing') {
                    activeTrack = video.textTracks[i];
                    break;
                }
            }
            apiPost('http://localhost:8000/update-settings', {
                id: idGlobal,
                capitulo: capituloGlobal,
                subs: activeTrack ? activeTrack.src.split('/').pop() : 'disabled'
            });
        });

    }

    async function initPlayer() {
        let main = document.querySelector('main');
        let container = document.createElement('div');
        container.className = 'w-full md:w-3/4 flex aspect-[16/9] justify-center hidden';

        let video = document.createElement('video');
        video.id = 'videoPlayer';
        video.className = 'video-js vjs-default-skin vjs-fluid rounded-lg shadow-lg';
        video.setAttribute('controls', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('preload', 'auto');
        video.addEventListener('play', startAutoSave);
        video.addEventListener('pause', stopAutoSave);
        video.addEventListener('ended', stopAutoSave);
        video.addEventListener('volumechange', updateVolume);

        // FUNCIONES PARA GUARDAR EL PROGRESO DEL VIDEO
        let intervalId;

        let saveInterval = 30 * 1000; // 30 segundos

        function startAutoSave() {
            intervalId = setInterval(() => {
                saveProgressToBackend(Math.floor(video.currentTime));
            }, saveInterval);
        }

        function stopAutoSave() {
            clearInterval(intervalId);
        }

        window.addEventListener('beforeunload', () => {
            if (video.ended)
                video.currentTime = 0;

            let data = {
                id: idGlobal,
                capitulo: capituloGlobal, //puede ser null
                tiempo: Math.floor(video.currentTime),
                beacon: btoa(localStorage.getItem("token") || "")
            };

            let blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon("http://localhost:8000/update-settings", blob); //Mando beacon porque es lo mas rapido que hay para estos casosç
        });

        function saveProgressToBackend(time) {
            let data = {
                id: idGlobal,
                capitulo: capituloGlobal, //puede ser null
                tiempo: time
            };
            apiPost(`http://localhost:8000/update-settings`, data)
        }

        let volumeChangeTimeout;
        function updateVolume() {
            clearTimeout(volumeChangeTimeout);

            volumeChangeTimeout = setTimeout(() => {
                let volume = video.volume.toFixed(2);
                let data = {
                    volumen: volume
                };
                apiPut(`http://localhost:8000/update-volume`, data)
            }, 500);
        }

        container.appendChild(video);
        main.appendChild(container);

        let extension = pelicula.extensionOriginal;
        if (!extension)
            extension = await apiGet(`http://localhost:8000/get-extension-cap/${params.get("id")}/${params.get("capitulo")}`);

        let original = "";
        if (params.get("capitulo")) {
            original = `https://castmanu.ddns.net/descargar/${pelicula.type}/${pelicula.title}/${params.get("capitulo")}/original/original.${extension}`;
            original += `?filename=${pelicula.title} - capitulo ${params.get("capitulo")}.${extension}`;
        } else {
            original = `https://castmanu.ddns.net/descargar/${pelicula.type}/${pelicula.title}/original/original.${extension}`;
            original += `?filename=${pelicula.title}.${extension}`;
        }

        let descarga = document.createElement("button");
        descarga.className = "w-48 bg-neon-cyan px-4 py-2 rounded-md text-midnight-blue font-bold hover:scale-105 transition text-center";
        descarga.innerText = "Descarga el archivo";
        descarga.addEventListener("click", async () => {
            let a = document.createElement("a");
            a.href = original;
            a.download = "";
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
        main.appendChild(descarga);

        let extraCap = params.get("capitulo") ? `?capitulo=${params.get("capitulo")}` : '';

        let subs = await apiGetServer(`https://castmanu.ddns.net/getSubLanguages/${pelicula.title}/${pelicula.type}${extraCap}`);
        if (subs.success) {
            let track;
            let capitulo = params.get("capitulo") ? `/${params.get("capitulo")}` : '';
            subs.languages.forEach((sub, index) => {
                track = document.createElement('track');

                track.setAttribute('kind', 'subtitles');
                track.setAttribute('label', sub);
                track.setAttribute('src', `https://castmanu.ddns.net/videos/${pelicula.type}/${pelicula.title}${capitulo}/subs/subs_${index}.vtt`);
                track.setAttribute('srclang', mapSubs(sub));

                video.appendChild(track);
            });
        }

        let player = videojs('videoPlayer', {
            techOrder: ['chromecast', 'html5'],
            controls: true,
            fluid: true,
            plugins: {
                chromecast: {}
            }
        });


        let volumen = await apiGet(`http://localhost:8000/get-volume`);
        let settings = await apiGet(`http://localhost:8000/get-settings/${params.get("id")}${extraCap}`);
        if (!settings.success)
            settings = null;
        else
            settings = settings.settings;

        // Establecer fuente HLS
        player.src({
            type: 'application/vnd.apple.mpegurl',
            src: videoSource
        });

        player.ready(function () {
            if (settings && settings.tiempo)
                player.currentTime(settings.tiempo);
            player.volume(volumen.volumen);
        });

        player.on('loadedmetadata', async () => {
            let audioTracks = player.audioTracks();
            let textTracks = player.textTracks();

            if (settings && settings.idioma) {
                let audioTracksArray = Array.from(audioTracks);
                let audioTrackToEnable = audioTracksArray.find(track => track.id == settings.idioma);
                audioTrackToEnable.enabled = true;
            }

            video.addEventListener("play", () => {
                if (settings && settings.subs) {
                    let textTracksArray = Array.from(textTracks);
                    if (settings.subs != "disabled") {
                        let textTrackToEnable = textTracksArray.find(track => track.src && track.src.endsWith(settings.subs));
                        textTrackToEnable.mode = "showing";
                    }
                }
            }, { once: true })

            audioTracks.addEventListener('change', () => {
                for (let i = 0; i < audioTracks.length; i++) {
                    let track = audioTracks[i];
                    if (track.enabled) {
                        let data = {
                            id: idGlobal,
                            capitulo: capituloGlobal, // puede ser null
                            idioma: track.id
                        };
                        apiPost('http://localhost:8000/update-settings', data);
                        break;
                    }
                }
            });

            textTracks.addEventListener('change', () => {
                let activeTrack = null;

                for (let i = 0; i < textTracks.length; i++) {
                    let track = textTracks[i];
                    if (track.mode == 'showing') {
                        activeTrack = track;
                        break;
                    }
                }

                let data = {
                    id: idGlobal,
                    capitulo: capituloGlobal, // puede ser null
                    subs: activeTrack ? activeTrack.src.split("/").pop() : "disabled"
                };

                apiPost('http://localhost:8000/update-settings', data);
            });

            let duracion = document.getElementById("duracion");
            duracion.innerText = `Duración: ${Math.round((player.duration() / 60))} minutos`;
            container.classList.remove("hidden");
        });


        player.poster(posterValue);

        // Manejar error de carga
        player.on('error', function () {
            let playerElement = player.el();
            let container = playerElement.parentNode;
            playerElement.remove();
            container.classList.remove("aspect-[16/9]", "hidden");


            // Crear el div de error
            let errorDiv = document.createElement('div');
            errorDiv.classList.add(
                'bg-gray-blue/20',
                'border',
                'border-neon-cyan/30',
                'text-gray-blue',
                'px-6',
                'py-8',
                'rounded-xl',
                'text-center',
                'shadow-md',
                'md:w-2/4',
                'w-full'
            );

            let title = document.createElement('p');
            title.textContent = 'No se pudo cargar el video';
            title.classList.add('text-lg', 'font-semibold', 'mb-2');

            let message = document.createElement('p');
            message.textContent = 'El video se está procesando. Inténtalo mas tarde';
            message.classList.add('text-sm');

            errorDiv.appendChild(title);
            errorDiv.appendChild(message);
            container.appendChild(errorDiv);
        });
    }

    function loadCapitulo() {
        let capitulo = document.getElementById("capitulo").value;
        params.set("capitulo", capitulo);
        let queryParams = params.toString();
        window.location.href = `watch.html?${queryParams}`;
    }

    function mapSubs(idioma) {
        switch (idioma) {
            case "Español":
                return "es";
            case "Inglés":
                return "en";
            case "Catalán":
                return "ca";
            case "Gallego":
                return "gl";
            case "Francés":
                return "fr";
            case "Alemán":
                return "de";
            case "Italiano":
                return "it";
            case "Portugués":
                return "pt";
            case "Euskera":
                return "eu";
            case "Ruso":
                return "ru";
            case "Japonés":
                return "ja";
            case "Chino":
                return "zh";
            case "Árabe":
                return "ar";
            case "Hindi":
                return "hi";
            case "Coreano":
                return "ko";
            case "Neerlandés":
                return "nl";
            case "Sueco":
                return "sv";
            case "Polaco":
                return "pl";
            case "Turco":
                return "tr";
            default:
                return "en";
        }
    }
});