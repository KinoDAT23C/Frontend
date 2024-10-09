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

                button.addEventListener("click", () => {
                    const showingId = button.dataset.showingId;
                    const theaterId = button.dataset.theaterId;
                    fetchAvailableSeats(showingId, theaterId);
                });

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

function fetchAvailableSeats(showingId, theaterId) {
    fetch(`http://localhost:8080/api/seats/available-seats/${showingId}?theaterId=${theaterId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(seats => {
            let seatOptions = seats.map(seat => `
                <option value="${seat.seatId}">Række: ${seat.rowNumberr}, Sæde: ${seat.seatNumber}</option>
            `).join("");

            const reservationOutput = document.getElementById("reservationOutput");
            reservationOutput.innerHTML = `
                <div class="reservation-form">
                    <h3>Reservation for Showing ID: ${showingId}</h3>
                    <label for="customerName">Navn:</label>
                    <input type="text" id="customerName" required><br>
                    <label for="customerEmail">Email:</label>
                    <input type="email" id="customerEmail" required><br>
                    <label for="seatSelect">Vælg sæde:</label>
                    <select id="seatSelect">${seatOptions}</select><br>
                    <button id="submitReservation">Reserver</button>
                </div>
            `;

            document.getElementById("submitReservation").addEventListener("click", () => {
                const customerName = document.getElementById("customerName").value;
                const customerEmail = document.getElementById("customerEmail").value;
                const seatId = document.getElementById("seatSelect").value;

                if (!customerName || !customerEmail) {
                    alert("Udfyld venligst både navn og email.");
                    return;
                }

                fetch("http://localhost:8080/api/reservations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        customerName,
                        customerEmail,
                        seat: { seatId },
                        showing: { showingId }
                    })
                })
                    .then(response => {
                        if (response.ok) {
                            alert("Reservation oprettet!");
                        } else {
                            alert("Fejl ved oprettelse af reservation.");
                        }
                    })
                    .catch(error => console.error("Der opstod en fejl:", error));
            });
        })
        .catch(error => console.error("Fejl ved hentning af sæder:", error));
}

// Admin Panel Functionality
document.getElementById("adminBtn").addEventListener("click", loadAdminPanel);

function loadAdminPanel() {
    const output = document.getElementById("output");
    output.innerHTML = `
        <h2>Admin Panel</h2>
        <h3>Tilføj ny film</h3>
        <input type="text" id="movieTitle" placeholder="Titel" required>
        <input type="text" id="movieGenre" placeholder="Genre" required>
        <input type="number" id="movieAgeRestriction" placeholder="Aldersbegrænsning" required>
        <input type="number" id="movieDuration" placeholder="Varighed (min)" required>
        <textarea id="movieDescription" placeholder="Beskrivelse" required></textarea>
        <input type="text" id="movieImageUrl" placeholder="Billede URL" required>
        <button id="addMovieBtn">Tilføj Film</button>
        <h3>Filmliste</h3>
        <div id="movieList"></div>
    `;

    // Add event listener for adding movies
    document.getElementById("addMovieBtn").addEventListener("click", addMovie);
    fetchMovies(); // Load existing movies
}

function fetchMovies() {
    fetch("http://localhost:8080/api/movies")
        .then(response => response.json())
        .then(data => {
            let output = "<ul>";
            data.forEach(movie => {
                output += `
                    <li>
                        ${movie.title} - ${movie.movieId} 
                        <button onclick="deleteMovie(${movie.movieId})">Slet</button>
                    </li>
                `;
            });
            output += "</ul>";
            document.getElementById("movieList").innerHTML = output;
        })
        .catch(error => console.error("Fejl ved hentning af film:", error));
}

function addMovie() {
    const title = document.getElementById("movieTitle").value;
    const genre = document.getElementById("movieGenre").value;
    const ageRestriction = parseInt(document.getElementById("movieAgeRestriction").value);
    const duration = parseInt(document.getElementById("movieDuration").value);
    const description = document.getElementById("movieDescription").value;
    const imageUrl = document.getElementById("movieImageUrl").value;

    const movieData = {
        title,
        genre,
        ageRestriction,
        duration,
        description,
        imageUrl
    };

    fetch("http://localhost:8080/api/movies", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(movieData)
    })
        .then(response => response.text())
        .then(message => {
            alert(message);
            fetchMovies(); 
        })
        .catch(error => console.error("Error adding movie:", error));


    fetch("http://localhost:8080/api/movies", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(movieData)
    })
        .then(response => {
            if (response.ok) {
                alert("Film tilføjet!");
                fetchMovies(); // Refresh the movie list
            } else {
                alert("Fejl ved tilføjelse af film.");
            }
        })
        .catch(error => console.error("Der opstod en fejl:", error));
}


function deleteMovie(movieId) {
    console.log(`Deleting movie with ID: ${movieId}`); // Log the movie ID being sent

    fetch(`http://localhost:8080/api/movies/${movieId}`, {
        method: "DELETE"
    })
        .then(response => {
            if (response.ok) {
                alert("Film slettet");
                fetchMovies();
            } else {
                alert("Fejl ved sletning af film.");
            }
        })
        .catch(error => console.error("Error deleting movie:", error));
}


