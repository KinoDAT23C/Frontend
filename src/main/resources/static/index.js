document.getElementById("showMoviesBtn").addEventListener("click", showMovies);

function showMovies() {
    fetch("http://localhost:8080/api/movies")
        .then(response => response.json())
        .then(data => {
            let output = "<h2>Alle Film:</h2><div class='movies'>";
            data.forEach(movie => {
                output += `
                    <div class="movie-card">
                        <img src="${movie.imageUrl}" alt="${movie.title} Billede" class="movie-image"/>
                        <h3>${movie.title}</h3>
                        <p>Genre: ${movie.genre}</p>
                        <p>Aldersbegrænsning: ${movie.ageRestriction} år</p>
                    </div>
                `;
            });
            output += "</div>";
            document.getElementById("output").innerHTML = output;
        })
        .catch(error => console.error("Error fetching movies:", error));
}

document.getElementById("showShowingsBtn").addEventListener("click", () => {
    const output = document.getElementById("output");
    output.innerHTML = `
        <h2>Vælg en dato for at se forestillinger:</h2>
        <input type="date" id="showingDate" value="${new Date().toISOString().split('T')[0]}">
        <button id="fetchShowingsBtn">Se Forestillinger</button>
        <div id="selectedDate"></div>
        <div id="showingsOutput"></div>
        <div id="reservationOutput"></div>
    `;

    document.getElementById("fetchShowingsBtn").addEventListener("click", () => {
        const date = document.getElementById("showingDate").value;
        document.getElementById("selectedDate").innerHTML = `<h3>Alle Forestillinger for: ${date}</h3>`;
        fetchShowings(date);
    });

    fetchShowings(new Date().toISOString().split('T')[0]);
});

function fetchShowings(date) {
    fetch(`http://localhost:8080/api/showings/date?date=${date}`)
        .then(response => response.json())
        .then(showings => {
            let outputHtml = showings.map(showing => `
                <div class="showing-card">
                    <img src="${showing.movie.imageUrl}" alt="${showing.movie.title}" class="showing-image">
                    <h3>Film: ${showing.movie.title}</h3>
                    <p>Tid: ${showing.startTime}</p>
                    <p>Biografsal: ${showing.theater.name}</p>
                    <button class="reserve-button" data-showing-id="${showing.showingId}" data-theater-id="${showing.theater.theaterId}">Reserver billetter</button>
                </div>
            `).join("");

            document.getElementById("showingsOutput").innerHTML = outputHtml;

            // Fjern event listeners fra tidligere knapper
            document.querySelectorAll(".reserve-button").forEach(button => {
                button.removeEventListener("click", handleReserveClick);
            });

            // Tilføj event listeners til nye knapper
            document.querySelectorAll(".reserve-button").forEach(button => {
                button.addEventListener("click", handleReserveClick);
            });
        })
        .catch(error => console.error("Der opstod en fejl:", error));
}

function handleReserveClick(event) {
    const button = event.target;
    const showingId = button.dataset.showingId;
    const theaterId = button.dataset.theaterId;

    // Skjul forestillinger, når der skal reserveres
    document.getElementById("showingsOutput").style.display = "none";

    // Nulstil `selectedSeat`
    selectedSeat = null;

    fetchAvailableSeats(showingId, theaterId);
}

