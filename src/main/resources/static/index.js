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

    // Tilføj event listener til knappen for at hente forestillinger baseret på valgt dato
    document.getElementById("fetchShowingsBtn").addEventListener("click", () => {
        const date = document.getElementById("showingDate").value;

        // Opdater visning af den valgte dato
        document.getElementById("selectedDate").innerHTML = `<h3>Alle Forestillinger for: ${date}</h3>`;

        fetchShowings(date);
    });

    // Hent forestillinger for valgte dato ved første visning
    fetchShowings(new Date().toISOString().split('T')[0]);
});

function fetchShowings(date) {
    fetch(`http://localhost:8080/api/showings/date?date=${date}`)
        .then(response => response.json())
        .then(showings => {
            let outputHtml = showings.map(showing => {
                return `
                    <div class="showing-card">
                        <img src="${showing.movie.imageUrl}" alt="${showing.movie.title}" class="showing-image">
                        <h3>Film: ${showing.movie.title}</h3>
                        <p>Tid: ${showing.startTime}</p>
                        <p>Biografsal: ${showing.theater.name}</p>
                        <button class="reserve-button" data-showing-id="${showing.showingId}" data-theater-id="${showing.theater.theaterId}">Reserver billetter</button>
                    </div>
                `;
            }).join("");

            document.getElementById("showingsOutput").innerHTML = outputHtml;

            document.querySelectorAll(".reserve-button").forEach(button => {
                button.addEventListener("click", () => {
                    const showingId = button.dataset.showingId;
                    const theaterId = button.dataset.theaterId;

                    console.log(`Knap trykket: Showing ID ${showingId}, Theater ID: ${theaterId}`);

                    // Hent ledige sæder for den valgte forestilling
                    fetch(`http://localhost:8080/api/seats/available-seats/${showingId}?theaterId=${theaterId}`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            return response.json();
                        })
                        .then(seats => {
                            console.log('Ledige sæder:', seats);
                            let seatOptions = seats.map(seat => `
                                <option value="${seat.seatId}">Række: ${seat.rowNumberr}, Sæde: ${seat.seatNumber}</option>
                            `).join("");

                            // Tilføj reservationsformularen i den separate div for at undgå konflikter
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

                            // Håndter reservation når knappen trykkes
                            document.getElementById("submitReservation").addEventListener("click", () => {
                                const customerName = document.getElementById("customerName").value;
                                const customerEmail = document.getElementById("customerEmail").value;
                                const seatId = document.getElementById("seatSelect").value;

                                if (!customerName || !customerEmail) {
                                    alert("Udfyld venligst både navn og email.");
                                    return;
                                }

                                console.log('Reservation info:', { customerName, customerEmail, seatId, showingId });

                                // Send reservationen til backend
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
                                        console.log('Reservation response:', response);
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
                });
            });
        })
        .catch(error => console.error("Der opstod en fejl:", error));
}
