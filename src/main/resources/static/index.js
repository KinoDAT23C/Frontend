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
    // Slet tidligere indhold og opdater visning for at vælge dato
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

            document.querySelectorAll(".reserve-button").forEach(button => {
                button.addEventListener("click", () => {
                    const showingId = button.dataset.showingId;
                    const theaterId = button.dataset.theaterId;

                    fetchAvailableSeats(showingId, theaterId);
                });
            });
        })
        .catch(error => console.error("Der opstod en fejl:", error));
}

function fetchAvailableSeats(showingId, theaterId) {
    fetch(`http://localhost:8080/api/available-seats/${showingId}?theaterId=${theaterId}`)
        .then(response => response.json())
        .then(seats => {
            let seatMapHtml = seats.map(seat => `
                <div class="seat" data-seat-id="${seat.seatId}" data-row="${seat.rowNumberr}" data-seat="${seat.seatNumber}">
                    Række ${seat.rowNumberr} Sæde ${seat.seatNumber}
                </div>
            `).join("");

            document.getElementById("reservationOutput").innerHTML = `
                <h3>Vælg dine sæder</h3>
                <div id="seatMap">${seatMapHtml}</div>
                <button id="confirmSeats">Bekræft valgte sæder</button>
            `;

            document.querySelectorAll(".seat").forEach(seat => {
                seat.addEventListener("click", () => selectSeat(seat));
            });

            document.getElementById("confirmSeats").addEventListener("click", () => {
                confirmSelectedSeats(showingId);
            });
        })
        .catch(error => console.error("Fejl ved hentning af ledige sæder:", error));
}

let selectedSeats = [];

function selectSeat(seatDiv) {
    seatDiv.classList.toggle("selected");
    const seatId = seatDiv.dataset.seatId;

    const index = selectedSeats.indexOf(seatId);
    if (index > -1) {
        selectedSeats.splice(index, 1);
    } else {
        selectedSeats.push(seatId);
    }
}

function confirmSelectedSeats(showingId) {
    if (selectedSeats.length === 0) {
        alert("Vælg venligst mindst ét sæde.");
        return;
    }

    fetch("http://localhost:8080/api/reservations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            showingId: showingId,
            seats: selectedSeats
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
}