function fetchAvailableSeats(showingId, theaterId) {
    fetch(`http://localhost:8080/api/seats/available-seats/${showingId}?theaterId=${theaterId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error fetching available seats: ${response.status}`);
            }
            return response.json();
        })
        .then(availableSeats => {
            const theater = availableSeats[0] ? availableSeats[0].theater : null;
            if (!theater) {
                throw new Error("Teaterdata mangler i sæderespons");
            }

            const totalRows = theater.totalRows;
            const totalSeatsPerRow = theater.totalSeatsPerRow;
            let seatMapHtml = '';

            for (let row = 1; row <= totalRows; row++) {
                for (let seatNumber = 1; seatNumber <= totalSeatsPerRow; seatNumber++) {
                    const seat = availableSeats.find(s => s.rowNumberr === row && s.seatNumber === seatNumber);
                    const seatClass = seat ? "seat" : "seat reserved";
                    const seatId = seat ? seat.seatId : null;

                    seatMapHtml += `
                        <div class="${seatClass}" data-seat-id="${seatId}" data-row="${row}" data-seat="${seatNumber}">
                            ${seatNumber}
                        </div>
                    `;
                }
                seatMapHtml += '<br>';
            }

            document.getElementById("reservationOutput").innerHTML = `
                <h3>Vælg dine sæder</h3>
                <div id="seatMap">${seatMapHtml}</div>
                <br>
                <label for="customerName">Navn:</label>
                <input type="text" id="customerName" required><br>
                <label for="customerEmail">Email:</label>
                <input type="email" id="customerEmail" required><br>
                <button id="confirmSeats">Bekræft valgte sæder</button>
            `;

            // Fjern gamle event listeners fra sæder
            document.querySelectorAll(".seat").forEach(seat => {
                seat.removeEventListener("click", selectSeat);
            });

            // Tilføj event listeners til nye sæder
            document.querySelectorAll(".seat").forEach(seat => {
                if (seat.dataset.seatId) {
                    seat.addEventListener("click", () => selectSeat(seat));
                }
            });

            document.getElementById("confirmSeats").removeEventListener("click", confirmSelectedSeat);
            document.getElementById("confirmSeats").addEventListener("click", () => {
                confirmSelectedSeat(showingId);
            });
        })
        .catch(error => console.error("Fejl ved hentning af ledige sæder:", error));
}

let selectedSeat = null;

function selectSeat(seatDiv) {
    if (selectedSeat) {
        selectedSeat.classList.remove("selected");
    }

    seatDiv.classList.add("selected");
    selectedSeat = seatDiv.dataset.seatId; // Gem det valgte sæde-id
}

function confirmSelectedSeat(showingId) {
    const customerName = document.getElementById("customerName").value;
    const customerEmail = document.getElementById("customerEmail").value;

    if (!customerName || !customerEmail) {
        alert("Udfyld venligst både navn og email.");
        return;
    }

    if (!selectedSeat) {
        alert("Vælg venligst et sæde.");
        return;
    }

    fetch("http://localhost:8080/api/reservations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            customerName: customerName,
            customerEmail: customerEmail,
            showing: { showingId: showingId },
            seat: { seatId: selectedSeat }
        })
    })
        .then(response => {
            if (response.ok) {
                alert("Reservation oprettet!");

                // Vis forestillinger igen efter reservation
                const date = document.getElementById("showingDate").value;
                fetchShowings(date); // Hent forestillingerne for den givne dag

                // Skjul reservationsformularen og vis forestillingerne igen
                document.getElementById("reservationOutput").innerHTML = '';
                document.getElementById("showingsOutput").style.display = "flex"; // Sikrer at flexbox er genanvendt
            } else {
                alert("Fejl ved oprettelse af reservation.");
            }
        })
        .catch(error => console.error("Der opstod en fejl:", error));
}

// Log ind form
// Tilføj event listener for admin login knappen
document.getElementById("adminLogIn").addEventListener("click", function () {
    document.getElementById("output").innerHTML = `
        <div id="login-form">
            <h2>Admin Log Ind</h2>
            <label for="username">Brugernavn:</label>
            <input type="text" id="username" required><br><br>
            <label for="password">Adgangskode:</label>
            <input type="password" id="password" required><br><br>
            <button id="submitLogin">Log ind</button>
            <button id="backToHome">Tilbage</button>
        </div>
    `;

    // Tilføj event listener for login-knappen EFTER formularen er tilføjet
    document.getElementById("submitLogin").addEventListener("click", function () {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        fetch("http://localhost:8080/api/employees")
            .then(response => response.json())
            .then(employees => {
                const employee = employees.find(emp => emp.name === username);

                if (employee) {
                    if (employee.password === password) {
                        showAdminPanel();  // Når login lykkes, vis admin-panelet
                    } else {
                        alert("Forkert adgangskode.");
                    }
                } else {
                    alert("Brugernavn findes ikke.");
                }
            })
            .catch(error => {
                console.error("Error fetching employees:", error);
                alert("Der opstod en fejl ved loginforsøg.");
            });
    });

    // Tilføj event listener for "Tilbage"-knappen EFTER den er tilføjet
    document.getElementById("backToHome").addEventListener("click", function () {
        document.getElementById("output").innerHTML = ''; // Tilbage til start
    });
});

// Funktion der viser admin-panelet
function showAdminPanel() {
    document.getElementById("output").innerHTML = `
        <h2>Admin Panel</h2>
        <button id="createMovie">Opret film</button>
        <button id="createShowing">Opret forestillinger</button>
        <button id="deleteMovie">Slet film</button>
        <button id="deleteShowing">Slet forestillinger</button>
    `;

    // Event listener for "Opret film"-knappen
    document.getElementById("createMovie").addEventListener("click", function () {
        document.getElementById("output").innerHTML = `
            <h2>Opret en ny film</h2>
            <label for="title">Titel:</label>
            <input type="text" id="title" required><br><br>
            <label for="genre">Genre:</label>
            <input type="text" id="genre" required><br><br>
            <label for="ageRestriction">Aldersbegrænsning:</label>
            <input type="number" id="ageRestriction" required><br><br>
            <label for="duration">Varighed (minutter):</label>
            <input type="number" id="duration" required><br><br>
            <label for="description">Beskrivelse:</label>
            <textarea id="description" required></textarea><br><br>
            <label for="imageUrl">Billed-URL:</label>
            <input type="text" id="imageUrl" required><br><br>
            <button id="submitMovie">Opret film</button>
            <button id="backToAdmin">Tilbage</button>
        `;

        document.getElementById("submitMovie").addEventListener("click", function () {
            const movieData = {
                title: document.getElementById("title").value,
                genre: document.getElementById("genre").value,
                ageRestriction: document.getElementById("ageRestriction").value,
                duration: document.getElementById("duration").value,
                description: document.getElementById("description").value
            };

            const imageUrl = document.getElementById("imageUrl").value;

            fetch(`http://localhost:8080/api/movies/createWithImage?imageUrl=${encodeURIComponent(imageUrl)}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(movieData)
            })
                .then(response => {
                    if (response.ok) {
                        alert("Film oprettet succesfuldt!");
                        showAdminPanel();
                    } else {
                        alert("Der opstod en fejl ved oprettelse af filmen.");
                    }
                })
                .catch(error => console.error("Error creating movie:", error));
        });

        document.getElementById("backToAdmin").addEventListener("click", function () {
            showAdminPanel();
        });
    });

    // Event listener for "Opret forestillinger"-knappen
    document.getElementById("createShowing").addEventListener("click", function () {
        fetch("http://localhost:8080/api/movies")
            .then(response => response.json())
            .then(movies => {
                let movieOptions = movies.map(movie => `<option value="${movie.movieId}">${movie.title}</option>`).join('');

                document.getElementById("output").innerHTML = `
                    <h2>Opret forestillinger for en film</h2>
                    <label for="movieId">Vælg en film:</label>
                    <select id="movieId">
                        ${movieOptions}
                    </select><br><br>

                    <label for="startDate">Startdato:</label>
                    <input type="date" id="startDate" required><br><br>

                    <label for="monthsAhead">Hvor mange måneder frem:</label>
                    <input type="number" id="monthsAhead" min="1" required><br><br>

                    <label for="largeTheaterStartTime">Starttid for stor biografsal (hh:mm):</label>
                    <input type="time" id="largeTheaterStartTime"><br><br>

                    <label for="smallTheaterStartTime">Starttid for lille biografsal (hh:mm):</label>
                    <input type="time" id="smallTheaterStartTime"><br><br>

                    <button id="submitShowing">Opret forestillinger</button>
                    <button id="backToAdmin">Tilbage</button>
                `;

                document.getElementById("submitShowing").addEventListener("click", function () {
                    const movieId = document.getElementById("movieId").value;
                    const startDate = document.getElementById("startDate").value;
                    const monthsAhead = document.getElementById("monthsAhead").value;
                    const largeTheaterStartTime = document.getElementById("largeTheaterStartTime").value || null;
                    const smallTheaterStartTime = document.getElementById("smallTheaterStartTime").value || null;

                    if (!movieId || !startDate || !monthsAhead) {
                        alert("Udfyld venligst alle de nødvendige felter.");
                        return;
                    }

                    const queryParams = new URLSearchParams({
                        movieId: movieId,
                        startDate: startDate,
                        monthsAhead: monthsAhead,
                        largeTheaterStartTime: largeTheaterStartTime,
                        smallTheaterStartTime: smallTheaterStartTime
                    });

                    fetch(`http://localhost:8080/api/showings/generate?${queryParams.toString()}`, {
                        method: "POST"
                    })
                        .then(response => {
                            if (response.ok) {
                                alert("Forestillinger oprettet succesfuldt!");
                                showAdminPanel();
                            } else {
                                alert("Der opstod en fejl ved oprettelsen af forestillingerne.");
                            }
                        })
                        .catch(error => {
                            console.error("Fejl ved oprettelse af forestillinger:", error);
                        });
                });

                document.getElementById("backToAdmin").addEventListener("click", function () {
                    showAdminPanel();
                });
            })
            .catch(error => console.error("Fejl ved hentning af film:", error));
    });

    // Event listener for "Slet film"-knappen
    document.getElementById("deleteMovie").addEventListener("click", function () {
        fetch("http://localhost:8080/api/movies")
            .then(response => response.json())
            .then(movies => {
                let movieOptions = movies.map(movie => `<option value="${movie.movieId}">${movie.title}</option>`).join('');

                document.getElementById("output").innerHTML = `
                    <h2>Slet en film</h2>
                    <label for="movieId">Vælg en film:</label>
                    <select id="movieId">
                        ${movieOptions}
                    </select><br><br>
                    <button id="submitDeleteMovie">Slet film</button>
                    <button id="backToAdmin">Tilbage</button>
                `;

                document.getElementById("submitDeleteMovie").addEventListener("click", function () {
                    const movieId = document.getElementById("movieId").value;

                    if (confirm("Er du sikker på, at du vil slette denne film? Alle tilknyttede forestillinger vil også blive slettet.")) {
                        fetch(`http://localhost:8080/api/movies/${movieId}`, {
                            method: "DELETE"
                        })
                            .then(response => {
                                if (response.ok) {
                                    alert("Film slettet succesfuldt!");
                                    showAdminPanel();
                                } else {
                                    alert("Der opstod en fejl ved sletning af filmen.");
                                }
                            })
                            .catch(error => {
                                console.error("Fejl ved sletning af film:", error);
                            });
                    }
                });

                document.getElementById("backToAdmin").addEventListener("click", function () {
                    showAdminPanel();
                });
            })
            .catch(error => console.error("Fejl ved hentning af film:", error));
    });

    // Event listener for "Slet forestillinger"-knappen
    document.getElementById("deleteShowing").addEventListener("click", function () {
        fetch("http://localhost:8080/api/showings")
            .then(response => response.json())
            .then(showings => {
                let showingOptions = showings.map(showing => `
                    <option value="${showing.showingId}">
                        ${showing.movie.title} - ${showing.date} kl. ${showing.startTime}
                    </option>
                `).join('');

                document.getElementById("output").innerHTML = `
                    <h2>Slet en forestilling</h2>
                    <label for="showingId">Vælg en forestilling:</label>
                    <select id="showingId">
                        ${showingOptions}
                    </select><br><br>
                    <button id="submitDeleteShowing">Slet forestilling</button>
                    <button id="backToAdmin">Tilbage</button>
                `;

                document.getElementById("submitDeleteShowing").addEventListener("click", function () {
                    const showingId = document.getElementById("showingId").value;

                    if (confirm("Er du sikker på, at du vil slette denne forestilling?")) {
                        fetch(`http://localhost:8080/api/showings/${showingId}`, {
                            method: "DELETE"
                        })
                            .then(response => {
                                if (response.ok) {
                                    alert("Forestilling slettet succesfuldt!");
                                    showAdminPanel();
                                } else {
                                    alert("Der opstod en fejl ved sletning af forestillingen.");
                                }
                            })
                            .catch(error => {
                                console.error("Fejl ved sletning af forestilling:", error);
                            });
                    }
                });

                document.getElementById("backToAdmin").addEventListener("click", function () {
                    showAdminPanel();
                });
            })
            .catch(error => console.error("Fejl ved hentning af forestillinger:", error));
    });
}
